#!/usr/bin/env bash

set -euo pipefail

SCRIPT_NAME=$(basename "$0")

print_usage() {
    cat <<EOF
Usage: $SCRIPT_NAME <source_directory> <target_directory>

Recursively copies every file and directory from the source into the target
while preserving structure. Existing files are overwritten, but nothing is
deleted from the target directory.
EOF
}

if [ "$#" -ne 2 ]; then
    echo "Error: missing arguments."
    print_usage
    exit 1
fi

SOURCE_DIR=$1
TARGET_DIR=$2

if [ ! -d "$SOURCE_DIR" ]; then
    echo "Error: source directory '$SOURCE_DIR' does not exist or is not a directory."
    exit 1
fi

mkdir -p "$TARGET_DIR"

# rsync preserves the directory structure, overwrites conflicting files,
# and never deletes anything at the destination.
rsync -a "$SOURCE_DIR"/ "$TARGET_DIR"/

echo "Merged '$SOURCE_DIR' into '$TARGET_DIR'."
