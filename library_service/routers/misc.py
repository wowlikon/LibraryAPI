"""Модуль прочих эндпоинтов"""
from datetime import datetime
from pathlib import Path
from typing import Dict

from fastapi import APIRouter, Request
from fastapi.params import Depends
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlmodel import Session, select, func

from library_service.settings import get_app, get_session
from library_service.models.db import Author, Book, Genre, User


router = APIRouter(tags=["misc"])
templates = Jinja2Templates(directory=Path(__file__).parent.parent / "templates")


def get_info(app) -> Dict:
    """Форматированная информация о приложении"""
    return {
        "status": "ok",
        "app_info": {
            "title": app.title,
            "version": app.version,
            "description": app.description.rsplit('|', 1)[0],
        },
        "server_time": datetime.now().isoformat(),
    }


@router.get("/", include_in_schema=False)
async def root(request: Request):
    """Эндпоинт главной страницы"""
    return templates.TemplateResponse(request, "index.html")


@router.get("/authors", include_in_schema=False)
async def authors(request: Request):
    """Эндпоинт страницы выбора автора"""
    return templates.TemplateResponse(request, "authors.html")


@router.get("/author/{author_id}", include_in_schema=False)
async def author(request: Request, author_id: int):
    """Эндпоинт страницы автора"""
    return templates.TemplateResponse(request, "author.html")


@router.get("/books", include_in_schema=False)
async def books(request: Request):
    """Эндпоинт страницы выбора книг"""
    return templates.TemplateResponse(request, "books.html")


@router.get("/book/{book_id}", include_in_schema=False)
async def book(request: Request, book_id: int):
    """Эндпоинт страницы книги"""
    return templates.TemplateResponse(request, "book.html")


@router.get("/auth", include_in_schema=False)
async def auth(request: Request):
    """Эндпоинт страницы авторизации"""
    return templates.TemplateResponse(request, "auth.html")


@router.get("/profile", include_in_schema=False)
async def profile(request: Request):
    """Эндпоинт страницы профиля"""
    return templates.TemplateResponse(request, "profile.html")


@router.get("/api", include_in_schema=False)
async def api(request: Request, app=Depends(lambda: get_app())):
    """Страница с сылками на документацию API"""
    return templates.TemplateResponse(request, "api.html", get_info(app))


@router.get("/favicon.ico", include_in_schema=False)
def redirect_favicon():
    """Редирект иконки вкладки"""
    return RedirectResponse("/favicon.svg")


@router.get("/favicon.svg", include_in_schema=False)
async def favicon():
    """Эндпоинт иконки вкладки"""
    return FileResponse(
        "library_service/static/favicon.svg", media_type="image/svg+xml"
    )


@router.get(
    "/api/info",
    summary="Информация о сервисе",
    description="Возвращает общую информацию о системе",
)
async def api_info(app=Depends(lambda: get_app())):
    """Эндпоинт информации об API"""
    return JSONResponse(content=get_info(app))


@router.get(
    "/api/stats",
    summary="Статистика сервиса",
    description="Возвращает статистическую информацию о системе",
)
async def api_stats(session: Session = Depends(get_session)):
    """Эндпоинт стстистики системы"""
    authors = select(func.count()).select_from(Author)
    books = select(func.count()).select_from(Book)
    genres = select(func.count()).select_from(Genre)
    users = select(func.count()).select_from(User)
    return JSONResponse(content={
        "authors": session.exec(authors).one(),
        "books": session.exec(books).one(),
        "genres": session.exec(genres).one(),
        "users": session.exec(users).one(),
    })
