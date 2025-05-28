from alembic import command
from alembic.config import Config
from fastapi import FastAPI, Depends, HTTPException
from sqlmodel import SQLModel, Session, select
from typing import List
from .database import engine, get_session
from .models import Author, AuthorBase, Book, BookBase, AuthorBookLink

alembic_cfg = Config("alembic.ini")
app = FastAPI(
    title="My API",
    description="This is a sample API for managing authors and books.",
    version="1.0.0",
    openapi_tags=[
        {
            "name": "authors",
            "description": "Operations with authors.",
        },
        {
            "name": "books",
            "description": "Operations with books.",
        },
    ]
)

# Initialize the database
@app.on_event("startup")
def on_startup():
    # Apply database migrations
    with engine.begin() as connection:
        alembic_cfg.attributes['connection'] = connection
        command.upgrade(alembic_cfg, "head")

# Root endpoint
@app.get("/", tags=["authors", "books"])
async def hello_world():
    return {"message": "Hello world!"}

# Create an author
@app.post("/authors/", response_model=Author, tags=["authors"])
def create_author(author: AuthorBase, session: Session = Depends(get_session)):
    db_author = Author(name=author.name)
    session.add(db_author)
    session.commit()
    session.refresh(db_author)
    return db_author

# Read authors
@app.get("/authors/", response_model=List[Author], tags=["authors"])
def read_authors(session: Session = Depends(get_session)):
    authors = session.exec(select(Author)).all()
    return authors

# Update an author
@app.put("/authors/{author_id}", response_model=Author, tags=["authors"])
def update_author(author_id: int, author: AuthorBase, session: Session = Depends(get_session)):
    db_author = session.get(Author, author_id)
    if not db_author:
        raise HTTPException(status_code=404, detail="Author not found")
    db_author.name = author.name
    session.commit()
    session.refresh(db_author)
    return db_author

# Delete an author
@app.delete("/authors/{author_id}", response_model=AuthorBase, tags=["authors"])
def delete_author(author_id: int, session: Session = Depends(get_session)):
    db_author = session.get(Author, author_id)
    if not db_author:
        raise HTTPException(status_code=404, detail="Author not found")
    session.delete(db_author)
    author = AuthorBase(name=db_author.name)
    session.commit()
    return author

# Create a book with authors
@app.post("/books/", response_model=Book, tags=["books"])
def create_book(book: BookBase, author_ids: List[int] | None = None, session: Session = Depends(get_session)):
    db_book = Book(title=book.title, description=book.description)
    session.add(db_book)
    session.commit()
    session.refresh(db_book)
    # Create relationships if author_ids are provided
    if author_ids:
        for author_id in author_ids:
            link = AuthorBookLink(author_id=author_id, book_id=db_book.id)
            session.add(link)
        session.commit()
    return db_book

# Read books
@app.get("/books/", response_model=List[Book], tags=["books"])
def read_books(session: Session = Depends(get_session)):
    books = session.exec(select(Book)).all()
    return books

# Update a book with authors
@app.put("/books/{book_id}", response_model=Book, tags=["books"])
def update_book(book_id: int, book: BookBase, author_ids: List[int] | None = None, session: Session = Depends(get_session)):
    db_book = session.get(Book, book_id)
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")

    db_book.title = book.title
    db_book.description = book.description
    session.commit()
    session.refresh(db_book)
    # Update relationships if author_ids are provided
    if author_ids is not None:
        # Clear existing relationships
        existing_links = session.exec(select(AuthorBookLink).where(AuthorBookLink.book_id == book_id)).all()
        for link in existing_links:
            session.delete(link)
        # Create new relationships
        for author_id in author_ids:
            link = AuthorBookLink(author_id=author_id, book_id=db_book.id)
            session.add(link)
        session.commit()
    return db_book

# Delete a book
@app.delete("/books/{book_id}", response_model=BookBase, tags=["books"])
def delete_book(book_id: int, session: Session = Depends(get_session)):
    db_book = session.get(Book, book_id)
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
    book = Book(title=db_book.title, description=db_book.description)
    session.delete(db_book)
    session.commit()
    return book
