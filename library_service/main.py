from alembic import command
from alembic.config import Config
from contextlib import asynccontextmanager
from fastapi import FastAPI
from toml import load

from .settings import engine, get_app
from .routers import api_router
from .routers.misc import get_info

app = get_app()
alembic_cfg = Config("alembic.ini")

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("[+] Initializing...")

    # Initialize the database
    with engine.begin() as connection:
        alembic_cfg.attributes['connection'] = connection
        command.upgrade(alembic_cfg, "head")

    print("[+] Starting...")
    yield  # Here FastAPI will start handling requests;
    print("[+] Application shutdown")

# Include routers
app.include_router(api_router)
