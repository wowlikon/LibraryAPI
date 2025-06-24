import os
from dotenv import load_dotenv
from fastapi import FastAPI
from sqlmodel import create_engine, SQLModel, Session
from toml import load

load_dotenv()

with open("pyproject.toml") as f:
    config = load(f)

# Dependency to get the FastAPI application instance
def get_app() -> FastAPI:
    return FastAPI(
        title=config["tool"]["poetry"]["name"],
        description=config["tool"]["poetry"]["description"],
        version=config["tool"]["poetry"]["version"],
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

USER = os.getenv("POSTGRES_USER")
PASSWORD = os.getenv("POSTGRES_PASSWORD")
DATABASE = os.getenv("POSTGRES_DB")
HOST = os.getenv("POSTGRES_SERVER")

if not USER or not PASSWORD or not DATABASE or not HOST:
    raise ValueError("Missing environment variables")

POSTGRES_DATABASE_URL = f"postgresql://{USER}:{PASSWORD}@{HOST}:5432/{DATABASE}"
engine = create_engine(POSTGRES_DATABASE_URL, echo=True, future=True)

# Dependency to get a database session
def get_session():
    with Session(engine) as session:
        yield session
