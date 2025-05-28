from alembic import command
from alembic.config import Config
from fastapi import FastAPI, HTTPException
from sqlmodel import SQLModel, Session, select
from typing import List
from .database import engine
from .models import Author, Book

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
def create_author(author: Author):
    with Session(engine) as session:
        session.add(author)
        session.commit()
        session.refresh(author)
        return author

# Read authors
@app.get("/authors/", response_model=List[Author], tags=["authors"])
def read_authors():
    with Session(engine) as session:
        authors = session.exec(select(Author)).all()
        return authors

# Update an author
@app.put("/authors/{author_id}", response_model=Author, tags=["authors"])
def update_author(author_id: int, author: Author):
    with Session(engine) as session:
        db_author = session.get(Author, author_id)
        if not db_author:
            raise HTTPException(status_code=404, detail="Author not found")
        db_author.name = author.name
        session.add(db_author)
        session.commit()
        session.refresh(db_author)
        return db_author

# Delete an author
@app.delete("/authors/{author_id}", tags=["authors"])
def delete_author(author_id: int):
    with Session(engine) as session:
        db_author = session.get(Author, author_id)
        if not db_author:
            raise HTTPException(status_code=404, detail="Author not found")
        session.delete(db_author)
        session.commit()
        return {"message": "Author deleted"}

# Create a book
@app.post("/books/", response_model=Book, tags=["books"])
def create_book(book: Book):
    with Session(engine) as session:
        session.add(book)
        session.commit()
        session.refresh(book)
        return book

# Read books
@app.get("/books/", response_model=List[Book], tags=["books"])
def read_books():
    with Session(engine) as session:
        books = session.exec(select(Book)).all()
        return books

# Update a book
@app.put("/books/{book_id}", response_model=Book, tags=["books"])
def update_book(book_id: int, book: Book):
    with Session(engine) as session:
        db_book = session.get(Book, book_id)
        if not db_book:
            raise HTTPException(status_code=404, detail="Book not found")
        db_book.title = book.title
        db_book.authors = book.authors
        session.add(db_book)
        session.commit()
        session.refresh(db_book)
        return db_book

# Delete a book
@app.delete("/books/{book_id}", tags=["books"])
def delete_book(book_id: int):
    with Session(engine) as session:
        db_book = session.get(Book, book_id)
        if not db_book:
            raise HTTPException(status_code=404, detail="Book not found")
        session.delete(db_book)
        session.commit()
        return {"message": "Book deleted"}
