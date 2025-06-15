from sqlmodel import SQLModel, Field

# Relationship model
class AuthorBookLink(SQLModel, table=True):
    author_id: int | None = Field(default=None, foreign_key="author.id", primary_key=True)
    book_id: int | None = Field(default=None, foreign_key="book.id", primary_key=True)