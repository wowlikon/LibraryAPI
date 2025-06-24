from fastapi import APIRouter

from .authors import router as authors_router
from .books import router as books_router
from .relationships import router as relationships_router
from .misc import router as misc_router

api_router = APIRouter()

# Including all routers
api_router.include_router(authors_router)
api_router.include_router(books_router)
api_router.include_router(relationships_router)
api_router.include_router(misc_router)
