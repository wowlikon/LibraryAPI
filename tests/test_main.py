import pytest # pyright: ignore
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture()
def client():
    with TestClient(app) as test_client:
        yield test_client

# Тесты для авторов
def test_create_author(client):
    response = client.post("/authors/", json={"name": "Author Name"})
    assert response.status_code == 200
    assert response.json()["name"] == "Author Name"

def test_read_authors(client):
    response = client.get("/authors/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)  # Проверяем, что ответ - это список

def test_update_author(client):
    # Сначала создаем автора, чтобы его обновить
    create_response = client.post("/authors/", json={"name": "Author Name"})
    author_id = create_response.json()["id"]

    response = client.put(f"/authors/{author_id}", json={"name": "Updated Author Name"})
    assert response.status_code == 200
    assert response.json()["name"] == "Updated Author Name"

def test_delete_author(client):
    # Сначала создаем автора, чтобы его удалить
    create_response = client.post("/authors/", json={"name": "Author Name"})
    author_id = create_response.json()["id"]
    author_name = create_response.json()["name"]

    response = client.delete(f"/authors/{author_id}")
    assert response.status_code == 200
    assert response.json()["name"] == author_name

# Тесты для книг
def test_create_book(client):
    response = client.post("/books/", json={"title": "Book Title", "description": "Book Description"})
    assert response.status_code == 200
    assert response.json()["title"] == "Book Title"

def test_read_books(client):
    response = client.get("/books/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)  # Проверяем, что ответ - это список

def test_update_book(client):
    # Сначала создаем книгу, чтобы ее обновить
    create_response = client.post("/books/", json={"title": "Book Title", "description": "Book Description"})
    book_id = create_response.json()["id"]

    response = client.put(f"/books/{book_id}", json={"title": "Updated Book Title", "description": "Updated Description"})
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Book Title"

def test_delete_book(client):
    # Сначала создаем книгу, чтобы ее удалить
    create_response = client.post("/books/", json={"title": "Book Title", "description": "Book Description"})
    book_id = create_response.json()["id"]
    book_title = create_response.json()["title"]
    book_description = create_response.json()["description"]

    response = client.delete(f"/books/{book_id}")
    assert response.status_code == 200
    assert response.json()["title"] == book_title
    assert response.json()["description"] == book_description
