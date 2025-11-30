from sqlmodel import SQLModel
from pydantic import ConfigDict
from typing import Optional, List


class BookBase(SQLModel):
    title: str
    description: str

    model_config = ConfigDict(  # pyright: ignore
        json_schema_extra={
            "example": {"title": "book_title", "description": "book_description"}
        }
    )


class BookCreate(BookBase):
    pass


class BookUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None


class BookRead(BookBase):
    id: int


class BookList(SQLModel):
    books: List[BookRead]
    total: int
