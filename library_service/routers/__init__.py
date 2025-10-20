from fastapi import APIRouter

from .authors import router as authors_router
from .books import router as books_router
from .genres import router as genres_router
from .relationships import router as relationships_router
from .misc import router as misc_router

api_router = APIRouter()

# Подключение всех маршрутов
api_router.include_router(authors_router)
api_router.include_router(books_router)
api_router.include_router(genres_router)
api_router.include_router(relationships_router)
api_router.include_router(misc_router)
