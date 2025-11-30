from typing import Optional, List, Any
from tests.mocks.mock_storage import mock_storage


class MockSession:
    """Mock SQLModel Session that works with MockStorage"""

    def __init__(self):
        self.storage = mock_storage

    def add(self, obj: Any):
        """Mock add - not needed for our implementation"""
        pass

    def commit(self):
        """Mock commit - not needed for our implementation"""
        pass

    def refresh(self, obj: Any):
        """Mock refresh - not needed for our implementation"""
        pass

    def get(self, model_class, pk: int):
        """Mock get method to retrieve object by primary key"""
        if hasattr(model_class, "__name__"):
            model_name = model_class.__name__.lower()
        else:
            model_name = str(model_class).lower()

        if "book" in model_name:
            return self.storage.get_book(pk)
        elif "author" in model_name:
            return self.storage.get_author(pk)
        elif "genre" in model_name:
            return self.storage.get_genre(pk)
        return None

    def delete(self, obj: Any):
        """Mock delete - handled in storage methods"""
        pass

    def exec(self, statement):
        """Mock exec method for queries"""
        return MockResult([])


class MockResult:
    """Mock result for query operations"""

    def __init__(self, data: List):
        self.data = data

    def all(self):
        return self.data

    def first(self):
        return self.data[0] if self.data else None


def mock_get_session():
    """Mock session dependency"""
    return MockSession()
