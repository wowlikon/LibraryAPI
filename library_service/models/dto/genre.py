"""Модуль DTO-моделей жанров"""

from typing import List

from pydantic import ConfigDict
from sqlmodel import SQLModel, Field


class GenreBase(SQLModel):
    """Базовая модель жанра"""

    name: str = Field(description="Название")

    model_config = ConfigDict(  # pyright: ignore
        json_schema_extra={"example": {"name": "genre_name"}}
    )


class GenreCreate(GenreBase):
    """Модель жанра для создания"""

    pass


class GenreUpdate(SQLModel):
    """Модель жанра для обновления"""

    name: str | None = Field(None, description="Название")


class GenreRead(GenreBase):
    """Модель жанра для чтения"""

    id: int = Field(description="Идентификатор")


class GenreList(SQLModel):
    """Списко жанров"""

    genres: List[GenreRead] = Field(description="Список жанров")
    total: int = Field(description="Количество жанров")
