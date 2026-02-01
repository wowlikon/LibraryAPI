"""Модуль разных моделей"""

from datetime import datetime
from typing import List

from sqlmodel import SQLModel, Field

from .author import AuthorRead
from .genre import GenreRead
from .book import BookRead
from .loan import LoanRead
from ..enums import BookStatus

from .user import UserCreate, UserRead, UserUpdate
from .recovery import RecoveryCodesResponse


class AuthorWithBooks(SQLModel):
    """Модель автора с книгами"""

    id: int = Field(description="Идентификатор")
    name: str = Field(description="Псевдоним")
    books: List[BookRead] = Field(default_factory=list, description="Список книг")


class GenreWithBooks(SQLModel):
    """Модель жанра с книгами"""

    id: int = Field(description="Идентификатор")
    name: str = Field(description="Название")
    books: List[BookRead] = Field(default_factory=list, description="Список книг")


class BookWithAuthors(SQLModel):
    """Модель книги с авторами"""

    id: int = Field(description="Идентификатор")
    title: str = Field(description="Название")
    description: str = Field(description="Описание")
    page_count: int = Field(description="Количество страниц")
    status: BookStatus | None = Field(None, description="Статус")
    preview_urls: dict[str, str] = Field(default_factory=dict, description="URL изображений")
    authors: List[AuthorRead] = Field(
        default_factory=list, description="Список авторов"
    )


class BookWithGenres(SQLModel):
    """Модель книги с жанрами"""

    id: int = Field(description="Идентификатор")
    title: str = Field(description="Название")
    description: str = Field(description="Описание")
    page_count: int = Field(description="Количество страниц")
    status: BookStatus | None = Field(None, description="Статус")
    preview_urls: dict[str, str] | None = Field(default=None, description="URL изображений")
    genres: List[GenreRead] = Field(default_factory=list, description="Список жанров")


class BookWithAuthorsAndGenres(SQLModel):
    """Модель с авторами и жанрами"""

    id: int = Field(description="Идентификатор")
    title: str = Field(description="Название")
    description: str = Field(description="Описание")
    page_count: int = Field(description="Количество страниц")
    status: BookStatus | None = Field(None, description="Статус")
    preview_urls: dict[str, str] | None = Field(default=None, description="URL изображений")
    authors: List[AuthorRead] = Field(
        default_factory=list, description="Список авторов"
    )
    genres: List[GenreRead] = Field(default_factory=list, description="Список жанров")


class BookFilteredList(SQLModel):
    """Список книг с фильтрацией"""

    books: List[BookWithAuthorsAndGenres] = Field(
        description="Список отфильтрованных книг"
    )
    total: int = Field(description="Количество книг")


class LoanWithBook(LoanRead):
    """Модель выдачи, включающая данные о книге"""

    book: BookRead = Field(description="Книга")


class BookStatusUpdate(SQLModel):
    """Модель для ручного изменения статуса библиотекарем"""

    status: str = Field(description="Статус книги")


class UserCreateByAdmin(UserCreate):
    """Создание пользователя администратором"""

    is_active: bool = Field(True, description="Не является ли заблокированным")
    roles: list[str] | None = Field(None, description="Роли")


class UserUpdateByAdmin(UserUpdate):
    """Обновление пользователя администратором"""

    is_active: bool = Field(True, description="Не является ли заблокированным")
    roles: list[str] | None = Field(None, description="Роли")


class LoginResponse(SQLModel):
    """Модель для авторизации пользователя"""

    access_token: str | None = Field(None, description="Токен доступа")
    partial_token: str | None = Field(None, description="Частичный токен")
    refresh_token: str | None = Field(None, description="Токен обновления")
    token_type: str = Field("bearer", description="Тип токена")
    requires_2fa: bool = Field(False, description="Требуется ли TOTP=код")


class RegisterResponse(SQLModel):
    """Модель для регистрации пользователя"""

    user: UserRead = Field(description="Пользователь")
    recovery_codes: RecoveryCodesResponse = Field(description="Коды восстановления")


class PasswordResetResponse(SQLModel):
    """Модель для сброса пароля"""

    total: int = Field(description="Общее количество кодов")
    remaining: int = Field(description="Количество оставшихся кодов")
    used_codes: list[bool] = Field(description="Количество использованых кодов")
    generated_at: datetime | None = Field(description="Дата и время генерации")
    should_regenerate: bool = Field(description="Нужно ли пересоздать коды")


class TOTPSetupResponse(SQLModel):
    """Модель для генерации данных для настройки TOTP"""

    secret: str = Field(description="Секрет TOTP")
    username: str = Field(description="Имя пользователя")
    issuer: str = Field(description="Запрашивающий сервис")
    size: int = Field(description="Размер кода")
    padding: int = Field(description="Отступ")
    bitmap_b64: str = Field(description="QR-код")


class TOTPVerifyRequest(SQLModel):
    """Модель для проверки TOTP кода"""

    code: str = Field(
        min_length=6,
        max_length=6,
        regex=r"^\d{6}$",
        description="Шестизначный TOTP-код",
    )


class TOTPDisableRequest(SQLModel):
    """Модель для отключения TOTP 2FA"""

    password: str = Field(description="Пароль")
