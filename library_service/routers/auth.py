"""Модуль работы с авторизацией и аутентификацией пользователей"""

import base64

from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from library_service.services import require_captcha
from library_service.models.db import Role, User
from library_service.models.dto import (
    Token,
    UserCreate,
    UserRead,
    UserUpdate,
    UserList,
    RoleRead,
    RoleList,
    Token,
    PartialToken,
    LoginResponse,
    RecoveryCodeUse,
    RegisterResponse,
    RecoveryCodesStatus,
    RecoveryCodesResponse,
    PasswordResetResponse,
    TOTPSetupResponse,
    TOTPVerifyRequest,
    TOTPDisableRequest,
)

from library_service.settings import get_session
from library_service.auth import (
    ACCESS_TOKEN_EXPIRE_MINUTES,
    RequireAuth,
    RequireAdmin,
    RequireStaff,
    authenticate_user,
    get_password_hash,
    decode_token,
    create_access_token,
    create_refresh_token,
    generate_totp_setup,
    generate_codes_for_user,
    verify_and_use_code,
    get_codes_status,
    verify_totp_code,
    verify_password,
    qr_to_bitmap_b64,
    create_partial_token,
    RequirePartialAuth,
    verify_and_use_code,
    cipher,
)


router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post(
    "/register",
    response_model=RegisterResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Регистрация нового пользователя",
    description="Создает нового пользователя и возвращает резервные коды",
)
def register(
    user_data: UserCreate,
    _=Depends(require_captcha),
    session: Session = Depends(get_session),
):
    """Регистрирует нового пользователя в системе"""
    existing_user = session.exec(
        select(User).where(User.username == user_data.username)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    existing_email = session.exec(
        select(User).where(User.email == user_data.email)
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    db_user = User(
        **user_data.model_dump(exclude={"password"}),
        hashed_password=get_password_hash(user_data.password),
    )

    default_role = session.exec(select(Role).where(Role.name == "member")).first()
    if default_role:
        db_user.roles.append(default_role)

    session.add(db_user)
    session.commit()
    session.refresh(db_user)

    recovery_codes = generate_codes_for_user(session, db_user)

    return RegisterResponse(
        user=UserRead(
            **db_user.model_dump(),
            roles=[role.name for role in db_user.roles],
        ),
        recovery_codes=RecoveryCodesResponse(
            codes=recovery_codes,
            generated_at=db_user.recovery_codes_generated_at,
        ),
    )


@router.post(
    "/token",
    response_model=LoginResponse,
    summary="Получение токена",
    description="Аутентификация и получение токенов",
)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: Session = Depends(get_session),
):
    """Аутентифицирует пользователя и возвращает JWT токены"""
    user = authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token_data = {"sub": user.username, "user_id": user.id}

    if user.is_2fa_enabled:
        return LoginResponse(
            partial_token=create_partial_token(token_data),
            token_type="partial",
            requires_2fa=True,
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return LoginResponse(
        access_token=create_access_token(
            data=token_data, expires_delta=access_token_expires
        ),
        refresh_token=create_refresh_token(data=token_data),
        token_type="bearer",
        requires_2fa=False,
    )


@router.post(
    "/refresh",
    response_model=Token,
    summary="Обновление токена",
    description="Получение новой пары токенов, используя действующий Refresh токен",
)
def refresh_token(
    refresh_token: str = Body(..., embed=True),
    session: Session = Depends(get_session),
):
    """Обновляет пару токенов (access и refresh)"""
    try:
        token_data = decode_token(refresh_token, expected_type="refresh")
    except HTTPException:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = session.get(User, token_data.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User is inactive",
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires,
    )
    new_refresh_token = create_refresh_token(
        data={"sub": user.username, "user_id": user.id}
    )

    return Token(
        access_token=new_access_token,
        refresh_token=new_refresh_token,
        token_type="bearer",
    )


@router.get(
    "/me",
    response_model=UserRead,
    summary="Текущий пользователь",
    description="Получить информацию о текущем авторизованном пользователе",
)
def get_my_profile(current_user: RequireAuth):
    """Возвращает информацию о текущем пользователе"""
    return UserRead(
        **current_user.model_dump(), roles=[role.name for role in current_user.roles]
    )


@router.put(
    "/me",
    response_model=UserRead,
    summary="Обновить профиль",
    description="Обновить информацию текущего пользователя",
)
def update_user_me(
    user_update: UserUpdate,
    current_user: RequireAuth,
    session: Session = Depends(get_session),
):
    """Обновляет профиль текущего пользователя"""
    if user_update.email:
        current_user.email = user_update.email
    if user_update.full_name:
        current_user.full_name = user_update.full_name
    if user_update.password:
        current_user.hashed_password = get_password_hash(user_update.password)

    session.add(current_user)
    session.commit()
    session.refresh(current_user)

    return UserRead(
        **current_user.model_dump(), roles=[role.name for role in current_user.roles]
    )


@router.get(
    "/2fa",
    response_model=TOTPSetupResponse,
    summary="Создание QR-кода TOTP 2FA",
    description="Генерирует секрет и QR-код для настройки TOTP",
)
def get_totp_qr_bitmap(
    current_user: RequireAuth,
    session: Session = Depends(get_session),
):
    """Возвращает данные для настройки TOTP"""
    totp_data = generate_totp_setup(current_user.username)
    encrypted = cipher.encrypt(totp_data["secret"].encode())

    current_user.totp_secret = base64.b64encode(encrypted).decode()
    session.add(current_user)
    session.commit()

    return TOTPSetupResponse(**totp_data)


@router.post(
    "/2fa/enable",
    summary="Включение TOTP 2FA",
    description="Подтверждает настройку и включает 2FA",
)
def enable_2fa(
    data: TOTPVerifyRequest,
    current_user: RequireAuth,
    secret: str = Body(..., embed=True),
    session: Session = Depends(get_session),
):
    """Включает 2FA после проверки кода"""
    if current_user.is_2fa_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA already enabled",
        )

    if not current_user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Secret key not generated"
        )

    if not verify_totp_code(secret, data.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid TOTP code",
        )

    decrypted = cipher.decrypt(base64.b64decode(current_user.totp_secret.encode()))
    if secret != decrypted.decode():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Incorret secret"
        )

    current_user.is_2fa_enabled = True
    session.add(current_user)
    session.commit()

    return {"success": True}


@router.post(
    "/2fa/disable",
    summary="Отключение TOTP 2FA",
    description="Отключает 2FA после проверки пароля и кода",
)
def disable_2fa(
    data: TOTPDisableRequest,
    current_user: RequireAuth,
    session: Session = Depends(get_session),
):
    """Отключает 2FA"""
    if not current_user.is_2fa_enabled or not current_user.totp_secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="2FA not enabled",
        )

    if not verify_password(data.password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
        )

    current_user.totp_secret = None
    current_user.is_2fa_enabled = False
    session.add(current_user)
    session.commit()

    return {"success": True}


@router.post(
    "/2fa/verify",
    response_model=Token,
    summary="Верификация 2FA",
    description="Завершает аутентификацию с помощью TOTP кода или резервного кода",
)
def verify_2fa(
    data: TOTPVerifyRequest,
    user: RequirePartialAuth,
    session: Session = Depends(get_session),
):
    """Верифицирует 2FA и возвращает полный токен"""
    if not data.code:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Provide TOTP code",
        )

    verified = False

    if data.code and user.totp_secret:
        decrypted = cipher.decrypt(base64.b64decode(user.totp_secret.encode()))
        if verify_totp_code(decrypted.decode(), data.code):
            verified = True

    if not verified:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid 2FA code",
        )

    token_data = {"sub": user.username, "user_id": user.id}
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    return Token(
        access_token=create_access_token(
            data=token_data, expires_delta=access_token_expires
        ),
        refresh_token=create_refresh_token(data=token_data),
    )


@router.get(
    "/recovery-codes/status",
    response_model=RecoveryCodesStatus,
    summary="Статус резервных кодов",
    description="Показывает количество оставшихся кодов и какие использованы",
)
def get_recovery_codes_status(current_user: RequireAuth):
    """Возвращает статус резервных кодов"""
    return RecoveryCodesStatus(**get_codes_status(current_user))


@router.post(
    "/recovery-codes/regenerate",
    response_model=RecoveryCodesResponse,
    summary="Перегенерация резервных кодов",
    description="Генерирует новые коды, старые аннулируются",
)
def regenerate_recovery_codes(
    current_user: RequireAuth,
    session: Session = Depends(get_session),
):
    """Генерирует новые резервные коды"""
    codes = generate_codes_for_user(session, current_user)

    return RecoveryCodesResponse(
        codes=codes,
        generated_at=current_user.recovery_codes_generated_at,
    )


@router.post(
    "/password/reset",
    response_model=PasswordResetResponse,
    summary="Сброс пароля через резервный код",
    description="Устанавливает новый пароль используя резервный код",
)
def reset_password(
    data: RecoveryCodeUse,
    session: Session = Depends(get_session),
):
    """Сброс пароля с использованием резервного кода"""
    user = session.exec(select(User).where(User.username == data.username)).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid username or recovery code",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is deactivated",
        )

    if not verify_and_use_code(session, user, data.recovery_code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid username or recovery code",
        )

    user.hashed_password = get_password_hash(data.new_password)
    session.add(user)
    session.commit()

    return PasswordResetResponse(**get_codes_status(user))
