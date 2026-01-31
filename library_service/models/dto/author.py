"""Модуль DTO-моделей авторов"""

from typing import List

from pydantic import ConfigDict
from sqlmodel import SQLModel, Field


class AuthorBase(SQLModel):
    """Базовая модель автора"""

    name: str = Field(description="Псевдоним")

    model_config = ConfigDict(
        json_schema_extra={"example": {"name": "John Doe"}}
    )


class AuthorCreate(AuthorBase):
    """Модель автора для создания"""

    pass


class AuthorUpdate(SQLModel):
    """Модель автора для обновления"""

    name: str | None = Field(None, description="Псевдоним")


class AuthorRead(AuthorBase):
    """Модель автора для чтения"""

    id: int = Field(description="Идентификатор")


class AuthorList(SQLModel):
    """Список авторов"""

    authors: List[AuthorRead] = Field(description="Список авторов")
    total: int = Field(description="Количество авторов")
