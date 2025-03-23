from pydantic import BaseModel
from pydantic import Field
from typing import List

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.orm import relationship
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy import Column, Integer, String, Table, ForeignKey

from dotenv import load_dotenv
import os

load_dotenv()
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost:5432/dbname"
)
engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Таблица связи многие-ко-многим
book_author = Table(
    'book_author',
    Base.metadata,
    Column('book_id', Integer, ForeignKey('books.id')),
    Column('author_id', Integer, ForeignKey('authors.id'))
)

class AuthorDB(Base):
    __tablename__ = "authors"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String)
    last_name = Column(String)
    books = relationship("BookDB", secondary=book_author, back_populates="authors")

class BookDB(Base):
    __tablename__ = "books"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String)
    pages = Column(Integer)
    authors = relationship("AuthorDB", secondary=book_author, back_populates="books")
    
class Author(BaseModel):
    first_name: str = Field(title="Имя", description="Имя автора")
    last_name: str = Field(title="Фамилия", description="Фамилия автора")

class NewBook(BaseModel):
    title: str = Field(title="Название", description="Название книги")
    authors: List[Author] = Field(title="Авторы", description="Авторы книги")
    pages: int = Field(title="Количество страниц", description="Количество страниц в книге")

class Book(NewBook):
    id: int = Field(title="Идентификатор", description="Уникальный идентификатор элемента")

    class Config:
        exclude = {'id'}
        from_attributes = True