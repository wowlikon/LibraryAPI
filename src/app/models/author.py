from typing import List, Optional
from sqlmodel import SQLModel, Field, Relationship
from .links import AuthorBookLink
from .book import Book

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
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    books: List["Book"] = Relationship(back_populates="authors", link_model=AuthorBookLink)
