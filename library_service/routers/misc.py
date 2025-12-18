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
    return templates.TemplateResponse(request, "index.html", get_info(app))


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


@router.get("/static/{path:path}", include_in_schema=False)
async def serve_static(path: str):
    """Статические файлы"""
    static_dir = Path(__file__).parent.parent / "static"
    file_path = static_dir / path

    if not file_path.is_file() or not file_path.is_relative_to(static_dir):
        return JSONResponse(status_code=404, content={"error": "File not found"})

    return FileResponse(file_path)


@router.get(
    "/api/info",
    summary="Информация о сервисе",
    description="Возвращает информацию о системе",
)
async def api_info(app=Depends(get_app)):
    """Эндпоинт информации об API"""
    return JSONResponse(content=get_info(app))
