from typing import List, Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from ..dto.genre import GenreBase
from .links import GenreBookLink

if TYPE_CHECKING:
    from .book import Book

class Genre(GenreBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    books: List["Book"] = Relationship(
        back_populates="genres",
        link_model=GenreBookLink
    )
