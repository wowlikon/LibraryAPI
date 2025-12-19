"""Модуль авторизации и аутентификации"""
import os
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlmodel import Session, select

from library_service.models.db import Role, User
from library_service.models.dto import TokenData
from library_service.settings import get_session, get_logger


# Конфигурация из переменных окружения
ALGORITHM = os.getenv("ALGORITHM", "HS256")
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))


#  Получение логгера
logger = get_logger("uvicorn")

# OAuth2 схема
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

# Хэширование паролей
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверка пароль по его хешу."""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Хэширование пароля."""
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Создание JWT access токена."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire, "type": "access"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_refresh_token(data: dict) -> str:
    """Создание JWT refresh токена."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire, "type": "refresh"})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> TokenData:
    """Декодирование и проверка JWT токенов."""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        user_id: int = payload.get("user_id")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
                headers={"WWW-Authenticate": "Bearer"},
            )
        return TokenData(username=username, user_id=user_id)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )


def authenticate_user(session: Session, username: str, password: str) -> User | None:
    """Аутентификация пользователя по имени пользователя и паролю."""
    statement = select(User).where(User.username == username)
    user = session.exec(statement).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: Session = Depends(get_session),
) -> User:
    """Получить текущего авторизованного пользователя."""
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
    """Получить текущего активного пользователя."""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user"
        )
    return current_user


def require_role(role_name: str):
    """Dependency, требующая выполнения определенной роли."""

    def role_checker(current_user: User = Depends(get_current_active_user)) -> User:
        user_roles = [role.name for role in current_user.roles]
        if role_name not in user_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role_name}' required",
            )
        return current_user

    return role_checker


# Создание dependencies
RequireAuth = Annotated[User, Depends(get_current_active_user)]
RequireAdmin = Annotated[User, Depends(require_role("admin"))]
RequireModerator = Annotated[User, Depends(require_role("moderator"))]


def seed_roles(session: Session) -> dict[str, Role]:
    """Создаёт роли по умолчанию, если их нет."""
    default_roles = [
        {"name": "admin", "description": "Администратор системы"},
        {"name": "moderator", "description": "Модератор"},
        {"name": "user", "description": "Обычный пользователь"},
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
    """Создаёт администратора по умолчанию, если нет ни одного."""
    existing_admins = session.exec(
        select(User).join(User.roles).where(Role.name == "admin")
    ).all()

    if existing_admins:
        logger.info(f"[=] Admin already exists: {existing_admins[0].username}, skipping creation")
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
        logger.warning("=" * 50)
        logger.warning(f"[!] GENERATED ADMIN PASSWORD: {admin_password}")
        logger.warning("[!] Save this password! It won't be shown again!")
        logger.warning("=" * 50)

    return admin_user


def run_seeds(session: Session) -> None:
    """Запускаем создание ролей и администратора."""
    roles = seed_roles(session)
    seed_admin(session, roles["admin"])
