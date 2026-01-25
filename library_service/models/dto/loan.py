"""Модуль DTO-моделей для выдачи книг"""

from typing import List

from datetime import datetime
from sqlmodel import SQLModel, Field


class LoanBase(SQLModel):
    """Базовая модель выдачи"""

    book_id: int = Field(description="Идентификатор книги")
    user_id: int = Field(description="Идентификатор пользователя")
    due_date: datetime = Field(description="Дата и время планируемого возврата")


class LoanCreate(LoanBase):
    """Модель для создания записи о выдаче"""

    pass


class LoanUpdate(SQLModel):
    """Модель для обновления записи о выдаче"""

    user_id: int | None = Field(None, description="Идентификатор пользователя")
    due_date: datetime | None = Field(
        None, description="дата и время планируемого возврата"
    )
    returned_at: datetime | None = Field(
        None, description="Дата и время фактического возврата"
    )


class LoanRead(LoanBase):
    """Модель чтения записи о выдаче"""

    id: int = Field(description="Идентификатор")
    borrowed_at: datetime = Field(description="Дата и время выдачи")
    returned_at: datetime | None = Field(
        None, description="Дата и время фактического возврата"
    )


class LoanList(SQLModel):
    """Список выдач"""

    loans: List[LoanRead] = Field(description="Список выдач")
    total: int = Field(description="Количество выдач")
