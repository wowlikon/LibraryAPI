"""Модуль DB-моделей авторов"""
from typing import TYPE_CHECKING, List

from sqlmodel import Field, Relationship

from library_service.models.dto.author import AuthorBase
from library_service.models.db.links import AuthorBookLink

if TYPE_CHECKING:
    from .book import Book


class Author(AuthorBase, table=True):
    """Модель автора в базе данных"""
    id: int | None = Field(default=None, primary_key=True, index=True)
    books: List["Book"] = Relationship(
        back_populates="authors", link_model=AuthorBookLink
    )
