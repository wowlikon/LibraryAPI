"""Модуль объединёных объектов"""

from datetime import datetime
from typing import List

from sqlmodel import SQLModel, Field

from .author import AuthorRead
from .genre import GenreRead
from .book import BookRead
from .loan import LoanRead
from ..enums import BookStatus

from .user import UserRead
from .recovery import RecoveryCodesResponse, RecoveryCodesStatus


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


class LoginResponse(SQLModel):
    """Модель для авторизации пользователя"""

    access_token: str | None = None
    partial_token: str | None = None
    refresh_token: str | None = None
    token_type: str = "bearer"
    requires_2fa: bool = False


class RegisterResponse(SQLModel):
    """Модель для регистрации пользователя"""

    user: UserRead
    recovery_codes: RecoveryCodesResponse


class PasswordResetResponse(SQLModel):
    """Модель для сброса пароля"""

    total: int
    remaining: int
    used_codes: list[bool]
    generated_at: datetime | None
    should_regenerate: bool


class TOTPSetupResponse(SQLModel):
    """Модель для генерации данных для настройки TOTP"""

    secret: str
    username: str
    issuer: str
    size: int
    padding: int
    bitmap_b64: str


class TOTPVerifyRequest(SQLModel):
    """Модель для проверки TOTP кода"""

    code: str = Field(min_length=6, max_length=6, regex=r"^\d{6}$")


class TOTPDisableRequest(SQLModel):
    """Модель для отключения TOTP 2FA"""

    password: str
