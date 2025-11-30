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


def test_empty_list_authors():
    response = client.get("/authors")
    print(response.json())
    assert response.status_code == 200, "Invalid response status"
    assert response.json() == {"authors": [], "total": 0}, "Invalid response data"


def test_create_author():
    response = client.post("/authors", json={"name": "Test Author"})
    print(response.json())
    assert response.status_code == 200, "Invalid response status"
    assert response.json() == {"id": 1, "name": "Test Author"}, "Invalid response data"


def test_list_authors():
    # First create an author
    client.post("/authors", json={"name": "Test Author"})

    response = client.get("/authors")
    print(response.json())
    assert response.status_code == 200, "Invalid response status"
    assert response.json() == {
        "authors": [{"id": 1, "name": "Test Author"}],
        "total": 1,
    }, "Invalid response data"


def test_get_existing_author():
    # First create an author
    client.post("/authors", json={"name": "Test Author"})

    response = client.get("/authors/1")
    print(response.json())
    assert response.status_code == 200, "Invalid response status"
    assert response.json() == {
        "id": 1,
        "name": "Test Author",
        "books": [],
    }, "Invalid response data"


def test_get_not_existing_author():
    response = client.get("/authors/2")
    print(response.json())
    assert response.status_code == 404, "Invalid response status"
    assert response.json() == {"detail": "Author not found"}, "Invalid response data"


def test_update_author():
    # First create an author
    client.post("/authors", json={"name": "Test Author"})

    response = client.get("/authors/1")
    assert response.status_code == 200, "Invalid response status"

    response = client.put("/authors/1", json={"name": "Updated Author"})
    assert response.status_code == 200, "Invalid response status"
    assert response.json() == {
        "id": 1,
        "name": "Updated Author",
    }, "Invalid response data"


def test_update_not_existing_author():
    response = client.put("/authors/2", json={"name": "Updated Author"})
    assert response.status_code == 404, "Invalid response status"
    assert response.json() == {"detail": "Author not found"}, "Invalid response data"


def test_delete_author():
    # First create an author
    client.post("/authors", json={"name": "Test Author"})

    # Update it first
    client.put("/authors/1", json={"name": "Updated Author"})

    response = client.get("/authors/1")
    assert response.status_code == 200, "Invalid response status"

    response = client.delete("/authors/1")
    assert response.status_code == 200, "Invalid response status"
    assert response.json() == {
        "id": 1,
        "name": "Updated Author",
    }, "Invalid response data"


def test_not_existing_delete_author():
    response = client.delete("/authors/2")
    assert response.status_code == 404, "Invalid response status"
    assert response.json() == {"detail": "Author not found"}, "Invalid response data"
