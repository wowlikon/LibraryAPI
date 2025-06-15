FROM python:3.11

WORKDIR /code

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY ./src/alembic.ini ./
COPY ./src/app /code/app
COPY ./tests /code/tests

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
