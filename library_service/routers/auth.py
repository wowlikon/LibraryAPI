"""Модуль работы с авторизацией и аутентификацией пользователей"""
from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Body, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlmodel import Session, select

from library_service.models.db import Role, User
from library_service.models.dto import Token, UserCreate, UserRead, UserUpdate, UserList, RoleRead, RoleList
from library_service.settings import get_session
from library_service.auth import (ACCESS_TOKEN_EXPIRE_MINUTES, RequireAdmin, RequireAuth,
                                  authenticate_user, get_password_hash, decode_token,
                                  create_access_token, create_refresh_token)

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Регистрация нового пользователя",
    description="Создает нового пользователя в системе",
)
def register(user_data: UserCreate, session: Session = Depends(get_session)):
    """Эндпоинт регистрации пользователя"""
    # Проверка если username существует
    existing_user = session.exec(
        select(User).where(User.username == user_data.username)
    ).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    # Проверка если email существует
    existing_email = session.exec(
        select(User).where(User.email == user_data.email)
    ).first()
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Email already registered"
        )

    db_user = User(
        **user_data.model_dump(exclude={"password"}),
        hashed_password=get_password_hash(user_data.password)
    )

    default_role = session.exec(select(Role).where(Role.name == "member")).first()
    if default_role:
        db_user.roles.append(default_role)

    session.add(db_user)
    session.commit()
    session.refresh(db_user)

    return UserRead(**db_user.model_dump(), roles=[role.name for role in db_user.roles])


@router.post(
    "/token",
    response_model=Token,
    summary="Получение токена",
    description="Аутентификация и получение JWT токена",
)
def login(
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
    session: Session = Depends(get_session),
):
    """Эндпоинт аутентификации и получения JWT токена"""
    user = authenticate_user(session, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires,
    )
    refresh_token = create_refresh_token(
        data={"sub": user.username, "user_id": user.id}
    )

    return Token(
        access_token=access_token, refresh_token=refresh_token, token_type="bearer"
    )


@router.post(
    "/refresh",
    response_model=Token,
    summary="Обновление токена",
    description="Получение новой пары токенов (Access + Refresh) используя действующий Refresh токен",
)
def refresh_token(
    refresh_token: str = Body(..., embed=True),
    session: Session = Depends(get_session),
):
    """Эндпоинт для обновления токенов."""
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
    """Эндпоинт получения информации о себе"""
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
    """Эндпоинт обновления пользователя"""
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
    "/users",
    response_model=UserList,
    summary="Список пользователей",
    description="Получить список всех пользователей (только для админов)",
)
def read_users(
    admin: RequireAdmin,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
):
    """Эндпоинт получения списка всех пользователей"""
    users = session.exec(select(User).offset(skip).limit(limit)).all()
    return UserList(
        users=[
            UserRead(**user.model_dump(), roles=[r.name for r in user.roles])
            for user in users
        ],
        total=len(users),
    )


@router.post(
    "/users/{user_id}/roles/{role_name}",
    response_model=UserRead,
    summary="Назначить роль пользователю",
    description="Добавить указанную роль пользователю",
)
def add_role_to_user(
    user_id: int,
    role_name: str,
    admin: RequireAdmin,
    session: Session = Depends(get_session),
):
    """Эндпоинт добавления роли пользователю"""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    role = session.exec(select(Role).where(Role.name == role_name)).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role '{role_name}' not found",
        )

    if role in user.roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has this role",
        )

    user.roles.append(role)
    session.add(user)
    session.commit()
    session.refresh(user)

    return UserRead(**user.model_dump(), roles=[r.name for r in user.roles])


@router.delete(
    "/users/{user_id}/roles/{role_name}",
    response_model=UserRead,
    summary="Удалить роль у пользователя",
    description="Убрать указанную роль у пользователя",
)
def remove_role_from_user(
    user_id: int,
    role_name: str,
    admin: RequireAdmin,
    session: Session = Depends(get_session),
):
    """Эндпоинт удаления роли у пользователя"""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    role = session.exec(select(Role).where(Role.name == role_name)).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role '{role_name}' not found",
        )

    if role not in user.roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have this role",
        )

    user.roles.remove(role)
    session.add(user)
    session.commit()
    session.refresh(user)

    return UserRead(**user.model_dump(), roles=[r.name for r in user.roles])


@router.get(
    "/roles",
    response_model=RoleList,
    summary="Получить список ролей",
    description="Возвращает список ролей",
)
def get_roles(
    auth: RequireAuth,
    session: Session = Depends(get_session),
):
    """Эндпоинт получения списа ролей"""
    user_roles = [role.name for role in auth.roles]
    exclude = {"payroll"} if "admin" in user_roles else set()
    roles = session.exec(select(Role)).all()
    return RoleList(
        roles=[RoleRead(**role.model_dump(exclude=exclude)) for role in roles],
        total=len(roles),
    )
