from typing import Dict, List, Optional


class MockStorage:
    """In-memory storage for testing without database"""

    def __init__(self):
        self.books = {}
        self.authors = {}
        self.genres = {}
        self.author_book_links = []
        self.genre_book_links = []
        self.book_id_counter = 1
        self.author_id_counter = 1
        self.genre_id_counter = 1

    def clear_all(self):
        """Clear all data"""
        self.books.clear()
        self.authors.clear()
        self.genres.clear()
        self.author_book_links.clear()
        self.genre_book_links.clear()
        self.book_id_counter = 1
        self.author_id_counter = 1
        self.genre_id_counter = 1

    # Book operations
    def create_book(self, title: str, description: str) -> dict:
        book_id = self.book_id_counter
        book = {"id": book_id, "title": title, "description": description}
        self.books[book_id] = book
        self.book_id_counter += 1
        return book

    def get_book(self, book_id: int) -> Optional[dict]:
        return self.books.get(book_id)

    def get_all_books(self) -> List[dict]:
        return list(self.books.values())

    def update_book(
        self,
        book_id: int,
        title: Optional[str] = None,
        description: Optional[str] = None,
    ) -> Optional[dict]:
        if book_id not in self.books:
            return None
        book = self.books[book_id]
        if title is not None:
            book["title"] = title
        if description is not None:
            book["description"] = description
        return book

    def delete_book(self, book_id: int) -> Optional[dict]:
        if book_id not in self.books:
            return None
        book = self.books.pop(book_id)
        self.author_book_links = [
            link for link in self.author_book_links if link["book_id"] != book_id
        ]
        self.genre_book_links = [
            link for link in self.genre_book_links if link["book_id"] != book_id
        ]
        return book

    # Author operations
    def create_author(self, name: str) -> dict:
        author_id = self.author_id_counter
        author = {"id": author_id, "name": name}
        self.authors[author_id] = author
        self.author_id_counter += 1
        return author

    def get_author(self, author_id: int) -> Optional[dict]:
        return self.authors.get(author_id)

    def get_all_authors(self) -> List[dict]:
        return list(self.authors.values())

    def update_author(
        self, author_id: int, name: Optional[str] = None
    ) -> Optional[dict]:
        if author_id not in self.authors:
            return None
        author = self.authors[author_id]
        if name is not None:
            author["name"] = name
        return author

    def delete_author(self, author_id: int) -> Optional[dict]:
        if author_id not in self.authors:
            return None
        author = self.authors.pop(author_id)
        self.author_book_links = [
            link for link in self.author_book_links if link["author_id"] != author_id
        ]
        return author

    # Genre operations
    def create_genre(self, name: str) -> dict:
        genre_id = self.genre_id_counter
        genre = {"id": genre_id, "name": name}
        self.genres[genre_id] = genre
        self.genre_id_counter += 1
        return genre

    def get_genre(self, genre_id: int) -> Optional[dict]:
        return self.genres.get(genre)

    def get_all_authors(self) -> List[dict]:
        return list(self.authors.values())

    def update_genre(
        self, genre_id: int, name: Optional[str] = None
    ) -> Optional[dict]:
        if genre_id not in self.genres:
            return None
        genre = self.genres[genre_id]
        if name is not None:
            genre["name"] = name
        return genre

    def delete_genre(self, genre_id: int) -> Optional[dict]:
        if genre_id not in self.genres:
            return None
        genre = self.genres.pop(genre_id)
        self.genre_book_links = [
            link for link in self.genre_book_links if link["genre_id"] != genre_id
        ]
        return genre

    # Relationship operations
    def create_author_book_link(self, author_id: int, book_id: int) -> bool:
        if author_id not in self.authors or book_id not in self.books:
            return False
        for link in self.author_book_links:
            if link["author_id"] == author_id and link["book_id"] == book_id:
                return False
        self.author_book_links.append({"author_id": author_id, "book_id": book_id})
        return True

    def get_authors_by_book(self, book_id: int) -> List[dict]:
        author_ids = [
            link["author_id"]
            for link in self.author_book_links
            if link["book_id"] == book_id
        ]
        return [
            self.authors[author_id]
            for author_id in author_ids
            if author_id in self.authors
        ]

    def get_books_by_author(self, author_id: int) -> List[dict]:
        book_ids = [
            link["book_id"]
            for link in self.author_book_links
            if link["author_id"] == author_id
        ]
        return [self.books[book_id] for book_id in book_ids if book_id in self.books]

    def get_all_author_book_links(self) -> List[dict]:
        return list(self.author_book_links)


mock_storage = MockStorage()
