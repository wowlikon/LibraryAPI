import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlmodel import select, delete, Session

from library_service.main import app
from tests.test_misc import setup_database

client = TestClient(app)

def make_relationship(author_id, book_id):
    response = client.post("/relationships", params={"author_id": author_id, "book_id": book_id})
    assert response.status_code == 200, "Invalid response status"

def test_prepare_data(setup_database):
    response = client.post("/books", json={"title": "Test Book 1", "description": "Test Description 1"})
    response = client.post("/books", json={"title": "Test Book 2", "description": "Test Description 2"})
    response = client.post("/books", json={"title": "Test Book 3", "description": "Test Description 3"})

    response = client.post("/authors", json={"name": "Test Author 1"})
    response = client.post("/authors", json={"name": "Test Author 2"})
    response = client.post("/authors", json={"name": "Test Author 3"})

    make_relationship(1, 1)
    make_relationship(2, 1)
    make_relationship(1, 2)
    make_relationship(2, 3)
    make_relationship(3, 3)

    response = client.get("/relationships")
    assert response.status_code == 200, "Invalid response status"
    assert len(response.json()) == 5, "Invalid number of relationships"

def test_get_book_authors():
    response1 = client.get("/books/1/authors")
    assert response1.status_code == 200, "Invalid response status"
    assert len(response1.json()) == 2, "Invalid number of authors"
    assert response1.json()[0]["name"] == "Test Author 1"
    assert response1.json()[1]["name"] == "Test Author 2"
    assert response1.json()[0]["id"] == 1
    assert response1.json()[1]["id"] == 2

    response2 = client.get("/books/2/authors")
    assert response2.status_code == 200, "Invalid response status"
    assert len(response2.json()) == 1, "Invalid number of authors"
    assert response2.json()[0]["name"] == "Test Author 1"
    assert response2.json()[0]["id"] == 1

    response3 = client.get("/books/3/authors")
    assert response3.status_code == 200, "Invalid response status"
    assert len(response3.json()) == 2, "Invalid number of authors"
    assert response3.json()[0]["name"] == "Test Author 2"
    assert response3.json()[1]["name"] == "Test Author 3"
    assert response3.json()[0]["id"] == 2
    assert response3.json()[1]["id"] == 3

def test_get_author_books():
    response1 = client.get("/authors/1/books")
    assert response1.status_code == 200, "Invalid response status"
    assert len(response1.json()) == 2, "Invalid number of books"
    assert response1.json()[0]["title"] == "Test Book 1"
    assert response1.json()[1]["title"] == "Test Book 2"
    assert response1.json()[0]["id"] == 1
    assert response1.json()[1]["id"] == 2

    response2 = client.get("/authors/2/books")
    assert response2.status_code == 200, "Invalid response status"
    assert len(response2.json()) == 2, "Invalid number of books"
    assert response2.json()[0]["title"] == "Test Book 1"
    assert response2.json()[1]["title"] == "Test Book 3"
    assert response2.json()[0]["id"] == 1
    assert response2.json()[1]["id"] == 3

    response3 = client.get("/authors/3/books")
    assert response3.status_code == 200, "Invalid response status"
    assert len(response3.json()) == 1, "Invalid number of books"
    assert response3.json()[0]["title"] == "Test Book 3"
    assert response3.json()[0]["id"] == 3
