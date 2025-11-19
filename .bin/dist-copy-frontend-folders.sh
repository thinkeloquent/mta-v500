#!/usr/bin/env bash

#
# dist-copy-frontend-folders.sh
#
# This script:
# 1. Finds all frontend directories in fastapi-apps and fastify-apps
# 2. Runs npm build in each frontend directory
# 3. Copies the built dist folder to static/{app-type}/*/frontend/dist
#
# Usage:
#   .bin/dist-copy-frontend-folders.sh
#   .bin/dist-copy-frontend-folders.sh --skip-build  # Skip npm build, just copy
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Parse arguments
SKIP_BUILD=false
if [[ "$1" == "--skip-build" ]]; then
    SKIP_BUILD=true
fi

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Frontend Build & Copy Script${NC}"
echo -e "${BLUE}================================================${NC}"
echo ""

# Change to project root
cd "$PROJECT_ROOT"

# Find all frontend directories in fastapi-apps and fastify-apps
FRONTEND_DIRS=""

# Search in fastapi-apps
if [ -d "fastapi-apps" ]; then
    FASTAPI_DIRS=$(find fastapi-apps -type d -name "frontend" -not -path "*/node_modules/*" -not -path "*/dist/*" 2>/dev/null || true)
    if [ -n "$FASTAPI_DIRS" ]; then
        FRONTEND_DIRS="$FASTAPI_DIRS"
    fi
fi

# Search in fastify-apps
if [ -d "fastify-apps" ]; then
    FASTIFY_DIRS=$(find fastify-apps -type d -name "frontend" -not -path "*/node_modules/*" -not -path "*/dist/*" 2>/dev/null || true)
    if [ -n "$FASTIFY_DIRS" ]; then
        if [ -n "$FRONTEND_DIRS" ]; then
            FRONTEND_DIRS="$FRONTEND_DIRS"$'\n'"$FASTIFY_DIRS"
        else
            FRONTEND_DIRS="$FASTIFY_DIRS"
        fi
    fi
fi

if [ -z "$FRONTEND_DIRS" ]; then
    echo -e "${YELLOW}⚠️  No frontend directories found in fastapi-apps or fastify-apps${NC}"
    exit 0
fi

# Count total directories
TOTAL_DIRS=$(echo "$FRONTEND_DIRS" | wc -l | xargs)
echo -e "${GREEN}Found $TOTAL_DIRS frontend directory(ies)${NC}"
echo ""

# Track success/failure
SUCCESS_COUNT=0
FAILURE_COUNT=0
FAILED_APPS=()

# Process each frontend directory
for FRONTEND_DIR in $FRONTEND_DIRS; do
    # Extract app type (fastapi-apps or fastify-apps) and app name
    # e.g., "fastapi-apps/persona-editor/frontend" -> APP_TYPE="fastapi-apps", APP_NAME="persona-editor"
    # e.g., "fastify-apps/ai-sdk-examples/frontend" -> APP_TYPE="fastify-apps", APP_NAME="ai-sdk-examples"
    APP_TYPE=$(echo "$FRONTEND_DIR" | cut -d'/' -f1)
    # Extract everything between the app type and /frontend
    APP_NAME=$(echo "$FRONTEND_DIR" | sed "s|^${APP_TYPE}/||" | sed 's|/frontend.*$||')

    echo -e "${BLUE}──────────────────────────────────────────────${NC}"
    echo -e "${BLUE}Processing: ${GREEN}$APP_NAME${NC}"
    echo -e "${BLUE}──────────────────────────────────────────────${NC}"

    # Check if package.json exists
    if [ ! -f "$FRONTEND_DIR/package.json" ]; then
        echo -e "${YELLOW}⚠️  Skipping $APP_NAME: No package.json found${NC}"
        echo ""
        continue
    fi

    # Step 1: Run npm build (unless skipped)
    if [ "$SKIP_BUILD" = false ]; then
        echo -e "${YELLOW}📦 Running npm install...${NC}"
        if (cd "$FRONTEND_DIR" && npm install --silent); then
            echo -e "${GREEN}✓ npm install completed${NC}"
        else
            echo -e "${RED}✗ npm install failed for $APP_NAME${NC}"
            FAILURE_COUNT=$((FAILURE_COUNT + 1))
            FAILED_APPS+=("$APP_NAME (npm install failed)")
            echo ""
            continue
        fi

        echo -e "${YELLOW}🔨 Running npm run build...${NC}"
        if (cd "$FRONTEND_DIR" && npm run build); then
            echo -e "${GREEN}✓ Build completed successfully${NC}"
        else
            echo -e "${RED}✗ Build failed for $APP_NAME${NC}"
            FAILURE_COUNT=$((FAILURE_COUNT + 1))
            FAILED_APPS+=("$APP_NAME (build failed)")
            echo ""
            continue
        fi
    else
        echo -e "${YELLOW}⏭️  Skipping build (--skip-build flag)${NC}"
    fi

    # Step 2: Check if dist directory exists
    if [ ! -d "$FRONTEND_DIR/dist" ]; then
        echo -e "${RED}✗ dist directory not found at $FRONTEND_DIR/dist${NC}"
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
        FAILED_APPS+=("$APP_NAME (no dist folder)")
        echo ""
        continue
    fi

    # Step 3: Copy dist to static directory
    DEST_DIR="static/$APP_TYPE/$APP_NAME/frontend/dist"

    echo -e "${YELLOW}📋 Copying dist to $DEST_DIR...${NC}"

    # Create destination directory
    mkdir -p "static/$APP_TYPE/$APP_NAME/frontend"

    # Remove old dist if it exists
    if [ -d "$DEST_DIR" ]; then
        echo -e "${YELLOW}   Removing old dist folder...${NC}"
        rm -rf "$DEST_DIR"
    fi

    # Copy the dist folder
    if cp -r "$FRONTEND_DIR/dist" "$DEST_DIR"; then
        # Count files copied
        FILE_COUNT=$(find "$DEST_DIR" -type f | wc -l | xargs)
        echo -e "${GREEN}✓ Copied $FILE_COUNT files to $DEST_DIR${NC}"
        SUCCESS_COUNT=$((SUCCESS_COUNT + 1))
    else
        echo -e "${RED}✗ Failed to copy dist for $APP_NAME${NC}"
        FAILURE_COUNT=$((FAILURE_COUNT + 1))
        FAILED_APPS+=("$APP_NAME (copy failed)")
    fi

    echo ""
done

# Summary
echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}Summary${NC}"
echo -e "${BLUE}================================================${NC}"
echo -e "${GREEN}✓ Successful: $SUCCESS_COUNT${NC}"
if [ $FAILURE_COUNT -gt 0 ]; then
    echo -e "${RED}✗ Failed: $FAILURE_COUNT${NC}"
    echo ""
    echo -e "${RED}Failed apps:${NC}"
    for FAILED_APP in "${FAILED_APPS[@]}"; do
        echo -e "${RED}  - $FAILED_APP${NC}"
    done
    echo ""
    exit 1
else
    echo -e "${GREEN}All frontend builds and copies completed successfully! 🎉${NC}"
fi
