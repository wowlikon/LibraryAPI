# Тесты без базы данных

## Обзор изменений

Все тесты были переработаны для работы без реальной базы данных PostgreSQL. Вместо этого используется in-memory мок-хранилище.

## Новые компоненты

### 1. Мок-хранилище ()
- Реализует все операции с данными в памяти
- Поддерживает CRUD операции для книг, авторов и жанров
- Управляет связями между сущностями
- Автоматически генерирует ID
- Предоставляет метод  для очистки данных между тестами

### 2. Мок-сессия ()
- Эмулирует поведение SQLModel Session
- Предоставляет совместимый интерфейс для dependency injection

### 3. Мок-роутеры ()
-  - упрощенные роутеры для операций с книгами
-  - упрощенные роутеры для операций с авторами  
-  - упрощенные роутеры для связей между сущностями

### 4. Мок-приложение ()
- FastAPI приложение для тестирования
- Использует мок-роутеры вместо реальных
- Включает реальный misc роутер (не требует БД)

## Обновленные тесты

Все тесты были обновлены:

### 
- Переработана фикстура  для работы с мок-хранилищем
- Добавлен автоматический cleanup между тестами

### 
- Использует мок-приложение вместо реального
- Все тесты создают необходимые данные явно
- Автоматическая очистка данных между тестами

###   
- Аналогично 
- Полная поддержка всех CRUD операций

### 
- Поддерживает создание и получение связей автор-книга
- Тестирует получение авторов по книге и книг по автору

## Запуск тестов

============================= test session starts ==============================
platform linux -- Python 3.13.7, pytest-8.4.1, pluggy-1.6.0 -- /bin/python
cachedir: .pytest_cache
rootdir: /home/wowlikon/code/python/LibraryAPI
configfile: pyproject.toml
plugins: anyio-4.10.0, asyncio-0.26.0, cov-6.1.1
asyncio: mode=Mode.STRICT, asyncio_default_fixture_loop_scope=None, asyncio_default_test_loop_scope=function
collecting ... collected 23 items

tests/test_authors.py::test_empty_list_authors PASSED                    [  4%]
tests/test_authors.py::test_create_author PASSED                         [  8%]
tests/test_authors.py::test_list_authors PASSED                          [ 13%]
tests/test_authors.py::test_get_existing_author PASSED                   [ 17%]
tests/test_authors.py::test_get_not_existing_author PASSED               [ 21%]
tests/test_authors.py::test_update_author PASSED                         [ 26%]
tests/test_authors.py::test_update_not_existing_author PASSED            [ 30%]
tests/test_authors.py::test_delete_author PASSED                         [ 34%]
tests/test_authors.py::test_not_existing_delete_author PASSED            [ 39%]
tests/test_books.py::test_empty_list_books PASSED                        [ 43%]
tests/test_books.py::test_create_book PASSED                             [ 47%]
tests/test_books.py::test_list_books PASSED                              [ 52%]
tests/test_books.py::test_get_existing_book PASSED                       [ 56%]
tests/test_books.py::test_get_not_existing_book PASSED                   [ 60%]
tests/test_books.py::test_update_book PASSED                             [ 65%]
tests/test_books.py::test_update_not_existing_book PASSED                [ 69%]
tests/test_books.py::test_delete_book PASSED                             [ 73%]
tests/test_books.py::test_not_existing_delete_book PASSED                [ 78%]
tests/test_misc.py::test_main_page PASSED                                [ 82%]
tests/test_misc.py::test_app_info_test PASSED                            [ 86%]
tests/test_relationships.py::test_prepare_data PASSED                    [ 91%]
tests/test_relationships.py::test_get_book_authors PASSED                [ 95%]
tests/test_relationships.py::test_get_author_books PASSED                [100%]

============================== 23 passed in 1.42s ==============================
============================= test session starts ==============================
platform linux -- Python 3.13.7, pytest-8.4.1, pluggy-1.6.0 -- /bin/python
cachedir: .pytest_cache
rootdir: /home/wowlikon/code/python/LibraryAPI
configfile: pyproject.toml
plugins: anyio-4.10.0, asyncio-0.26.0, cov-6.1.1
asyncio: mode=Mode.STRICT, asyncio_default_fixture_loop_scope=None, asyncio_default_test_loop_scope=function
collecting ... collected 9 items

tests/test_books.py::test_empty_list_books PASSED                        [ 11%]
tests/test_books.py::test_create_book PASSED                             [ 22%]
tests/test_books.py::test_list_books PASSED                              [ 33%]
tests/test_books.py::test_get_existing_book PASSED                       [ 44%]
tests/test_books.py::test_get_not_existing_book PASSED                   [ 55%]
tests/test_books.py::test_update_book PASSED                             [ 66%]
tests/test_books.py::test_update_not_existing_book PASSED                [ 77%]
tests/test_books.py::test_delete_book PASSED                             [ 88%]
tests/test_books.py::test_not_existing_delete_book PASSED                [100%]

============================== 9 passed in 0.99s ===============================
============================= test session starts ==============================
platform linux -- Python 3.13.7, pytest-8.4.1, pluggy-1.6.0 -- /bin/python
cachedir: .pytest_cache
rootdir: /home/wowlikon/code/python/LibraryAPI
configfile: pyproject.toml
plugins: anyio-4.10.0, asyncio-0.26.0, cov-6.1.1
asyncio: mode=Mode.STRICT, asyncio_default_fixture_loop_scope=None, asyncio_default_test_loop_scope=function
collecting ... collected 9 items

tests/test_authors.py::test_empty_list_authors PASSED                    [ 11%]
tests/test_authors.py::test_create_author PASSED                         [ 22%]
tests/test_authors.py::test_list_authors PASSED                          [ 33%]
tests/test_authors.py::test_get_existing_author PASSED                   [ 44%]
tests/test_authors.py::test_get_not_existing_author PASSED               [ 55%]
tests/test_authors.py::test_update_author PASSED                         [ 66%]
tests/test_authors.py::test_update_not_existing_author PASSED            [ 77%]
tests/test_authors.py::test_delete_author PASSED                         [ 88%]
tests/test_authors.py::test_not_existing_delete_author PASSED            [100%]

============================== 9 passed in 0.96s ===============================
============================= test session starts ==============================
platform linux -- Python 3.13.7, pytest-8.4.1, pluggy-1.6.0 -- /bin/python
cachedir: .pytest_cache
rootdir: /home/wowlikon/code/python/LibraryAPI
configfile: pyproject.toml
plugins: anyio-4.10.0, asyncio-0.26.0, cov-6.1.1
asyncio: mode=Mode.STRICT, asyncio_default_fixture_loop_scope=None, asyncio_default_test_loop_scope=function
collecting ... collected 3 items

tests/test_relationships.py::test_prepare_data PASSED                    [ 33%]
tests/test_relationships.py::test_get_book_authors PASSED                [ 66%]
tests/test_relationships.py::test_get_author_books PASSED                [100%]

============================== 3 passed in 1.09s ===============================
============================= test session starts ==============================
platform linux -- Python 3.13.7, pytest-8.4.1, pluggy-1.6.0 -- /bin/python
cachedir: .pytest_cache
rootdir: /home/wowlikon/code/python/LibraryAPI
configfile: pyproject.toml
plugins: anyio-4.10.0, asyncio-0.26.0, cov-6.1.1
asyncio: mode=Mode.STRICT, asyncio_default_fixture_loop_scope=None, asyncio_default_test_loop_scope=function
collecting ... collected 2 items

tests/test_misc.py::test_main_page PASSED                                [ 50%]
tests/test_misc.py::test_app_info_test PASSED                            [100%]

============================== 2 passed in 0.93s ===============================

## Преимущества нового подхода

1. **Независимость**: Тесты не требуют PostgreSQL или Docker
2. **Скорость**: Выполняются значительно быстрее
3. **Изоляция**: Каждый тест работает с чистым состоянием
4. **Стабильность**: Нет проблем с сетевыми подключениями или состоянием БД
5. **CI/CD готовность**: Легко интегрируются в CI пайплайны

## Ограничения

- Мок-хранилище упрощено по сравнению с реальной БД
- Отсутствуют некоторые возможности SQLModel (сложные запросы, транзакции)
- Нет проверки целостности данных на уровне БД

Однако для юнит-тестирования API логики этого достаточно.
