from sqlmodel import SQLModel, Field
from typing import List

from library_service.models.dto.author import AuthorRead
from library_service.models.dto.book import BookRead
from library_service.models.dto.genre import GenreRead


class AuthorBookLink(SQLModel, table=True):
    author_id: int | None = Field(
        default=None, foreign_key="author.id", primary_key=True
    )
    book_id: int | None = Field(default=None, foreign_key="book.id", primary_key=True)


class GenreBookLink(SQLModel, table=True):
    genre_id: int | None = Field(default=None, foreign_key="genre.id", primary_key=True)
    book_id: int | None = Field(default=None, foreign_key="book.id", primary_key=True)


class AuthorWithBooks(AuthorRead):
    books: List[BookRead] = Field(default_factory=list)


class BookWithAuthors(BookRead):
    authors: List[AuthorRead] = Field(default_factory=list)


class BookWithGenres(BookRead):
    genres: List[GenreRead] = Field(default_factory=list)


class GenreWithBooks(GenreRead):
    books: List[BookRead] = Field(default_factory=list)


class BookWithAuthorsAndGenres(BookRead):
    authors: List[AuthorRead] = Field(default_factory=list)
    genres: List[GenreRead] = Field(default_factory=list)
