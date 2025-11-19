#!/bin/bash

# Script to kill processes using port 8080

PORT=8080

echo "Looking for processes using port $PORT..."

# Find the process ID(s) using the port
PIDS=$(lsof -ti :$PORT)

if [ -z "$PIDS" ]; then
    echo "No processes found using port $PORT"
    exit 0
fi

echo "Found process(es): $PIDS"

# Kill the processes
for PID in $PIDS; do
    echo "Killing process $PID..."
    kill -9 $PID
done

echo "Port $PORT has been cleaned up successfully"
