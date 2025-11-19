#!/bin/bash
# dev-parallel.sh - Run FastAPI, Fastify, and Vite servers in parallel
# Handles clean shutdown on Ctrl+C
#
# Usage:
#   ./dev-parallel.sh                    # FastAPI + Fastify + Vite build:watch
#   ./dev-parallel.sh app-name           # FastAPI + Fastify + Vite dev for app-name
#   ./dev-parallel.sh app1 app2          # FastAPI + Fastify + Vite dev for multiple apps

set -e

# Capture Vite apps from arguments
VITE_APPS=("$@")

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}Starting FastAPI (port 8080), Fastify (port 3000), and Vite in parallel...${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Store PIDs
FASTAPI_PID=""
FASTIFY_PID=""
VITE_PID=""

# Cleanup function
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping servers...${NC}"

    if [ -n "$FASTAPI_PID" ]; then
        echo "Stopping FastAPI (PID: $FASTAPI_PID)..."
        kill -TERM $FASTAPI_PID 2>/dev/null || true
        wait $FASTAPI_PID 2>/dev/null || true
    fi

    if [ -n "$FASTIFY_PID" ]; then
        echo "Stopping Fastify (PID: $FASTIFY_PID)..."
        kill -TERM $FASTIFY_PID 2>/dev/null || true
        wait $FASTIFY_PID 2>/dev/null || true
    fi

    if [ -n "$VITE_PID" ]; then
        echo "Stopping Vite (PID: $VITE_PID)..."
        kill -TERM $VITE_PID 2>/dev/null || true
        wait $VITE_PID 2>/dev/null || true
    fi

    # Additional cleanup - kill any remaining processes on these ports
    bash .bin/clean-port-3000.sh 2>/dev/null || true
    bash .bin/clean-port-8080.sh 2>/dev/null || true

    echo -e "${GREEN}All servers stopped${NC}"
    exit 0
}

# Set up trap
trap cleanup INT TERM EXIT

# Start FastAPI in background
echo -e "${GREEN}Starting FastAPI...${NC}"
make -f Makefile.fastapi dev &
FASTAPI_PID=$!

# Start Fastify in background
echo -e "${GREEN}Starting Fastify...${NC}"
make -f Makefile.fastify dev &
FASTIFY_PID=$!

# Usage:
# make dev                                    # FastAPI + Fastify only (no Vite)
# make dev VITE_APPS="app-figma"              # + Vite dev for app-figma
# make dev VITE_APPS="app-figma app-dashboard" # + Vite dev for multiple apps

# Start Vite in background (only if VITE_APPS is set)
if [ ${#VITE_APPS[@]} -gt 0 ]; then
    # Launch dev servers for specified apps
    for app in "${VITE_APPS[@]}"; do
        echo -e "${GREEN}Starting Vite dev for ${app}...${NC}"
        make -f Makefile.vite dev-frontend NAME="${app}" &
    done
    VITE_PID=$!
fi

# Wait for all processes
wait
