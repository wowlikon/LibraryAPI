import pytest
from fastapi.testclient import TestClient

from tests.mock_app import mock_app
from tests.mocks.mock_storage import mock_storage

client = TestClient(mock_app)


@pytest.fixture(autouse=True)
def setup_database():
    mock_storage.clear_all()
    yield
    mock_storage.clear_all()


def make_authorbook_relationship(author_id, book_id):
    response = client.post(
        "/relationships/author-book",
        params={"author_id": author_id, "book_id": book_id},
    )
    assert response.status_code == 200, "Invalid response status"


def make_genrebook_relationship(genre_id, book_id):
    response = client.post(
        "/relationships/genre-book", params={"genre_id": genre_id, "book_id": book_id}
    )
    assert response.status_code == 200, "Invalid response status"


def test_prepare_data():
    assert (client.post("/books", json={"title": "Test Book 1", "description": "Test Description 1"}).status_code == 200)
    assert (client.post("/books", json={"title": "Test Book 2", "description": "Test Description 2"}).status_code == 200)
    assert (client.post("/books", json={"title": "Test Book 3", "description": "Test Description 3"}).status_code == 200)

    assert client.post("/authors", json={"name": "Test Author 1"}).status_code == 200
    assert client.post("/authors", json={"name": "Test Author 2"}).status_code == 200
    assert client.post("/authors", json={"name": "Test Author 3"}).status_code == 200

    assert client.post("/genres", json={"name": "Test Genre 1"}).status_code == 200
    assert client.post("/genres", json={"name": "Test Genre 2"}).status_code == 200
    assert client.post("/genres", json={"name": "Test Genre 3"}).status_code == 200

    make_authorbook_relationship(1, 1)
    make_authorbook_relationship(2, 1)
    make_authorbook_relationship(1, 2)
    make_authorbook_relationship(2, 3)
    make_authorbook_relationship(3, 3)
    make_genrebook_relationship(1, 1)
    make_genrebook_relationship(2, 1)
    make_genrebook_relationship(1, 2)
    make_genrebook_relationship(2, 3)
    make_genrebook_relationship(3, 3)


def test_get_book_authors():
    test_prepare_data()

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
    test_prepare_data()

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
