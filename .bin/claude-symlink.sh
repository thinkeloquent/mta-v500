#!/bin/bash

# Script to create symlinks to the .claude config folder and .CLAUDE.md file from any subdirectory
# This script can be placed at the project root and called from any subfolder

# Find the .claude directory by walking up from current directory
find_claude_dir() {
    local SEARCH_DIR="$(pwd)"
    while [ "$SEARCH_DIR" != "/" ]; do
        if [ -d "$SEARCH_DIR/.claude" ]; then
            echo "$SEARCH_DIR"
            return 0
        fi
        SEARCH_DIR="$(dirname "$SEARCH_DIR")"
    done
    return 1
}

# Try to find .claude directory
PROJECT_ROOT="$(find_claude_dir)"

# Verify we found the project root
if [ -z "$PROJECT_ROOT" ]; then
    echo "Error: Could not find .claude directory in any parent directory"
    exit 1
fi

# Define the target .claude directory and .CLAUDE.md file at project root
TARGET_CLAUDE_DIR="$PROJECT_ROOT/.claude"
TARGET_CLAUDE_MD="$PROJECT_ROOT/.CLAUDE.md"

# Define the symlink paths in the current working directory
SYMLINK_CLAUDE_DIR="$(pwd)/.claude"
SYMLINK_CLAUDE_MD="$(pwd)/.CLAUDE.md"

# Check if we're already at the project root
if [ "$(pwd)" = "$PROJECT_ROOT" ]; then
    echo "You are already at the project root where .claude exists"

    # Remove symlinks if they exist at project root
    SYMLINKS_REMOVED=false
    if [ -L ".claude" ]; then
        rm ".claude"
        echo "Removed .claude symlink"
        SYMLINKS_REMOVED=true
    fi

    if [ -L ".CLAUDE.md" ]; then
        rm ".CLAUDE.md"
        echo "Removed .CLAUDE.md symlink"
        SYMLINKS_REMOVED=true
    fi

    if [ "$SYMLINKS_REMOVED" = false ]; then
        echo "No symlinks to remove"
    fi

    exit 0
fi

# Check if target directory exists
if [ ! -d "$TARGET_CLAUDE_DIR" ]; then
    echo "Error: Target directory does not exist: $TARGET_CLAUDE_DIR"
    exit 1
fi

# Function to handle symlink creation
create_symlink() {
    local TARGET="$1"
    local SYMLINK="$2"
    local RESOURCE_TYPE="$3"  # "directory" or "file"

    # Check if symlink already exists and remove it
    if [ -L "$SYMLINK" ]; then
        echo "$RESOURCE_TYPE symlink already exists at: $SYMLINK"
        echo "Current target: $(readlink "$SYMLINK")"
        rm "$SYMLINK"
        echo "Removed existing $RESOURCE_TYPE symlink"
    elif [ -e "$SYMLINK" ]; then
        echo "Error: A $RESOURCE_TYPE already exists at: $SYMLINK (not a symlink)"
        echo "Please remove it manually before running this script"
        return 1
    fi

    # Create the symlink
    ln -s "$TARGET" "$SYMLINK"

    if [ $? -eq 0 ]; then
        echo "Successfully created $RESOURCE_TYPE symlink:"
        echo "  From: $SYMLINK"
        echo "  To:   $TARGET"
        return 0
    else
        echo "Error: Failed to create $RESOURCE_TYPE symlink"
        return 1
    fi
}

# Create .claude directory symlink
echo "Creating .claude directory symlink..."
create_symlink "$TARGET_CLAUDE_DIR" "$SYMLINK_CLAUDE_DIR" "directory"
CLAUDE_DIR_RESULT=$?

# Create .CLAUDE.md file symlink (if the file exists)
if [ -f "$TARGET_CLAUDE_MD" ]; then
    echo ""
    echo "Creating .CLAUDE.md file symlink..."
    create_symlink "$TARGET_CLAUDE_MD" "$SYMLINK_CLAUDE_MD" "file"
    CLAUDE_MD_RESULT=$?
else
    echo ""
    echo "Note: .CLAUDE.md file not found at $TARGET_CLAUDE_MD"
    echo "Skipping .CLAUDE.md symlink creation"
    CLAUDE_MD_RESULT=0
fi

# Exit with error if either symlink creation failed
if [ $CLAUDE_DIR_RESULT -ne 0 ] || [ $CLAUDE_MD_RESULT -ne 0 ]; then
    exit 1
fi

echo ""
echo "Symlink creation complete!"
