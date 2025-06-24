from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from library_service.settings import get_session
from library_service.models.db import Author, AuthorBookLink, Book, AuthorWithBooks
from library_service.models.dto import (
    AuthorCreate, AuthorUpdate, AuthorRead,
    AuthorList, BookRead
)

router = APIRouter(prefix="/authors", tags=["authors"])

# Create an author
@router.post("/", response_model=AuthorRead)
def create_author(author: AuthorCreate, session: Session = Depends(get_session)):
    db_author = Author(**author.model_dump())
    session.add(db_author)
    session.commit()
    session.refresh(db_author)
    return AuthorRead(**db_author.model_dump())

# Read authors
@router.get("/", response_model=AuthorList)
def read_authors(session: Session = Depends(get_session)):
    authors = session.exec(select(Author)).all()
    return AuthorList(
        authors=[AuthorRead(**author.model_dump()) for author in authors],
        total=len(authors)
    )

# Read an author with their books
@router.get("/{author_id}", response_model=AuthorWithBooks)
def get_author(author_id: int, session: Session = Depends(get_session)):
    author = session.get(Author, author_id)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    books = session.exec(
        select(Book)
        .join(AuthorBookLink)
        .where(AuthorBookLink.author_id == author_id)
    ).all()

    book_reads = [BookRead(**book.model_dump()) for book in books]

    author_data = author.model_dump()
    author_data['books'] = book_reads

    return AuthorWithBooks(**author_data)

# Update an author
@router.put("/{author_id}", response_model=AuthorRead)
def update_author(
    author_id: int,
    author: AuthorUpdate,
    session: Session = Depends(get_session)
):
    db_author = session.get(Author, author_id)
    if not db_author:
        raise HTTPException(status_code=404, detail="Author not found")

    update_data = author.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_author, field, value)

    session.commit()
    session.refresh(db_author)
    return AuthorRead(**db_author.model_dump())

# Delete an author
@router.delete("/{author_id}", response_model=AuthorRead)
def delete_author(author_id: int, session: Session = Depends(get_session)):
    author = session.get(Author, author_id)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    author_read = AuthorRead(**author.model_dump())
    session.delete(author)
    session.commit()
    return author_read
