from typing import Optional, List
from sqlmodel import SQLModel, Field, Relationship

class AuthorBookLink(SQLModel, table=True):
    author_id: int | None = Field(default=None, foreign_key="author.id", primary_key=True)
    book_id: int | None = Field(default=None, foreign_key="book.id", primary_key=True)

class Author(SQLModel, table=True):
    id: Optional[int] = Field(primary_key=True, index=True)
    name: str

    books: List["Book"] = Relationship(back_populates="authors", link_model=AuthorBookLink)

class Book(SQLModel, table=True):
    id: Optional[int] = Field(primary_key=True, index=True)
    title: str
    description: str
    authors: List[Author] = Relationship(back_populates="books", link_model=AuthorBookLink)
