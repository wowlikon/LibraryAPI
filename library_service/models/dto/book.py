"""Модуль DTO-моделей книг"""
from typing import List, TYPE_CHECKING

from pydantic import ConfigDict
from sqlmodel import SQLModel

if TYPE_CHECKING:
    from .combined import BookWithAuthorsAndGenres


class BookBase(SQLModel):
    """Базовая модель книги"""
    title: str
    description: str

    model_config = ConfigDict(  # pyright: ignore
        json_schema_extra={
            "example": {"title": "book_title", "description": "book_description"}
        }
    )


class BookCreate(BookBase):
    """Модель книги для создания"""
    pass


class BookUpdate(SQLModel):
    """Модель книги для обновления"""
    title: str | None = None
    description: str | None = None


class BookRead(BookBase):
    """Модель книги для чтения"""
    id: int


class BookList(SQLModel):
    """Список книг"""
    books: List[BookRead]
    total: int
