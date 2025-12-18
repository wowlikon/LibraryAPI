from datetime import datetime

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


def test_main_page():
    response = client.get("/api")
    try:
        content = response.content.decode("utf-8")
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
        print(f"Error: {e}")
        assert False, "Unexpected error"


def test_app_info_test():
    response = client.get("/api/info")
    assert response.status_code == 200, "Invalid response status"
    assert response.json()["status"] == "ok", "Status not ok"
    assert response.json()["app_info"]["title"] != "", "Title not provided"
    assert response.json()["app_info"]["description"] != "", "Description not provided"
    assert response.json()["app_info"]["version"] != "", "Version not provided"
    assert (0 < (datetime.now() - datetime.fromisoformat(response.json()["server_time"])).total_seconds()), "Negative time difference"
    assert (datetime.now() - datetime.fromisoformat(response.json()["server_time"])).total_seconds() < 1, "Time difference too large"
