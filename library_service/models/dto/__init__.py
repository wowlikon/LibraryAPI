from .author import (
    AuthorBase, AuthorCreate, AuthorUpdate,
    AuthorRead, AuthorList
)
from .book import (
    BookBase, BookCreate, BookUpdate,
    BookRead, BookList
)
# from .common import PaginatedResponse

__all__ = [
    'AuthorBase', 'AuthorCreate', 'AuthorUpdate', 'AuthorRead', 'AuthorList',
    'BookBase', 'BookCreate', 'BookUpdate', 'BookRead', 'BookList',
    # 'PaginatedResponse'
]
