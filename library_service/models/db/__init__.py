"""Модуль моделей для базы данных"""
from .author import Author
from .book import Book
from .genre import Genre
from .role import Role
from .user import User
from .links import (
    AuthorBookLink,
    GenreBookLink,
    BookUserLink,
    UserRoleLink
)

__all__ = [
    "Author",
    "Book",
    "Genre",
    "Role",
    "User",
    "AuthorBookLink",
    "GenreBookLink",
    "BookUserLink",
    "UserRoleLink",
]
