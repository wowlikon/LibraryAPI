from fastapi import APIRouter, HTTPException

from tests.mocks.mock_storage import mock_storage

router = APIRouter(tags=["relations"])


@router.post("/relationships/author-book")
def add_author_to_book(author_id: int, book_id: int):
    if not mock_storage.create_author_book_link(author_id, book_id):
        if not mock_storage.get_author(author_id):
            raise HTTPException(status_code=404, detail="Author not found")
        if not mock_storage.get_book(book_id):
            raise HTTPException(status_code=404, detail="Book not found")
        raise HTTPException(status_code=400, detail="Relationship already exists")

    return {"author_id": author_id, "book_id": book_id}


@router.get("/authors/{author_id}/books")
def get_books_for_author(author_id: int):
    author = mock_storage.get_author(author_id)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    return mock_storage.get_books_by_author(author_id)


@router.get("/books/{book_id}/authors")
def get_authors_for_book(book_id: int):
    book = mock_storage.get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    return mock_storage.get_authors_by_book(book_id)


@router.post("/relationships/genre-book")
def add_genre_to_book(genre_id: int, book_id: int):
    return {"genre_id": genre_id, "book_id": book_id}
