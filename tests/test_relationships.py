import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlmodel import select, delete, Session

from library_service.main import app
from tests.test_misc import setup_database

client = TestClient(app)

#TODO: add tests for relationships endpoints
