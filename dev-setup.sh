#!/bin/bash

# Development Environment Setup Script
# This script sets up the local development environment for the MTA v400 application

set -e

echo "========================================="
echo "MTA v400 Development Environment Setup"
echo "========================================="
echo ""

# Check Python version
PYTHON_CMD="python3.11"
if ! command -v $PYTHON_CMD &> /dev/null; then
    echo "Python 3.11 not found. Trying python3..."
    PYTHON_CMD="python3"
    if ! command -v $PYTHON_CMD &> /dev/null; then
        echo "Error: Python 3 not found. Please install Python 3.11+"
        exit 1
    fi
fi

PYTHON_VERSION=$($PYTHON_CMD --version | cut -d' ' -f2)
echo "Using Python: $PYTHON_VERSION"
echo ""

# Setup main application
echo "Step 1: Setting up main application..."
echo "----------------------------------------"

VENV_DIR=".venv"

if [ -d "$VENV_DIR" ]; then
    echo "Virtual environment already exists at $VENV_DIR"
else
    echo "Creating virtual environment..."
    $PYTHON_CMD -m venv $VENV_DIR
    echo "Virtual environment created!"
fi

# Activate virtual environment
source $VENV_DIR/bin/activate

# Upgrade pip
echo "Upgrading pip..."
pip install --upgrade pip setuptools wheel

# Install Poetry
echo "Installing Poetry..."
pip install poetry

# Configure Poetry to use in-project venv
echo "Configuring Poetry..."
poetry config virtualenvs.create true
poetry config virtualenvs.in-project true

# Check if lock file is out of sync and regenerate if needed
echo "Checking poetry lock file..."
if ! poetry install --dry-run --no-interaction --no-ansi --no-root &> /dev/null; then
    echo "Poetry lock file is out of sync with pyproject.toml"
    echo "Running poetry lock to regenerate lock file..."
    poetry lock --no-interaction
    echo "Lock file regenerated successfully!"
fi

# Install dependencies (Poetry will use .venv)
echo "Installing main application dependencies..."
poetry install --no-interaction --no-ansi --no-root

echo ""
echo "Step 2: Setting up sub-applications..."
echo "----------------------------------------"

# Setup hello sub-app
HELLO_APP="app/hello"
if [ -d "$HELLO_APP" ]; then
    echo "Setting up hello sub-app..."
    cd $HELLO_APP

    if [ -f "pyproject.toml" ]; then
        # Create dedicated virtual environment for sub-app
        HELLO_VENV=".venv"
        if [ ! -d "$HELLO_VENV" ]; then
            echo "Creating virtual environment for hello sub-app..."
            $PYTHON_CMD -m venv $HELLO_VENV
        fi

        source $HELLO_VENV/bin/activate
        pip install --upgrade pip
        pip install poetry
        poetry config virtualenvs.create true
        poetry config virtualenvs.in-project true

        # Check if lock file is out of sync and regenerate if needed
        if ! poetry install --dry-run --no-interaction --no-ansi --no-root &> /dev/null; then
            echo "Poetry lock file is out of sync for hello sub-app"
            echo "Running poetry lock to regenerate lock file..."
            poetry lock --no-interaction
            echo "Lock file regenerated successfully!"
        fi

        poetry install --no-interaction --no-ansi --no-root
        deactivate
        echo "Hello sub-app setup complete!"
    else
        echo "No pyproject.toml found in hello sub-app, skipping..."
    fi

    cd ../..
else
    echo "Hello sub-app directory not found, skipping..."
fi

echo ""
echo "Step 3: Environment configuration..."
echo "----------------------------------------"

# Check for .env file
if [ ! -f ".env" ]; then
    echo "No .env file found."
    if [ -f ".env.example" ]; then
        echo "Copying .env.example to .env..."
        cp .env.example .env
        echo "Please edit .env file with your configuration."
    else
        echo "No .env.example found. You may need to create .env manually."
    fi
else
    echo ".env file already exists."
fi

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Quick Start:"
echo "  make dev                   # Run main orchestrator (port 8080)"
echo "  make dev-app NAME=hello    # Run hello sub-app (port 8081)"
echo "  make dev-all               # Run all apps simultaneously"
echo "  make test                  # Run all tests"
echo ""
echo "For more commands, run: make help"
echo ""
