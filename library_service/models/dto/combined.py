"""Модуль объединёных объектов"""
from typing import List
from sqlmodel import SQLModel, Field

from .author import AuthorRead
from .genre import GenreRead
from .book import BookRead
from .loan import LoanRead
from ..enums import BookStatus

class AuthorWithBooks(SQLModel):
    """Модель автора с книгами"""
    id: int
    name: str
    books: List[BookRead] = Field(default_factory=list)


class GenreWithBooks(SQLModel):
    """Модель жанра с книгами"""
    id: int
    name: str
    books: List[BookRead] = Field(default_factory=list)


class BookWithAuthors(SQLModel):
    """Модель книги с авторами"""
    id: int
    title: str
    description: str
    authors: List[AuthorRead] = Field(default_factory=list)


class BookWithGenres(SQLModel):
    """Модель книги с жанрами"""
    id: int
    title: str
    description: str
    status: BookStatus | None = None
    genres: List[GenreRead] = Field(default_factory=list)


class BookWithAuthorsAndGenres(SQLModel):
    """Модель с авторами и жанрами"""
    id: int
    title: str
    description: str
    status: BookStatus | None = None
    authors: List[AuthorRead] = Field(default_factory=list)
    genres: List[GenreRead] = Field(default_factory=list)


class BookFilteredList(SQLModel):
    """Список книг с фильтрацией"""
    books: List[BookWithAuthorsAndGenres]
    total: int

class LoanWithBook(LoanRead):
    """Модель выдачи, включающая данные о книге"""
    book: BookRead

class BookStatusUpdate(SQLModel):
    """Модель для ручного изменения статуса библиотекарем"""
    status: str
