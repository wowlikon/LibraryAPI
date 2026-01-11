"""Модуль авторизации и аутентификации"""

import os
import base64
from datetime import datetime, timedelta, timezone
from typing import Annotated

from uuid import uuid4
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError, ExpiredSignatureError
from passlib.context import CryptContext
from sqlmodel import Session, select
import pyotp
import qrcode

from library_service.models.db import Role, User
from library_service.models.dto import TokenData
from library_service.settings import get_session, get_logger


# Конфигурация JWT из переменных окружения
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Конфигурация хэширования паролей из переменных окружения
ARGON2_TYPE = os.getenv("ARGON2_TYPE", "id")
ARGON2_TIME_COST = int(os.getenv("ARGON2_TIME_COST", "3"))
ARGON2_MEMORY_COST = int(os.getenv("ARGON2_MEMORY_COST", "65536"))
ARGON2_PARALLELISM = int(os.getenv("ARGON2_PARALLELISM", "4"))
ARGON2_SALT_LENGTH = int(os.getenv("ARGON2_SALT_LENGTH", "16"))

#  Получение логгера
logger = get_logger()

# OAuth2 схема
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# Проверка секретного ключа
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is required")

# Хэширование паролей
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__type=ARGON2_TYPE,
    argon2__time_cost=ARGON2_TIME_COST,
    argon2__memory_cost=ARGON2_MEMORY_COST,
    argon2__parallelism=ARGON2_PARALLELISM,
    argon2__salt_len=ARGON2_SALT_LENGTH,
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверяет пароль по его хешу"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Хэширует пароль"""
    return pwd_context.hash(password)


def _create_token(data: dict, expires_delta: timedelta, token_type: str) -> str:
    """Базовая функция создания токена"""
    now = datetime.now(timezone.utc)
    to_encode = {**data, "iat": now, "exp": now + expires_delta, "type": token_type}
    if token_type == "refresh":
        to_encode.update({"jti": str(uuid4())})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Создает JWT access токен"""
    delta = expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return _create_token(data, delta, "access")


def create_refresh_token(data: dict) -> str:
    """Создает JWT refresh токен"""
    return _create_token(data, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS), "refresh")


def decode_token(token: str, expected_type: str = "access") -> TokenData:
    """Декодирует и проверяет JWT токен"""
    token_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        user_id: int | None = payload.get("user_id")
        token_type: str | None = payload.get("type")
        if token_type != expected_type:
            token_error.detail = f"Invalid token type. Expected {expected_type}"
            raise token_error
        if username is None or user_id is None:
            token_error.detail = "Could not validate credentials"
            raise token_error
        return TokenData(username=username, user_id=user_id)
    except ExpiredSignatureError:
        token_error.detail = "Token expired"
        raise token_error
    except JWTError:
        token_error.detail = "Could not validate credentials"
        raise token_error


def authenticate_user(session: Session, username: str, password: str) -> User | None:
    """Аутентифицирует пользователя по имени и паролю"""
    statement = select(User).where(User.username == username)
    user = session.exec(statement).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: Session = Depends(get_session),
) -> User:
    """Возвращает текущего авторизованного пользователя"""
    token_data = decode_token(token)

    user = session.get(User, token_data.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Проверяет активность пользователя и возвращает его"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user"
        )
    return current_user


def require_role(role_name: str):
    """Создает dependency для проверки наличия определенной роли"""

    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        user_roles = [role.name for role in current_user.roles]
        if role_name not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role_name}' required",
            )
        return current_user

    return role_checker


def require_any_role(allowed_roles: list[str]):
    """Создает dependency для проверки наличия хотя бы одной из ролей"""

    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        user_roles = {role.name for role in current_user.roles}
        if not (user_roles & set(allowed_roles)):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Requires one of roles: {allowed_roles}",
            )
        return current_user

    return role_checker


# Создание dependencies
RequireAuth = Annotated[User, Depends(get_current_active_user)]
RequireAdmin = Annotated[User, Depends(require_role("admin"))]
RequireMember = Annotated[User, Depends(require_role("member"))]
RequireLibrarian = Annotated[User, Depends(require_role("librarian"))]
RequireStaff = Annotated[User, Depends(require_any_role(["admin", "librarian"]))]


def is_user_staff(user: User) -> bool:
    """Проверяет, является ли пользователь сотрудником (admin или librarian)"""
    roles = {role.name for role in user.roles}
    return bool(roles & {"admin", "librarian"})


def is_user_admin(user: User) -> bool:
    """Проверяет, является ли пользователь администратором"""
    roles = {role.name for role in user.roles}
    return "admin" in roles


def seed_roles(session: Session) -> dict[str, Role]:
    """Создает роли по умолчанию, если их нет"""
    default_roles = [
        {"name": "admin", "description": "Администратор системы", "payroll": 80000},
        {"name": "librarian", "description": "Библиотекарь", "payroll": 55000},
        {"name": "member", "description": "Посетитель библиотеки", "payroll": 0},
    ]

    roles = {}
    for role_data in default_roles:
        existing = session.exec(
            select(Role).where(Role.name == role_data["name"])
        ).first()

        if existing:
            roles[role_data["name"]] = existing
        else:
            role = Role(**role_data)
            session.add(role)
            session.commit()
            session.refresh(role)
            roles[role_data["name"]] = role
            logger.info(f"[+] Created role: {role_data['name']}")

    return roles


def seed_admin(session: Session, admin_role: Role) -> User | None:
    """Создает администратора по умолчанию, если нет ни одного"""
    existing_admins = session.exec(
        select(User).join(User.roles).where(Role.name == "admin")
    ).all()

    if existing_admins:
        logger.info(
            f"[=] Admin already exists: {existing_admins[0].username}, skipping creation"
        )
        return None

    admin_username = os.getenv("DEFAULT_ADMIN_USERNAME", "admin")
    admin_email = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@example.com")
    admin_password = os.getenv("DEFAULT_ADMIN_PASSWORD")

    generated = False
    if not admin_password:
        import secrets

        admin_password = secrets.token_urlsafe(16)
        generated = True

    admin_user = User(
        username=admin_username,
        email=admin_email,
        full_name="Системный администратор",
        hashed_password=get_password_hash(admin_password),
        is_active=True,
        is_verified=True,
    )
    admin_user.roles.append(admin_role)

    session.add(admin_user)
    session.commit()
    session.refresh(admin_user)

    logger.info(f"[+] Created admin user: {admin_username}")

    if generated:
        logger.warning("=" * 52)
        logger.warning(f"[!] GENERATED ADMIN PASSWORD: {admin_password}")
        logger.warning("[!] Save this password! It won't be shown again!")
        logger.warning("=" * 52)

    return admin_user


def run_seeds(session: Session) -> None:
    """Запускает создание ролей и администратора"""
    roles = seed_roles(session)
    seed_admin(session, roles["admin"])


def qr_to_bitmap_b64(data: str) -> dict:
    """
    Конвертирует данные в QR-код и возвращает как base64 bitmap.
    0 = чёрный, 1 = белый
    """
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=1,
        border=0,
    )
    qr.add_data(data)
    qr.make(fit=True)

    matrix = qr.get_matrix()
    size = len(matrix)

    bits = []
    for row in matrix:
        for cell in row:
            bits.append(0 if cell else 1)

    padding = (8 - len(bits) % 8) % 8
    bits.extend([0] * padding)

    bytes_array = bytearray()
    for i in range(0, len(bits), 8):
        byte = 0
        for j in range(8):
            byte = (byte << 1) | bits[i + j]
        bytes_array.append(byte)

    b64 = base64.b64encode(bytes_array).decode("ascii")

    return {"size": size, "padding": padding, "bitmap_b64": b64}
