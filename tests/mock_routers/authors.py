from fastapi import APIRouter, HTTPException
from tests.mocks.mock_storage import mock_storage

router = APIRouter(prefix="/authors", tags=["authors"])


@router.post("/")
def create_author(author: dict):
    return mock_storage.create_author(author["name"])


@router.get("/")
def read_authors():
    authors = mock_storage.get_all_authors()
    return {"authors": authors, "total": len(authors)}


@router.get("/{author_id}")
def get_author(author_id: int):
    author = mock_storage.get_author(author_id)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    books = mock_storage.get_books_by_author(author_id)
    author_with_books = author.copy()
    author_with_books["books"] = books
    return author_with_books


@router.put("/{author_id}")
def update_author(author_id: int, author: dict):
    updated_author = mock_storage.update_author(author_id, author.get("name"))
    if not updated_author:
        raise HTTPException(status_code=404, detail="Author not found")
    return updated_author


@router.delete("/{author_id}")
def delete_author(author_id: int):
    author = mock_storage.delete_author(author_id)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")
    return author
