"""Модуль настроек проекта"""

import os, logging
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from sqlmodel import Session, create_engine
from toml import load

load_dotenv()

with open("pyproject.toml", "r", encoding="utf-8") as f:
    _pyproject = load(f)

_APP_NAME = "library_service"

LOGGING_CONFIG = {
    "version": 1,
    "disable_existing_loggers": True,
    "formatters": {
        "json": {
            "class": "json_log_formatter.JSONFormatter",
            "format": "%(asctime)s %(name)s %(levelname)s %(message)s %(pathname)s %(lineno)d",
        },
    },
    "handlers": {
        "console": {
            "()": "rich.logging.RichHandler",
            "level": "INFO",
            "show_time": True,
            "show_path": True,
            "rich_tracebacks": True,
        },
        "file": {
            "class": "logging.FileHandler",
            "filename": Path(__file__).parent / "app.log",
            "formatter": "json",
            "level": "INFO",
        },
    },
    "loggers": {
        "uvicorn": {
            "handlers": [],
            "level": "INFO",
            "propagate": False,
        },
        _APP_NAME: {
            "handlers": ["console", "file"],
            "level": "INFO",
            "propagate": False,
        },
    },
}

OPENAPI_TAGS = [
    {"name": "authentication", "description": "Авторизация пользователя."},
    {"name": "authors", "description": "Действия с авторами."},
    {"name": "books", "description": "Действия с книгами."},
    {"name": "genres", "description": "Действия с жанрами."},
    {"name": "loans", "description": "Действия с выдачами."},
    {"name": "relations", "description": "Действия со связями."},
    {"name": "misc", "description": "Прочие."},
]


def get_app(lifespan=None, /) -> FastAPI:
    """Возвращает экземпляр FastAPI приложения"""
    project_cfg = _pyproject["project"]
    return FastAPI(
        title=project_cfg["name"],
        description=f"{project_cfg['description']} | [Вернуться на главную](/)",
        version=project_cfg["version"],
        lifespan=lifespan,
        openapi_tags=OPENAPI_TAGS,
    )


def get_logger(name: str = _APP_NAME) -> logging.Logger:
    """Возвращает логгер с указанным именем"""
    return logging.getLogger(name)


def get_session():
    """Возвращает сессию базы данных"""
    with Session(engine) as session:
        yield session


HOST = os.getenv("POSTGRES_HOST")
PORT = os.getenv("POSTGRES_PORT")
USER = os.getenv("POSTGRES_USER")
PASSWORD = os.getenv("POSTGRES_PASSWORD")
DATABASE = os.getenv("POSTGRES_DB")

if not all([HOST, PORT, USER, PASSWORD, DATABASE]):
    raise ValueError("Missing required POSTGRES environment variables")

POSTGRES_DATABASE_URL = f"postgresql://{USER}:{PASSWORD}@{HOST}:{PORT}/{DATABASE}"
engine = create_engine(POSTGRES_DATABASE_URL, echo=False, future=True)
