from typing import List, Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship
from ..dto.author import AuthorBase
from .links import AuthorBookLink

if TYPE_CHECKING:
    from .book import Book


class Author(AuthorBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True, index=True)
    books: List["Book"] = Relationship(
        back_populates="authors", link_model=AuthorBookLink
    )
