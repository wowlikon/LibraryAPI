from fastapi import APIRouter, HTTPException
from tests.mocks.mock_storage import mock_storage

router = APIRouter(prefix="/books", tags=["books"])


@router.post("/")
def create_book(book: dict):
    return mock_storage.create_book(book["title"], book["description"])


@router.get("/")
def read_books():
    books = mock_storage.get_all_books()
    return {"books": books, "total": len(books)}


@router.get("/{book_id}")
def get_book(book_id: int):
    book = mock_storage.get_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    authors = mock_storage.get_authors_by_book(book_id)
    book_with_authors = book.copy()
    book_with_authors["authors"] = authors
    return book_with_authors


@router.put("/{book_id}")
def update_book(book_id: int, book: dict):
    updated_book = mock_storage.update_book(
        book_id, book.get("title"), book.get("description")
    )
    if not updated_book:
        raise HTTPException(status_code=404, detail="Book not found")
    return updated_book


@router.delete("/{book_id}")
def delete_book(book_id: int):
    book = mock_storage.delete_book(book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book
