"""Модуль DTO-моделей"""
from .author import AuthorBase, AuthorCreate, AuthorList, AuthorRead, AuthorUpdate
from .genre import GenreBase, GenreCreate, GenreList, GenreRead, GenreUpdate
from .book import BookBase, BookCreate, BookList, BookRead, BookUpdate
from .role import RoleBase, RoleCreate, RoleList, RoleRead, RoleUpdate
from .user import UserBase, UserCreate, UserList, UserRead, UserUpdate, UserLogin
from .loan import LoanBase, LoanCreate, LoanList, LoanRead, LoanUpdate
from .token import Token, TokenData
from .combined import (AuthorWithBooks, GenreWithBooks, BookWithAuthors, BookWithGenres,
    BookWithAuthorsAndGenres, BookFilteredList, BookStatusUpdate, LoanWithBook)

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
    "BookStatusUpdate",
    "GenreBase",
    "GenreCreate",
    "GenreUpdate",
    "GenreRead",
    "GenreList",
    "LoanBase",
    "LoanCreate",
    "LoanUpdate",
    "LoanRead",
    "LoanList",
    "LoanWithBook",
    "UserBase",
    "UserCreate",
    "UserUpdate",
    "UserRead",
    "UserList",
    "UserLogin",
    "RoleBase",
    "RoleCreate",
    "RoleUpdate",
    "RoleRead",
    "RoleList",
    "Token",
    "TokenData",
]
