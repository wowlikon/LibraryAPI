"""Модуль DB-моделей пользователей"""
from datetime import datetime
from typing import TYPE_CHECKING, List

from sqlmodel import Field, Relationship

from library_service.models.dto.user import UserBase
from library_service.models.db.links import UserRoleLink

if TYPE_CHECKING:
    from .role import Role


class User(UserBase, table=True):
    """Модель пользователя в базе данных"""
    __tablename__ = "users"

    id: int | None = Field(default=None, primary_key=True, index=True)
    hashed_password: str = Field(nullable=False)
    is_active: bool = Field(default=True)
    is_verified: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime | None = Field(
        default=None, sa_column_kwargs={"onupdate": datetime.utcnow}
    )

    # Связи
    roles: List["Role"] = Relationship(back_populates="users", link_model=UserRoleLink)
