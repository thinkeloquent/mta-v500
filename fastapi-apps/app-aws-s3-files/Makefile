.PHONY: help install install-dev dev start test test-cov lint lint-fix format format-check type-check check clean

# Default target
help:
	@echo "Available commands:"
	@echo "  make install       - Install production dependencies"
	@echo "  make install-dev   - Install development dependencies"
	@echo "  make dev           - Run development server with auto-reload"
	@echo "  make start         - Run production server"
	@echo "  make test          - Run tests"
	@echo "  make test-cov      - Run tests with coverage report"
	@echo "  make lint          - Run linter (ruff)"
	@echo "  make lint-fix      - Run linter and fix issues"
	@echo "  make format        - Format code with black"
	@echo "  make format-check  - Check code formatting"
	@echo "  make type-check    - Run type checker (mypy)"
	@echo "  make check         - Run all checks (format, lint, type)"
	@echo "  make clean         - Remove generated files"

# Install production dependencies
install:
	pip install -r requirements.txt

# Install development dependencies
install-dev:
	pip install -r requirements-dev.txt

# Run development server
dev:
	uvicorn main:app --host 0.0.0.0 --port 3001 --reload

# Run production server
start:
	uvicorn main:app --host 0.0.0.0 --port 3001

# Run tests
test:
	pytest

# Run tests with coverage
test-cov:
	pytest --cov=. --cov-report=term-missing --cov-report=html

# Run linter
lint:
	ruff check .

# Run linter and fix issues
lint-fix:
	ruff check --fix .

# Format code
format:
	black .

# Check code formatting
format-check:
	black --check .

# Run type checker
type-check:
	mypy .

# Run all checks
check: format-check lint type-check
	@echo "All checks passed!"

# Clean generated files
clean:
	find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	find . -type f -name ".coverage" -delete 2>/dev/null || true
	find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "Cleaned generated files"
