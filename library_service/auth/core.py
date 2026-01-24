"""Модуль основного функционала авторизации и аутентификации"""

from datetime import datetime, timedelta, timezone
from typing import Annotated
from uuid import uuid4
import hashlib
import os

from argon2.low_level import hash_secret_raw, Type
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError, ExpiredSignatureError
from passlib.context import CryptContext
from sqlmodel import Session, select

from library_service.models.db import User
from library_service.models.dto import TokenData
from library_service.settings import get_session, get_logger


# Конфигурация JWT из переменных окружения
ALGORITHM = os.getenv("ALGORITHM", "HS256")
PARTIAL_TOKEN_EXPIRE_MINUTES = int(os.getenv("PARTIAL_TOKEN_EXPIRE_MINUTES", "5"))
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "15"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))

# Конфигурация хэширования из переменных окружения
ARGON2_TYPE = os.getenv("ARGON2_TYPE", "id")
ARGON2_TIME_COST = int(os.getenv("ARGON2_TIME_COST", "3"))
ARGON2_MEMORY_COST = int(os.getenv("ARGON2_MEMORY_COST", "131072"))
ARGON2_PARALLELISM = int(os.getenv("ARGON2_PARALLELISM", "2"))
ARGON2_SALT_LENGTH = int(os.getenv("ARGON2_SALT_LENGTH", "16"))
ARGON2_HASH_LENGTH = int(os.getenv("ARGON2_HASH_LENGTH", "48"))

# Конфигурация кодов восстановления
RECOVERY_CODES_COUNT = int(os.getenv("RECOVERY_CODES_COUNT", "10"))
RECOVERY_CODE_SEGMENTS = int(os.getenv("RECOVERY_CODE_SEGMENTS", "4"))
RECOVERY_CODE_SEGMENT_BYTES = int(os.getenv("RECOVERY_CODE_SEGMENT_BYTES", "2"))
RECOVERY_MIN_REMAINING_WARNING = int(os.getenv("RECOVERY_MIN_REMAINING_WARNING", "3"))
RECOVERY_MAX_AGE_DAYS = int(os.getenv("RECOVERY_MAX_AGE_DAYS", "365"))

SECRET_KEY = os.getenv("SECRET_KEY")

# Получение логгера
logger = get_logger()

# OAuth2 схема
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


class KeyDeriver:
    def __init__(self, master_key: bytes):
        self.master_key = master_key

    def derive(
        self,
        context: str,
        key_len: int = 32,
        time_cost: int = 12,
        memory_cost: int = 512 * 1024,
        parallelism: int = 4,
    ) -> bytes:
        """
        Формирование разных ключей из одного.
        context: любая строка, например "aes", "hmac", "totp"
        """
        salt = hashlib.sha256(context.encode("utf-8")).digest()
        key = hash_secret_raw(
            secret=self.master_key,
            salt=salt,
            time_cost=time_cost,
            memory_cost=memory_cost,
            parallelism=parallelism,
            hash_len=key_len,
            type=Type.ID,
        )
        return key


class AES256Cipher:
    def __init__(self, key: bytes):
        if len(key) != 32:
            raise ValueError("AES-256 требует ключ длиной 32 байта")
        self.key = key
        self.aesgcm = AESGCM(key)

    def encrypt(self, plaintext: bytes, nonce_len: int = 12) -> bytes:
        """Зашифровывает данные с помощью AES256-GCM"""
        nonce = os.urandom(nonce_len)
        ct = self.aesgcm.encrypt(nonce, plaintext, associated_data=None)
        return nonce + ct

    def decrypt(self, data: bytes, nonce_len: int = 12) -> bytes:
        """Расшифровывает данные с помощью AES256-GCM"""
        nonce = data[:nonce_len]
        ct = data[nonce_len:]
        return self.aesgcm.decrypt(nonce, ct, associated_data=None)


# Проверка секретного ключа
if not SECRET_KEY:
    raise RuntimeError("SECRET_KEY environment variable is required")

deriver = KeyDeriver(SECRET_KEY.encode())

jwt_key = deriver.derive("jwt", key_len=32)

aes_key = deriver.derive("totp", key_len=32)
cipher = AES256Cipher(aes_key)


# Хэширование паролей
pwd_context = CryptContext(
    schemes=["argon2"],
    deprecated="auto",
    argon2__type=ARGON2_TYPE,
    argon2__time_cost=ARGON2_TIME_COST,
    argon2__memory_cost=ARGON2_MEMORY_COST,
    argon2__parallelism=ARGON2_PARALLELISM,
    argon2__salt_len=ARGON2_SALT_LENGTH,
    argon2__hash_len=ARGON2_HASH_LENGTH,
)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Проверяет пароль по его хешу"""
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Хэширует пароль"""
    return pwd_context.hash(password)


def _create_token(
    data: dict,
    expires_delta: timedelta,
    token_type: str,
    is_partial: bool = False,
) -> str:
    """Базовая функция создания токена"""
    now = datetime.now(timezone.utc)
    to_encode = {
        **data,
        "iat": now,
        "exp": now + expires_delta,
        "type": token_type,
        "partial": is_partial,
    }
    if token_type == "refresh":
        to_encode.update({"jti": str(uuid4())})
    return jwt.encode(to_encode, jwt_key, algorithm=ALGORITHM)


def create_partial_token(data: dict) -> str:
    """Создает partial токен для незавершённой 2FA аутентификации"""
    delta = timedelta(minutes=PARTIAL_TOKEN_EXPIRE_MINUTES)
    return _create_token(data, delta, "partial", is_partial=True)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """Создает JWT access токен"""
    delta = expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    return _create_token(data, delta, "access")


def create_refresh_token(data: dict) -> str:
    """Создает JWT refresh токен"""
    return _create_token(data, timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS), "refresh")


def decode_token(
    token: str,
    expected_type: str = "access",
    allow_partial: bool = False,
) -> TokenData:
    """Декодирует и проверяет JWT токен"""
    token_error = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, jwt_key, algorithms=[ALGORITHM])
        username: str | None = payload.get("sub")
        user_id: int | None = payload.get("user_id")
        token_type: str | None = payload.get("type")
        is_partial: bool = payload.get("partial", False)

        if token_type == "partial":
            if not allow_partial:
                token_error.detail = "2FA verification required"
                raise token_error
        elif token_type != expected_type:
            token_error.detail = f"Invalid token type. Expected {expected_type}"
            raise token_error

        if username is None or user_id is None:
            token_error.detail = "Could not validate credentials"
            raise token_error

        return TokenData(username=username, user_id=user_id, is_partial=is_partial)
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


def get_user_from_partial_token(
    token: Annotated[str, Depends(oauth2_scheme)],
    session: Session = Depends(get_session),
) -> User:
    """Возвращает пользователя из partial токена (для 2FA верификации)"""
    token_data = decode_token(token, expected_type="access", allow_partial=True)

    if not token_data.is_partial:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Full token provided, 2FA not required",
        )

    user = session.get(User, token_data.user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


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
RequirePartialAuth = Annotated[User, Depends(get_user_from_partial_token)]
RequireStaff = Annotated[User, Depends(require_any_role(["admin", "librarian"]))]


def is_user_staff(user: User) -> bool:
    """Проверяет, является ли пользователь сотрудником (admin или librarian)"""
    roles = {role.name for role in user.roles}
    return bool(roles & {"admin", "librarian"})


def is_user_admin(user: User) -> bool:
    """Проверяет, является ли пользователь администратором"""
    roles = {role.name for role in user.roles}
    return "admin" in roles
