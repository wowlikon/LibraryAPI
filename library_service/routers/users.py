"""Модуль управления пользователями (для администраторов)"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from library_service.models.db import Role, User
from library_service.models.dto import (
    RoleRead,
    RoleList,
    UserRead,
    UserList,
    UserCreateByAdmin,
    UserUpdateByAdmin,
)
from library_service.settings import get_session
from library_service.auth import (
    RequireAuth,
    RequireAdmin,
    RequireStaff,
    get_password_hash,
)


router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "/roles",
    response_model=RoleList,
    summary="Список ролей",
)
def get_roles(
    auth: RequireAuth,
    session: Session = Depends(get_session),
):
    """Возвращает список ролей в системе"""
    user_roles = [role.name for role in auth.roles]
    exclude = {"payroll"} if "admin" not in user_roles else set()
    roles = session.exec(select(Role)).all()

    return RoleList(
        roles=[RoleRead(**role.model_dump(exclude=exclude)) for role in roles],
        total=len(roles),
    )


@router.get(
    "/",
    response_model=UserList,
    summary="Список пользователей",
)
def list_users(
    current_user: RequireStaff,
    skip: int = 0,
    limit: int = 100,
    session: Session = Depends(get_session),
):
    """Возвращает список всех пользователей"""
    users = session.exec(select(User).offset(skip).limit(limit)).all()
    total = session.exec(select(User)).all()

    return UserList(
        users=[
            UserRead(**user.model_dump(), roles=[r.name for r in user.roles])
            for user in users
        ],
        total=len(total),
    )


@router.post(
    "/",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Создать пользователя",
)
def create_user(
    user_data: UserCreateByAdmin,
    current_user: RequireAdmin,
    session: Session = Depends(get_session),
):
    """Создает пользователя (без резервных кодов)"""
    if session.exec(select(User).where(User.username == user_data.username)).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered",
        )

    if session.exec(select(User).where(User.email == user_data.email)).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )

    db_user = User(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password),
        is_active=user_data.is_active,
    )

    if user_data.roles:
        for role_name in user_data.roles:
            role = session.exec(select(Role).where(Role.name == role_name)).first()
            if role:
                db_user.roles.append(role)
    else:
        default_role = session.exec(select(Role).where(Role.name == "member")).first()
        if default_role:
            db_user.roles.append(default_role)

    session.add(db_user)
    session.commit()
    session.refresh(db_user)

    return UserRead(**db_user.model_dump(), roles=[r.name for r in db_user.roles])


@router.get(
    "/{user_id}",
    response_model=UserRead,
    summary="Получить пользователя",
)
def get_user(
    user_id: int,
    current_user: RequireStaff,
    session: Session = Depends(get_session),
):
    """Возвращает пользователя по ID"""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    return UserRead(**user.model_dump(), roles=[r.name for r in user.roles])


@router.put(
    "/{user_id}",
    response_model=UserRead,
    summary="Обновить пользователя",
)
def update_user(
    user_id: int,
    user_data: UserUpdateByAdmin,
    current_user: RequireAdmin,
    session: Session = Depends(get_session),
):
    """Обновляет данные пользователя"""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user_data.email and user_data.email != user.email:
        existing = session.exec(
            select(User).where(User.email == user_data.email)
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )
        user.email = user_data.email

    if user_data.full_name is not None:
        user.full_name = user_data.full_name

    if user_data.password:
        user.hashed_password = get_password_hash(user_data.password)

    if user_data.is_active is not None:
        user.is_active = user_data.is_active

    if user_data.roles is not None:
        user.roles.clear()
        for role_name in user_data.roles:
            role = session.exec(select(Role).where(Role.name == role_name)).first()
            if role:
                user.roles.append(role)

    session.add(user)
    session.commit()
    session.refresh(user)

    return UserRead(**user.model_dump(), roles=[r.name for r in user.roles])


@router.delete(
    "/{user_id}",
    response_model=UserRead,
    summary="Удалить пользователя",
)
def delete_user(
    user_id: int,
    current_user: RequireAdmin,
    session: Session = Depends(get_session),
):
    """Деактивирует пользователя, при повторном вызове — удаляет физически"""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    if user.is_active:
        user.is_active = False
        session.add(user)
        session.commit()
        session.refresh(user)
        return UserRead(**user.model_dump(), roles=[r.name for r in user.roles])
    else:
        user_read = UserRead(**user.model_dump(), roles=[r.name for r in user.roles])
        session.delete(user)
        session.commit()
        return user_read


@router.post(
    "/{user_id}/roles/{role_name}",
    response_model=UserRead,
    summary="Назначить роль пользователю",
)
def add_role_to_user(
    user_id: int,
    role_name: str,
    current_user: RequireAdmin,
    session: Session = Depends(get_session),
):
    """Добавляет роль пользователю"""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    role = session.exec(select(Role).where(Role.name == role_name)).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role '{role_name}' not found",
        )

    if role in user.roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User already has this role",
        )

    user.roles.append(role)
    session.add(user)
    session.commit()
    session.refresh(user)

    return UserRead(**user.model_dump(), roles=[r.name for r in user.roles])


@router.delete(
    "/{user_id}/roles/{role_name}",
    response_model=UserRead,
    summary="Удалить роль у пользователя",
)
def remove_role_from_user(
    user_id: int,
    role_name: str,
    current_user: RequireAdmin,
    session: Session = Depends(get_session),
):
    """Удаляет роль у пользователя"""
    user = session.get(User, user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )

    role = session.exec(select(Role).where(Role.name == role_name)).first()
    if not role:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Role '{role_name}' not found",
        )

    if role not in user.roles:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User does not have this role",
        )

    user.roles.remove(role)
    session.add(user)
    session.commit()
    session.refresh(user)

    return UserRead(**user.model_dump(), roles=[r.name for r in user.roles])
