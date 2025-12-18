"""Модуль DTO-моделей авторов"""
from typing import List

from pydantic import ConfigDict
from sqlmodel import SQLModel


class AuthorBase(SQLModel):
    """Базовая модель автора"""
    name: str

    model_config = ConfigDict(  # pyright: ignore
        json_schema_extra={"example": {"name": "author_name"}}
    )


class AuthorCreate(AuthorBase):
    """Модель автора для создания"""
    pass


class AuthorUpdate(SQLModel):
    """Модель автора для обновления"""
    name: str | None = None


class AuthorRead(AuthorBase):
    """Модель автора для чтения"""
    id: int


class AuthorList(SQLModel):
    """Список авторов"""
    authors: List[AuthorRead]
    total: int
