from alembic import command
from alembic.config import Config
from fastapi import FastAPI
from sqlmodel import SQLModel

from .database import engine
from .routers import api_router
from .routers.misc import get_info

alembic_cfg = Config("alembic.ini")

app = FastAPI(
    title="LibraryAPI",
    description="This is a sample API for managing authors and books.",
    version="1.0.1",
    openapi_tags=[
        {
            "name": "authors",
            "description": "Operations with authors.",
        },
        {
            "name": "books",
            "description": "Operations with books.",
        },
        {
            "name": "relations",
            "description": "Operations with relations.",
        },
        {
            "name": "misc",
            "description": "Miscellaneous operations.",
        }
    ]
)

# Initialize the database
@app.on_event("startup")
def on_startup():
    # Apply database migrations
    with engine.begin() as connection:
        alembic_cfg.attributes['connection'] = connection
        command.upgrade(alembic_cfg, "head")

# Include routers
app.include_router(api_router)
