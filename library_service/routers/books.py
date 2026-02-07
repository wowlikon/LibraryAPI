"""Модуль работы с книгами"""
from typing_extensions import Annotated
from uuid import uuid4
import shutil

from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status, UploadFile, File
from ollama import Client
from pydantic import Field
from sqlalchemy import text, case, distinct
from sqlalchemy.orm import selectinload, defer
from sqlmodel import Session, select, col, func

from library_service.auth import RequireStaff, OptionalAuth
from library_service.services import transcode_image
from library_service.settings import get_session, OLLAMA_URL, BOOKS_PREVIEW_DIR
from library_service.models.enums import BookStatus
from library_service.models.db import (
    Author,
    AuthorBookLink,
    Book,
    GenreBookLink,
    Genre,
    BookUserLink,
)
from library_service.models.dto import (
    AuthorRead,
    BookCreate,
    BookList,
    BookRead,
    BookUpdate,
    GenreRead,
)
from library_service.models.dto.misc import (
    BookWithAuthorsAndGenres,
    BookFilteredList,
)


router = APIRouter(prefix="/books", tags=["books"])
ollama_client = Client(host=OLLAMA_URL)


def close_active_loan(session: Session, book_id: int) -> None:
    """Закрывает активную выдачу книги при изменении статуса"""
    active_loan = session.exec(
        select(BookUserLink)
        .where(BookUserLink.book_id == book_id) # ty: ignore
        .where(BookUserLink.returned_at == None) # ty: ignore
    ).first() # ty: ignore

    if active_loan:
        active_loan.returned_at = datetime.now(timezone.utc)
        session.add(active_loan)


from sqlalchemy import select, func, distinct, case, exists
from sqlalchemy.orm import selectinload


@router.get("/filter", response_model=BookFilteredList)
def filter_books(
    current_user: OptionalAuth,
    session: Session = Depends(get_session),
    q: str | None = Query(None, max_length=50, description="Поиск"),
    min_page_count: int | None = Query(None, ge=0),
    max_page_count: int | None = Query(None, ge=0),
    author_ids: List[Annotated[int, Field(gt=0)]] | None = Query(None),
    genre_ids: List[Annotated[int, Field(gt=0)]] | None = Query(None),
    page: int = Query(1, gt=0),
    size: int = Query(20, gt=0, le=100),
):
    statement = select(Book).options(
        selectinload(Book.authors), selectinload(Book.genres), defer(Book.embedding) # ty: ignore
    )

    if min_page_count:
        statement = statement.where(Book.page_count >= min_page_count) # ty: ignore
    if max_page_count:
        statement = statement.where(Book.page_count <= max_page_count) # ty: ignore

    if author_ids:
        statement = statement.where(
            exists().where(
                AuthorBookLink.book_id == Book.id, # ty: ignore
                AuthorBookLink.author_id.in_(author_ids), # ty: ignore
            )
        )

    if genre_ids:
        for genre_id in genre_ids:
            statement = statement.where(
                exists().where(
                    GenreBookLink.book_id == Book.id, GenreBookLink.genre_id == genre_id # ty: ignore
                )
            )

    count_statement = select(func.count()).select_from(statement.subquery())
    total = session.scalar(count_statement)

    if q:
        if current_user:
            emb = ollama_client.embeddings(model="mxbai-embed-large", prompt=q)["embedding"]
            distance_col = Book.embedding.cosine_distance(emb) # ty: ignore
            statement = statement.where(Book.embedding.is_not(None)) # ty: ignore

            keyword_match = case((Book.title.ilike(f"%{q}%"), 0), else_=1) # ty: ignore
            statement = statement.order_by(keyword_match, distance_col)
        else:
            statement = statement.where(Book.title.ilike(f"%{q}%")) # ty: ignore
            statement = statement.order_by(Book.id) # ty: ignore
    else:
        statement = statement.order_by(Book.id) # ty: ignore

    offset = (page - 1) * size
    statement = statement.offset(offset).limit(size)
    results = session.scalars(statement).unique().all()

    return BookFilteredList(books=results, total=total)


@router.post(
    "/",
    response_model=BookRead,
    summary="Создать книгу",
    description="Добавляет книгу в систему",
)
def create_book(
    book: BookCreate,
    current_user: RequireStaff,
    session: Session = Depends(get_session),
):
    """Создает новую книгу в системе"""
    full_text = book.title + " " + book.description
    emb = ollama_client.embeddings(model="mxbai-embed-large", prompt=full_text)
    db_book = Book(**book.model_dump(), embedding=emb["embedding"])

    session.add(db_book)
    session.commit()
    session.refresh(db_book)

    book_dict = {k: v for k, v in db_book.__dict__.items() if not k.startswith('_')}
    book_data = {k: v for k, v in book_dict.items() if k not in {"embedding", "preview_id"}}
    book_data["preview_urls"] = {
        "png": f"/static/books/{db_book.preview_id}.png",
        "jpeg": f"/static/books/{db_book.preview_id}.jpg",
        "webp": f"/static/books/{db_book.preview_id}.webp",
    } if db_book.preview_id else {}
    return BookRead(**book_data)


@router.get(
    "/",
    response_model=BookList,
    summary="Получить список книг",
    description="Возвращает список всех книг в системе",
)
def read_books(session: Session = Depends(get_session)):
    """Возвращает список всех книг"""
    books = session.exec(select(Book)).all() # ty: ignore

    books_data = []
    for book in books:
        book = book[0]
        book_dict = dict(book)

        book_data = {k: v for k, v in book_dict.items() if k not in {"embedding", "preview_id"}}

        book_data["preview_urls"] = {
            "png": f"/static/books/{book.preview_id}.png",
            "jpeg": f"/static/books/{book.preview_id}.jpg",
            "webp": f"/static/books/{book.preview_id}.webp",
        } if book.preview_id else {}

        books_data.append(book_data)

    return BookList(
        books=[BookRead(**book_data) for book_data in books_data],
        total=len(books),
    )


@router.get(
    "/{book_id}",
    response_model=BookWithAuthorsAndGenres,
    summary="Получить информацию о книге",
    description="Возвращает информацию о книге, её авторах и жанрах",
)
def get_book(
    book_id: int = Path(..., description="ID книги (целое число, > 0)", gt=0),
    session: Session = Depends(get_session),
):
    """Возвращает информацию о книге с авторами и жанрами"""
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )

    authors = session.scalars(
        select(Author).join(AuthorBookLink).where(AuthorBookLink.book_id == book_id) # ty: ignore
    ).all()

    author_reads = [AuthorRead(**author.model_dump()) for author in authors]

    genres = session.scalars(
        select(Genre).join(GenreBookLink).where(GenreBookLink.book_id == book_id) # ty: ignore
    ).all()

    genre_reads = [GenreRead(**genre.model_dump()) for genre in genres]

    book_dict = {k: v for k, v in book.__dict__.items() if not k.startswith('_')}
    book_data = {k: v for k, v in book_dict.items() if k not in {"embedding", "preview_id"}}
    book_data["preview_urls"] = {
        "png": f"/static/books/{book.preview_id}.png",
        "jpeg": f"/static/books/{book.preview_id}.jpg",
        "webp": f"/static/books/{book.preview_id}.webp",
    } if book.preview_id else {}
    book_data["authors"] = author_reads
    book_data["genres"] = genre_reads

    return BookWithAuthorsAndGenres(**book_data)


@router.put(
    "/{book_id}",
    response_model=BookRead,
    summary="Обновить информацию о книге",
    description="Обновляет информацию о книге в системе",
)
def update_book(
    current_user: RequireStaff,
    book_update: BookUpdate,
    book_id: int = Path(..., gt=0),
    session: Session = Depends(get_session),
):
    """Обновляет информацию о книге"""
    db_book = session.get(Book, book_id)
    if not db_book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )

    if book_update.status is not None:
        if book_update.status == BookStatus.BORROWED:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Статус 'borrowed' устанавливается только через выдачу книги",
            )

        if db_book.status == BookStatus.BORROWED:
            close_active_loan(session, book_id)

        db_book.status = book_update.status

    if book_update.title is not None or book_update.description is not None:
        if book_update.title is not None:
            db_book.title = book_update.title
        if book_update.description is not None:
            db_book.description = book_update.description

        full_text = (
            (book_update.title or db_book.title)
            + " "
            + (book_update.description or db_book.description)
        )
        emb = ollama_client.embeddings(model="mxbai-embed-large", prompt=full_text)
        db_book.embedding = emb["embedding"]

    if book_update.page_count is not None:
        db_book.page_count = book_update.page_count

    session.add(db_book)
    session.commit()
    session.refresh(db_book)

    book_data = db_book.model_dump(exclude={"embedding", "preview_id"})
    book_data["preview_urls"] = {
        "png": f"/static/books/{db_book.preview_id}.png",
        "jpeg": f"/static/books/{db_book.preview_id}.jpg",
        "webp": f"/static/books/{db_book.preview_id}.webp",
    } if db_book.preview_id else {}

    return BookRead(**book_data)


@router.delete(
    "/{book_id}",
    response_model=BookRead,
    summary="Удалить книгу",
    description="Удаляет книгу их системы",
)
def delete_book(
    current_user: RequireStaff,
    book_id: int = Path(..., description="ID книги (целое число, > 0)", gt=0),
    session: Session = Depends(get_session),
):
    """Удаляет книгу из системы"""
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )
    book_read = BookRead(
        id=(book.id or 0),
        title=book.title,
        description=book.description,
        page_count=book.page_count,
        status=book.status,
    )
    session.delete(book)
    session.commit()
    return book_read

@router.post("/{book_id}/preview")
async def upload_book_preview(
    current_user: RequireStaff,
    file: UploadFile = File(...),
    book_id: int = Path(..., gt=0),
    session: Session = Depends(get_session)
):
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Image required",
        )

    if (file.size or 0) > 32 * 1024 * 1024:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File larger than 10 MB",
        )

    file_uuid= uuid4()
    tmp_path = BOOKS_PREVIEW_DIR / f"{file_uuid}.upload"

    with open(tmp_path, "wb") as f:
        shutil.copyfileobj(file.file, f)

    book = session.get(Book, book_id)
    if not book:
        tmp_path.unlink()
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Book not found",
        )

    transcode_image(tmp_path)
    tmp_path.unlink()

    if book.preview_id:
        for path in BOOKS_PREVIEW_DIR.glob(f"{book.preview_id}.*"):
            if path.exists():
                path.unlink(missing_ok=True)

    book.preview_id = file_uuid
    session.add(book)
    session.commit()

    return {
            "preview": {
                "png": f"/static/books/{file_uuid}.png",
                "jpeg": f"/static/books/{file_uuid}.jpg",
                "webp": f"/static/books/{file_uuid}.webp",
            }
        }


@router.delete("/{book_id}/preview")
async def remove_book_preview(
    current_user: RequireStaff,
    book_id: int = Path(..., gt=0),
    session: Session = Depends(get_session)
):
    book = session.get(Book, book_id)
    if not book:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Book not found")

    if book.preview_id:
        for path in BOOKS_PREVIEW_DIR.glob(f"{book.preview_id}.*"):
            if path.exists():
                path.unlink(missing_ok=True)

    book.preview_id = None
    session.add(book)
    session.commit()

    return {"preview_urls": []}
