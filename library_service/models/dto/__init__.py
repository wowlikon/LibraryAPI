"""Модуль DTO-моделей"""
from .author import AuthorBase, AuthorCreate, AuthorList, AuthorRead, AuthorUpdate
from .genre import GenreBase, GenreCreate, GenreList, GenreRead, GenreUpdate
from .book import BookBase, BookCreate, BookList, BookRead, BookUpdate
from .role import RoleBase, RoleCreate, RoleList, RoleRead, RoleUpdate
from .user import UserBase, UserCreate, UserList, UserRead, UserUpdate, UserLogin
from .token import Token, TokenData
from .combined import (AuthorWithBooks, GenreWithBooks, BookWithAuthors, BookWithGenres,
    BookWithAuthorsAndGenres, BookFilteredList)

__all__ = [
    "AuthorBase",
    "AuthorCreate",
    "AuthorUpdate",
    "AuthorRead",
    "AuthorList",
    "BookBase",
    "BookCreate",
    "BookUpdate",
    "BookRead",
    "BookList",
    "BookFilteredList",
    "GenreBase",
    "GenreCreate",
    "GenreUpdate",
    "GenreRead",
    "GenreList",
    "RoleBase",
    "RoleCreate",
    "RoleUpdate",
    "RoleRead",
    "RoleList",
    "Token",
    "TokenData",
    "UserBase",
    "UserCreate",
    "UserRead",
    "UserUpdate",
    "UserList",
    "UserLogin",
]
