from typing import List, Optional
from sqlmodel import SQLModel, Field, Relationship
from .links import AuthorBookLink
from .author import Author

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
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    authors: List["Author"] = Relationship(back_populates="books", link_model=AuthorBookLink)
