from fastapi import FastAPI

from library_service.routers.misc import router as misc_router
from tests.mock_routers import authors, books, genres, relationships


def create_mock_app() -> FastAPI:
    """Создание FastAPI app с моками роутеров для тестов"""
    app = FastAPI(
        title="Library API Test",
        description="Library API for testing without database",
        version="1.0.0",
    )

    # Подключение мок-роутеров
    app.include_router(books.router)
    app.include_router(authors.router)
    app.include_router(genres.router)
    app.include_router(relationships.router)

    # Подключение реального misc роутера
    app.include_router(misc_router)

    return app


mock_app = create_mock_app()
