#!/bin/bash
# dev-parallel.sh - Run FastAPI, Fastify, and Vite servers in parallel
# Handles clean shutdown on Ctrl+C
#
# Usage:
#   ./dev-parallel.sh                    # FastAPI + Fastify + Vite build:watch
#   ./dev-parallel.sh app-name           # FastAPI + Fastify + Vite dev for app-name
#   ./dev-parallel.sh app1 app2          # FastAPI + Fastify + Vite dev for multiple apps

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

# Track all background PIDs
PIDS=()

# Cleanup function - kill all child processes
cleanup() {
    echo ""
    echo -e "${YELLOW}Stopping all servers...${NC}"

    # Kill all tracked PIDs
    for pid in "${PIDS[@]}"; do
        if kill -0 "$pid" 2>/dev/null; then
            echo "Stopping process $pid..."
            kill -TERM "$pid" 2>/dev/null || true
        fi
    done

    # Wait briefly for graceful shutdown
    sleep 1

    # Force kill any remaining processes on the ports
    echo "Cleaning up ports..."
    bash .bin/clean-port-3000.sh 2>/dev/null || true
    bash .bin/clean-port-8080.sh 2>/dev/null || true

    # Kill any remaining child processes of this script
    pkill -P $$ 2>/dev/null || true

    echo -e "${GREEN}All servers stopped${NC}"
    exit 0
}

# Set up trap - catch INT (Ctrl+C), TERM, and EXIT
trap cleanup INT TERM

# Start FastAPI in background with prefixed output
echo -e "${GREEN}Starting FastAPI...${NC}"
(make -f Makefile.fastapi dev 2>&1 | awk '{print "[FastAPI] " $0; fflush()}') &
PIDS+=($!)

# Small delay to let FastAPI start first and reduce output interleaving
sleep 1

# Start Fastify in background with prefixed output
echo -e "${GREEN}Starting Fastify...${NC}"
(make -f Makefile.fastify dev 2>&1 | awk '{print "[Fastify] " $0; fflush()}') &
PIDS+=($!)

# Usage:
# make dev                                    # FastAPI + Fastify only (no Vite)
# make dev VITE_APPS="app-figma"              # + Vite dev for app-figma
# make dev VITE_APPS="app-figma app-dashboard" # + Vite dev for multiple apps

# # Start Vite in background (only if VITE_APPS is set)
# if [ ${#VITE_APPS[@]} -gt 0 ]; then
#     sleep 1
#     # Launch dev servers for specified apps
#     for app in "${VITE_APPS[@]}"; do
#         echo -e "${GREEN}Starting Vite dev for ${app}...${NC}"
#         (make -f Makefile.vite dev-frontend NAME="${app}" 2>&1 | awk -v app="$app" '{print "[Vite:" app "] " $0; fflush()}') &
#         PIDS+=($!)
#     done
# fi

# Wait for all processes - this will be interrupted by the trap
wait
