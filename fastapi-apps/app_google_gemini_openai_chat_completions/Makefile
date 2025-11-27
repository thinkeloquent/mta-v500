.PHONY: help setup install install-dev install-local venv run run-dev test test-cov lint format type-check quality migrate migrate-upgrade migrate-downgrade migrate-downgrade-to migrate-create clean clean-all ci

# Python and virtual environment configuration
PYTHON := python3
VENV := ../../.venv
VENV_BIN := $(VENV)/bin
PYTHON_VENV := $(VENV_BIN)/python
PIP := $(VENV_BIN)/pip
PYTEST := $(VENV_BIN)/pytest
BLACK := $(VENV_BIN)/black
ISORT := $(VENV_BIN)/isort
FLAKE8 := $(VENV_BIN)/flake8
MYPY := $(VENV_BIN)/mypy
UVICORN := $(VENV_BIN)/uvicorn
GUNICORN := $(VENV_BIN)/gunicorn
ALEMBIC := $(VENV_BIN)/alembic

# Application configuration
APP_MODULE := app.main:app
HOST := 0.0.0.0
PORT := 8080

# Local packages directory
LOCAL_PACKAGES := ../../packages-py

# Default target
help:
	@echo "App Google Gemini Openai Chat Completions Backend - Makefile Commands"
	@echo ""
	@echo "Setup & Installation:"
	@echo "  make setup          - Full setup: clean, create venv, install all deps"
	@echo "  make venv           - Create virtual environment"
	@echo "  make install        - Install production dependencies"
	@echo "  make install-dev    - Install development dependencies"
	@echo "  make install-local  - Install local monorepo packages (editable)"
	@echo ""
	@echo "Running:"
	@echo "  make run            - Run with Gunicorn (production)"
	@echo "  make run-dev        - Run with Uvicorn (development with reload)"
	@echo ""
	@echo "Testing:"
	@echo "  make test           - Run tests with pytest"
	@echo "  make test-cov       - Run tests with coverage report"
	@echo ""
	@echo "Code Quality:"
	@echo "  make lint           - Run linting checks (flake8)"
	@echo "  make format         - Format code (black + isort)"
	@echo "  make type-check     - Run type checking (mypy)"
	@echo "  make quality        - Run all quality checks (lint + type-check)"
	@echo ""
	@echo "Database Migrations:"
	@echo "  make migrate        - Show migration status"
	@echo "  make migrate-upgrade - Apply migrations"
	@echo "  make migrate-downgrade - Downgrade one migration (requires confirmation or FORCE=1)"
	@echo "  make migrate-downgrade-to REV='revision' - Downgrade to specific revision (requires confirmation or FORCE=1)"
	@echo "  make migrate-create MSG='message' - Create new migration"
	@echo ""
	@echo "CI/CD:"
	@echo "  make ci             - Run full CI pipeline (install, quality, test)"
	@echo ""
	@echo "Cleanup:"
	@echo "  make clean          - Remove Python cache and build artifacts"
	@echo "  make clean-all      - Remove venv and all artifacts"

# Create virtual environment
venv:
	@if [ ! -d "$(VENV)" ]; then \
		echo "Creating virtual environment at $(VENV)..."; \
		$(PYTHON) -m venv $(VENV); \
		echo "Virtual environment created."; \
	else \
		echo "Virtual environment already exists at $(VENV)."; \
	fi

# Full setup: delete venv, recreate, install all dependencies
setup:
	@echo "Running full setup..."
	@echo "Removing existing virtual environment..."
	rm -rf $(VENV)
	@echo "Creating virtual environment at $(VENV)..."
	$(PYTHON) -m venv $(VENV)
	@echo "Activating and installing dependencies..."
	. $(VENV_BIN)/activate && \
		pip install --upgrade pip && \
		pip install -r requirements.txt && \
		pip install -r requirements-dev.txt && \
		echo "Installing local monorepo packages..." && \
		pip install -e $(LOCAL_PACKAGES)/fetch_proxy_dispatcher && \
		pip install -e $(LOCAL_PACKAGES)/google_gemini_openai_client
	@echo ""
	@echo "Setup complete! Run 'make run-dev' to start the development server."

# Install local monorepo packages (editable mode)
install-local: venv
	@echo "Installing local monorepo packages..."
	$(PIP) install -e $(LOCAL_PACKAGES)/fetch_proxy_dispatcher
	$(PIP) install -e $(LOCAL_PACKAGES)/google_gemini_openai_client
	@echo "Local packages installed."

# Install production dependencies
install: venv install-local
	@echo "Installing production dependencies..."
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements.txt
	@echo "Production dependencies installed."

# Install development dependencies
install-dev: venv install-local
	@echo "Installing development dependencies..."
	$(PIP) install --upgrade pip
	$(PIP) install -r requirements-dev.txt
	@echo "Development dependencies installed."

# Run with Gunicorn (production)
run: install
	@echo "Starting application with Gunicorn (production)..."
	$(GUNICORN) -c gunicorn.conf.py $(APP_MODULE)

# Run with Uvicorn (development with auto-reload)
run-dev: install-dev
	@echo "Starting application with Uvicorn (development mode)..."
	$(UVICORN) $(APP_MODULE) --host $(HOST) --port $(PORT) --reload

# Run tests
test: install-dev
	@echo "Running tests..."
	$(PYTEST) tests/ -v

# Run tests with coverage
test-cov: install-dev
	@echo "Running tests with coverage..."
	$(PYTEST) tests/ -v --cov=app --cov-report=term-missing --cov-report=html

# Lint code
lint: install-dev
	@echo "Running linting checks..."
	$(FLAKE8) app/ tests/ --max-line-length=100 --extend-ignore=E203,W503

# Format code
format: install-dev
	@echo "Formatting code with black..."
	$(BLACK) app/ tests/ --line-length=100
	@echo "Sorting imports with isort..."
	$(ISORT) app/ tests/ --profile black

# Type checking
type-check: install-dev
	@echo "Running type checking..."
	$(MYPY) app/ --ignore-missing-imports

# Run all quality checks
quality: lint type-check
	@echo "All quality checks passed."

# Show migration status
migrate: install
	@echo "Current migration status:"
	$(ALEMBIC) current
	@echo ""
	@echo "Migration history:"
	$(ALEMBIC) history

# Apply migrations
migrate-upgrade: install
	@echo "Applying database migrations..."
	$(ALEMBIC) upgrade head
	@echo "Migrations applied."

# Downgrade one migration (with confirmation or FORCE)
migrate-downgrade: install
	@if [ "$(FORCE)" = "1" ]; then \
		echo "FORCE mode enabled - downgrading one migration..."; \
		$(ALEMBIC) downgrade -1; \
		echo "Downgrade complete."; \
	else \
		echo "This will downgrade one migration and may drop tables/columns!"; \
		read -p "Are you sure? [y/N] " -n 1 -r; \
		echo; \
		if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
			echo "Downgrading one migration..."; \
			$(ALEMBIC) downgrade -1; \
			echo "Downgrade complete."; \
		else \
			echo "Downgrade cancelled."; \
			exit 1; \
		fi; \
	fi

# Downgrade to specific revision (with confirmation or FORCE)
migrate-downgrade-to: install
	@if [ -z "$(REV)" ]; then \
		echo "Error: REV parameter required. Usage: make migrate-downgrade-to REV='revision_id'"; \
		exit 1; \
	fi
	@if [ "$(FORCE)" = "1" ]; then \
		echo "FORCE mode enabled - downgrading to revision $(REV)..."; \
		$(ALEMBIC) downgrade $(REV); \
		echo "Downgrade complete."; \
	else \
		echo "This will downgrade to revision $(REV) and may drop tables/columns!"; \
		read -p "Are you sure? [y/N] " -n 1 -r; \
		echo; \
		if [ "$$REPLY" = "y" ] || [ "$$REPLY" = "Y" ]; then \
			echo "Downgrading to revision $(REV)..."; \
			$(ALEMBIC) downgrade $(REV); \
			echo "Downgrade complete."; \
		else \
			echo "Downgrade cancelled."; \
			exit 1; \
		fi; \
	fi

# Create new migration
migrate-create: install
	@if [ -z "$(MSG)" ]; then \
		echo "Error: MSG parameter required. Usage: make migrate-create MSG='your message'"; \
		exit 1; \
	fi
	@echo "Creating new migration: $(MSG)"
	$(ALEMBIC) revision --autogenerate -m "$(MSG)"

# Clean Python cache and build artifacts
clean:
	@echo "Cleaning Python cache and build artifacts..."
	find . -type f -name '*.pyc' -delete
	find . -type d -name '__pycache__' -delete
	find . -type d -name '*.egg-info' -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name '.pytest_cache' -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name '.mypy_cache' -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name 'htmlcov' -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name '.coverage' -delete 2>/dev/null || true
	@echo "Cleanup complete."

# Remove venv and all artifacts
clean-all: clean
	@echo "Removing virtual environment..."
	rm -rf $(VENV)
	@echo "Full cleanup complete."

# CI pipeline - runs all checks
ci: install-dev quality test
	@echo ""
	@echo "CI pipeline completed successfully!"
	@echo ""
