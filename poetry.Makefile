# ==============================================================================
# Poetry Makefile - Manage Python Poetry Application
# ==============================================================================
# Usage: make -f poetry.Makefile <target>
# Usage: make -f poetry.Makefile update-lock
# Or: include poetry.Makefile in your main Makefile
# ==============================================================================

.PHONY: help

# ------------------------------------------------------------------------------
# Configuration
# ------------------------------------------------------------------------------

# Colors for output
RED     := \033[0;31m
GREEN   := \033[0;32m
YELLOW  := \033[0;33m
CYAN    := \033[0;36m
BLUE    := \033[0;34m
PURPLE  := \033[0;35m
WHITE   := \033[0;37m
RESET   := \033[0m

# Python/Pip Registry Configuration
# Uses system environment variables if set, otherwise uses defaults below
# Override these values by setting environment variables or editing this file
PYTHON_REGISTRY_URL ?= https://pypi.org/simple
PIP_INDEX ?= $(PYTHON_REGISTRY_URL)
PIP_INDEX_URL ?= $(PYTHON_REGISTRY_URL)
PIP_TRUSTED_HOST ?= pypi.org
POETRY_PYPI_TOKEN ?=

# Pip behavior configuration
# Use system environment variables if set, otherwise use defaults
PIP_DISABLE_PIP_VERSION_CHECK ?= 1
PIP_VERBOSE ?= 1

# Proxy configuration
# Use HTTP_PROXY from environment if set
ifdef HTTP_PROXY
PROXY_FLAGS ?= --proxy $(HTTP_PROXY)
else
PROXY_FLAGS ?=
endif

# Export registry configuration for pip/poetry
export PIP_INDEX
export PIP_INDEX_URL
export PIP_TRUSTED_HOST
export PIP_DISABLE_PIP_VERSION_CHECK
export PIP_VERBOSE
export POETRY_PYPI_TOKEN_PYPI = $(POETRY_PYPI_TOKEN)

# Poetry commands
POETRY := poetry
POETRY_RUN := poetry run

# Project configuration
PROJECT_NAME := $(shell $(POETRY) version | cut -d' ' -f1)
PROJECT_VERSION := $(shell $(POETRY) version -s)

# ------------------------------------------------------------------------------
# Help
# ------------------------------------------------------------------------------

help: ## Show this help message
	@echo "$(CYAN)Poetry Application Management$(RESET)"
	@echo ""
	@echo "$(GREEN)Core Commands:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-25s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(BLUE)Quick Commands:$(RESET)"
	@echo "  make -f poetry.Makefile lock                     # Generate/update lock file"
	@echo "  make -f poetry.Makefile install                  # Install dependencies"
	@echo "  make -f poetry.Makefile test                     # Run tests"
	@echo "  make -f poetry.Makefile build                    # Build package"
	@echo "  make -f poetry.Makefile ci                       # Run CI workflow"
	@echo ""
	@echo "$(BLUE)Development Workflow:$(RESET)"
	@echo "  1. make -f poetry.Makefile lock                  # Generate lock file"
	@echo "  2. make -f poetry.Makefile install               # Install dependencies"
	@echo "  3. make -f poetry.Makefile test                  # Run tests"
	@echo "  4. make -f poetry.Makefile build                 # Build package"
	@echo ""
	@echo "$(PURPLE)Registry Configuration:$(RESET)"
	@echo "  PYTHON_REGISTRY_URL = $(PYTHON_REGISTRY_URL)"
	@echo "  PIP_INDEX           = $(PIP_INDEX)"
	@echo "  PIP_INDEX_URL       = $(PIP_INDEX_URL)"
	@echo "  PIP_TRUSTED_HOST    = $(PIP_TRUSTED_HOST)"
	@echo ""
	@echo "$(PURPLE)Pip Behavior:$(RESET)"
	@echo "  PIP_DISABLE_PIP_VERSION_CHECK = $(PIP_DISABLE_PIP_VERSION_CHECK)"
	@echo "  PIP_VERBOSE                   = $(PIP_VERBOSE)"
ifdef HTTP_PROXY
	@echo "  HTTP_PROXY                    = $(HTTP_PROXY)"
	@echo "  Proxy flags                   = $(PROXY_FLAGS)"
endif
	@echo ""
	@echo "$(PURPLE)Environment Variables (with defaults if not set):$(RESET)"
	@echo "  All configuration variables use system environment variables first"
	@echo "  If not set, defaults shown above are used"
	@echo ""
	@echo "$(PURPLE)To override registry:$(RESET)"
	@echo "  PYTHON_REGISTRY_URL=https://custom.registry.com make -f poetry.Makefile install"
	@echo "  Or export: export PYTHON_REGISTRY_URL=https://custom.registry.com"
	@echo ""
	@echo "$(PURPLE)To use proxy:$(RESET)"
	@echo "  HTTP_PROXY=http://proxy.example.com:8080 make -f poetry.Makefile install"
	@echo "  Or export: export HTTP_PROXY=http://proxy.example.com:8080"
	@echo ""

# ------------------------------------------------------------------------------
# Installation & Setup
# ------------------------------------------------------------------------------

install: ## Install all dependencies
	@echo "$(CYAN)Installing dependencies...$(RESET)"
	@echo "$(BLUE)Using registry: $(PIP_INDEX_URL)$(RESET)"
	@$(POETRY) install --no-interaction --no-ansi
	@echo "$(GREEN)✓ Dependencies installed$(RESET)"

install-no-dev: ## Install only production dependencies
	@echo "$(CYAN)Installing production dependencies...$(RESET)"
	@echo "$(BLUE)Using registry: $(PIP_INDEX_URL)$(RESET)"
	@$(POETRY) install --no-interaction --no-ansi --without dev
	@echo "$(GREEN)✓ Production dependencies installed$(RESET)"

install-no-root: ## Install dependencies without installing project
	@echo "$(CYAN)Installing dependencies (no root)...$(RESET)"
	@echo "$(BLUE)Using registry: $(PIP_INDEX_URL)$(RESET)"
	@$(POETRY) install --no-interaction --no-ansi --no-root
	@echo "$(GREEN)✓ Dependencies installed (no root)$(RESET)"

update: ## Update all dependencies
	@echo "$(CYAN)Updating dependencies...$(RESET)"
	@$(POETRY) update --no-interaction
	@echo "$(GREEN)✓ Dependencies updated$(RESET)"

update-lock: ## Update lock file without upgrading dependencies
	@echo "$(CYAN)Updating lock file...$(RESET)"
	@$(POETRY) lock --no-update
	@echo "$(GREEN)✓ Lock file updated$(RESET)"

# ------------------------------------------------------------------------------
# Lock File Management
# ------------------------------------------------------------------------------

lock: ## Generate/update poetry.lock file
	@echo "$(CYAN)Generating/updating lock file...$(RESET)"
	@echo "$(BLUE)Using registry: $(PIP_INDEX_URL)$(RESET)"
	@$(POETRY) lock --no-interaction
	@echo "$(GREEN)✓ Lock file generated$(RESET)"

lock-check: ## Check if lock file is up to date
	@echo "$(CYAN)Checking lock file...$(RESET)"
	@$(POETRY) lock --check
	@echo "$(GREEN)✓ Lock file is up to date$(RESET)"

lock-no-update: ## Refresh lock file without updating dependencies
	@echo "$(CYAN)Refreshing lock file (no update)...$(RESET)"
	@$(POETRY) lock --no-update
	@echo "$(GREEN)✓ Lock file refreshed$(RESET)"

# ------------------------------------------------------------------------------
# Dependency Management
# ------------------------------------------------------------------------------

add: ## Add a dependency (use PKG=package)
	@if [ -z "$(PKG)" ]; then \
		echo "$(RED)✗ PKG parameter required$(RESET)"; \
		echo "$(YELLOW)Usage: make -f poetry.Makefile add PKG=fastapi$(RESET)"; \
		exit 1; \
	fi
	@echo "$(CYAN)Adding dependency: $(PKG)$(RESET)"
	@$(POETRY) add $(PKG)
	@echo "$(GREEN)✓ Dependency added: $(PKG)$(RESET)"

add-dev: ## Add a dev dependency (use PKG=package)
	@if [ -z "$(PKG)" ]; then \
		echo "$(RED)✗ PKG parameter required$(RESET)"; \
		echo "$(YELLOW)Usage: make -f poetry.Makefile add-dev PKG=pytest$(RESET)"; \
		exit 1; \
	fi
	@echo "$(CYAN)Adding dev dependency: $(PKG)$(RESET)"
	@$(POETRY) add --group dev $(PKG)
	@echo "$(GREEN)✓ Dev dependency added: $(PKG)$(RESET)"

remove: ## Remove a dependency (use PKG=package)
	@if [ -z "$(PKG)" ]; then \
		echo "$(RED)✗ PKG parameter required$(RESET)"; \
		echo "$(YELLOW)Usage: make -f poetry.Makefile remove PKG=package$(RESET)"; \
		exit 1; \
	fi
	@echo "$(CYAN)Removing dependency: $(PKG)$(RESET)"
	@$(POETRY) remove $(PKG)
	@echo "$(GREEN)✓ Dependency removed: $(PKG)$(RESET)"

show: ## Show installed dependencies
	@echo "$(CYAN)Installed Dependencies:$(RESET)"
	@$(POETRY) show

show-tree: ## Show dependency tree
	@echo "$(CYAN)Dependency Tree:$(RESET)"
	@$(POETRY) show --tree

show-outdated: ## Show outdated dependencies
	@echo "$(CYAN)Outdated Dependencies:$(RESET)"
	@$(POETRY) show --outdated

show-latest: ## Show latest versions of dependencies
	@echo "$(CYAN)Latest Versions:$(RESET)"
	@$(POETRY) show --latest

# ------------------------------------------------------------------------------
# Build & Package
# ------------------------------------------------------------------------------

build: ## Build package distributions
	@echo "$(CYAN)Building package...$(RESET)"
	@$(POETRY) build
	@echo "$(GREEN)✓ Build complete$(RESET)"
	@echo "$(BLUE)Artifacts:$(RESET)"
	@ls -lh dist/

build-wheel: ## Build wheel distribution only
	@echo "$(CYAN)Building wheel...$(RESET)"
	@$(POETRY) build --format wheel
	@echo "$(GREEN)✓ Wheel built$(RESET)"

build-sdist: ## Build source distribution only
	@echo "$(CYAN)Building source distribution...$(RESET)"
	@$(POETRY) build --format sdist
	@echo "$(GREEN)✓ Source distribution built$(RESET)"

clean-build: ## Clean build artifacts
	@echo "$(CYAN)Cleaning build artifacts...$(RESET)"
	@rm -rf dist/ build/ *.egg-info .eggs/
	@find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@echo "$(GREEN)✓ Build artifacts cleaned$(RESET)"

# ------------------------------------------------------------------------------
# Publishing
# ------------------------------------------------------------------------------

publish: ## Publish package to PyPI
	@echo "$(CYAN)Publishing package...$(RESET)"
	@$(POETRY) publish
	@echo "$(GREEN)✓ Package published$(RESET)"

publish-build: ## Build and publish package
	@echo "$(CYAN)Building and publishing package...$(RESET)"
	@$(POETRY) publish --build
	@echo "$(GREEN)✓ Package built and published$(RESET)"

publish-test: ## Publish package to TestPyPI
	@echo "$(CYAN)Publishing to TestPyPI...$(RESET)"
	@$(POETRY) config repositories.testpypi https://test.pypi.org/legacy/
	@$(POETRY) publish --repository testpypi
	@echo "$(GREEN)✓ Package published to TestPyPI$(RESET)"

# ------------------------------------------------------------------------------
# Testing
# ------------------------------------------------------------------------------

test: ## Run tests with pytest
	@echo "$(CYAN)Running tests...$(RESET)"
	@$(POETRY_RUN) pytest
	@echo "$(GREEN)✓ Tests complete$(RESET)"

test-verbose: ## Run tests with verbose output
	@echo "$(CYAN)Running tests (verbose)...$(RESET)"
	@$(POETRY_RUN) pytest -v
	@echo "$(GREEN)✓ Tests complete$(RESET)"

test-coverage: ## Run tests with coverage report
	@echo "$(CYAN)Running tests with coverage...$(RESET)"
	@$(POETRY_RUN) pytest --cov --cov-report=html --cov-report=term
	@echo "$(GREEN)✓ Coverage report generated$(RESET)"
	@echo "$(BLUE)View report: open htmlcov/index.html$(RESET)"

test-watch: ## Run tests in watch mode (requires pytest-watch)
	@echo "$(CYAN)Starting test watch mode...$(RESET)"
	@$(POETRY_RUN) ptw

test-failed: ## Re-run only failed tests
	@echo "$(CYAN)Re-running failed tests...$(RESET)"
	@$(POETRY_RUN) pytest --lf

test-markers: ## Show available test markers
	@echo "$(CYAN)Available Test Markers:$(RESET)"
	@$(POETRY_RUN) pytest --markers

# ------------------------------------------------------------------------------
# Linting & Formatting
# ------------------------------------------------------------------------------

lint: ## Run linting checks
	@echo "$(CYAN)Running linting...$(RESET)"
	@$(POETRY_RUN) ruff check .
	@echo "$(GREEN)✓ Linting complete$(RESET)"

lint-fix: ## Run linting with auto-fix
	@echo "$(CYAN)Running linting with auto-fix...$(RESET)"
	@$(POETRY_RUN) ruff check --fix .
	@echo "$(GREEN)✓ Linting fixed$(RESET)"

format: ## Format code with ruff
	@echo "$(CYAN)Formatting code...$(RESET)"
	@$(POETRY_RUN) ruff format .
	@echo "$(GREEN)✓ Code formatted$(RESET)"

format-check: ## Check code formatting
	@echo "$(CYAN)Checking code formatting...$(RESET)"
	@$(POETRY_RUN) ruff format --check .
	@echo "$(GREEN)✓ Code formatting is correct$(RESET)"

type-check: ## Run type checking with mypy
	@echo "$(CYAN)Running type check...$(RESET)"
	@$(POETRY_RUN) mypy .
	@echo "$(GREEN)✓ Type check complete$(RESET)"

# ------------------------------------------------------------------------------
# Project Information
# ------------------------------------------------------------------------------

version: ## Show project version
	@echo "$(CYAN)Project Version:$(RESET)"
	@$(POETRY) version

version-bump-patch: ## Bump patch version (0.0.X)
	@echo "$(CYAN)Bumping patch version...$(RESET)"
	@$(POETRY) version patch
	@echo "$(GREEN)✓ Version bumped to: $(shell $(POETRY) version -s)$(RESET)"

version-bump-minor: ## Bump minor version (0.X.0)
	@echo "$(CYAN)Bumping minor version...$(RESET)"
	@$(POETRY) version minor
	@echo "$(GREEN)✓ Version bumped to: $(shell $(POETRY) version -s)$(RESET)"

version-bump-major: ## Bump major version (X.0.0)
	@echo "$(CYAN)Bumping major version...$(RESET)"
	@$(POETRY) version major
	@echo "$(GREEN)✓ Version bumped to: $(shell $(POETRY) version -s)$(RESET)"

info: ## Show project information
	@echo "$(CYAN)Project Information:$(RESET)"
	@echo "  Name:    $(PROJECT_NAME)"
	@echo "  Version: $(PROJECT_VERSION)"
	@echo "  Python:  $(shell $(POETRY) run python3 --version)"
	@echo "  Poetry:  $(shell $(POETRY) --version)"

check: ## Validate pyproject.toml
	@echo "$(CYAN)Validating pyproject.toml...$(RESET)"
	@$(POETRY) check
	@echo "$(GREEN)✓ Configuration is valid$(RESET)"

env-info: ## Show virtual environment information
	@echo "$(CYAN)Virtual Environment:$(RESET)"
	@$(POETRY) env info

env-list: ## List all virtual environments
	@echo "$(CYAN)Virtual Environments:$(RESET)"
	@$(POETRY) env list

# ------------------------------------------------------------------------------
# Virtual Environment Management
# ------------------------------------------------------------------------------

shell: ## Activate virtual environment shell
	@echo "$(CYAN)Activating poetry shell...$(RESET)"
	@$(POETRY) shell

run: ## Run a command in virtual environment (use CMD="command")
	@if [ -z "$(CMD)" ]; then \
		echo "$(RED)✗ CMD parameter required$(RESET)"; \
		echo "$(YELLOW)Usage: make -f poetry.Makefile run CMD='python3 script.py'$(RESET)"; \
		exit 1; \
	fi
	@$(POETRY_RUN) $(CMD)

# ------------------------------------------------------------------------------
# Clean Commands
# ------------------------------------------------------------------------------

clean: ## Clean all generated files
	@echo "$(CYAN)Cleaning generated files...$(RESET)"
	@rm -rf dist/ build/ *.egg-info .eggs/
	@find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name "*.pyc" -delete 2>/dev/null || true
	@find . -type d -name ".pytest_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".ruff_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name ".mypy_cache" -exec rm -rf {} + 2>/dev/null || true
	@find . -type d -name "htmlcov" -exec rm -rf {} + 2>/dev/null || true
	@find . -type f -name ".coverage" -delete 2>/dev/null || true
	@echo "$(GREEN)✓ Clean complete$(RESET)"

clean-venv: ## Remove virtual environment
	@echo "$(CYAN)Removing virtual environment...$(RESET)"
	@$(POETRY) env remove --all
	@echo "$(GREEN)✓ Virtual environment removed$(RESET)"

clean-all: clean clean-venv ## Clean everything (files + venv)
	@echo "$(GREEN)✓ Deep clean complete$(RESET)"

# ------------------------------------------------------------------------------
# CI/CD Workflows
# ------------------------------------------------------------------------------

ci: lock-check install test lint format-check type-check build ## Full CI workflow
	@echo ""
	@echo "$(GREEN)✓ CI workflow complete$(RESET)"
	@echo "$(CYAN)Summary:$(RESET)"
	@echo "  ✓ Lock file validated"
	@echo "  ✓ Dependencies installed"
	@echo "  ✓ Tests passed"
	@echo "  ✓ Linting passed"
	@echo "  ✓ Formatting checked"
	@echo "  ✓ Type checking passed"
	@echo "  ✓ Build successful"

ci-fast: install test lint ## Fast CI workflow (no build)
	@echo ""
	@echo "$(GREEN)✓ Fast CI workflow complete$(RESET)"

ci-build: lock install build ## CI workflow for building
	@echo ""
	@echo "$(GREEN)✓ Build CI workflow complete$(RESET)"

ci-test: install test-coverage ## CI workflow for testing with coverage
	@echo ""
	@echo "$(GREEN)✓ Test CI workflow complete$(RESET)"

pre-commit: format lint test ## Pre-commit checks
	@echo ""
	@echo "$(GREEN)✓ Pre-commit checks passed$(RESET)"

validate-all: check lock-check lint format-check type-check test ## Run all validation checks
	@echo ""
	@echo "$(GREEN)✓ All validation checks passed$(RESET)"

# ------------------------------------------------------------------------------
# Complete Workflows
# ------------------------------------------------------------------------------

init: lock install ## Initialize project (lock + install)
	@echo ""
	@echo "$(GREEN)✓ Project initialized$(RESET)"
	@echo ""
	@echo "$(CYAN)Next steps:$(RESET)"
	@echo "  1. Run tests: make -f poetry.Makefile test"
	@echo "  2. Start development: make -f poetry.Makefile shell"
	@echo ""

setup: init ## Alias for init

fresh-install: clean-all lock install ## Fresh installation (clean + lock + install)
	@echo "$(GREEN)✓ Fresh installation complete$(RESET)"

rebuild: clean-build build ## Clean and rebuild
	@echo "$(GREEN)✓ Rebuild complete$(RESET)"

release-patch: version-bump-patch build publish ## Release patch version
	@echo "$(GREEN)✓ Patch release complete: $(shell $(POETRY) version -s)$(RESET)"

release-minor: version-bump-minor build publish ## Release minor version
	@echo "$(GREEN)✓ Minor release complete: $(shell $(POETRY) version -s)$(RESET)"

release-major: version-bump-major build publish ## Release major version
	@echo "$(GREEN)✓ Major release complete: $(shell $(POETRY) version -s)$(RESET)"

# ------------------------------------------------------------------------------
# Docker Support
# ------------------------------------------------------------------------------

docker-build: ## Build Docker image
	@echo "$(CYAN)Building Docker image...$(RESET)"
	@docker build -t $(PROJECT_NAME):$(PROJECT_VERSION) .
	@docker build -t $(PROJECT_NAME):latest .
	@echo "$(GREEN)✓ Docker image built$(RESET)"

docker-run: ## Run Docker container
	@echo "$(CYAN)Running Docker container...$(RESET)"
	@docker run -p 8080:8080 $(PROJECT_NAME):latest

docker-test: ## Run tests in Docker
	@echo "$(CYAN)Running tests in Docker...$(RESET)"
	@docker build -t $(PROJECT_NAME)-test --target test .
	@docker run $(PROJECT_NAME)-test

# ------------------------------------------------------------------------------
# Development Helpers
# ------------------------------------------------------------------------------

status: ## Show project status
	@echo "$(CYAN)Project Status$(RESET)"
	@echo ""
	@echo "$(PURPLE)Project:$(RESET)"
	@echo "  Name:    $(PROJECT_NAME)"
	@echo "  Version: $(PROJECT_VERSION)"
	@echo ""
	@echo "$(PURPLE)Python:$(RESET)"
	@$(POETRY) run python3 --version
	@echo ""
	@echo "$(PURPLE)Poetry:$(RESET)"
	@$(POETRY) --version
	@echo ""
	@echo "$(PURPLE)Registry:$(RESET)"
	@echo "  URL: $(PIP_INDEX_URL)"
	@echo ""
	@echo "$(PURPLE)Dependencies:$(RESET)"
	@$(POETRY) show --tree --no-dev | head -20 || true
	@echo ""

watch: ## Watch for file changes and run tests (requires pytest-watch)
	@echo "$(CYAN)Watching for changes...$(RESET)"
	@$(POETRY_RUN) ptw --runner "pytest --lf -x"

audit: ## Run security audit with safety
	@echo "$(CYAN)Running security audit...$(RESET)"
	@$(POETRY_RUN) safety check || echo "$(YELLOW)Install safety: poetry add --group dev safety$(RESET)"

audit-full: ## Full security audit (safety + bandit)
	@echo "$(CYAN)Running full security audit...$(RESET)"
	@echo "$(PURPLE)Safety Check:$(RESET)"
	@$(POETRY_RUN) safety check || echo "$(YELLOW)Install safety: poetry add --group dev safety$(RESET)"
	@echo ""
	@echo "$(PURPLE)Bandit Check:$(RESET)"
	@$(POETRY_RUN) bandit -r . || echo "$(YELLOW)Install bandit: poetry add --group dev bandit$(RESET)"

config-list: ## List all Poetry configuration
	@echo "$(CYAN)Poetry Configuration:$(RESET)"
	@$(POETRY) config --list

config-show-registry: ## Show registry configuration
	@echo "$(CYAN)Registry Configuration:$(RESET)"
	@echo "  PYTHON_REGISTRY_URL:          $(PYTHON_REGISTRY_URL)"
	@echo "  PIP_INDEX:                    $(PIP_INDEX)"
	@echo "  PIP_INDEX_URL:                $(PIP_INDEX_URL)"
	@echo "  PIP_TRUSTED_HOST:             $(PIP_TRUSTED_HOST)"
	@echo ""
	@echo "$(CYAN)Pip Behavior:$(RESET)"
	@echo "  PIP_DISABLE_PIP_VERSION_CHECK: $(PIP_DISABLE_PIP_VERSION_CHECK)"
	@echo "  PIP_VERBOSE:                   $(PIP_VERBOSE)"
ifdef HTTP_PROXY
	@echo ""
	@echo "$(CYAN)Proxy Configuration:$(RESET)"
	@echo "  HTTP_PROXY:                    $(HTTP_PROXY)"
	@echo "  Proxy flags:                   $(PROXY_FLAGS)"
endif

# ------------------------------------------------------------------------------
# Default target
# ------------------------------------------------------------------------------

.DEFAULT_GOAL := help
