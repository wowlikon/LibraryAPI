from typing import List
from sqlmodel import SQLModel, Field, Relationship

# Relationship model
class AuthorBookLink(SQLModel, table=True):
    author_id: int | None = Field(default=None, foreign_key="author.id", primary_key=True)
    book_id: int | None = Field(default=None, foreign_key="book.id", primary_key=True)

# Author DTO model
class AuthorBase(SQLModel):
    name: str

    class Config: # pyright: ignore
        json_schema_extra = {
            "example": {
                "name": "author_name",
            }
        }

# Author DB model
class Author(AuthorBase, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    books: List["Book"] = Relationship(back_populates="authors", link_model=AuthorBookLink)

# Book DTO model
class BookBase(SQLModel):
    title: str
    description: str

    class Config: # pyright: ignore
        json_schema_extra = {
            "example": {
                "title": "book_title",
                "description": "book_description",
            }
        }

# Book DB model
class Book(BookBase, table=True):
    id: int | None = Field(default=None, primary_key=True, index=True)
    authors: List[Author] = Relationship(back_populates="books", link_model=AuthorBookLink)
