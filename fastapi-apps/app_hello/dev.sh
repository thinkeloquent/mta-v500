#!/bin/bash

# Hello Sub-App Development Script
# Run this script to start the hello sub-app in development mode with hot-reload

set -e

# Default port for hello sub-app
PORT="${HELLO_APP_PORT:-8081}"

echo "Starting hello sub-app in development mode..."
echo "Port: $PORT"
echo ""

# Check if virtual environment exists
if [ -d ".venv" ]; then
    echo "Using local virtual environment (.venv)"
    PYTHON_CMD=".venv/bin/python"
    UVICORN_CMD=".venv/bin/uvicorn"
elif command -v poetry &> /dev/null; then
    echo "Using poetry environment"
    PYTHON_CMD="poetry run python"
    UVICORN_CMD="poetry run uvicorn"
else
    echo "Error: No virtual environment found and poetry not installed."
    echo "Please run 'make dev-install' from the project root first."
    exit 1
fi

# Check if app.main module exists
if [ ! -f "app/main.py" ] && [ ! -f "main.py" ]; then
    echo "Error: Cannot find main.py"
    echo "Expected location: app/main.py or main.py"
    exit 1
fi

# Determine the correct module path
if [ -f "app/main.py" ]; then
    MODULE_PATH="app.main:app"
else
    MODULE_PATH="main:app"
fi

echo "Module: $MODULE_PATH"
echo ""
echo "Hot-reload enabled - code changes will automatically restart the server"
echo "Press Ctrl+C to stop"
echo ""

# Start the application with hot-reload
if [ -d ".venv" ]; then
    .venv/bin/uvicorn $MODULE_PATH --host 0.0.0.0 --port $PORT --reload
else
    poetry run uvicorn $MODULE_PATH --host 0.0.0.0 --port $PORT --reload
fi
