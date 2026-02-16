from fastapi import Request, Response, status, HTTPException
from fastapi.responses import JSONResponse

from library_service.settings import get_app
from library_service.routers.misc import unknown


async def not_found_handler(request: Request, exc: HTTPException):
    """Middleware для обработки 404 ошибки"""
    if exc.detail == "Not Found":
        path = request.url.path

        if path.startswith("/api/"):
            return JSONResponse(
                status_code=status.HTTP_404_NOT_FOUND,
                content={"detail": "API endpoint not found", "path": path},
            )
        app = get_app()
        return await unknown(request, app)

    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail},
    )
