"""Модуль настроек проекта"""
import os, logging

from dotenv import load_dotenv
from fastapi import FastAPI
from sqlmodel import Session, create_engine
from toml import load

load_dotenv()

with open("pyproject.toml", 'r', encoding='utf-8') as f:
    config = load(f)


def get_app(lifespan=None) -> FastAPI:
    """Dependency для получения экземпляра FastAPI application"""
    if not hasattr(get_app, 'instance'):
        get_app.instance = FastAPI(
            title=config["tool"]["poetry"]["name"],
            description=config["tool"]["poetry"]["description"],
            version=config["tool"]["poetry"]["version"],
            lifespan=lifespan,
            openapi_tags=[
                {
                    "name": "authentication",
                    "description": "Авторизация пользователя."
                },
                {
                    "name": "authors",
                    "description": "Действия с авторами.",
                },
                {
                    "name": "books",
                    "description": "Действия с книгами.",
                },
                {
                    "name": "genres",
                    "description": "Действия с жанрами.",
                },
                {
                    "name": "relations",
                    "description": "Действия с связями.",
                },
                {
                    "name": "misc",
                    "description": "Прочие.",
                },
            ],
        )
    return get_app.instance


HOST = os.getenv("POSTGRES_HOST")
PORT = os.getenv("POSTGRES_PORT")
USER = os.getenv("POSTGRES_USER")
PASSWORD = os.getenv("POSTGRES_PASSWORD")
DATABASE = os.getenv("POSTGRES_DB")

if not USER or not PASSWORD or not DATABASE or not HOST:
    raise ValueError("Missing environment variables")

POSTGRES_DATABASE_URL = f"postgresql://{USER}:{PASSWORD}@{HOST}:{PORT}/{DATABASE}"
engine = create_engine(POSTGRES_DATABASE_URL, echo=False, future=True)


def get_session():
    """Dependency, для получение сессии БД"""
    with Session(engine) as session:
        yield session


def get_logger(name: str = "uvicorn"):
    """Dependency, для получение логгера"""
    return logging.getLogger(name)
