"""Основной модуль"""
from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from .routers import api_router
from .settings import engine, get_app

app = get_app()
alembic_cfg = Config("alembic.ini")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Жизененый цикл сервиса"""
    print("[+] Initializing...")

    # Настройка базы данных
    with engine.begin() as connection:
        alembic_cfg.attributes["connection"] = connection
        command.upgrade(alembic_cfg, "head")

    print("[+] Starting...")
    yield  # Обработка запросов
    print("[+] Application shutdown")


# Подключение маршрутов
app.include_router(api_router)
static_path = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=static_path), name="static")
