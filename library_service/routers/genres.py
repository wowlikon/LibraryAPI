"""Модуль работы с жанрами"""
from fastapi import APIRouter, Depends, HTTPException, Path
from sqlmodel import Session, select

from library_service.auth import RequireAuth
from library_service.models.db import Book, Genre, GenreBookLink
from library_service.models.dto import BookRead, GenreCreate, GenreList, GenreRead, GenreUpdate, GenreWithBooks
from library_service.settings import get_session

router = APIRouter(prefix="/genres", tags=["genres"])


# Создание жанра
@router.post(
    "/",
    response_model=GenreRead,
    summary="Создать жанр",
    description="Добавляет жанр книг в систему",
)
def create_genre(
    current_user: RequireAuth,
    genre: GenreCreate,
    session: Session = Depends(get_session),
):
    """Эндпоинт создания жанра"""
    db_genre = Genre(**genre.model_dump())
    session.add(db_genre)
    session.commit()
    session.refresh(db_genre)
    return GenreRead(**db_genre.model_dump())


# Чтение жанров
@router.get(
    "/",
    response_model=GenreList,
    summary="Получить список жанров",
    description="Возвращает список всех жанров в системе",
)
def read_genres(session: Session = Depends(get_session)):
    """Эндпоинт чтения списка жанров"""
    genres = session.exec(select(Genre)).all()
    return GenreList(
        genres=[GenreRead(**genre.model_dump()) for genre in genres], total=len(genres)
    )


# Чтение жанра с его книгами
@router.get(
    "/{genre_id}",
    response_model=GenreWithBooks,
    summary="Получить информацию о жанре",
    description="Возвращает информацию о жанре и книгах с ним",
)
def get_genre(
    genre_id: int = Path(..., description="ID жанра (целое число, > 0)", gt=0),
    session: Session = Depends(get_session),
):
    """Эндпоинт чтения конкретного жанра"""
    genre = session.get(Genre, genre_id)
    if not genre:
        raise HTTPException(status_code=404, detail="Genre not found")

    books = session.exec(
        select(Book).join(GenreBookLink).where(GenreBookLink.genre_id == genre_id)
    ).all()

    book_reads = [BookRead(**book.model_dump()) for book in books]

    genre_data = genre.model_dump()
    genre_data["books"] = book_reads

    return GenreWithBooks(**genre_data)


# Обновление жанра
@router.put(
    "/{genre_id}",
    response_model=GenreRead,
    summary="Обновляет информацию о жанре",
    description="Обновляет информацию о жанре в системе",
)
def update_genre(
    current_user: RequireAuth,
    genre: GenreUpdate,
    genre_id: int = Path(..., description="ID жанра (целое число, > 0)", gt=0),
    session: Session = Depends(get_session),
):
    """Эндпоинт обновления жанра"""
    db_genre = session.get(Genre, genre_id)
    if not db_genre:
        raise HTTPException(status_code=404, detail="Genre not found")

    update_data = genre.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_genre, field, value)

    session.commit()
    session.refresh(db_genre)
    return GenreRead(**db_genre.model_dump())


# Удаление жанра
@router.delete(
    "/{genre_id}",
    response_model=GenreRead,
    summary="Удалить жанр",
    description="Удаляет автора из системы",
)
def delete_genre(
    current_user: RequireAuth,
    genre_id: int = Path(..., description="ID жанра (целое число, > 0)", gt=0),
    session: Session = Depends(get_session),
):
    """Эндпоинт удаления жанра"""
    genre = session.get(Genre, genre_id)
    if not genre:
        raise HTTPException(status_code=404, detail="Genre not found")

    genre_read = GenreRead(**genre.model_dump())
    session.delete(genre)
    session.commit()
    return genre_read
