from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from ..database import get_session
from ..models import Book, BookBase, Author, AuthorBookLink

router = APIRouter(prefix="/books", tags=["books"])

# Create a book
@router.post("/", response_model=Book)
def create_book(book: BookBase, session: Session = Depends(get_session)):
    db_book = Book(title=book.title, description=book.description)
    session.add(db_book)
    session.commit()
    session.refresh(db_book)
    return db_book

# Read books
@router.get("/", response_model=List[Book])
def read_books(session: Session = Depends(get_session)):
    books = session.exec(select(Book)).all()
    return books

# Update a book
@router.put("/{book_id}", response_model=Book)
def update_book(book_id: int, book: BookBase, session: Session = Depends(get_session)):
    db_book = session.get(Book, book_id)
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")

    db_book.title = book.title
    db_book.description = book.description
    session.commit()
    session.refresh(db_book)
    return db_book

# Delete a book
@router.delete("/{book_id}", response_model=BookBase)
def delete_book(book_id: int, session: Session = Depends(get_session)):
    db_book = session.get(Book, book_id)
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
    book = Book(title=db_book.title, description=db_book.description)
    session.delete(db_book)
    session.commit()
    return book

# Get all authors for a book
@router.get("/{book_id}/authors/", response_model=List[Author], tags=["relations"])
def get_authors_for_book(book_id: int, session: Session = Depends(get_session)):
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    authors = session.exec(
        select(Author)
        .join(AuthorBookLink)
        .where(AuthorBookLink.book_id == book_id)
    ).all()

    return authors