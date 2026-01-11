"""Основной модуль"""
from contextlib import asynccontextmanager
from datetime import datetime
from pathlib import Path
from time import perf_counter
from uuid import uuid4

from alembic import command
from alembic.config import Config
from fastapi import Request, Response
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session

from library_service.auth import run_seeds
from library_service.routers import api_router
from library_service.settings import (
    LOGGING_CONFIG,
    engine,
    get_app,
    get_logger,
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

    logger.info("[+] Starting application...")
    yield  # Обработка запросов
    logger.info("[+] Application shutdown")


app = get_app(lifespan)


# Улучшеное логгирование
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
        return Response(status_code=500, content="Internal Server Error")


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
        log_config=LOGGING_CONFIG,
        access_log=False,
    )
