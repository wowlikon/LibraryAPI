"""Модуль DTO-моделей книг"""

from typing import List

from pydantic import ConfigDict
from sqlmodel import Field, SQLModel

from library_service.models.enums import BookStatus


class BookBase(SQLModel):
    """Базовая модель книги"""

    title: str = Field(description="Название")
    description: str = Field(description="Описание")
    page_count: int = Field(gt=0, description="Количество страниц")

    model_config = ConfigDict(  # pyright: ignore
        json_schema_extra={
            "example": {
                "title": "book_title",
                "description": "book_description",
                "page_count": 1,
            }
        }
    )


class BookCreate(BookBase):
    """Модель книги для создания"""

    pass


class BookUpdate(SQLModel):
    """Модель книги для обновления"""

    title: str | None = Field(
        None, description="Название", schema_extra={"examples": [None]}
    )
    description: str | None = Field(
        None, description="Описание", schema_extra={"examples": [None]}
    )
    page_count: int | None = Field(
        None, description="Количество страниц", schema_extra={"examples": [None]}
    )
    status: BookStatus | None = Field(
        None, description="Статус", schema_extra={"examples": [None]}
    )


class BookRead(BookBase):
    """Модель книги для чтения"""

    id: int = Field(description="Идентификатор")
    status: BookStatus = Field(description="Статус")
    preview_urls: dict[str, str] = Field(
        default_factory=dict,
        description="URL обложек в разных форматах",
        schema_extra={
            "example": {
                "png": "/static/books/00000000-0000-4000-8000-000000000000.png",
                "jpeg": "/static/books/00000000-0000-4000-8000-000000000000.jpg",
                "webp": "/static/books/00000000-0000-4000-8000-000000000000.webp",
            }
        },
    )


class BookList(SQLModel):
    """Список книг"""

    books: List[BookRead] = Field(description="Список книг")
    total: int = Field(description="Количество книг")
