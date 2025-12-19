"""Основной модуль"""
from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session

from .auth import run_seeds
from .routers import api_router
from .settings import engine, get_app, get_logger


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Жизненный цикл сервиса"""
    logger = get_logger("uvicorn")
    logger.info("[+] Initializing database...")

    try:
        with engine.begin() as connection:
            alembic_cfg = Config("alembic.ini")
            alembic_cfg.attributes["configure_logging"] = False
            alembic_cfg.attributes["connection"] = connection
            command.upgrade(alembic_cfg, "head")
    except Exception as e:
        logger.error(f"[-] Migration failed: {e}")
        raise e

    logger.info("[+] Running seeds...")
    try:
        with Session(engine) as session:
            run_seeds(session)
        logger.info("[+] Database setup completed.")
    except Exception as e:
        logger.error(f"[-] Seeding failed: {e}")

    logger.info("[+] Starting application...")
    yield  # Обработка запросов
    logger.info("[+] Application shutdown")


app = get_app(lifespan)


# Подключение маршрутов
app.include_router(api_router)
static_path = Path(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=static_path), name="static")
