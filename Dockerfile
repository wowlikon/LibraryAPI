FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /code

RUN apt-get update \
    && apt-get -y install gcc libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN pip install poetry
RUN poetry config virtualenvs.create false

COPY ./pyproject.toml ./poetry.lock* /code/

RUN poetry install --with dev --no-root --no-interaction

COPY ./library_service /code/library_service
COPY ./alembic.ini /code/
COPY ./data.py /code/

RUN useradd app && chown -R app:app /code
USER app

ENV PYTHONPATH=/code

CMD ["uvicorn", "library_service.main:app", "--host", "0.0.0.0", "--port", "8000"]
