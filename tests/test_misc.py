import pytest
from alembic import command
from alembic.config import Config
from datetime import datetime
from fastapi.testclient import TestClient
from sqlmodel import select, delete, Session

from library_service.main import app, engine
from library_service.models.db import Author, Book, AuthorBookLink

client = TestClient(app)

@pytest.fixture(scope="module")
def setup_database():
    # Save original data backup
    with Session(engine) as session:
        original_authors = session.exec(select(Author)).all()
        original_books = session.exec(select(Book)).all()
        original_links = session.exec(select(AuthorBookLink)).all()
    # Reset database
    alembic_cfg = Config("alembic.ini")
    with engine.begin() as connection:
        alembic_cfg.attributes['connection'] = connection
        command.downgrade(alembic_cfg, 'base')
        command.upgrade(alembic_cfg, 'head')
    # Check database state after reset
    with Session(engine) as session:
        assert len(session.exec(select(Author)).all()) == 0
        assert len(session.exec(select(Book)).all()) == 0
        assert len(session.exec(select(AuthorBookLink)).all()) == 0
    yield # Here pytest will start testing
    # Restore original data from backup
    with Session(engine) as session:
        for author in original_authors:
            session.add(author)
        for book in original_books:
            session.add(book)
        for link in original_links:
            session.add(link)
        session.commit()

# Test the main page of the application
def test_main_page():
    response = client.get("/")  # Send GET request to the main page
    try:
        content = response.content.decode('utf-8')  # Decode response content
        # Find indices of key elements in the content
        title_idx = content.index("Welcome to ")
        description_idx = content.index("Description: ")
        version_idx = content.index("Version: ")
        time_idx = content.index("Current Time: ")
        status_idx = content.index("Status: ")

        assert response.status_code == 200, "Invalid response status"
        assert content.startswith('<!doctype html>'), "Not HTML"
        assert content.endswith('</html>'), "HTML tag not closed"
        assert content[title_idx+1] != '<', "Title not provided"
        assert content[description_idx+1] != '<', "Description not provided"
        assert content[version_idx+1] != '<', "Version not provided"
        assert content[time_idx+1] != '<', "Time not provided"
        assert content[status_idx+1] != '<', "Status not provided"
    except Exception as e:
        print(f"Error: {e}")  # Print error if an exception occurs
        assert False, "Unexpected error"  # Force test failure on unexpected error

# Test application info endpoint
def test_app_info_test():
    response = client.get("/api/info")  # Send GET request to the info endpoint
    assert response.status_code == 200, "Invalid response status"
    assert response.json()["status"] == "ok", "Status not ok"
    assert response.json()["app_info"]["title"] != "", "Title not provided"
    assert response.json()["app_info"]["description"] != "", "Description not provided"
    assert response.json()["app_info"]["version"] != "", "Version not provided"
    # Check time difference
    assert 0 < (datetime.now() - datetime.fromisoformat(response.json()["server_time"])).total_seconds(), "Negative time difference"
    assert (datetime.now() - datetime.fromisoformat(response.json()["server_time"])).total_seconds() < 1, "Time difference too large"
