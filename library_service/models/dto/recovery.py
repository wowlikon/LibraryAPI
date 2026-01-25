"""Модуль DTO-моделей для резервных кодов восстановления"""

from datetime import datetime
import re

from pydantic import field_validator
from sqlmodel import SQLModel, Field


class RecoveryCodesResponse(SQLModel):
    """Ответ при генерации резервных кодов"""

    codes: list[str] = Field(description="Список кодов восстановления")
    generated_at: datetime = Field(description="Дата и время генерации")


class RecoveryCodesStatus(SQLModel):
    """Статус резервных кодов пользователя"""

    total: int = Field(description="Общее количество кодов")
    remaining: int = Field(description="Количество оставшихся кодов")
    used_codes: list[bool] = Field(description="Количество использованых кодов")
    generated_at: datetime | None = Field(description="Дата и время генерации")
    should_regenerate: bool = Field(description="Нужно ли пересоздать коды")


class RecoveryCodeUse(SQLModel):
    """Запрос на сброс пароля через резервный код"""

    username: str = Field(description="Имя пользователя")
    recovery_code: str = Field(
        min_length=19, max_length=19, description="Код восстановления"
    )
    new_password: str = Field(min_length=8, max_length=100, description="Новый пароль")

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
