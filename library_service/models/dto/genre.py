"""Модуль DTO-моделей жанров"""
from typing import List

from pydantic import ConfigDict
from sqlmodel import SQLModel


class GenreBase(SQLModel):
    """Базовая модель жанра"""
    name: str

    model_config = ConfigDict(  # pyright: ignore
        json_schema_extra={"example": {"name": "genre_name"}}
    )


class GenreCreate(GenreBase):
    """Модель жанра для создания"""
    pass


class GenreUpdate(SQLModel):
    """Модель жанра для обновления"""
    name: str | None = None


class GenreRead(GenreBase):
    """Модель жанра для чтения"""
    id: int


class GenreList(SQLModel):
    """Списко жанров"""
    genres: List[GenreRead]
    total: int
