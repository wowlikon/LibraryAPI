"""Основной модуль"""
from library_service.services.embeddings import ensure_embeddings
from starlette.middleware.base import BaseHTTPMiddleware

import asyncio, sys, traceback
from contextlib import asynccontextmanager
from pathlib import Path

from alembic import command
from alembic.config import Config
from fastapi import status, Request, Response, HTTPException
from fastapi.staticfiles import StaticFiles
from ollama import Client, ResponseError
from sqlmodel import Session

from library_service.auth import run_seeds
from library_service.routers import api_router
from library_service.services.captcha import limiter, cleanup_task, require_captcha
from library_service.middlewares import catch_exception_middleware, log_request_middleware, not_found_handler
from library_service.settings import (
    LOGGING_CONFIG,
    engine,
    get_app,
    get_logger,
    OLLAMA_URL,
    ASSISTANT_LLM, EMBEDDINGS_MODEL, REGENERATE_EMBEDDINGS_FORCE, SKIP_REGENERATE_EMBEDDINGS,
)


@asynccontextmanager
async def lifespan(_):
    """Жизненный цикл сервиса"""
    logger = get_logger()
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

    logger.info("[+] Loading ollama models...")
    try:
        ollama_client = Client(host=OLLAMA_URL)
        ollama_client.pull(EMBEDDINGS_MODEL)

        if ASSISTANT_LLM:
            ollama_client.pull(ASSISTANT_LLM)
        else:
            logger.info("[=] AI-assistant is not available")

    except ResponseError as e:
        logger.error(f"[-] Failed to pull models {e}")

    ensure_embeddings(REGENERATE_EMBEDDINGS_FORCE, SKIP_REGENERATE_EMBEDDINGS)

    asyncio.create_task(cleanup_task())
    logger.info("[+] Starting application...")
    yield  # Обработка запросов
    logger.info("[+] Application shutdown")


app = get_app(lifespan)
app.add_middleware(BaseHTTPMiddleware, dispatch=log_request_middleware)  # type: ignore[arg-type]
app.add_middleware(BaseHTTPMiddleware, dispatch=catch_exception_middleware)  # type: ignore[arg-type]
app.add_exception_handler(status.HTTP_404_NOT_FOUND, not_found_handler)  # type: ignore[arg-type]


# Подключение маршрутов
app.include_router(api_router)
app.mount(
    "/static",
    StaticFiles(directory=Path(__file__).parent / "static"),
    name="static",
)


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "library_service.main:app",
        host="0.0.0.0", port=8000,
        proxy_headers=True,
        forwarded_allow_ips="*",
        log_config=LOGGING_CONFIG,
        access_log=False,
    )
