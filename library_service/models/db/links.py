"""Модуль связей между сущностями в БД"""

from datetime import datetime, timezone
from sqlmodel import SQLModel, Field


class AuthorBookLink(SQLModel, table=True):
    """Модель связи автора и книги"""

    author_id: int | None = Field(
        default=None, foreign_key="author.id", primary_key=True
    )
    book_id: int | None = Field(
        default=None,
        foreign_key="book.id",
        primary_key=True,
        description="Идентификатор книги",
    )


class GenreBookLink(SQLModel, table=True):
    """Модель связи жанра и книги"""

    genre_id: int | None = Field(
        default=None,
        foreign_key="genre.id",
        primary_key=True,
        description="Идентификатор жанра",
    )
    book_id: int | None = Field(
        default=None,
        foreign_key="book.id",
        primary_key=True,
        description="Идентификатор книги",
    )


class UserRoleLink(SQLModel, table=True):
    """Модель связи роли и пользователя"""

    __tablename__ = "user_roles"

    user_id: int | None = Field(
        default=None,
        foreign_key="users.id",
        primary_key=True,
        description="Идентификатор пользователя",
    )
    role_id: int | None = Field(
        default=None,
        foreign_key="roles.id",
        primary_key=True,
        description="Идентификатор роли",
    )


class BookUserLink(SQLModel, table=True):
    """
    Модель истории выдачи книг (Loan).
    Связывает книгу и пользователя с фиксацией времени.
    """

    __tablename__ = "loans"

    id: int | None = Field(
        default=None, primary_key=True, index=True, description="Идентификатор"
    )

    book_id: int = Field(foreign_key="book.id", description="Идентификатор")
    user_id: int = Field(
        foreign_key="users.id", description="Идентификатор пользователя"
    )

    borrowed_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Дата и время выдачи",
    )
    due_date: datetime = Field(description="Дата и время запланированного возврата")
    returned_at: datetime | None = Field(
        default=None, description="Дата и время фактического возврата"
    )
