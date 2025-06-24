import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlmodel import select, delete, Session

from library_service.main import app
from tests.test_misc import setup_database

client = TestClient(app)

#TODO: assert descriptions
#TODO: add comments
#TODO: update tests

def test_create_book(setup_database):
    response = client.post("/books", json={"title": "Test Book", "description": "Test Description"})
    print(response.json())
    assert response.status_code == 200
    assert response.json() == {"id": 1, "title": "Test Book", "description": "Test Description"}

def test_get_existing_book(setup_database):
    response = client.get("/books/1")
    print(response.json())
    assert response.status_code == 200
    assert response.json() == {"id": 1, "title": "Test Book", "description": "Test Description", 'authors': []}

def test_get_not_existing_book(setup_database):
    response = client.get("/books/2")
    print(response.json())
    assert response.status_code == 404
    assert response.json() == {"detail": "Book not found"}

def test_update_book(setup_database):
    response = client.get("/books/1")
    assert response.status_code == 200
    response = client.put("/books/1", json={"title": "Updated Book", "description": "Updated Description"})
    assert response.status_code == 200
    assert response.json() == {"id": 1, "title": "Updated Book", "description": "Updated Description"}

def test_update_not_existing_book(setup_database):
    response = client.put("/books/2", json={"title": "Updated Book", "description": "Updated Description"})
    assert response.status_code == 404
    assert response.json() == {"detail": "Book not found"}

def test_delete_book(setup_database):
    response = client.get("/books/1")
    assert response.status_code == 200
    response = client.delete("/books/1")
    assert response.status_code == 200
    assert response.json() == {"id": 1, "title": "Updated Book", "description": "Updated Description"}

def test_not_existing_delete_book(setup_database):
    response = client.delete("/books/2")
    assert response.status_code == 404
    assert response.json() == {"detail": "Book not found"}

#TODO: add tests for other books endpoints
