# Makefile - Main CI orchestrator for MTA-V500
# Extends: Makefile.fastapi, Makefile.fastify, Makefile.vite, Makefile.database
# Implements standard CI targets: install, build, test, run, clean
# - make dev-no-cache - Clears Python cache and starts dev server
# - make -f Makefile.fastapi dev-no-cache - Same but just for FastAPI

.PHONY: setup install build test run clean help

.DEFAULT_GOAL := help

# Python version (3.11 required - asyncpg doesn't support 3.13 yet)
PYTHON := python3.11

# Virtual environment path
VENV := .venv

# =============================================================================
# CI Targets - Orchestrate all subsystems
# =============================================================================

setup: ## Full setup: delete .venv, recreate, install all dependencies
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  MTA-V500 - Full Setup (clean .venv + install)"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""
	@if ! command -v $(PYTHON) &> /dev/null; then \
		echo "Error: $(PYTHON) not found. Please install Python 3.11"; \
		echo "  brew install python@3.11"; \
		exit 1; \
	fi
	@echo "Using Python: $$($(PYTHON) --version)"
	@echo ""
	@echo "Removing existing virtual environment..."
	@rm -rf $(VENV)
	@echo "Creating fresh virtual environment..."
	@$(PYTHON) -m venv $(VENV)
	@echo "Virtual environment created at $(VENV)"
	@echo ""
	@. $(VENV)/bin/activate && $(MAKE) install
	@echo ""
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "✓ Setup complete! Run 'make dev' to start development server."
	@echo "═══════════════════════════════════════════════════════════════"

install:
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  MTA-V500 - Installing all dependencies"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""
	@echo "[1/3] Installing FastAPI dependencies..."
	@$(MAKE) -f Makefile.fastapi install
	@echo ""
	@echo "[2/3] Installing Fastify dependencies..."
	@$(MAKE) -f Makefile.fastify install
	@echo ""
	@echo "[3/3] Installing Vite frontend dependencies..."
	@$(MAKE) -f Makefile.vite install
	@echo ""
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "✓ Installation complete"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""
	@echo "Note: Database setup requires explicit command:"
	@echo "  make -f Makefile.database run    # Start databases"

# VITE_APPS - space-separated list of app names for Vite dev servers
# If empty, defaults to build:watch mode
# Example: make dev VITE_APPS="app-figma app-dashboard"
VITE_APPS ?="app-chat-window"

dev:
	@bash .bin/clean-port-3000.sh
	@bash .bin/clean-port-8080.sh
	make -f Makefile.nx build
	@bash .bin/dev-parallel.sh $(VITE_APPS)

dev-no-cache: ## Clear Python cache and start dev server
	@echo "[MTA] Clearing Python cache..."
	@find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	@find . -name "*.pyc" -delete 2>/dev/null || true
	@find . -name "*.pyo" -delete 2>/dev/null || true
	@echo "[MTA] Cache cleared!"
	@$(MAKE) dev

build:
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  MTA-V500 - Building all components"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""
	@echo "[1/3] Building Vite frontends..."
	@$(MAKE) -f Makefile.vite build
	@echo ""
	@echo "[2/3] Building FastAPI apps..."
	@$(MAKE) -f Makefile.fastapi build
	@echo ""
	@echo "[3/3] Building Fastify apps..."
	@$(MAKE) -f Makefile.fastify build
	@echo ""
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "✓ Build complete"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""
	@echo "Note: Database images require explicit command:"
	@echo "  make -f Makefile.database build    # Build database images"

test:
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  MTA-V500 - Running all tests"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""
	@echo "[1/3] Testing Vite frontends..."
	@$(MAKE) -f Makefile.vite test
	@echo ""
	@echo "[2/3] Testing FastAPI apps..."
	@$(MAKE) -f Makefile.fastapi test
	@echo ""
	@echo "[3/3] Testing Fastify apps..."
	@$(MAKE) -f Makefile.fastify test
	@echo ""
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "✓ All tests passed"
	@echo "═══════════════════════════════════════════════════════════════"

run:
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  MTA-V500 - Starting services"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""
	@echo "Note: 'make run' does NOT start databases automatically."
	@echo "      Databases require explicit commands."
	@echo ""
	@echo "Setup instructions:"
	@echo ""
	@echo "  [Terminal 1] Start databases:"
	@echo "    make -f Makefile.database run"
	@echo ""
	@echo "  [Terminal 2] Start FastAPI (port 8080):"
	@echo "    make -f Makefile.fastapi run"
	@echo ""
	@echo "  [Terminal 3] Start Fastify (port 3000):"
	@echo "    make -f Makefile.fastify run"
	@echo ""
	@echo "Or use Docker:"
	@echo "  make -f Makefile.database build      # Build database images"
	@echo "  make -f Makefile.database run        # Start databases"
	@echo "  docker build -f Dockerfile.fastapi -t mta-fastapi ."
	@echo "  docker run -p 8080:8080 --network mta-network mta-fastapi"
	@echo ""

clean:
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  MTA-V500 - Cleaning all artifacts"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""
	@echo "[1/3] Cleaning Vite artifacts..."
	@$(MAKE) -f Makefile.vite clean
	@echo ""
	@echo "[2/3] Cleaning FastAPI artifacts..."
	@$(MAKE) -f Makefile.fastapi clean
	@echo ""
	@echo "[3/3] Cleaning Fastify artifacts..."
	@$(MAKE) -f Makefile.fastify clean
	@echo ""
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "✓ Clean complete"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""
	@echo "Note: Database cleanup requires explicit command:"
	@echo "  make -f Makefile.database clean      # Stop databases (preserve data)"
	@echo "  make -f Makefile.database db-reset   # Reset databases (DELETE ALL DATA)"

# =============================================================================
# Help
# =============================================================================

help:
	@echo "═══════════════════════════════════════════════════════════════"
	@echo "  MTA-V500 Makefile - CI Orchestrator"
	@echo "═══════════════════════════════════════════════════════════════"
	@echo ""
	@echo "Setup & CI Targets (apps only - no database):"
	@echo "  make setup      - Full monorepo setup (alias for install)"
	@echo "  make install    - Install dependencies (Vite + FastAPI + Fastify)"
	@echo "  make dev        - Start dev servers (Fastify + FastAPI + Vite)"
	@echo "  make build      - Build all components (Vite + FastAPI + Fastify)"
	@echo "  make test       - Run all tests (Vite + FastAPI + Fastify)"
	@echo "  make run        - Show startup instructions"
	@echo "  make clean      - Clean build artifacts (Vite + FastAPI + Fastify)"
	@echo ""
	@echo "Database Commands (require explicit execution):"
	@echo "  make -f Makefile.database build       - Build database Docker images"
	@echo "  make -f Makefile.database run         - Start Postgres + Redis"
	@echo "  make -f Makefile.database clean       - Stop databases (preserve data)"
	@echo "  make -f Makefile.database db-reset    - Reset databases (DELETE DATA)"
	@echo ""
	@echo "Application Commands:"
	@echo "  make -f Makefile.vite [target]        - Vite frontend operations"
	@echo "  make -f Makefile.fastapi [target]     - FastAPI operations"
	@echo "  make -f Makefile.fastify [target]     - Fastify operations"
	@echo ""
	@echo "Quick Start:"
	@echo "  1. make install                       # Install all dependencies"
	@echo "  2. make -f Makefile.database run      # Start databases"
	@echo "  3. make -f Makefile.fastapi run       # Start FastAPI (new terminal)"
	@echo "  4. make -f Makefile.vite dev          # Start Vite frontends (optional)"
	@echo ""
	@echo "For detailed help on each subsystem:"
	@echo "  make -f Makefile.database help"
	@echo "  make -f Makefile.vite help"
	@echo "  make -f Makefile.fastapi help"
	@echo "  make -f Makefile.fastify help"
	@echo ""
