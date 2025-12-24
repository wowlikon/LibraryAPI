"""Модуль работы с книгами"""
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlmodel import Session, select, col, func

from library_service.auth import RequireStaff
from library_service.settings import get_session
from library_service.models.enums import BookStatus
from library_service.models.db import Author, AuthorBookLink, Book, GenreBookLink, Genre, BookUserLink
from library_service.models.dto import AuthorRead, BookCreate, BookList, BookRead, BookUpdate, GenreRead
from library_service.models.dto.combined import (
    BookWithAuthorsAndGenres,
    BookFilteredList
)


router = APIRouter(prefix="/books", tags=["books"])


def close_active_loan(session: Session, book_id: int) -> None:
    """Закрывает активную выдачу книги при изменении статуса"""
    active_loan = session.exec(
        select(BookUserLink)
        .where(BookUserLink.book_id == book_id)
        .where(BookUserLink.returned_at == None)  # noqa: E711
    ).first()

    if active_loan:
        active_loan.returned_at = datetime.utcnow()
        session.add(active_loan)


@router.get(
    "/filter",
    response_model=BookFilteredList,
    summary="Фильтрация книг",
    description="Фильтрация списка книг по названию, авторам и жанрам с пагинацией"
)
def filter_books(
    session: Session = Depends(get_session),
    q: str | None = Query(None, max_length=50, description="Поиск"),
    author_ids: List[int] | None = Query(None, description="Список ID авторов"),
    genre_ids: List[int] | None = Query(None, description="Список ID жанров"),
    page: int = Query(1, gt=0, description="Номер страницы"),
    size: int = Query(20, gt=0, lt=101, description="Количество элементов на странице"),
):
    """Возвращает отфильтрованный список книг с пагинацией"""
    statement = select(Book).distinct()

    if q:
        statement = statement.where(
            (col(Book.title).ilike(f"%{q}%")) | (col(Book.description).ilike(f"%{q}%"))
        )

    if author_ids:
        statement = statement.join(AuthorBookLink).where(AuthorBookLink.author_id.in_(author_ids))

    if genre_ids:
        statement = statement.join(GenreBookLink).where(GenreBookLink.genre_id.in_(genre_ids))

    total_statement = select(func.count()).select_from(statement.subquery())
    total = session.exec(total_statement).one()

    offset = (page - 1) * size
    statement = statement.offset(offset).limit(size)
    results = session.exec(statement).all()

    books_with_data = []
    for db_book in results:
        books_with_data.append(
            BookWithAuthorsAndGenres(
                **db_book.model_dump(),
                authors=[AuthorRead(**a.model_dump()) for a in db_book.authors],
                genres=[GenreRead(**g.model_dump()) for g in db_book.genres]
            )
        )

    return BookFilteredList(books=books_with_data, total=total)


@router.post(
    "/",
    response_model=BookRead,
    summary="Создать книгу",
    description="Добавляет книгу в систему",
)
def create_book(
    book: BookCreate,
    current_user: RequireStaff,
    session: Session = Depends(get_session)
):
    """Создает новую книгу в системе"""
    db_book = Book(**book.model_dump())
    session.add(db_book)
    session.commit()
    session.refresh(db_book)
    return BookRead(**db_book.model_dump())


@router.get(
    "/",
    response_model=BookList,
    summary="Получить список книг",
    description="Возвращает список всех книг в системе",
)
def read_books(session: Session = Depends(get_session)):
    """Возвращает список всех книг"""
    books = session.exec(select(Book)).all()
    return BookList(
        books=[BookRead(**book.model_dump()) for book in books], total=len(books)
    )


@router.get(
    "/{book_id}",
    response_model=BookWithAuthorsAndGenres,
    summary="Получить информацию о книге",
    description="Возвращает информацию о книге, её авторах и жанрах",
)
def get_book(
    book_id: int = Path(..., description="ID книги (целое число, > 0)", gt=0),
    session: Session = Depends(get_session),
):
    """Возвращает информацию о книге с авторами и жанрами"""
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    authors = session.exec(
        select(Author).join(AuthorBookLink).where(AuthorBookLink.book_id == book_id)
    ).all()

    author_reads = [AuthorRead(**author.model_dump()) for author in authors]

    genres = session.exec(
        select(Genre).join(GenreBookLink).where(GenreBookLink.book_id == book_id)
    ).all()

    genre_reads = [GenreRead(**genre.model_dump()) for genre in genres]

    book_data = book.model_dump()
    book_data["authors"] = author_reads
    book_data["genres"] = genre_reads

    return BookWithAuthorsAndGenres(**book_data)


@router.put(
    "/{book_id}",
    response_model=Book,
    summary="Обновить информацию о книге",
    description="Обновляет информацию о книге в системе",
)
def update_book(
    current_user: RequireStaff,
    book_update: BookUpdate,
    book_id: int = Path(..., gt=0),
    session: Session = Depends(get_session),
):
    """Обновляет информацию о книге"""
    db_book = session.get(Book, book_id)
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")

    if book_update.status is not None:
        if book_update.status == BookStatus.BORROWED:
            raise HTTPException(
                status_code=400,
                detail="Статус 'borrowed' устанавливается только через выдачу книги"
            )

        if db_book.status == BookStatus.BORROWED:
            close_active_loan(session, book_id)

        db_book.status = book_update.status

    if book_update.title is not None or book_update.description is not None:
        if book_update.title is not None:
            db_book.title = book_update.title
        if book_update.description is not None:
            db_book.description = book_update.description

    session.add(db_book)
    session.commit()
    session.refresh(db_book)

    return BookRead(**db_book.model_dump())


@router.delete(
    "/{book_id}",
    response_model=BookRead,
    summary="Удалить книгу",
    description="Удаляет книгу их системы",
)
def delete_book(
    current_user: RequireStaff,
    book_id: int = Path(..., description="ID книги (целое число, > 0)", gt=0),
    session: Session = Depends(get_session),
):
    """Удаляет книгу из системы"""
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    book_read = BookRead(
        id=(book.id or 0), title=book.title, description=book.description, status=book.status
    )
    session.delete(book)
    session.commit()
    return book_read
