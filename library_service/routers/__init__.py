"""Модуль объединения роутеров"""
from fastapi import APIRouter

from .auth import router as auth_router
from .authors import router as authors_router
from .books import router as books_router
from .genres import router as genres_router
from .loans import router as loans_router
from .relationships import router as relationships_router
from .misc import router as misc_router


api_router = APIRouter()


# Подключение всех маршрутов
api_router.include_router(misc_router)
api_router.include_router(auth_router, prefix="/api")
api_router.include_router(authors_router, prefix="/api")
api_router.include_router(books_router, prefix="/api")
api_router.include_router(genres_router, prefix="/api")
api_router.include_router(loans_router, prefix="/api")
api_router.include_router(relationships_router, prefix="/api")
