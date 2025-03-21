from pydantic import BaseModel
from pydantic import Field
from typing import List
from datetime import date
from uuid import uuid4

class Author(BaseModel):
    first_name: str = Field(title="Имя", description="Имя автора")
    last_name: str = Field(title="Фамилия", description="Фамилия автора")

class NewBook(BaseModel):
    title: str = Field(title="Название", description="Название книги")
    authors: List[Author] = Field(title="Авторы", description="Авторы книги")
    pages: int = Field(title="Количество страниц", description="Количество страниц в книге")

class Book(NewBook):
    id: int = Field(title="Идентификатор", description="Уникальный идентификатор элемента")

    class Config:
        exclude = {'id'}