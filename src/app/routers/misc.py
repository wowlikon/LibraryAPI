from fastapi import APIRouter, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from pathlib import Path
from datetime import datetime
from typing import Dict

# Инициализация шаблонов
templates = Jinja2Templates(directory=Path(__file__).parent.parent / "templates")

router = APIRouter(tags=["misc"])

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

# Root endpoint
@router.get("/", response_class=HTMLResponse)
async def root(request: Request, app=None):
    return templates.TemplateResponse("index.html", {"request": request, "data": get_info(app)})

# API Information endpoint
@router.get("/api/info")
async def api_info(app=None):
    return JSONResponse(content=get_info(app))