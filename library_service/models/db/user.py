"""Модуль DB-моделей пользователей"""

from datetime import datetime, timezone
from typing import TYPE_CHECKING, List

from sqlmodel import Field, Relationship

from library_service.models.dto.user import UserBase
from library_service.models.db.links import UserRoleLink

if TYPE_CHECKING:
    from .role import Role


class User(UserBase, table=True):
    """Модель пользователя в базе данных"""

    __tablename__ = "users"

    id: int | None = Field(
        default=None, primary_key=True, index=True, description="Идентификатор"
    )
    hashed_password: str = Field(nullable=False, description="Argon2id хэш пароля")
    is_2fa_enabled: bool = Field(default=False, description="Включен TOTP 2FA")
    totp_secret: str | None = Field(
        default=None, max_length=80, description="Зашифрованный секрет TOTP"
    )
    recovery_code_hashes: str | None = Field(
        default=None,
        max_length=1500,
        description="Argon2id хэши одноразовыхкодов восстановления",
    )
    recovery_codes_generated_at: datetime | None = Field(
        default=None, description="Дата и время создания кодов восстановления"
    )
    is_active: bool = Field(default=True, description="Не является ли заблокированым")
    is_verified: bool = Field(default=False, description="Является ли верифицированным")
    created_at: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="Дата и время создания",
    )
    updated_at: datetime | None = Field(
        default=None,
        sa_column_kwargs={"onupdate": lambda: datetime.now(timezone.utc)},
        description="Дата и время последнего обновления",
    )

    roles: List["Role"] = Relationship(back_populates="users", link_model=UserRoleLink)
    loans: List["BookUserLink"] = Relationship(  # ty: ignore[unresolved-reference]
        sa_relationship_kwargs={"cascade": "all, delete"}
    )

    @property
    def recovery_codes_list(self) -> list[str]:
        """Список хешей"""
        if not self.recovery_code_hashes:
            return []
        return self.recovery_code_hashes.split(" ")

    @property
    def recovery_codes_total(self) -> int:
        """Общее количество слотов"""
        if not self.recovery_code_hashes:
            return 0
        return len(self.recovery_codes_list)

    @property
    def recovery_codes_remaining(self) -> int:
        """Количество неиспользованных кодов"""
        return sum(1 for h in self.recovery_codes_list if h)

    @property
    def recovery_codes_used(self) -> int:
        """Количество использованных кодов"""
        return self.recovery_codes_total - self.recovery_codes_remaining

    def get_recovery_code_positions(self) -> dict[str, list[int]]:
        """Возвращает позиции использованных и оставшихся кодов"""
        used = []
        remaining = []
        for i, h in enumerate(self.recovery_codes_list, start=1):
            if h:
                remaining.append(i)
            else:
                used.append(i)
        return {"used": used, "remaining": remaining}
