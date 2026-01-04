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
    apt-get install -y curl build-essential && \
    curl -sSL https://install.python-poetry.org | python -

WORKDIR /app
ENV POETRY_VIRTUALENVS_IN_PROJECT=true

# Copy library packages over, these will be pulled into the .venv directory during install as needed
# COPY py/lib /py/lib

# Copy in just the files needed for installing dependencies
COPY ./pyproject.toml ./poetry.lock ./

RUN poetry install --no-root --only main

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
  # Add the app venv to $PATH
  PATH="/app/.venv/bin:${PATH}"

WORKDIR /app


COPY --from=builder /app .

# Create the app user and group
RUN groupadd --gid 1000 app && \
  useradd --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin --uid 1000 --gid 1000 app

ENTRYPOINT ["python", "-m", "led_daemon"]
#ENTRYPOINT ["ls", "-lah"]