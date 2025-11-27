# ==============================================================================
# Changeset Makefile - Manage versioning and publishing with changesets
# ==============================================================================
# Usage: make -f changeset.Makefile <target>
# Or: include changeset.Makefile in your main Makefile
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
RESET   := \033[0m

# Package manager
PKG_MANAGER ?= npm

# ------------------------------------------------------------------------------
# Help
# ------------------------------------------------------------------------------

help: ## Show this help message
	@echo "$(CYAN)Changeset Publishing$(RESET)"
	@echo ""
	@echo "$(GREEN)Core Commands:$(RESET)"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-25s$(RESET) %s\n", $$1, $$2}'
	@echo ""
	@echo "$(BLUE)Examples:$(RESET)"
	@echo "  make -f changeset.Makefile changeset       # Create a new changeset"
	@echo "  make -f changeset.Makefile version         # Bump version"
	@echo "  make -f changeset.Makefile publish         # Publish (with tests)"
	@echo ""

# ------------------------------------------------------------------------------
# Pre-publish Validation
# ------------------------------------------------------------------------------

pre-publish-check: ## Run all pre-publish checks (tests, build, lint)
	@echo "$(CYAN)Running pre-publish checks...$(RESET)"
	@echo ""
	@echo "$(PURPLE)[1/4] Type checking...$(RESET)"
	@$(PKG_MANAGER) run type-check || { echo "$(RED)✗ Type check failed$(RESET)"; exit 1; }
	@echo "$(GREEN)✓ Type check passed$(RESET)"
	@echo ""
	@echo "$(PURPLE)[2/4] Running tests...$(RESET)"
	@$(PKG_MANAGER) run test:run || { echo "$(RED)✗ Tests failed$(RESET)"; exit 1; }
	@echo "$(GREEN)✓ Tests passed$(RESET)"
	@echo ""
	@echo "$(PURPLE)[3/4] Building project...$(RESET)"
	@$(PKG_MANAGER) run build || { echo "$(RED)✗ Build failed$(RESET)"; exit 1; }
	@echo "$(GREEN)✓ Build successful$(RESET)"
	@echo ""
	@echo "$(PURPLE)[4/4] Checking package contents...$(RESET)"
	@$(PKG_MANAGER) pack --dry-run > /dev/null 2>&1 || { echo "$(RED)✗ Package check failed$(RESET)"; exit 1; }
	@echo "$(GREEN)✓ Package contents valid$(RESET)"
	@echo ""
	@echo "$(GREEN)✓ All pre-publish checks passed!$(RESET)"

# ------------------------------------------------------------------------------
# Changeset Commands
# ------------------------------------------------------------------------------

init: ## Initialize changeset in the project
	@echo "$(CYAN)Initializing changesets...$(RESET)"
	@if [ ! -d ".changeset" ]; then \
		npx @changesets/cli init; \
		echo "$(GREEN)✓ Changesets initialized$(RESET)"; \
	else \
		echo "$(YELLOW)⚠ Changesets already initialized$(RESET)"; \
	fi

changeset: ## Create a new changeset
	@echo "$(CYAN)Creating a new changeset...$(RESET)"
	@npx changeset
	@echo "$(GREEN)✓ Changeset created$(RESET)"

add: changeset ## Alias for 'changeset'

status: ## Check changeset status
	@echo "$(CYAN)Checking changeset status...$(RESET)"
	@npx changeset status

# ------------------------------------------------------------------------------
# Version Management
# ------------------------------------------------------------------------------

version: ## Bump version based on changesets
	@echo "$(CYAN)Bumping version...$(RESET)"
	@npx changeset version
	@echo "$(GREEN)✓ Version bumped$(RESET)"
	@echo "$(YELLOW)Don't forget to commit the version changes!$(RESET)"

version-dry-run: ## Show what version bump would do
	@echo "$(CYAN)Simulating version bump...$(RESET)"
	@npx changeset version --dry-run

# ------------------------------------------------------------------------------
# Publishing
# ------------------------------------------------------------------------------

publish: pre-publish-check ## Publish to npm (runs tests first!)
	@echo ""
	@echo "$(CYAN)Publishing to npm...$(RESET)"
	@echo "$(YELLOW)⚠ This will publish to the npm registry!$(RESET)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	echo; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		npx changeset publish; \
		echo "$(GREEN)✓ Published successfully!$(RESET)"; \
		echo "$(YELLOW)Don't forget to push tags: git push --follow-tags$(RESET)"; \
	else \
		echo "$(YELLOW)Publish cancelled$(RESET)"; \
	fi

publish-force: pre-publish-check ## Publish without confirmation (CI use)
	@echo "$(CYAN)Publishing to npm (CI mode)...$(RESET)"
	@npx changeset publish
	@echo "$(GREEN)✓ Published successfully!$(RESET)"

publish-dry-run: pre-publish-check ## Simulate publishing (with checks)
	@echo "$(CYAN)Simulating publish...$(RESET)"
	@echo "$(PURPLE)Package contents:$(RESET)"
	@$(PKG_MANAGER) pack --dry-run
	@echo ""
	@echo "$(GREEN)✓ Dry run complete - ready to publish!$(RESET)"

# ------------------------------------------------------------------------------
# Package Inspection
# ------------------------------------------------------------------------------

pack: ## Create a local tarball of the package
	@echo "$(CYAN)Creating package tarball...$(RESET)"
	@$(PKG_MANAGER) pack
	@echo "$(GREEN)✓ Package created$(RESET)"

pack-inspect: ## Show what will be included in the package
	@echo "$(CYAN)Package contents:$(RESET)"
	@$(PKG_MANAGER) pack --dry-run

pack-size: ## Show package size
	@echo "$(CYAN)Calculating package size...$(RESET)"
	@$(PKG_MANAGER) pack --dry-run 2>&1 | grep -E "unpacked size|package size"

# ------------------------------------------------------------------------------
# Git Operations
# ------------------------------------------------------------------------------

push-tags: ## Push git tags to remote
	@echo "$(CYAN)Pushing tags to remote...$(RESET)"
	@git push --follow-tags
	@echo "$(GREEN)✓ Tags pushed$(RESET)"

# ------------------------------------------------------------------------------
# CI/CD Commands
# ------------------------------------------------------------------------------

ci-publish: ## Publish in CI environment (no prompts)
	@echo "$(CYAN)CI Publish Pipeline$(RESET)"
	@echo ""
	@echo "$(PURPLE)[1/5] Type checking...$(RESET)"
	@$(PKG_MANAGER) run type-check
	@echo "$(GREEN)✓ Type check passed$(RESET)"
	@echo ""
	@echo "$(PURPLE)[2/5] Running tests...$(RESET)"
	@$(PKG_MANAGER) run test:run
	@echo "$(GREEN)✓ Tests passed$(RESET)"
	@echo ""
	@echo "$(PURPLE)[3/5] Building...$(RESET)"
	@$(PKG_MANAGER) run build
	@echo "$(GREEN)✓ Build complete$(RESET)"
	@echo ""
	@echo "$(PURPLE)[4/5] Validating package...$(RESET)"
	@$(PKG_MANAGER) pack --dry-run > /dev/null 2>&1
	@echo "$(GREEN)✓ Package valid$(RESET)"
	@echo ""
	@echo "$(PURPLE)[5/5] Publishing...$(RESET)"
	@npx changeset publish
	@echo "$(GREEN)✓ Published!$(RESET)"

ci-version: ## Version bump in CI environment
	@echo "$(CYAN)CI Version Bump$(RESET)"
	@npx changeset version
	@echo "$(GREEN)✓ Version updated$(RESET)"

# ------------------------------------------------------------------------------
# Validation Commands
# ------------------------------------------------------------------------------

validate-setup: ## Validate changeset setup
	@echo "$(CYAN)Validating changeset setup...$(RESET)"
	@if [ ! -d ".changeset" ]; then \
		echo "$(RED)✗ .changeset directory not found$(RESET)"; \
		echo "$(YELLOW)Run: make -f changeset.Makefile init$(RESET)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✓ .changeset directory exists$(RESET)"
	@if [ ! -f ".changeset/config.json" ]; then \
		echo "$(RED)✗ .changeset/config.json not found$(RESET)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✓ config.json exists$(RESET)"
	@echo "$(GREEN)✓ Changeset setup validated$(RESET)"

# ------------------------------------------------------------------------------
# Workflow Shortcuts
# ------------------------------------------------------------------------------

release: ## Full release workflow (changeset -> version -> publish)
	@echo "$(CYAN)Starting release workflow...$(RESET)"
	@echo ""
	@echo "$(PURPLE)Step 1: Create changeset$(RESET)"
	@$(MAKE) -f changeset.Makefile changeset
	@echo ""
	@echo "$(PURPLE)Step 2: Bump version$(RESET)"
	@$(MAKE) -f changeset.Makefile version
	@echo ""
	@echo "$(YELLOW)Review the changes, then run:$(RESET)"
	@echo "  git add ."
	@echo "  git commit -m 'chore: version bump'"
	@echo "  make -f changeset.Makefile publish"

quick-publish: version publish ## Quick version bump and publish

# ------------------------------------------------------------------------------
# Info Commands
# ------------------------------------------------------------------------------

info: ## Show package and changeset info
	@echo "$(CYAN)Package Information$(RESET)"
	@echo ""
	@echo "$(PURPLE)Package:$(RESET)"
	@cat package.json | grep -E '"name"|"version"' | head -2
	@echo ""
	@echo "$(PURPLE)Changeset Status:$(RESET)"
	@if [ -d ".changeset" ]; then \
		echo "  $(GREEN)Changesets configured$(RESET)"; \
		ls .changeset/*.md 2>/dev/null | wc -l | xargs echo "  Pending changesets:"; \
	else \
		echo "  $(YELLOW)Changesets not initialized$(RESET)"; \
	fi
	@echo ""
	@echo "$(PURPLE)Last Published:$(RESET)"
	@npm view $$(cat package.json | grep '"name"' | head -1 | cut -d'"' -f4) version 2>/dev/null || echo "  $(YELLOW)Not published yet$(RESET)"

# ------------------------------------------------------------------------------
# Cleanup Commands
# ------------------------------------------------------------------------------

clean: ## Remove build artifacts
	@echo "$(CYAN)Cleaning build artifacts...$(RESET)"
	@$(PKG_MANAGER) run clean 2>/dev/null || rm -rf dist
	@rm -f *.tgz
	@echo "$(GREEN)✓ Cleaned$(RESET)"

# ------------------------------------------------------------------------------
# Default target
# ------------------------------------------------------------------------------

.DEFAULT_GOAL := help
