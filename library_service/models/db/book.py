"""Модуль DB-моделей книг"""

from typing import TYPE_CHECKING, List

from pgvector.sqlalchemy import Vector
from sqlalchemy import Column, String
from sqlmodel import Field, Relationship

from library_service.models.dto.book import BookBase
from library_service.models.db.links import AuthorBookLink, GenreBookLink
from library_service.models.enums import BookStatus

if TYPE_CHECKING:
    from .author import Author
    from .genre import Genre


class Book(BookBase, table=True):
    """Модель книги в базе данных"""

    id: int | None = Field(
        default=None, primary_key=True, index=True, description="Идентификатор"
    )
    status: BookStatus = Field(
        default=BookStatus.ACTIVE,
        sa_column=Column(String, nullable=False, default="active"),
        description="Статус",
    )
    embedding: list[float] | None = Field(sa_column=Column(Vector(1024)))
    authors: List["Author"] = Relationship(
        back_populates="books", link_model=AuthorBookLink
    )
    genres: List["Genre"] = Relationship(
        back_populates="books", link_model=GenreBookLink
    )
    loans: List["BookUserLink"] = Relationship(  # ty: ignore[unresolved-reference]
        sa_relationship_kwargs={"cascade": "all, delete"}
    )
