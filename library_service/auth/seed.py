"""Модуль создания начальных ролей и администратора"""

import os

from sqlmodel import Session, select
from library_service.models.db import Role, User

from .core import get_password_hash
from library_service.settings import get_logger

#  Получение логгера
logger = get_logger()


def seed_roles(session: Session) -> dict[str, Role]:
    """Создает роли по умолчанию, если их нет"""
    default_roles = [
        {"name": "admin", "description": "Администратор системы", "payroll": 80000},
        {"name": "librarian", "description": "Библиотекарь", "payroll": 55000},
        {"name": "member", "description": "Посетитель библиотеки", "payroll": 0},
    ]

    roles = {}
    for role_data in default_roles:
        existing = session.exec(
            select(Role).where(Role.name == role_data["name"])
        ).first()

        if existing:
            roles[role_data["name"]] = existing
        else:
            role = Role(**role_data)
            session.add(role)
            session.commit()
            session.refresh(role)
            roles[role_data["name"]] = role
            logger.info(f"[+] Created role: {role_data['name']}")

    return roles


def seed_admin(session: Session, admin_role: Role) -> User | None:
    """Создает администратора по умолчанию, если нет ни одного"""
    existing_admins = session.exec(
        select(User)
        .join(User.roles)  # ty: ignore[invalid-argument-type]
        .where(Role.name == "admin")
    ).all()

    if existing_admins:
        logger.info(
            f"[=] Admin already exists: {existing_admins[0].username}, skipping creation"
        )
        return None

    admin_username = os.getenv("DEFAULT_ADMIN_USERNAME", "admin")
    admin_email = os.getenv("DEFAULT_ADMIN_EMAIL", "admin@example.com")
    admin_password = os.getenv("DEFAULT_ADMIN_PASSWORD")

    generated = False
    if not admin_password:
        import secrets

        admin_password = secrets.token_urlsafe(16)
        generated = True

    admin_user = User(
        username=admin_username,
        email=admin_email,
        full_name="Системный администратор",
        hashed_password=get_password_hash(admin_password),
        is_active=True,
        is_verified=True,
    )
    admin_user.roles.append(admin_role)

    session.add(admin_user)
    session.commit()
    session.refresh(admin_user)

    logger.info(f"[+] Created admin user: {admin_username}")

    if generated:
        logger.warning("=" * 52)
        logger.warning(f"[!] GENERATED ADMIN PASSWORD: {admin_password}")
        logger.warning("[!] Save this password! It won't be shown again!")
        logger.warning("=" * 52)

    return admin_user


def run_seeds(session: Session) -> None:
    """Запускает создание ролей и администратора"""
    roles = seed_roles(session)
    seed_admin(session, roles["admin"])
