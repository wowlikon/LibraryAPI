from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from library_service.settings import get_session
from library_service.models.db import Genre, GenreBookLink, Book, GenreWithBooks
from library_service.models.dto import (
    GenreCreate, GenreUpdate, GenreRead,
    GenreList, BookRead
)

router = APIRouter(prefix="/genres", tags=["genres"])

# Create a genre
@router.post("/", response_model=GenreRead)
def create_genre(genre: GenreCreate, session: Session = Depends(get_session)):
    db_genre = Genre(**genre.model_dump())
    session.add(db_genre)
    session.commit()
    session.refresh(db_genre)
    return GenreRead(**db_genre.model_dump())

# Read genres
@router.get("/", response_model=GenreList)
def read_genres(session: Session = Depends(get_session)):
    genres = session.exec(select(Genre)).all()
    return GenreList(
        genres=[GenreRead(**genre.model_dump()) for genre in genres],
        total=len(genres)
    )

# Read a genre with their books
@router.get("/{genre_id}", response_model=GenreWithBooks)
def get_genre(genre_id: int, session: Session = Depends(get_session)):
    genre = session.get(Genre, genre_id)
    if not genre:
        raise HTTPException(status_code=404, detail="Genre not found")

    books = session.exec(
        select(Book)
        .join(GenreBookLink)
        .where(GenreBookLink.genre_id == genre_id)
    ).all()

    book_reads = [BookRead(**book.model_dump()) for book in books]

    genre_data = genre.model_dump()
    genre_data['books'] = book_reads

    return GenreWithBooks(**genre_data)

# Update a genre
@router.put("/{genre_id}", response_model=GenreRead)
def update_genre(
    genre_id: int,
    genre: GenreUpdate,
    session: Session = Depends(get_session)
):
    db_genre = session.get(Genre, genre_id)
    if not db_genre:
        raise HTTPException(status_code=404, detail="Genre not found")

    update_data = genre.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_genre, field, value)

    session.commit()
    session.refresh(db_genre)
    return GenreRead(**db_genre.model_dump())

# Delete a genre
@router.delete("/{genre_id}", response_model=GenreRead)
def delete_genre(genre_id: int, session: Session = Depends(get_session)):
    genre = session.get(Genre, genre_id)
    if not genre:
        raise HTTPException(status_code=404, detail="Genre not found")

    genre_read = GenreRead(**genre.model_dump())
    session.delete(genre)
    session.commit()
    return genre_read
