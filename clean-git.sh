#!/bin/bash

set -e  # Exit on error

# Find all .git directories and clean them except for .git/config
find . -maxdepth 3 -type d -name ".git"  | while read -r GIT_DIR; do
    CONFIG_FILE="$GIT_DIR/config"
    
    # Check if .git directory exists (redundant but safe)
    if [ ! -d "$GIT_DIR" ]; then
        echo "Error: $GIT_DIR not found!"
        continue
    fi
    
    # Find and delete everything inside .git except .git/config
    find "$GIT_DIR" -mindepth 1 -not -name "config" -exec rm -rf {} +
    
    echo "Cleaned $GIT_DIR, only config file remains."
done

