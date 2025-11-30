import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from tests.mock_app import mock_app
from tests.mocks.mock_storage import mock_storage

client = TestClient(mock_app)


@pytest.fixture(autouse=True)
def setup_database():
    """Setup and cleanup mock database for each test"""
    # Clear data before each test
    mock_storage.clear_all()
    yield
    # Clear data after each test (optional, but good practice)
    mock_storage.clear_all()


# Test the main page of the application
def test_main_page():
    response = client.get("/")  # Send GET request to the main page
    try:
        content = response.content.decode("utf-8")  # Decode response content
        # Find indices of key elements in the content
        title_idx = content.index("Welcome to ")
        description_idx = content.index("Description: ")
        version_idx = content.index("Version: ")
        time_idx = content.index("Current Time: ")
        status_idx = content.index("Status: ")

        assert response.status_code == 200, "Invalid response status"
        assert content.startswith("<!doctype html>"), "Not HTML"
        assert content.endswith("</html>"), "HTML tag not closed"
        assert content[title_idx + 1] != "<", "Title not provided"
        assert content[description_idx + 1] != "<", "Description not provided"
        assert content[version_idx + 1] != "<", "Version not provided"
        assert content[time_idx + 1] != "<", "Time not provided"
        assert content[status_idx + 1] != "<", "Status not provided"
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
    assert (
        0
        < (
            datetime.now() - datetime.fromisoformat(response.json()["server_time"])
        ).total_seconds()
    ), "Negative time difference"
    assert (
        datetime.now() - datetime.fromisoformat(response.json()["server_time"])
    ).total_seconds() < 1, "Time difference too large"
