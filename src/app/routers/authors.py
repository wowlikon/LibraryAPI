from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from typing import List

from ..database import get_session
from ..models import Author, AuthorBase

router = APIRouter(prefix="/authors", tags=["authors"])

# Create an author
@router.post("/", response_model=Author)
def create_author(author: AuthorBase, session: Session = Depends(get_session)):
    db_author = Author(name=author.name)
    session.add(db_author)
    session.commit()
    session.refresh(db_author)
    return db_author

# Read authors
@router.get("/", response_model=List[Author])
def read_authors(session: Session = Depends(get_session)):
    authors = session.exec(select(Author)).all()
    return authors

# Update an author
@router.put("/{author_id}", response_model=Author)
def update_author(author_id: int, author: AuthorBase, session: Session = Depends(get_session)):
    db_author = session.get(Author, author_id)
    if not db_author:
        raise HTTPException(status_code=404, detail="Author not found")
    db_author.name = author.name
    session.commit()
    session.refresh(db_author)
    return db_author

# Delete an author
@router.delete("/{author_id}", response_model=AuthorBase)
def delete_author(author_id: int, session: Session = Depends(get_session)):
    db_author = session.get(Author, author_id)
    if not db_author:
        raise HTTPException(status_code=404, detail="Author not found")
    session.delete(db_author)
    author = AuthorBase(name=db_author.name)
    session.commit()
    return author