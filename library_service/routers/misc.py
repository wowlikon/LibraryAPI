"""Модуль прочих эндпоинтов"""
from datetime import datetime
from pathlib import Path
from typing import Dict

from fastapi import APIRouter, Request
from fastapi.params import Depends
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates

from library_service.settings import get_app


router = APIRouter(tags=["misc"])
templates = Jinja2Templates(directory=Path(__file__).parent.parent / "templates")


def get_info(app) -> Dict:
    """Форматированная информация о приложении"""
    return {
        "status": "ok",
        "app_info": {
            "title": app.title,
            "version": app.version,
            "description": app.description,
        },
        "server_time": datetime.now().isoformat(),
    }


@router.get("/", include_in_schema=False)
async def root(request: Request, app=Depends(get_app)):
    """Эндпоинт главной страницы"""
    return RedirectResponse("/books")


@router.get("/books", include_in_schema=False)
async def books(request: Request, app=Depends(get_app)):
    """Эндпоинт страницы выбора книг"""
    return templates.TemplateResponse(request, "books.html", get_info(app))


@router.get("/auth", include_in_schema=False)
async def root(request: Request, app=Depends(get_app)):
    """Эндпоинт страницы авторизации"""
    return templates.TemplateResponse(request, "auth.html", get_info(app))



@router.get("/api", include_in_schema=False)
async def root(request: Request, app=Depends(get_app)):
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
    description="Возвращает информацию о системе",
)
async def api_info(app=Depends(get_app)):
    """Эндпоинт информации об API"""
    return JSONResponse(content=get_info(app))
