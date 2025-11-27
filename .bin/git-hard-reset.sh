#!/bin/bash

# Hard reset to match latest main remote
# WARNING: This will discard all local changes and commits

set -e

echo "⚠️  WARNING: This will discard all local changes and commits!"
echo "Fetching latest from origin..."

git fetch origin

echo "Resetting to origin/main..."
git reset --hard origin/main

echo "Cleaning untracked files and directories..."
git clean -fd

echo "✓ Repository reset to origin/main"
git status
