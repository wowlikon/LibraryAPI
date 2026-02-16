from datetime import datetime
from time import perf_counter
from uuid import uuid4

from fastapi import Request, Response, status

from library_service.settings import get_logger


SKIP_LOGGING_PATHS = frozenset({"/favicon.ico", "/favicon.svg"})


async def log_request_middleware(request: Request, call_next):
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
