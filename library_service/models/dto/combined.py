"""Модуль объединёных объектов"""
from typing import List
from sqlmodel import SQLModel, Field

from .author import AuthorRead
from .genre import GenreRead
from .book import BookRead


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
    genres: List[GenreRead] = Field(default_factory=list)


class BookWithAuthorsAndGenres(SQLModel):
    """Модель с авторами и жанрами"""
    id: int
    title: str
    description: str
    authors: List[AuthorRead] = Field(default_factory=list)
    genres: List[GenreRead] = Field(default_factory=list)


class BookFilteredList(SQLModel):
    """Список книг с фильтрацией"""
    books: List[BookWithAuthorsAndGenres]
    total: int
