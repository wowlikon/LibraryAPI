from fastapi import APIRouter, Request, FastAPI
from fastapi.params import Depends
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from pathlib import Path
from datetime import datetime
from typing import Dict

from httpx import get

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
@router.get("/", response_class=HTMLResponse)
async def root(request: Request, app=Depends(get_app)):
    return templates.TemplateResponse(request, "index.html", get_info(app))


# Эндпоинт информации об API
@router.get("/api/info")
async def api_info(app=Depends(get_app)):
    return JSONResponse(content=get_info(app))
