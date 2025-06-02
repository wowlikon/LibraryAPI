from datetime import datetime
from pathlib import Path
from typing import List

from alembic import command
from alembic.config import Config
from fastapi import FastAPI, Depends, Request, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from sqlmodel import SQLModel, Session, select

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
        {
            "name": "relations",
            "description": "Operations with relations.",
        },
        {
            "name": "misc",
            "description": "Miscellaneous operations.",
        }
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
@app.get("/", tags=["misc"])
async def root(request: Request, html: str = ""):

    if html != "": # API response
        data = {
            "title": app.title,
            "version": app.version,
            "description": app.description,
            "status": "ok"
        }
        return JSONResponse({"message": "Hello world!", "data": data, "time": datetime.now(), })
    else: # Browser response
        with open(Path(__file__).parent / "index.html", 'r', encoding='utf-8') as file:
            html_content = file.read()
        return HTMLResponse(html_content)

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
def create_book(book: BookBase, session: Session = Depends(get_session)):
    db_book = Book(title=book.title, description=book.description)
    session.add(db_book)
    session.commit()
    session.refresh(db_book)
    return db_book

# Read books
@app.get("/books/", response_model=List[Book], tags=["books"])
def read_books(session: Session = Depends(get_session)):
    books = session.exec(select(Book)).all()
    return books

# Update a book with authors
@app.put("/books/{book_id}", response_model=Book, tags=["books"])
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
@app.delete("/books/{book_id}", response_model=BookBase, tags=["books"])
def delete_book(book_id: int, session: Session = Depends(get_session)):
    db_book = session.get(Book, book_id)
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
    book = Book(title=db_book.title, description=db_book.description)
    session.delete(db_book)
    session.commit()
    return book

# Add author to book
@app.post("/relationships/", response_model=AuthorBookLink, tags=["relations"])
def add_author_to_book(author_id: int, book_id: int, session: Session = Depends(get_session)):
    # Check if author and book exist
    author = session.get(Author, author_id)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")

    # Check if relationship already exists
    existing_link = session.exec(
        select(AuthorBookLink)
        .where(AuthorBookLink.author_id == author_id)
        .where(AuthorBookLink.book_id == book_id)
    ).first()

    if existing_link:
        raise HTTPException(status_code=400, detail="Relationship already exists")

    # Create new relationship
    link = AuthorBookLink(author_id=author_id, book_id=book_id)
    session.add(link)
    session.commit()
    session.refresh(link)
    return link

# Remove author from book
@app.delete("/relationships/", tags=["relations"])
def remove_author_from_book(author_id: int, book_id: int, session: Session = Depends(get_session)):
    # Find the relationship
    link = session.exec(
        select(AuthorBookLink)
        .where(AuthorBookLink.author_id == author_id)
        .where(AuthorBookLink.book_id == book_id)
    ).first()

    if not link:
        raise HTTPException(status_code=404, detail="Relationship not found")

    session.delete(link)
    session.commit()
    return {"message": "Relationship removed successfully"}

# Get all authors for a book
@app.get("/books/{book_id}/authors/", response_model=List[Author], tags=["books", "relations"])
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

# Get all books for an author
@app.get("/authors/{author_id}/books/", response_model=List[Book], tags=["authors", "relations"])
def get_books_for_author(author_id: int, session: Session = Depends(get_session)):
    author = session.get(Author, author_id)
    if not author:
        raise HTTPException(status_code=404, detail="Author not found")

    books = session.exec(
        select(Book)
        .join(AuthorBookLink)
        .where(AuthorBookLink.author_id == author_id)
    ).all()

    return books
