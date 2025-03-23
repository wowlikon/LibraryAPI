# fastapi-book-library
RESTful API для управления библиотекой книг, реализованное с помощью FastAPI

## Описание
Этот проект представляет собой RESTful API для управления библиотекой книг. Он позволяет выполнять CRUD-операции (создание, чтение, обновление, удаление) с книгами, а также предоставляет эндпоинты для поиска книг по названию и получения списка всех книг.

## Технологии
- FastAPI
- Python 3.x

## Установка
1. Клонировать репозиторий
2. Установить зависимости: `pip install -r requirements.txt`
3. Установите PostgreSQL:
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo -u postgres psql
```
4. Создайте базу данных:
```sql
CREATE DATABASE bookdb;
CREATE USER myuser WITH PASSWORD 'mypassword';
GRANT ALL PRIVILEGES ON DATABASE bookdb TO myuser;
\q
```
5. Создайте файл `.env` и добавьте переменные окружения:
```bash
DATABASE_URL=postgresql://myuser:,ypassword@localhost:5432/bookdb
```
6. Запустить приложение: `uvicorn main:app --reload`

## Эндпоинты
- `/`: Получить текущую дату и время
- `/books`: Получить список всех книг
- `/books/search`: Поиск книг по названию
- `/books/{id}`: Получить книгу по id
- `/books`: Создать новую книгу
- `/books/{id}`: Обновить книгу
- `/books/{id}`: Удалить книгу
- `/books`: Очистить список книг

## Лицензия
Этот проект распространяется под лицензией MIT - подробности см. в файле [LICENSE](LICENSE).