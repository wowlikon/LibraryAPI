"""Модуль DTO-моделей пользователей"""

import re
from typing import List

from pydantic import ConfigDict, EmailStr, field_validator
from sqlmodel import Field, SQLModel


class UserBase(SQLModel):
    """Базовая модель пользователя"""

    username: str = Field(min_length=3, max_length=50, index=True, unique=True)
    email: EmailStr = Field(index=True, unique=True)
    full_name: str | None = Field(default=None, max_length=100)

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "username": "johndoe",
                "email": "john@example.com",
                "full_name": "John Doe",
            }
        }
    )


class UserCreate(UserBase):
    """Модель пользователя для создания"""

    password: str = Field(min_length=8, max_length=100)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        """Валидация пароля"""
        if not re.search(r"[A-Z]", v):
            raise ValueError("Пароль должен содержать символы в верхнем регистре")
        if not re.search(r"[a-z]", v):
            raise ValueError("Пароль должен содержать символы в нижнем регистре")
        if not re.search(r"\d", v):
            raise ValueError("пароль должен содержать цифры")
        return v


class UserLogin(SQLModel):
    """Модель аутентификации для пользователя"""

    username: str
    password: str


class UserRead(UserBase):
    """Модель пользователя для чтения"""

    id: int
    is_active: bool
    is_verified: bool
    is_2fa_enabled: bool
    roles: List[str] = []


class UserUpdate(SQLModel):
    """Модель пользователя для обновления"""

    email: EmailStr | None = None
    full_name: str | None = None
    password: str | None = None


class UserList(SQLModel):
    """Список пользователей"""

    users: List[UserRead]
    total: int
