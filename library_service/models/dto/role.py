"""Модуль DTO-моделей ролей"""

from typing import List

from sqlmodel import SQLModel, Field


class RoleBase(SQLModel):
    """Базовая модель роли"""

    name: str = Field(description="Название")
    description: str | None = Field(None, description="Описание")
    payroll: int = Field(0, description="Оплата")


class RoleCreate(RoleBase):
    """Модель роли для создания"""

    pass


class RoleUpdate(SQLModel):
    """Модель роли для обновления"""

    name: str | None = Field(None, description="Название")


class RoleRead(RoleBase):
    """Модель роли для чтения"""

    id: int = Field(description="Идентификатор")


class RoleList(SQLModel):
    """Список ролей"""

    roles: List[RoleRead] = Field(description="Список ролей")
    total: int = Field(description="Количество ролей")
