"""Модуль DTO-моделей токенов"""

from sqlmodel import SQLModel, Field


class Token(SQLModel):
    """Модель токена"""

    access_token: str = Field(description="Токен доступа")
    token_type: str = Field("bearer", description="Тип токена")
    refresh_token: str | None = Field(None, description="Токен обновления")


class PartialToken(SQLModel):
    """Частичный токен — для подтверждения 2FA"""

    partial_token: str = Field(description="Частичный токен")
    token_type: str = Field("partial", description="Тип токена")
    requires_2fa: bool = Field(True, description="Требуется TOTP-код")


class TokenData(SQLModel):
    """Модель содержимого токена"""

    username: str | None = Field(None, description="Имя пользователя")
    user_id: int | None = Field(None, description="Идентификатор пользователя")
    is_partial: bool = Field(False, description="Является ли токен частичным")
