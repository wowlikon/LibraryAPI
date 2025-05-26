from fastapi import FastAPI
from sqlmodel import SQLModel, Session, select
from .database import engine
from .models import Author, Book

app = FastAPI()

@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)

@app.get("/")
async def read_root():
    return {"message": "Hello, FastAPI with SQLModel and PostgreSQL!"}

@app.post("/authors/")
def create_author(author: Author):
    with Session(engine) as session:
        session.add(author)
        session.commit()
        session.refresh(author)
        return author

@app.get("/authors/")
def read_authors():
    with Session(engine) as session:
        authors = session.exec(select(Author)).all()
        return authors

@app.post("/books/")
def create_book(book: Book):
    with Session(engine) as session:
        session.add(book)
        session.commit()
        session.refresh(book)
        return book

@app.get("/books/")
def read_books():
    with Session(engine) as session:
        books = session.exec(select(Book)).all()
        return books
