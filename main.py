from fastapi import FastAPI, Query, Path, HTTPException
from fastapi_pagination import Page, paginate, Params
from typing import List
import datetime, psutil

from utils import get_book_or_404, create_book_obj, fuzzy_search
from models import Book, NewBook

# Создание экземпляра приложения
app = FastAPI()
app.lst_idx = 0
app.books = {}

# Эндпоинт получения даты и времени
@app.get("/")
def home():
    now = datetime.datetime.now()
    cpu_count = psutil.cpu_count()
    cpu_usage = psutil.cpu_percent()
    memory_usage = psutil.virtual_memory().percent
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
@app.get("/books")
def get_books(
      limit: int = Query(10, ge=1, le=100, description="Количество книг на странице"),
      page: int = Query(1, ge=1, description="Номер страницы")
    ):
    if not app.books: raise HTTPException(status_code=404, detail="No books found")
    if not isinstance(limit, int) or not isinstance(page, int): raise HTTPException(status_code=400, detail="Invalid parameters")
    if limit < 1 or page < 1: raise HTTPException(status_code=400, detail="Invalid parameters")
    if not app.books: raise HTTPException(status_code=404, detail="No books found")
    return paginate(list(app.books.values()), Params(page=page, limit=limit))

# Эндпоинт поиска книги по названию
@app.get("/books/search")
def search_books(query: str):
    if not query: raise HTTPException(status_code=400, detail="Query parameter is required")
    return fuzzy_search(query, app.books)

# Эндпоинт получения книги по id
@app.get("/books/{id}")
def get_book(id: int):
    return get_book_or_404(app.books, id)

# Эндпоинт создания книги
@app.post("/books")
def create_book(book: NewBook):
    app.lst_idx += 1
    inserted_book = create_book_obj(app.lst_idx, book)
    app.books[app.lst_idx] = inserted_book
    return {"id": app.lst_idx}

# Эндпоинт обновления книги
@app.put("/books/{id}")
def update_book(id: int, book: NewBook):
    get_book_or_404(app.books, id)
    app.books[id] = create_book_obj(app.lst_idx, book)
    return {"id": id}

# Эндпоинт удаления книги
@app.delete("/books/{id}")
def delete_book(id: int):
    book = get_book_or_404(app.books, id)
    del app.books[id]
    return {"message": "Book deleted successfully", "book": book}

# Эндпоинт очистки списка книг
@app.delete("/books")
def delete_books():
    app.books.clear()
    app.lst_idx = 0
    return {"message": "All books deleted successfully"}

