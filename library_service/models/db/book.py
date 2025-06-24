from typing import List, Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from ..dto.book import BookBase
from .links import AuthorBookLink, GenreBookLink

if TYPE_CHECKING:
    from .author import Author
    from .genre import Genre

class Book(BookBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    authors: List["Author"] = Relationship(
        back_populates="books",
        link_model=AuthorBookLink
    )
    genres: List["Genre"] = Relationship(
        back_populates="books",
        link_model=GenreBookLink
    )
