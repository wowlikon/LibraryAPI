from fastapi import APIRouter, HTTPException
from tests.mocks.mock_storage import mock_storage

router = APIRouter(prefix="/genres", tags=["genres"])


@router.post("/")
def create_genre(genre: dict):
    return mock_storage.create_genre(genre["name"])


@router.get("/")
def read_genres():
    genres = mock_storage.get_all_genres()
    return {"genres": genres, "total": len(genres)}


@router.get("/{genre_id}")
def get_genre(genre_id: int):
    genre = mock_storage.get_genre(genre_id)
    if not genre:
        raise HTTPException(status_code=404, detail="genre not found")

    books = mock_storage.get_books_by_genre(genre_id)
    genre_with_books = genre.copy()
    genre_with_books["books"] = books
    return genre_with_books


@router.put("/{genre_id}")
def update_genre(genre_id: int, genre: dict):
    updated_genre = mock_storage.update_genre(genre_id, genre.get("name"))
    if not updated_genre:
        raise HTTPException(status_code=404, detail="genre not found")
    return updated_genre


@router.delete("/{genre_id}")
def delete_genre(genre_id: int):
    genre = mock_storage.delete_genre(genre_id)
    if not genre:
        raise HTTPException(status_code=404, detail="genre not found")
    return genre
