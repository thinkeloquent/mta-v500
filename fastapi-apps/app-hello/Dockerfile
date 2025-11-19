# Standalone Dockerfile for Hello sub-app
FROM python:3.11-slim

WORKDIR /app

# Install Poetry from pip
RUN pip install --no-cache-dir poetry

# Configure Poetry
ENV POETRY_VIRTUALENVS_CREATE=false

# Copy Poetry files
COPY pyproject.toml poetry.lock* ./

# Install dependencies
RUN poetry install --no-interaction --no-ansi --without dev

# Copy application code
COPY . .

# Expose port
EXPOSE 8080

# Run the application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8080"]
