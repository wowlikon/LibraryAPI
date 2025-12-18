"""Модуль DTO-моделей ролей"""
from typing import List

from sqlmodel import SQLModel


class RoleBase(SQLModel):
    """Базовая модель роли"""
    name: str
    description: str | None = None


class RoleCreate(RoleBase):
    """Модель роли для создания"""
    pass


class RoleUpdate(SQLModel):
    """Модель роли для обновления"""
    name: str | None = None


class RoleRead(RoleBase):
    """Модель роли для чтения"""
    id: int


class RoleList(SQLModel):
    """Список ролей"""
    roles: List[RoleRead]
    total: int
