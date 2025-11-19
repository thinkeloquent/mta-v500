#!/bin/bash

# Script to find and delete all package-lock.json files in current and subdirectories

echo "Searching for package-lock.json files..."

# Find all package-lock.json files
files=$(find . -name "package-lock.json" -type f)

if [ -z "$files" ]; then
    echo "No package-lock.json files found."
    exit 0
fi

echo "Found the following package-lock.json files:"
echo "$files"
echo ""

# Count files
count=$(echo "$files" | wc -l)
echo "Total files to delete: $count"
echo ""

# Ask for confirmation
read -p "Do you want to delete these files? (y/n): " confirm

if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
    find . -name "package-lock.json" -type f -delete
    echo "All package-lock.json files have been deleted."
else
    echo "Deletion cancelled."
fi
