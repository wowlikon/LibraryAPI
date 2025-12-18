"""Модуль связей между сущностями в БД"""
from sqlmodel import SQLModel, Field


class AuthorBookLink(SQLModel, table=True):
    """Модель связи автора и книги"""
    author_id: int | None = Field(
        default=None, foreign_key="author.id", primary_key=True
    )
    book_id: int | None = Field(default=None, foreign_key="book.id", primary_key=True)


class GenreBookLink(SQLModel, table=True):
    """Модель связи жанра и книги"""
    genre_id: int | None = Field(default=None, foreign_key="genre.id", primary_key=True)
    book_id: int | None = Field(default=None, foreign_key="book.id", primary_key=True)


class UserRoleLink(SQLModel, table=True):
    """Модель связи роли и пользователя"""
    __tablename__ = "user_roles"

    user_id: int | None = Field(default=None, foreign_key="users.id", primary_key=True)
    role_id: int | None = Field(default=None, foreign_key="roles.id", primary_key=True)
