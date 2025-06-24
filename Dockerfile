FROM python:3.13 as requirements-stage
WORKDIR /tmp
RUN pip install poetry
RUN poetry self add poetry-plugin-export
COPY ./pyproject.toml ./poetry.lock* /tmp/
RUN poetry export -f requirements.txt --output requirements.txt --with dev --without-hashes

FROM python:3.13
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update \
    && apt-get -y install gcc postgresql \
    && apt-get clean # netcat

RUN pip install --upgrade pip

WORKDIR /code
COPY --from=requirements-stage /tmp/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir --upgrade -r ./requirements.txt
COPY . .
ENV PYTHONPATH=.
