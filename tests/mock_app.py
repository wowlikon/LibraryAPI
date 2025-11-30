from fastapi import FastAPI
from tests.mock_routers import books, authors, genres, relationships
from library_service.routers.misc import router as misc_router


def create_mock_app() -> FastAPI:
    """Create FastAPI app with mock routers for testing"""
    app = FastAPI(
        title="Library API Test",
        description="Library API for testing without database",
        version="1.0.0",
    )

    # Include mock routers
    app.include_router(books.router)
    app.include_router(authors.router)
    app.include_router(genres.router)
    app.include_router(relationships.router)

    # Include real misc router (it doesn't use database)
    app.include_router(misc_router)

    return app


mock_app = create_mock_app()
