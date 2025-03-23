from models import Book, NewBook
from models import SessionLocal

def create_book_obj(id: int, book: NewBook):
    return Book(id=id, title=book.title, authors=book.authors, pages=book.pages)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()