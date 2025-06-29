from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from library_service.settings import get_session
from library_service.models.db import Author, Book, BookWithAuthors, AuthorBookLink
from library_service.models.dto import (
    AuthorRead, BookList, BookRead,
    BookCreate, BookUpdate
)

router = APIRouter(prefix="/books", tags=["books"])

# Create a book
@router.post("/", response_model=Book)
def create_book(book: BookCreate, session: Session = Depends(get_session)):
    db_book = Book(**book.model_dump())
    session.add(db_book)
    session.commit()
    session.refresh(db_book)
    return BookRead(**db_book.model_dump())

# Read books
@router.get("/", response_model=BookList)
def read_books(session: Session = Depends(get_session)):
    books = session.exec(select(Book)).all()
    return BookList(
        books=[BookRead(**book.model_dump()) for book in books],
        total=len(books)
    )

# Read a book with their authors
@router.get("/{book_id}", response_model=BookWithAuthors)
def get_book(book_id: int, session: Session = Depends(get_session)):
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    authors = session.exec(
        select(Author)
        .join(AuthorBookLink)
        .where(AuthorBookLink.book_id == book_id)
    ).all()

    author_reads = [AuthorRead(**author.model_dump()) for author in authors]

    book_data = book.model_dump()
    book_data['authors'] = author_reads

    return BookWithAuthors(**book_data)

# Update a book
@router.put("/{book_id}", response_model=Book)
def update_book(book_id: int, book: BookUpdate, session: Session = Depends(get_session)):
    db_book = session.get(Book, book_id)
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")

    db_book.title = book.title or db_book.title
    db_book.description = book.description or db_book.description
    session.commit()
    session.refresh(db_book)
    return db_book

# Delete a book
@router.delete("/{book_id}", response_model=BookRead)
def delete_book(book_id: int, session: Session = Depends(get_session)):
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    book_read = BookRead(id=(book.id or 0), title=book.title, description=book.description)
    session.delete(book)
    session.commit()
    return book_read
