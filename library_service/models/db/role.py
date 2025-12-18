"""Модуль DB-моделей ролей"""
from typing import TYPE_CHECKING, List

from sqlmodel import Field, Relationship

from library_service.models.dto.role import RoleBase
from library_service.models.db.links import UserRoleLink

if TYPE_CHECKING:
    from .user import User


class Role(RoleBase, table=True):
    """Модель роли в базе данных"""
    __tablename__ = "roles"

    id: int | None = Field(default=None, primary_key=True, index=True)

    # Связи
    users: List["User"] = Relationship(back_populates="roles", link_model=UserRoleLink)
