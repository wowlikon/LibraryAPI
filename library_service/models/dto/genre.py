from sqlmodel import SQLModel
from pydantic import ConfigDict
from typing import Optional, List

class GenreBase(SQLModel):
    name: str

    model_config = ConfigDict( #pyright: ignore
        json_schema_extra={
            "example": {"name": "genre_name"}
        }
    )

class GenreCreate(GenreBase):
    pass

class GenreUpdate(SQLModel):
    name: Optional[str] = None

class GenreRead(GenreBase):
    id: int

class GenreList(SQLModel):
    genres: List[GenreRead]
    total: int
