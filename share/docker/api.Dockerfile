FROM python:3.13-slim AS builder

ENV \
  # Don't create .pyc files, these aren't useful in a container imager
  PYTHONDONTWRITEBYTECODE=1 \
  # Immediately write to stdout and stderr instead of buffering the output
  PYTHONUNBUFFERED=1 \
  # Dump tracebacks when non-python code crashes, useful for diagnosing issues
  PYTHONFAULTHANDLER=1 \
  POETRY_HOME=/opt/poetry \
  PATH="/opt/poetry/bin:${PATH}"


# Setup a venv and install Poetry
# Ref: https://python-poetry.org/docs/#ci-recommendations
ARG POETRY_VERSION=2.1.2

RUN apt-get update && \
    apt-get install -y curl build-essential libpq-dev && \
    curl -sSL https://install.python-poetry.org | python -

WORKDIR /app
ENV POETRY_VIRTUALENVS_IN_PROJECT=true

# Copy library packages over, these will be pulled into the .venv directory during install as needed
# COPY py/lib /py/lib

# Copy in just the files needed for installing dependencies
COPY ./pyproject.toml ./poetry.lock ./

RUN poetry install --no-root --only main

COPY ./.alembic ./.alembic
COPY ./alembic.ini .
COPY ./src .
COPY ./default.toml .
COPY ./logging.yaml .

FROM python:3.13-slim AS production

ENV \
  # Don't create .pyc files, these aren't useful in a container imager
  PYTHONDONTWRITEBYTECODE=1 \
  # Immediately write to stdout and stderr instead of buffering the output
  PYTHONUNBUFFERED=1 \
  # Dump tracebacks when non-python code crashes, useful for diagnosing issues
  PYTHONFAULTHANDLER=1 \
  UVICORN_HOST=0.0.0.0 \
  UVICORN_PORT=8000 \
  UVICORN_APP=api.main:app \
  # Trust proxy headers such as `X-Forwarded-For`, the default is to only trust headers from 127.0.0.1
  FORWARDED_ALLOW_IPS="*" \
  # Add the app venv to $PATH
  PATH="/app/.venv/bin:${PATH}"

WORKDIR /app

COPY --from=builder /app .

# Create the app user and group
RUN groupadd --gid 1000 app && \
  useradd --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin --uid 1000 --gid 1000 app

RUN apt-get update && \
    apt-get install -y libpq5

USER app

ENTRYPOINT ["uvicorn"]
