"""Модуль DTO-модели токена"""

from sqlmodel import SQLModel, Field


class TokenData(SQLModel):
    """Модель содержимого токена"""

    username: str | None = Field(None, description="Имя пользователя")
    user_id: int | None = Field(None, description="Идентификатор пользователя")
    is_partial: bool = Field(False, description="Является ли токен частичным")
