#!/bin/bash

# Script to kill processes running on port 3000

PORT=3000

echo "Checking for processes on port $PORT..."

# Find the PID of the process using port 3000
PID=$(lsof -ti:$PORT)

if [ -z "$PID" ]; then
    echo "No process found running on port $PORT"
    exit 0
fi

echo "Found process(es) with PID: $PID"
echo "Killing process(es)..."

# Kill the process
kill -9 $PID

if [ $? -eq 0 ]; then
    echo "Successfully killed process(es) on port $PORT"
else
    echo "Failed to kill process(es) on port $PORT"
    exit 1
fi
