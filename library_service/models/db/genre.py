"""Модуль DB-моделей жанров"""
from typing import TYPE_CHECKING, List

from sqlmodel import Field, Relationship

from library_service.models.dto.genre import GenreBase
from library_service.models.db.links import GenreBookLink

if TYPE_CHECKING:
    from .book import Book


class Genre(GenreBase, table=True):
    """Модель жанра в базе данных"""
    id: int | None = Field(default=None, primary_key=True, index=True)
    books: List["Book"] = Relationship(
        back_populates="genres", link_model=GenreBookLink
    )
