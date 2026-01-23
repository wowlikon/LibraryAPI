"""Модуль работы с авторами"""

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlmodel import Session, select

from library_service.auth import RequireStaff
from library_service.settings import get_session
from library_service.models.db import Author, AuthorBookLink, Book
from library_service.models.dto import (
    BookRead,
    AuthorWithBooks,
    AuthorCreate,
    AuthorList,
    AuthorRead,
    AuthorUpdate,
)


router = APIRouter(prefix="/authors", tags=["authors"])


@router.post(
    "/",
    response_model=AuthorRead,
    summary="Создать автора",
    description="Добавляет автора в систему",
)
def create_author(
    current_user: RequireStaff,
    author: AuthorCreate,
    session: Session = Depends(get_session),
):
    """Создает нового автора в системе"""
    db_author = Author(**author.model_dump())
    session.add(db_author)
    session.commit()
    session.refresh(db_author)
    return AuthorRead(**db_author.model_dump())


@router.get(
    "/",
    response_model=AuthorList,
    summary="Получить список авторов",
    description="Возвращает список всех авторов в системе",
)
def read_authors(session: Session = Depends(get_session)):
    """Возвращает список всех авторов"""
    authors = session.exec(select(Author)).all()
    return AuthorList(
        authors=[AuthorRead(**author.model_dump()) for author in authors],
        total=len(authors),
    )


@router.get(
    "/{author_id}",
    response_model=AuthorWithBooks,
    summary="Получить информацию об авторе",
    description="Возвращает информацию об авторе и его книгах",
)
def get_author(
    author_id: int = Path(..., description="ID автора (целое число, > 0)", gt=0),
    session: Session = Depends(get_session),
):
    """Возвращает информацию об авторе и его книгах"""
    author = session.get(Author, author_id)
    if not author:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Author not found"
        )

    books = session.exec(
        select(Book).join(AuthorBookLink).where(AuthorBookLink.author_id == author_id)
    ).all()

    book_reads = [BookRead(**book.model_dump()) for book in books]

    author_data = author.model_dump()
    author_data["books"] = book_reads

    return AuthorWithBooks(**author_data)


@router.put(
    "/{author_id}",
    response_model=AuthorRead,
    summary="Обновить информацию об авторе",
    description="Обновляет информацию об авторе в системе",
)
def update_author(
    current_user: RequireStaff,
    author: AuthorUpdate,
    author_id: int = Path(..., description="ID автора (целое число, > 0)", gt=0),
    session: Session = Depends(get_session),
):
    """Обновляет информацию об авторе"""
    db_author = session.get(Author, author_id)
    if not db_author:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Author not found"
        )

    update_data = author.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_author, field, value)

    session.commit()
    session.refresh(db_author)
    return AuthorRead(**db_author.model_dump())


@router.delete(
    "/{author_id}",
    response_model=AuthorRead,
    summary="Удалить автора",
    description="Удаляет автора из системы",
)
def delete_author(
    current_user: RequireStaff,
    author_id: int = Path(..., description="ID автора (целое число, > 0)", gt=0),
    session: Session = Depends(get_session),
):
    """Удаляет автора из системы"""
    author = session.get(Author, author_id)
    if not author:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Author not found"
        )

    author_read = AuthorRead(**author.model_dump())
    session.delete(author)
    session.commit()
    return author_read
