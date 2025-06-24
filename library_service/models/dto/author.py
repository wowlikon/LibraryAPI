from sqlmodel import SQLModel
from pydantic import ConfigDict
from typing import Optional, List

class AuthorBase(SQLModel):
    name: str

    model_config = ConfigDict( #pyright: ignore
        json_schema_extra={
            "example": {"name": "author_name"}
        }
    )

class AuthorCreate(AuthorBase):
    pass

class AuthorUpdate(SQLModel):
    name: Optional[str] = None

class AuthorRead(AuthorBase):
    id: int

class AuthorList(SQLModel):
    authors: List[AuthorRead]
    total: int
