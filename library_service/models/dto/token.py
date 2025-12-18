"""Модуль DTO-моделей токенов"""
from sqlmodel import SQLModel


class Token(SQLModel):
    """Модель токена"""
    access_token: str
    token_type: str = "bearer"
    refresh_token: str | None = None


class TokenData(SQLModel):
    """Модель содержимого токена"""
    username: str | None = None
    user_id: int | None = None
