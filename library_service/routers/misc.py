from fastapi import APIRouter, Path, Request, FastAPI
from fastapi.params import Depends
from fastapi.responses import FileResponse, HTMLResponse, JSONResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from pathlib import Path
from datetime import datetime
from typing import Dict

from library_service.settings import get_app

# Загрузка шаблонов
templates = Jinja2Templates(directory=Path(__file__).parent.parent / "templates")

router = APIRouter(tags=["misc"])


# Форматированная информация о приложении
def get_info(app) -> Dict:
    return {
        "status": "ok",
        "app_info": {
            "title": app.title,
            "version": app.version,
            "description": app.description,
        },
        "server_time": datetime.now().isoformat(),
    }


# Эндпоинт главной страницы
@router.get("/", include_in_schema=False)
async def root(request: Request, app=Depends(get_app)):
    return templates.TemplateResponse(request, "index.html", get_info(app))


# Редирект иконки вкладки
@router.get("/favicon.ico", include_in_schema=False)
def redirect_favicon():
    return RedirectResponse("/favicon.svg")


# Эндпоинт иконки вкладки
@router.get("/favicon.svg", include_in_schema=False)
async def favicon():
    return FileResponse("library_service/favicon.svg", media_type="image/svg+xml")


# Эндпоинт информации об API
@router.get(
    "/api/info",
    summary="Информация о сервисе",
    description="Возвращает информацию о системе",
)
async def api_info(app=Depends(get_app)):
    return JSONResponse(content=get_info(app))
