"""Модуль прочих эндпоинтов и веб-страниц"""
import os
import sys

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
from library_service.services import SchemaGenerator
from library_service import models


router = APIRouter(tags=["misc"])
generator = SchemaGenerator(models.db, models.dto)
templates = Jinja2Templates(directory=Path(__file__).parent.parent / "templates")


def get_info(app) -> Dict:
    """Возвращает информацию о приложении"""
    return {
        "status": "ok",
        "app_info": {
            "title": app.title,
            "version": app.version,
            "description": app.description.rsplit("|", 1)[0],
        },
        "server_time": datetime.now().isoformat(),
        "domain": os.getenv("DOMAIN", ""),
    }


@router.get("/", include_in_schema=False)
async def root(request: Request, app=Depends(lambda: get_app())):
    """Рендерит главную страницу"""
    return templates.TemplateResponse(request, "index.html", get_info(app) | {"title": "LiB - Библиотека"})


@router.get("/unknown", include_in_schema=False)
async def unknown(request: Request, app=Depends(lambda: get_app())):
    """Рендерит страницу 404 ошибки"""
    return templates.TemplateResponse(request, "unknown.html", get_info(app) | {"title": "LiB - Страница не найдена"})


@router.get("/genre/create", include_in_schema=False)
async def create_genre(request: Request, app=Depends(lambda: get_app())):
    """Рендерит страницу создания жанра"""
    return templates.TemplateResponse(request, "create_genre.html", get_info(app) | {"title": "LiB - Создать жанр"})


@router.get("/genre/{genre_id}/edit", include_in_schema=False)
async def edit_genre(request: Request, genre_id: int, app=Depends(lambda: get_app())):
    """Рендерит страницу редактирования жанра"""
    return templates.TemplateResponse(request, "edit_genre.html", get_info(app) | {"id": genre_id} | {"id": genre_id, "title": "LiB - Редактировать жанр"})


@router.get("/authors", include_in_schema=False)
async def authors(request: Request, app=Depends(lambda: get_app())):
    """Рендерит страницу списка авторов"""
    return templates.TemplateResponse(request, "authors.html", get_info(app) | {"title": "LiB - Авторы"})


@router.get("/author/create", include_in_schema=False)
async def create_author(request: Request, app=Depends(lambda: get_app())):
    """Рендерит страницу создания автора"""
    return templates.TemplateResponse(request, "create_author.html", get_info(app) | {"title": "LiB - Создать автора"})


@router.get("/author/{author_id}/edit", include_in_schema=False)
async def edit_author(request: Request, author_id: int, app=Depends(lambda: get_app())):
    """Рендерит страницу редактирования автора"""
    return templates.TemplateResponse(request, "edit_author.html", get_info(app) | {"id": author_id, "title": "LiB - Редактировать автора"})


@router.get("/author/{author_id}", include_in_schema=False)
async def author(request: Request, author_id: int, app=Depends(lambda: get_app())):
    """Рендерит страницу просмотра автора"""
    return templates.TemplateResponse(request, "author.html", get_info(app) | {"id": author_id, "title": "LiB - Автор"})


@router.get("/books", include_in_schema=False)
async def books(request: Request, app=Depends(lambda: get_app())):
    """Рендерит страницу списка книг"""
    return templates.TemplateResponse(request, "books.html", get_info(app) | {"title": "LiB - Книги"})


@router.get("/book/create", include_in_schema=False)
async def create_book(request: Request, app=Depends(lambda: get_app())):
    """Рендерит страницу создания книги"""
    return templates.TemplateResponse(request, "create_book.html", get_info(app) | {"title": "LiB - Создать книгу"})


@router.get("/book/{book_id}/edit", include_in_schema=False)
async def edit_book(request: Request, book_id: int, app=Depends(lambda: get_app())):
    """Рендерит страницу редактирования книги"""
    return templates.TemplateResponse(request, "edit_book.html", get_info(app) | {"id": book_id, "title": "LiB - Редактировать книгу"})


@router.get("/book/{book_id}", include_in_schema=False)
async def book(request: Request, book_id: int, app=Depends(lambda: get_app())):
    """Рендерит страницу просмотра книги"""
    return templates.TemplateResponse(request, "book.html", get_info(app) | {"id": book_id, "title": "LiB - Книга"})


@router.get("/auth", include_in_schema=False)
async def auth(request: Request, app=Depends(lambda: get_app())):
    """Рендерит страницу авторизации"""
    return templates.TemplateResponse(request, "auth.html", get_info(app) | {"title": "LiB - Авторизация"})


@router.get("/2fa", include_in_schema=False)
async def set2fa(request: Request, app=Depends(lambda: get_app())):
    """Рендерит страницу установки двухфакторной аутентификации"""
    return templates.TemplateResponse(request, "2fa.html", get_info(app) | {"title": "LiB - Двухфакторная аутентификация"})


@router.get("/profile", include_in_schema=False)
async def profile(request: Request, app=Depends(lambda: get_app())):
    """Рендерит страницу профиля пользователя"""
    return templates.TemplateResponse(request, "profile.html", get_info(app) | {"title": "LiB - Профиль"})


@router.get("/users", include_in_schema=False)
async def users(request: Request, app=Depends(lambda: get_app())):
    """Рендерит страницу управления пользователями"""
    return templates.TemplateResponse(request, "users.html", get_info(app) | {"title": "LiB - Пользователи"})


@router.get("/my-books", include_in_schema=False)
async def my_books(request: Request, app=Depends(lambda: get_app())):
    """Рендерит страницу моих книг пользователя"""
    return templates.TemplateResponse(request, "my_books.html", get_info(app) | {"title": "LiB - Мои книги"})


@router.get("/analytics", include_in_schema=False)
async def analytics(request: Request, app=Depends(lambda: get_app())):
    """Рендерит страницу аналитики выдач"""
    return templates.TemplateResponse(request, "analytics.html", get_info(app) | {"title": "LiB - Аналитика"})


@router.get("/favicon.ico", include_in_schema=False)
def redirect_favicon():
    """Редиректит на favicon.svg"""
    return RedirectResponse("/favicon.svg")


@router.get("/favicon.svg", include_in_schema=False)
async def favicon():
    """Возвращает иконку сайта"""
    return FileResponse(
        "library_service/static/favicon.svg", media_type="image/svg+xml"
    )


@router.get("/api", include_in_schema=False)
async def api(request: Request, app=Depends(lambda: get_app())):
    """Рендерит страницу с ссылками на документацию API"""
    return templates.TemplateResponse(request, "api.html", get_info(app))


@router.get(
    "/api/info",
    summary="Информация о сервисе",
    description="Возвращает общую информацию о системе",
)
async def api_info(app=Depends(lambda: get_app())):
    """Возвращает информацию о сервисе"""
    return JSONResponse(content=get_info(app))


@router.get(
    "/api/schema",
    summary="Информация о таблицах и связях",
    description="Возвращает схему базы данных с описаниями полей",
)
async def api_schema():
    """Возвращает информацию для создания er-диаграммы"""
    return generator.generate()


@router.get(
    "/api/stats",
    summary="Статистика сервиса",
    description="Возвращает статистическую информацию о системе",
)
async def api_stats(session: Session = Depends(get_session)):
    """Возвращает статистику системы"""
    authors = select(func.count()).select_from(Author)
    books = select(func.count()).select_from(Book)
    genres = select(func.count()).select_from(Genre)
    users = select(func.count()).select_from(User)
    return JSONResponse(
        content={
            "authors": session.exec(authors).one(),
            "books": session.exec(books).one(),
            "genres": session.exec(genres).one(),
            "users": session.exec(users).one(),
        }
    )
