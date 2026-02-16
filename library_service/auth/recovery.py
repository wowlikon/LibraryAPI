"""Модуль резервных кодов восстановления пароля"""

import secrets
from datetime import datetime, timezone, timedelta

import argon2
from sqlmodel import Session

from .core import (
    ARGON2_TIME_COST,
    ARGON2_MEMORY_COST,
    ARGON2_PARALLELISM,
    ARGON2_SALT_LENGTH,
    ARGON2_HASH_LENGTH,
    RECOVERY_CODES_COUNT,
    RECOVERY_CODE_SEGMENTS,
    RECOVERY_CODE_SEGMENT_BYTES,
    RECOVERY_MIN_REMAINING_WARNING,
    RECOVERY_MAX_AGE_DAYS,
)
from library_service.settings import get_logger

# Получение логгера
logger = get_logger()


# Argon2 для кодов
_recovery_hasher = argon2.PasswordHasher(
    type=argon2.Type.ID,
    time_cost=ARGON2_TIME_COST,
    hash_len=ARGON2_HASH_LENGTH,
    salt_len=ARGON2_SALT_LENGTH,
    memory_cost=ARGON2_MEMORY_COST,
    parallelism=ARGON2_PARALLELISM,
)


def generate_code() -> str:
    """Генерация кода в формате xxxx-xxxx-xxxx-xxxx"""
    segments = [
        secrets.token_hex(RECOVERY_CODE_SEGMENT_BYTES)
        for _ in range(RECOVERY_CODE_SEGMENTS)
    ]
    return "-".join(segments)


def normalize_code(code: str) -> str:
    """Нормализация: убираем дефисы, lowercase"""
    return code.replace("-", "").lower().strip()


def hash_code(code: str) -> str:
    """Хеширование кода"""
    return _recovery_hasher.hash(normalize_code(code))


def verify_code(plain_code: str, hashed: str) -> bool:
    """Проверка кода"""
    if not hashed:
        return False
    try:
        _recovery_hasher.verify(hashed, normalize_code(plain_code))
        return True
    except argon2.exceptions.VerifyMismatchError:
        return False
    except argon2.exceptions.InvalidHashError:
        logger.warning("Invalid recovery code hash format")
        return False


def generate_codes_for_user(session: Session, user) -> list[str]:
    """Генерация новых резервных кодов для пользователя."""
    plain_codes: list[str] = []
    hashed_codes: list[str] = []

    for _ in range(RECOVERY_CODES_COUNT):
        code = generate_code()
        plain_codes.append(code)
        hashed_codes.append(hash_code(code))

    user.recovery_code_hashes = " ".join(hashed_codes)
    user.recovery_codes_generated_at = datetime.now(timezone.utc)

    session.add(user)
    session.commit()
    session.refresh(user)

    logger.info(f"Generated {RECOVERY_CODES_COUNT} recovery codes for user {user.id}")

    return plain_codes


def verify_and_use_code(session: Session, user, code: str) -> bool:
    """Проверка и использование кода. При успехе хеш заменяется на пустую строку"""
    if not user.recovery_code_hashes:
        return False

    hashes = user.recovery_code_hashes.split(" ")

    for i, stored_hash in enumerate(hashes):
        if stored_hash and verify_code(code, stored_hash):
            hashes[i] = ""
            user.recovery_code_hashes = " ".join(hashes)

            session.add(user)
            session.commit()

            logger.info(
                f"Recovery code #{i + 1} used for user {user.id}, "
                f"remaining: {sum(1 for h in hashes if h)}"
            )
            return True

    logger.warning(f"Invalid recovery code attempt for user {user.id}")
    return False


def get_codes_status(user) -> dict:
    """Статус резервных кодов"""
    if not user.recovery_code_hashes:
        return {
            "total": 0,
            "remaining": 0,
            "used_codes": [],
            "generated_at": None,
            "should_regenerate": True,
        }

    hashes = user.recovery_code_hashes.split(" ")
    used_codes = [h == "" for h in hashes]
    remaining = sum(1 for h in hashes if h)
    total = len(hashes)
    generated_at = user.recovery_codes_generated_at

    should_regenerate = remaining <= RECOVERY_MIN_REMAINING_WARNING

    if generated_at:
        generated_at = generated_at.replace(tzinfo=timezone.utc)
        age = datetime.now(timezone.utc) - generated_at
        if age > timedelta(days=RECOVERY_MAX_AGE_DAYS):
            should_regenerate = True

    return {
        "total": total,
        "remaining": remaining,
        "used_codes": used_codes,
        "generated_at": generated_at,
        "should_regenerate": should_regenerate,
    }
