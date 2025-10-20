from alembic import command
from alembic.config import Config
from contextlib import asynccontextmanager
from fastapi import FastAPI
from toml import load

from .settings import engine, get_app
from .routers import api_router
from .routers.misc import get_info

app = get_app()
alembic_cfg = Config("alembic.ini")


@asynccontextmanager
async def lifespan(app: FastAPI):
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
