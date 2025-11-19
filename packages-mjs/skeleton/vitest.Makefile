# ==============================================================================
# Vitest Makefile - Manage testing with Vitest
# ==============================================================================
# Usage: make -f vitest.Makefile <target>
# Or: include vitest.Makefile in your main Makefile
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

# Package manager
PKG_MANAGER ?= npm

# Test pattern
TEST_PATTERN := src/**/*.spec.vite.ts

# Directories
COVERAGE_DIR := coverage
HTML_DIR := html
NODE_MODULES := node_modules

# Ports
UI_PORT ?= 51204

# ------------------------------------------------------------------------------
# Help
# ------------------------------------------------------------------------------

help: ## Show this help message
	@echo "$(CYAN)Vitest Testing$(RESET)"
	@echo ""
	@echo "$(GREEN)Core Commands:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(BLUE)Examples:$(RESET)"
	@echo "  make -f vitest.Makefile test           # Run tests in watch mode"
	@echo "  make -f vitest.Makefile test-ui        # Open test UI in browser"
	@echo "  make -f vitest.Makefile coverage       # Generate coverage report"
	@echo ""

# ------------------------------------------------------------------------------
# Core Test Commands
# ------------------------------------------------------------------------------

test: ## Run tests in watch mode
	@echo "$(CYAN)Running tests in watch mode...$(RESET)"
	@$(PKG_MANAGER) run test
	@echo "$(GREEN)✓ Tests complete$(RESET)"

test-run: ## Run all tests once (no watch)
	@echo "$(CYAN)Running tests...$(RESET)"
	@$(PKG_MANAGER) run test:run
	@echo "$(GREEN)✓ All tests passed$(RESET)"

test-ui: ## Open test UI in browser
	@echo "$(CYAN)Starting Vitest UI...$(RESET)"
	@echo "$(BLUE)UI will be available at http://localhost:$(UI_PORT)/__vitest__/$(RESET)"
	@$(PKG_MANAGER) run test:ui

test-watch: ## Run tests in watch mode (explicit)
	@echo "$(CYAN)Running tests in watch mode...$(RESET)"
	@$(PKG_MANAGER) run test:watch

# ------------------------------------------------------------------------------
# Coverage Commands
# ------------------------------------------------------------------------------

coverage: ## Generate test coverage report
	@echo "$(CYAN)Generating coverage report...$(RESET)"
	@$(PKG_MANAGER) run test:coverage
	@echo "$(GREEN)✓ Coverage report generated$(RESET)"
	@echo "$(YELLOW)Run 'make -f vitest.Makefile view-coverage' to view the report$(RESET)"

view-coverage: ## View coverage report in browser
	@echo "$(CYAN)Opening coverage report...$(RESET)"
	@if [ -d "$(COVERAGE_DIR)" ]; then \
		npx vite preview --outDir $(COVERAGE_DIR) --port 4173; \
	else \
		echo "$(RED)✗ No coverage report found$(RESET)"; \
		echo "$(YELLOW)Run 'make -f vitest.Makefile coverage' first$(RESET)"; \
		exit 1; \
	fi

coverage-summary: ## Show coverage summary in terminal
	@echo "$(CYAN)Coverage Summary:$(RESET)"
	@if [ -f "$(COVERAGE_DIR)/coverage-summary.json" ]; then \
		cat $(COVERAGE_DIR)/coverage-summary.json; \
	elif [ -d "$(COVERAGE_DIR)" ]; then \
		echo "$(YELLOW)Coverage data exists but no summary JSON found$(RESET)"; \
		echo "$(YELLOW)Run 'make -f vitest.Makefile coverage' to regenerate$(RESET)"; \
	else \
		echo "$(RED)✗ No coverage data found$(RESET)"; \
		echo "$(YELLOW)Run 'make -f vitest.Makefile coverage' first$(RESET)"; \
	fi

# ------------------------------------------------------------------------------
# HTML Report Commands
# ------------------------------------------------------------------------------

view-html-report: ## View HTML test report in browser
	@echo "$(CYAN)Opening HTML test report...$(RESET)"
	@if [ -d "$(HTML_DIR)" ]; then \
		npx vite preview --outDir $(HTML_DIR) --port 4174; \
	else \
		echo "$(RED)✗ No HTML report found$(RESET)"; \
		echo "$(YELLOW)Run 'make -f vitest.Makefile test-run' first$(RESET)"; \
		exit 1; \
	fi

# ------------------------------------------------------------------------------
# CI/CD Commands
# ------------------------------------------------------------------------------

ci-test: ## Run tests for CI (no watch, with coverage)
	@echo "$(CYAN)Running CI tests...$(RESET)"
	@$(PKG_MANAGER) run test:run
	@echo "$(GREEN)✓ CI tests passed$(RESET)"

ci-test-coverage: ## Run tests with coverage for CI
	@echo "$(CYAN)Running CI tests with coverage...$(RESET)"
	@$(PKG_MANAGER) run test:coverage
	@echo "$(GREEN)✓ CI tests with coverage complete$(RESET)"

ci-validate: ## Validate test files exist and are named correctly
	@echo "$(CYAN)Validating test files...$(RESET)"
	@if [ -z "$$(find src -name '*.spec.vite.ts' -type f)" ]; then \
		echo "$(RED)✗ No test files found matching pattern: $(TEST_PATTERN)$(RESET)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✓ Test files validated$(RESET)"

# ------------------------------------------------------------------------------
# File Management Commands
# ------------------------------------------------------------------------------

list-tests: ## List all test files
	@echo "$(CYAN)Test files ($(TEST_PATTERN)):$(RESET)"
	@find src -name '*.spec.vite.ts' -type f | while read file; do \
		echo "  $(YELLOW)$$file$(RESET)"; \
	done

count-tests: ## Count total number of test files
	@echo "$(CYAN)Counting test files...$(RESET)"
	@find src -name '*.spec.vite.ts' -type f | wc -l | xargs echo "  Total test files:"
	@echo ""

watch-pattern: ## Show which files match the test pattern
	@echo "$(CYAN)Files matching pattern '$(TEST_PATTERN)':$(RESET)"
	@find src -name '*.spec.vite.ts' -type f -exec echo "  $(GREEN)✓ {}" \;
	@echo ""
	@echo "$(CYAN)All TypeScript files in src/:$(RESET)"
	@find src -name '*.ts' ! -name '*.spec.vite.ts' -type f | head -10 | while read file; do \
		echo "  $(YELLOW)- $$file$(RESET)"; \
	done

# ------------------------------------------------------------------------------
# Cleanup Commands
# ------------------------------------------------------------------------------

clean: ## Remove coverage and HTML reports
	@echo "$(CYAN)Cleaning test artifacts...$(RESET)"
	@rm -rf $(COVERAGE_DIR)
	@rm -rf $(HTML_DIR)
	@echo "$(GREEN)✓ Test artifacts cleaned$(RESET)"

clean-coverage: ## Remove only coverage reports
	@echo "$(CYAN)Cleaning coverage reports...$(RESET)"
	@rm -rf $(COVERAGE_DIR)
	@echo "$(GREEN)✓ Coverage reports removed$(RESET)"

clean-html: ## Remove only HTML reports
	@echo "$(CYAN)Cleaning HTML reports...$(RESET)"
	@rm -rf $(HTML_DIR)
	@echo "$(GREEN)✓ HTML reports removed$(RESET)"

clean-all: clean ## Remove all generated files (alias for clean)
	@echo "$(GREEN)✓ All test artifacts removed$(RESET)"

# ------------------------------------------------------------------------------
# Development Commands
# ------------------------------------------------------------------------------

dev: test-ui ## Start development mode with UI (alias for test-ui)

dev-watch: test ## Start development mode in watch (alias for test)

quick: test-run ## Quick test run (alias for test-run)

# ------------------------------------------------------------------------------
# Validation Commands
# ------------------------------------------------------------------------------

validate: ## Validate test setup and configuration
	@echo "$(CYAN)Validating test setup...$(RESET)"
	@if [ ! -f "vitest.config.ts" ]; then \
		echo "$(RED)✗ vitest.config.ts not found$(RESET)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✓ vitest.config.ts exists$(RESET)"
	@if ! npx vitest --version >/dev/null 2>&1; then \
		echo "$(RED)✗ Vitest not installed$(RESET)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✓ Vitest is installed$(RESET)"
	@if npm list @vitest/ui >/dev/null 2>&1; then \
		echo "$(GREEN)✓ @vitest/ui is installed$(RESET)"; \
	else \
		echo "$(YELLOW)⚠ @vitest/ui not installed (optional)$(RESET)"; \
	fi
	@if [ -z "$$(find src -name '*.spec.vite.ts' -type f 2>/dev/null)" ]; then \
		echo "$(YELLOW)⚠ No test files found$(RESET)"; \
	else \
		echo "$(GREEN)✓ Test files found$(RESET)"; \
	fi
	@echo "$(GREEN)✓ Test setup validated$(RESET)"

check-config: ## Display vitest configuration
	@echo "$(CYAN)Vitest Configuration:$(RESET)"
	@if [ -f "vitest.config.ts" ]; then \
		cat vitest.config.ts; \
	else \
		echo "$(RED)vitest.config.ts not found$(RESET)"; \
	fi

# ------------------------------------------------------------------------------
# Info Commands
# ------------------------------------------------------------------------------

info: ## Show Vitest installation and configuration info
	@echo "$(CYAN)Vitest Information$(RESET)"
	@echo ""
	@echo "$(PURPLE)Vitest CLI:$(RESET)"
	@npx vitest --version 2>/dev/null || echo "  $(RED)Not installed$(RESET)"
	@echo ""
	@echo "$(PURPLE)Configuration:$(RESET)"
	@echo "  Config file: vitest.config.ts"
	@echo "  Test pattern: $(TEST_PATTERN)"
	@echo "  Coverage dir: $(COVERAGE_DIR)"
	@echo "  HTML dir: $(HTML_DIR)"
	@echo "  UI port: $(UI_PORT)"
	@echo ""
	@echo "$(PURPLE)Package Manager:$(RESET) $(PKG_MANAGER)"
	@echo ""
	@if [ -d "src" ]; then \
		echo "$(PURPLE)Test Files:$(RESET)"; \
		find src -name '*.spec.vite.ts' -type f | wc -l | xargs echo "  Count:"; \
	fi
	@echo ""
	@if [ -d "$(COVERAGE_DIR)" ]; then \
		echo "$(PURPLE)Coverage:$(RESET)"; \
		echo "  $(GREEN)Coverage report exists$(RESET)"; \
		du -sh $(COVERAGE_DIR) 2>/dev/null | awk '{print "  Size: " $$1}'; \
	else \
		echo "$(PURPLE)Coverage:$(RESET)"; \
		echo "  $(YELLOW)No coverage report$(RESET)"; \
	fi

stats: ## Show test statistics
	@echo "$(CYAN)Test Statistics$(RESET)"
	@echo ""
	@echo "$(PURPLE)Test Files:$(RESET)"
	@find src -name '*.spec.vite.ts' -type f | wc -l | xargs echo "  Total:"
	@echo ""
	@echo "$(PURPLE)Test Lines:$(RESET)"
	@find src -name '*.spec.vite.ts' -type f -exec cat {} \; | wc -l | xargs echo "  Total lines:"
	@echo ""
	@echo "$(PURPLE)Test Suites:$(RESET)"
	@find src -name '*.spec.vite.ts' -type f -exec grep -h "^describe(" {} \; 2>/dev/null | wc -l | xargs echo "  Describe blocks:"
	@echo ""
	@echo "$(PURPLE)Test Cases:$(RESET)"
	@find src -name '*.spec.vite.ts' -type f -exec grep -h "^  it(" {} \; 2>/dev/null | wc -l | xargs echo "  It blocks (approx):"

# ------------------------------------------------------------------------------
# Debug Commands
# ------------------------------------------------------------------------------

debug: ## Run tests with verbose output
	@echo "$(CYAN)Running tests in debug mode...$(RESET)"
	@$(PKG_MANAGER) run test -- --reporter=verbose

debug-single: ## Run a single test file (use FILE=path/to/test.spec.vite.ts)
	@if [ -z "$(FILE)" ]; then \
		echo "$(RED)✗ FILE parameter required$(RESET)"; \
		echo "$(YELLOW)Usage: make -f vitest.Makefile debug-single FILE=src/my.spec.vite.ts$(RESET)"; \
		exit 1; \
	fi
	@echo "$(CYAN)Running single test file: $(FILE)$(RESET)"
	@npx vitest run $(FILE)

# ------------------------------------------------------------------------------
# Update Commands
# ------------------------------------------------------------------------------

update-snapshots: ## Update all test snapshots
	@echo "$(CYAN)Updating test snapshots...$(RESET)"
	@npx vitest run -u
	@echo "$(GREEN)✓ Snapshots updated$(RESET)"

# ------------------------------------------------------------------------------
# Benchmark Commands
# ------------------------------------------------------------------------------

bench: ## Run benchmark tests (if any exist)
	@echo "$(CYAN)Running benchmarks...$(RESET)"
	@npx vitest bench
	@echo "$(GREEN)✓ Benchmarks complete$(RESET)"

# ------------------------------------------------------------------------------
# Quick Actions
# ------------------------------------------------------------------------------

quick-check: ci-validate test-run ## Quick validation and test run
	@echo "$(GREEN)✓ Quick check complete!$(RESET)"

full-test: clean test-run coverage ## Full test suite with coverage
	@echo "$(GREEN)✓ Full test suite complete!$(RESET)"
	@echo "$(YELLOW)Run 'make -f vitest.Makefile view-coverage' to view coverage$(RESET)"

# ------------------------------------------------------------------------------
# Git Hooks Integration
# ------------------------------------------------------------------------------

pre-commit: ci-validate test-run ## Run before committing (fast)
	@echo "$(GREEN)✓ Pre-commit checks passed$(RESET)"

pre-push: clean ci-test-coverage ## Run before pushing (thorough)
	@echo "$(GREEN)✓ Pre-push checks passed$(RESET)"

# ------------------------------------------------------------------------------
# Installation Commands
# ------------------------------------------------------------------------------

install-vitest: ## Install Vitest and @vitest/ui
	@echo "$(CYAN)Installing Vitest...$(RESET)"
	@$(PKG_MANAGER) install -D vitest @vitest/ui
	@echo "$(GREEN)✓ Vitest installed$(RESET)"

install-coverage: ## Install coverage provider
	@echo "$(CYAN)Installing coverage provider...$(RESET)"
	@$(PKG_MANAGER) install -D @vitest/coverage-v8
	@echo "$(GREEN)✓ Coverage provider installed$(RESET)"

# ------------------------------------------------------------------------------
# Default target
# ------------------------------------------------------------------------------

.DEFAULT_GOAL := help
