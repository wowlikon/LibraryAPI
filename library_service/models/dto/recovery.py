"""Модуль DTO-моделей для резервных кодов восстановления"""

from datetime import datetime
import re

from pydantic import field_validator
from sqlmodel import SQLModel, Field


class RecoveryCodesResponse(SQLModel):
    """Ответ при генерации резервных кодов"""

    codes: list[str]
    generated_at: datetime


class RecoveryCodesStatus(SQLModel):
    """Статус резервных кодов пользователя"""

    total: int
    remaining: int
    used_codes: list[bool]
    generated_at: datetime | None
    should_regenerate: bool


class RecoveryCodeUse(SQLModel):
    """Запрос на сброс пароля через резервный код"""

    username: str
    recovery_code: str = Field(min_length=19, max_length=19)
    new_password: str = Field(min_length=8, max_length=100)

    @field_validator("recovery_code")
    @classmethod
    def validate_recovery_code(cls, v: str) -> str:
        if not re.match(
            r"^[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}$", v
        ):
            raise ValueError("Invalid recovery code format")
        return v.lower()

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not re.search(r"[A-Z]", v):
            raise ValueError("Password must contain uppercase")
        if not re.search(r"[a-z]", v):
            raise ValueError("Password must contain lowercase")
        if not re.search(r"\d", v):
            raise ValueError("Password must contain digit")
        return v
