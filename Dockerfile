FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

ENV UV_PROJECT_ENVIRONMENT="/opt/venv"
ENV PATH="/opt/venv/bin:$PATH"

WORKDIR /code

RUN apt-get update \
    && apt-get -y install gcc libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

RUN pip install uv
COPY ./README.md ./pyproject.toml ./uv.lock* /code/
RUN uv sync --group dev --no-install-project

COPY ./library_service /code/library_service
COPY ./alembic.ini /code/
COPY ./data.py /code/

RUN useradd app && \
    chown -R app:app /code && \
    chown -R app:app /opt/venv
USER app

ENV PYTHONPATH=/code

EXPOSE 8000

CMD ["uvicorn", "library_service.main:app", "--host", "0.0.0.0", "--port", "8000", "--forwarded-allow-ips=*"]
