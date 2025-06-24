from sqlmodel import SQLModel, Field
from typing import List

from library_service.models.dto.author import AuthorRead
from library_service.models.dto.book import BookRead

class AuthorBookLink(SQLModel, table=True):
    author_id: int | None = Field(default=None, foreign_key="author.id", primary_key=True)
    book_id: int | None = Field(default=None, foreign_key="book.id", primary_key=True)

class AuthorWithBooks(AuthorRead):
    books: List[BookRead] = Field(default_factory=list)

class BookWithAuthors(BookRead):
    authors: List[AuthorRead] = Field(default_factory=list)
