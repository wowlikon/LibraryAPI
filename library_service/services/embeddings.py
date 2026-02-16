"""Модуль работы с векторными эмбеддингами"""
from typing import List, Optional

from ollama import Client

from library_service.settings import OLLAMA_URL, EMBEDDINGS_MODEL, get_logger


_client: Optional[Client] = None
logger = get_logger()


def get_ollama_client() -> Client:
    """Возвращает singleton клиент Ollama"""
    global _client
    if _client is None:
        _client = Client(host=OLLAMA_URL)
    return _client


def generate_embedding(text: str) -> List[float]:
    """Генерирует эмбеддинг для текста."""
    client = get_ollama_client()
    response = client.embeddings(model=EMBEDDINGS_MODEL, prompt=text)
    return response["embedding"]


def generate_book_embedding(title: str, description: str) -> List[float]:
    """Генерирует эмбеддинг для книги на основе названия и описания."""
    full_text = f"Название книги: {title}. Описание: {description}"
    return generate_embedding(full_text)


def generate_search_embedding(query: str) -> List[float]:
    """Генерирует эмбеддинг для поискового запроса."""
    search_prompt = f"Represent this sentence for searching relevant passages: {query}"
    return generate_embedding(search_prompt)


def regenerate_embeddings(force: bool = False) -> int:
    """Генерирует эмбеддинги для книг в БД."""
    from sqlmodel import Session, select
    from library_service.settings import engine
    from library_service.models.db import Book

    with Session(engine) as session:
        statement = select(Book)

        if not force:
            statement = statement.where(Book.embedding == None)  # noqa: E711

        books = session.exec(statement).all()

        if not books:
            logger.info("[=] No books to process")
            return 0

        logger.info(f"[+] Generating embeddings for {len(books)} books...")
        processed = 0

        for book in books:
            try:
                book.embedding = generate_book_embedding(
                    book.title,
                    book.description or ""
                )
                session.add(book)
                logger.debug(f"  [+] Book {book.id}: {book.title[:50]}")
                processed += 1
            except Exception as e:
                logger.warning(f"  [-] Book {book.id}: {e}")

        session.commit()
        logger.info(f"[+] Embedding generation complete: {processed}/{len(books)}")
        return processed


def ensure_embeddings(force: bool, skip: bool) -> None:
    """Проверяет и генерирует отсутствующие эмбеддинги"""

    if skip:
        logger.info("[=] Embeddings generation skipped")
        return

    logger.info("[+] Checking embeddings...")
    try:
        count = regenerate_embeddings(force=force)
        if count > 0:
            logger.info(f"[+] Generated {count} embeddings")
        else:
            logger.info("[+] All embeddings up to date")
    except Exception as e:
        logger.error(f"[-] Embeddings generation failed: {e}")
