"""Модуль работы с книгами"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Path, Query
from sqlmodel import Session, select, col, func

from library_service.auth import RequireAuth
from library_service.settings import get_session
from library_service.models.db import Author, AuthorBookLink, Book, GenreBookLink, Genre
from library_service.models.dto import AuthorRead, BookCreate, BookList, BookRead, BookUpdate, GenreRead
from library_service.models.dto.combined import (
    BookWithAuthorsAndGenres,
    BookFilteredList
)


router = APIRouter(prefix="/books", tags=["books"])


@router.get(
    "/filter",
    response_model=BookFilteredList,
    summary="Фильтрация книг",
    description="Фильтрация списка книг по названию, авторам и жанрам с пагинацией"
)
def filter_books(
    session: Session = Depends(get_session),
    q: str | None = Query(None, min_length=3, max_length=50, description="Поиск"),
    author_ids: List[int] | None = Query(None, description="Список ID авторов"),
    genre_ids: List[int] | None = Query(None, description="Список ID жанров"),
    page: int = Query(1, gt=0, description="Номер страницы"),
    size: int = Query(20, gt=0, lt=101, description="Количество элементов на странице"),
):
    """Эндпоинт получения отфильтрованного списка книг"""
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
    response_model=Book,
    summary="Создать книгу",
    description="Добавляет книгу в систему",
)
def create_book(
    current_user: RequireAuth, book: BookCreate, session: Session = Depends(get_session)
):
    """Эндпоинт создания книги"""
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
    """Эндпоинт чтения списка книг"""
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
    """Эндпоинт чтения конкретной книги"""
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
    current_user: RequireAuth,
    book: BookUpdate,
    book_id: int = Path(..., description="ID книги (целое число, > 0)", gt=0),
    session: Session = Depends(get_session),
):
    """Эндпоинт обновления книги"""
    db_book = session.get(Book, book_id)
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")

    db_book.title = book.title or db_book.title
    db_book.description = book.description or db_book.description
    session.commit()
    session.refresh(db_book)
    return db_book


@router.delete(
    "/{book_id}",
    response_model=BookRead,
    summary="Удалить книгу",
    description="Удаляет книгу их системы",
)
def delete_book(
    current_user: RequireAuth,
    book_id: int = Path(..., description="ID книги (целое число, > 0)", gt=0),
    session: Session = Depends(get_session),
):
    """Эндпоинт удаления книги"""
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    book_read = BookRead(
        id=(book.id or 0), title=book.title, description=book.description
    )
    session.delete(book)
    session.commit()
    return book_read
