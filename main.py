from fastapi import FastAPI, Query, HTTPException, Depends
from fastapi_pagination import Page, paginate, Params
from sqlalchemy.orm import Session
from sqlalchemy import or_
import datetime

from utils import get_db
from models import create_tables
from models import AuthorDB, BookDB, Book, NewBook

# Создание экземпляра приложения
create_tables()
app = FastAPI()
app.lst_idx = 0
app.books = {}

# Эндпоинт получения даты и времени
@app.get("/")
def home():
    now = datetime.datetime.now()
    return {
             "time":
              {
               "hour": now.hour,
               "minute": now.minute,
               "second": now.second
              },
              "date": now.date()
           }

# Эндпоинт получения всех книг
@app.get("/books", response_model=Page[Book])
def get_books(
    db: Session = Depends(get_db),
    limit: int = Query(10, ge=1, le=100),
    page: int = Query(1, ge=1)
):
    books = db.query(BookDB).offset((page - 1) * limit).limit(limit).all()
    return paginate(books, Params(page=page, size=limit))

# Эндпоинт поиска книги по названию
@app.get("/books/search")
def search_books(query: str, db: Session = Depends(get_db)):
    return db.query(BookDB).filter(
        or_(
            BookDB.title.ilike(f"%{query}%"),
            AuthorDB.first_name.ilike(f"%{query}%"),
            AuthorDB.last_name.ilike(f"%{query}%")
        )
    ).join(BookDB.authors).all()

# Эндпоинт получения книги по id
@app.get("/books/{id}", response_model=Book)
def get_book(id: int, db: Session = Depends(get_db)):
    book = db.query(BookDB).filter(BookDB.id == id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    return book

# Эндпоинт создания книги
@app.post("/books", response_model=Book)
def create_book(book: NewBook, db: Session = Depends(get_db)):
    # Создаем книгу
    db_book = BookDB(title=book.title, pages=book.pages)
    
    # Создаем или находим авторов
    for author_data in book.authors:
        author = db.query(AuthorDB).filter(
            AuthorDB.first_name == author_data.first_name,
            AuthorDB.last_name == author_data.last_name
        ).first()
        if not author:
            author = AuthorDB(**author_data.model_dump())
            db.add(author)
        db_book.authors.append(author)
    
    db.add(db_book)
    db.commit()
    db.refresh(db_book)
    return db_book

# Эндпоинт обновления книги
def update_book(id: int, book: Book, db: Session = Depends(get_db)):
    db_book = db.query(BookDB).filter(BookDB.id == id).first()
    if not db_book:
        raise HTTPException(status_code=404, detail="Book not found")
    
    for key, value in book.model_dump().items():
        setattr(db_book, key, value)
    
    db.commit()
    db.refresh(db_book)
    return db_book

# Эндпоинт удаления книги
@app.delete("/books/{id}")
def delete_book(id: int, db: Session = Depends(get_db)):
    book = db.query(BookDB).filter(BookDB.id == id).first()
    if not book:
        raise HTTPException(status_code=404, detail="Book not found")
    db.delete(book)
    db.commit()
    return {"message": "Book deleted successfully"}

# Эндпоинт очистки списка книг
@app.delete("/books")
def delete_all_books(db: Session = Depends(get_db)):
    db.query(BookDB).delete()
    db.commit()
    return {"message": "All books deleted successfully"}

