"""Модуль DTO-моделей книг"""

from typing import List

from pydantic import ConfigDict
from sqlmodel import SQLModel, Field

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

    title: str | None = Field(None, description="Название")
    description: str | None = Field(None, description="Описание")
    page_count: int | None = Field(None, description="Количество страниц")
    status: BookStatus | None = Field(None, description="Статус")


class BookRead(BookBase):
    """Модель книги для чтения"""

    id: int = Field(description="Идентификатор")
    status: BookStatus = Field(description="Статус")


class BookList(SQLModel):
    """Список книг"""

    books: List[BookRead] = Field(description="Список книг")
    total: int = Field(description="Количество книг")
