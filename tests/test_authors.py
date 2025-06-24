import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlmodel import select, delete, Session

from library_service.main import app
from tests.test_misc import setup_database

client = TestClient(app)

#TODO: add tests for author endpoints

def test_empty_list_authors(setup_database):
    response = client.get("/authors")
    print(response.json())
    assert response.status_code == 200, "Invalid response status"
    assert response.json() == {"authors": [], "total": 0}, "Invalid response data"

def test_create_author(setup_database):
    response = client.post("/authors", json={"name": "Test Author"})
    print(response.json())
    assert response.status_code == 200, "Invalid response status"
    assert response.json() == {"id": 1, "name": "Test Author"}, "Invalid response data"

def test_list_authors(setup_database):
    response = client.get("/authors")
    print(response.json())
    assert response.status_code == 200, "Invalid response status"
    assert response.json() == {"authors": [{"id": 1, "name": "Test Author"}], "total": 1}, "Invalid response data"

def test_get_existing_author(setup_database):
    response = client.get("/authors/1")
    print(response.json())
    assert response.status_code == 200, "Invalid response status"
    assert response.json() == {"id": 1, "name": "Test Author"}, "Invalid response data"

def test_get_not_existing_author(setup_database):
    response = client.get("/authors/2")
    print(response.json())
    assert response.status_code == 404, "Invalid response status"
    assert response.json() == {"detail": "Author not found"}, "Invalid response data"

def test_update_author(setup_database):
    response = client.get("/authors/1")
    assert response.status_code == 200, "Invalid response status"
    response = client.put("/authors/1", json={"name": "Updated Author"})
    assert response.status_code == 200, "Invalid response status"
    assert response.json() == {"id": 1, "name": "Updated Author"}, "Invalid response data"

def test_update_not_existing_author(setup_database):
    response = client.put("/authors/2", json={"name": "Updated Author"})
    assert response.status_code == 404, "Invalid response status"
    assert response.json() == {"detail": "Author not found"}, "Invalid response data"

def test_delete_author(setup_database):
    response = client.get("/authors/1")
    assert response.status_code == 200, "Invalid response status"
    response = client.delete("/authors/1")
    assert response.status_code == 200, "Invalid response status"
    assert response.json() == {"id": 1, "name": "Updated Author"}, "Invalid response data"

def test_not_existing_delete_author(setup_database):
    response = client.delete("/authors/2")
    assert response.status_code == 404, "Invalid response status"
    assert response.json() == {"detail": "Author not found"}, "Invalid response data"
