"""Основной модуль"""

import asyncio, psutil, sys, traceback
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from time import perf_counter
from uuid import uuid4

from alembic import command
from alembic.config import Config
from fastapi import FastAPI, Depends, Request, Response, status, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
from ollama import Client, ResponseError
from sqlmodel import Session

from library_service.auth import run_seeds
from library_service.routers import api_router
from library_service.routers.misc import unknown
from library_service.services.captcha import limiter, cleanup_task, require_captcha
from library_service.settings import (
    LOGGING_CONFIG,
    engine,
    get_app,
    get_logger,
    OLLAMA_URL,
)


SKIP_LOGGING_PATHS = frozenset({"/favicon.ico", "/favicon.svg"})


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
        ollama_client.pull("mxbai-embed-large")

        total_memory_bytes = psutil.virtual_memory().total
        total_memory_gb = total_memory_bytes / (1024 ** 3)
        if total_memory_gb > 5:
            ollama_client.pull("qwen3:4b")

    except ResponseError as e:
        logger.error(f"[-] Failed to pull models {e}")

    asyncio.create_task(cleanup_task())
    logger.info("[+] Starting application...")
    yield  # Обработка запросов
    logger.info("[+] Application shutdown")


app = get_app(lifespan)


@app.exception_handler(status.HTTP_404_NOT_FOUND)
async def custom_not_found_handler(request: Request, exc: HTTPException):
    if exc.detail == "Not Found":
        path = request.url.path

        if path.startswith("/api/"):
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"detail": "API endpoint not found", "path": path},
            )
        return await unknown(request, app)

    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )


@app.middleware("http")
async def catch_exceptions_middleware(request: Request, call_next):
    """Middleware для подробного json-описания Internal error"""
    try:
        return await call_next(request)
    except Exception as exc:
        exc_type, exc_value, exc_tb = sys.exc_info()
        logger = get_logger()
        logger.exception(exc)

        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={
                "message": str(exc),
                "type": exc_type.__name__ if exc_type else "Unknown",
                "path": str(request.url),
                "method": request.method,
            },
        )


@app.middleware("http")
async def log_requests(request: Request, call_next):
    """Middleware для логирования HTTP-запросов"""
    path = request.url.path
    if path.startswith("/static") or path in SKIP_LOGGING_PATHS:
        return await call_next(request)

    logger = get_logger()
    request_id = uuid4().hex[:8]
    timestamp = datetime.now().isoformat()
    method = request.method
    url = str(request.url)
    user_agent = request.headers.get("user-agent", "Unknown")
    client_ip = request.client.host if request.client else None

    start_time = perf_counter()

    try:
        logger.debug(
            f"[{request_id}] Starting: {method} {url}",
            extra={"request_id": request_id, "user_agent": user_agent},
        )

        response: Response = await call_next(request)
        process_time = perf_counter() - start_time

        logger.info(
            f"[{request_id}] {method} {url} - {response.status_code} - {process_time:.4f}s",
            extra={
                "request_id": request_id,
                "timestamp": timestamp,
                "method": method,
                "url": url,
                "status": response.status_code,
                "process_time": process_time,
                "client_ip": client_ip,
                "user_agent": user_agent,
            },
        )
        return response

    except Exception as e:
        process_time = perf_counter() - start_time
        logger.error(
            f"[{request_id}] {method} {url} - Error: {e} - {process_time:.4f}s",
            extra={
                "request_id": request_id,
                "timestamp": timestamp,
                "method": method,
                "url": url,
                "error": str(e),
                "process_time": process_time,
                "client_ip": client_ip,
                "user_agent": user_agent,
            },
            exc_info=True,
        )
        return Response(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content="Internal Server Error",
        )


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
        host="0.0.0.0",
        port=8000,
        proxy_headers=True,
        forwarded_allow_ips="*",
        log_config=LOGGING_CONFIG,
        access_log=False,
    )
