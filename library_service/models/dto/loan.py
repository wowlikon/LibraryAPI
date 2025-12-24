"""Модуль DTO-моделей для выдачи книг"""
from typing import List

from datetime import datetime
from sqlmodel import SQLModel


class LoanBase(SQLModel):
    """Базовая модель выдачи"""
    book_id: int
    user_id: int
    due_date: datetime


class LoanCreate(LoanBase):
    """Модель для создания записи о выдаче"""
    pass


class LoanUpdate(SQLModel):
    """Модель для обновления записи о выдаче"""
    user_id: int | None = None
    due_date: datetime | None = None
    returned_at: datetime | None = None


class LoanRead(LoanBase):
    """Модель чтения записи о выдаче"""
    id: int
    borrowed_at: datetime
    returned_at: datetime | None = None


class LoanList(SQLModel):
    """Список выдач"""
    loans: List[LoanRead]
    total: int
