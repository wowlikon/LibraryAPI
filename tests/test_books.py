import pytest
from fastapi.testclient import TestClient
from tests.mock_app import mock_app
from tests.mocks.mock_storage import mock_storage

client = TestClient(mock_app)


@pytest.fixture(autouse=True)
def setup_database():
    """Clear mock storage before each test"""
    mock_storage.clear_all()
    yield
    mock_storage.clear_all()


def test_empty_list_books():
    response = client.get("/books")
    print(response.json())
    assert response.status_code == 200, "Invalid response status"
    assert response.json() == {"books": [], "total": 0}, "Invalid response data"


def test_create_book():
    response = client.post(
        "/books", json={"title": "Test Book", "description": "Test Description"}
    )
    print(response.json())
    assert response.status_code == 200, "Invalid response status"
    assert response.json() == {
        "id": 1,
        "title": "Test Book",
        "description": "Test Description",
    }, "Invalid response data"


def test_list_books():
    # First create a book
    client.post(
        "/books", json={"title": "Test Book", "description": "Test Description"}
    )

    response = client.get("/books")
    print(response.json())
    assert response.status_code == 200, "Invalid response status"
    assert response.json() == {
        "books": [{"id": 1, "title": "Test Book", "description": "Test Description"}],
        "total": 1,
    }, "Invalid response data"


def test_get_existing_book():
    # First create a book
    client.post(
        "/books", json={"title": "Test Book", "description": "Test Description"}
    )

    response = client.get("/books/1")
    print(response.json())
    assert response.status_code == 200, "Invalid response status"
    assert response.json() == {
        "id": 1,
        "title": "Test Book",
        "description": "Test Description",
        "authors": [],
    }, "Invalid response data"


def test_get_not_existing_book():
    response = client.get("/books/2")
    print(response.json())
    assert response.status_code == 404, "Invalid response status"
    assert response.json() == {"detail": "Book not found"}, "Invalid response data"


def test_update_book():
    # First create a book
    client.post(
        "/books", json={"title": "Test Book", "description": "Test Description"}
    )

    response = client.get("/books/1")
    assert response.status_code == 200, "Invalid response status"

    response = client.put(
        "/books/1", json={"title": "Updated Book", "description": "Updated Description"}
    )
    assert response.status_code == 200, "Invalid response status"
    assert response.json() == {
        "id": 1,
        "title": "Updated Book",
        "description": "Updated Description",
    }, "Invalid response data"


def test_update_not_existing_book():
    response = client.put(
        "/books/2", json={"title": "Updated Book", "description": "Updated Description"}
    )
    assert response.status_code == 404, "Invalid response status"
    assert response.json() == {"detail": "Book not found"}, "Invalid response data"


def test_delete_book():
    # First create a book
    client.post(
        "/books", json={"title": "Test Book", "description": "Test Description"}
    )

    # Update it first
    client.put(
        "/books/1", json={"title": "Updated Book", "description": "Updated Description"}
    )

    response = client.get("/books/1")
    assert response.status_code == 200, "Invalid response status"

    response = client.delete("/books/1")
    assert response.status_code == 200, "Invalid response status"
    assert response.json() == {
        "id": 1,
        "title": "Updated Book",
        "description": "Updated Description",
    }, "Invalid response data"


def test_not_existing_delete_book():
    response = client.delete("/books/2")
    assert response.status_code == 404, "Invalid response status"
    assert response.json() == {"detail": "Book not found"}, "Invalid response data"
