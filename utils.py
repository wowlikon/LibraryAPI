from fastapi import HTTPException
from fuzzywuzzy import fuzz
from typing import Dict

from models import Book, NewBook

def get_book_or_404(books: Dict[int, Book], id: int) -> Book:
    if id not in books.keys(): raise HTTPException(status_code=404, detail="Book not found")
    return books[id]

def create_book_obj(id: int, book: NewBook):
    return Book(id=id, title=book.title, authors=book.authors, pages=book.pages)

def fuzzy_search(query: str, books: dict):
    results = []
    query = query.lower()
    for book in books.values():
        title_score = fuzz.ratio(query, book.title.lower())
        author_scores = [fuzz.ratio(query, author.first_name.lower() + ' ' + author.last_name.lower()) for author in book.authors]
        author_score = max(author_scores) if author_scores else 0

        if title_score > 60 or author_score > 60:
            results.append({
                'book': book,
                'score': max(title_score, author_score)
            })

    results.sort(key=lambda x: x['score'], reverse=True)
    return [result['book'] for result in results]
