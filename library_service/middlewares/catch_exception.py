import sys

from fastapi import Request, status
from fastapi.responses import JSONResponse

from library_service.settings import get_logger


async def catch_exception_middleware(request: Request, call_next):
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
                "method": request.method,
                "path": str(request.url),
                "type": exc_type.__name__ if exc_type else "Unknown",
                # "message": str(exc),  # DEBUG ONLY!
            },
        )
