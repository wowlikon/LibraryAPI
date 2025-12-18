"""Модуль DB-моделей книг"""
from typing import TYPE_CHECKING, List

from sqlmodel import Field, Relationship

from library_service.models.dto.book import BookBase
from library_service.models.db.links import AuthorBookLink, GenreBookLink

if TYPE_CHECKING:
    from .author import Author
    from .genre import Genre


class Book(BookBase, table=True):
    """Модель книги в базе данных"""
    id: int | None = Field(default=None, primary_key=True, index=True)
    authors: List["Author"] = Relationship(
        back_populates="books", link_model=AuthorBookLink
    )
    genres: List["Genre"] = Relationship(
        back_populates="books", link_model=GenreBookLink
    )
