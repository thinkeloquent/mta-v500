# Hello Sub-App

A standalone FastAPI application that can run independently or be mounted as a sub-app.

## Features

- Independent Poetry project
- Can run standalone
- Can be mounted in parent app
- Self-contained with own tests

## Running Standalone

```bash
cd app/hello
poetry install
poetry run uvicorn app.main:app --host 0.0.0.0 --port 8080 --reload
```

## Endpoints

- `GET /` - Hello World
- `GET /hello` - Hello from FastAPI
- `GET /hello/{name}` - Personalized greeting

## Testing

```bash
cd app/hello
poetry run pytest
```

## Building Standalone Docker Image

```bash
cd app/hello
docker build -t hello-app:latest .
docker run -p 8080:8080 hello-app:latest
```
