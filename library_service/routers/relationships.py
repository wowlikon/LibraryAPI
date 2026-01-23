"""Модуль работы со связями"""

from typing import Dict, List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from library_service.auth import RequireStaff
from library_service.models.db import Author, AuthorBookLink, Book, Genre, GenreBookLink
from library_service.models.dto import AuthorRead, BookRead, GenreRead
from library_service.settings import get_session


router = APIRouter(tags=["relations"])


def check_entity_exists(session, model, entity_id, entity_name):
    """Проверяет существование сущности в базе данных"""
    entity = session.get(model, entity_id)
    if not entity:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=f"{entity_name} not found"
        )
    return entity


def add_relationship(session, link_model, id1, field1, id2, field2, detail):
    """Создает связь между сущностями в базе данных"""
    existing_link = session.exec(
        select(link_model)
        .where(getattr(link_model, field1) == id1)
        .where(getattr(link_model, field2) == id2)
    ).first()

    if existing_link:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

    link = link_model(**{field1: id1, field2: id2})
    session.add(link)
    session.commit()
    session.refresh(link)
    return link


def remove_relationship(session, link_model, id1, field1, id2, field2):
    """Удаляет связь между сущностями в базе данных"""
    link = session.exec(
        select(link_model)
        .where(getattr(link_model, field1) == id1)
        .where(getattr(link_model, field2) == id2)
    ).first()

    if not link:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Relationship not found"
        )

    session.delete(link)
    session.commit()
    return {"message": "Relationship removed successfully"}


def get_related(
    session,
    main_model,
    main_id,
    main_name,
    related_model,
    link_model,
    link_main_field,
    link_related_field,
    read_model,
):
    """Возвращает список связанных сущностей"""
    check_entity_exists(session, main_model, main_id, main_name)

    related = session.exec(
        select(related_model)
        .join(link_model)
        .where(getattr(link_model, link_main_field) == main_id)
    ).all()

    return [read_model(**obj.model_dump()) for obj in related]


@router.post(
    "/relationships/author-book",
    response_model=AuthorBookLink,
    summary="Связать автора и книгу",
    description="Добавляет связь между автором и книгой в систему",
)
def add_author_to_book(
    current_user: RequireStaff,
    author_id: int,
    book_id: int,
    session: Session = Depends(get_session),
):
    """Добавляет связь между автором и книгой"""
    check_entity_exists(session, Author, author_id, "Author")
    check_entity_exists(session, Book, book_id, "Book")

    return add_relationship(
        session,
        AuthorBookLink,
        author_id,
        "author_id",
        book_id,
        "book_id",
        "Relationship already exists",
    )


@router.delete(
    "/relationships/author-book",
    response_model=Dict[str, str],
    summary="Разделить автора и книгу",
    description="Удаляет связь между автором и книгой в системе",
)
def remove_author_from_book(
    current_user: RequireStaff,
    author_id: int,
    book_id: int,
    session: Session = Depends(get_session),
):
    """Удаляет связь между автором и книгой"""
    return remove_relationship(
        session, AuthorBookLink, author_id, "author_id", book_id, "book_id"
    )


@router.get(
    "/authors/{author_id}/books/",
    response_model=List[BookRead],
    summary="Получить книги, написанные автором",
    description="Возвращает все книги в системе, написанные автором",
)
def get_books_for_author(author_id: int, session: Session = Depends(get_session)):
    """Возвращает список книг автора"""
    return get_related(
        session,
        Author,
        author_id,
        "Author",
        Book,
        AuthorBookLink,
        "author_id",
        "book_id",
        BookRead,
    )


@router.get(
    "/books/{book_id}/authors/",
    response_model=List[AuthorRead],
    summary="Получить авторов книги",
    description="Возвращает всех авторов книги в системе",
)
def get_authors_for_book(book_id: int, session: Session = Depends(get_session)):
    """Возвращает список авторов книги"""
    return get_related(
        session,
        Book,
        book_id,
        "Book",
        Author,
        AuthorBookLink,
        "book_id",
        "author_id",
        AuthorRead,
    )


@router.post(
    "/relationships/genre-book",
    response_model=GenreBookLink,
    summary="Связать книгу и жанр",
    description="Добавляет связь между книгой и жанром в систему",
)
def add_genre_to_book(
    current_user: RequireStaff,
    genre_id: int,
    book_id: int,
    session: Session = Depends(get_session),
):
    """Добавляет связь между жанром и книгой"""
    check_entity_exists(session, Genre, genre_id, "Genre")
    check_entity_exists(session, Book, book_id, "Book")

    return add_relationship(
        session,
        GenreBookLink,
        genre_id,
        "genre_id",
        book_id,
        "book_id",
        "Relationship already exists",
    )


@router.delete(
    "/relationships/genre-book",
    response_model=Dict[str, str],
    summary="Разделить жанр и книгу",
    description="Удаляет связь между жанром и книгой в системе",
)
def remove_genre_from_book(
    current_user: RequireStaff,
    genre_id: int,
    book_id: int,
    session: Session = Depends(get_session),
):
    """Удаляет связь между жанром и книгой"""
    return remove_relationship(
        session, GenreBookLink, genre_id, "genre_id", book_id, "book_id"
    )


@router.get(
    "/genres/{genre_id}/books/",
    response_model=List[BookRead],
    summary="Получить книги, написанные в жанре",
    description="Возвращает все книги в системе в этом жанре",
)
def get_books_for_genre(genre_id: int, session: Session = Depends(get_session)):
    """Возвращает список книг в жанре"""
    return get_related(
        session,
        Genre,
        genre_id,
        "Genre",
        Book,
        GenreBookLink,
        "genre_id",
        "book_id",
        BookRead,
    )


@router.get(
    "/books/{book_id}/genres/",
    response_model=List[GenreRead],
    summary="Получить жанры книги",
    description="Возвращает все жанры книги в системе",
)
def get_genres_for_book(book_id: int, session: Session = Depends(get_session)):
    """Возвращает список жанров книги"""
    return get_related(
        session,
        Book,
        book_id,
        "Book",
        Genre,
        GenreBookLink,
        "book_id",
        "genre_id",
        GenreRead,
    )
