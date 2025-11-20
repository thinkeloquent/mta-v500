#!/bin/bash
# Force stop Docker Desktop and all Docker processes
# Usage: ./.bin/docker-force-stop.sh

echo "=== Force Stopping Docker Desktop ==="

# Stop Docker Desktop app gracefully first
echo "Stopping Docker Desktop app..."
osascript -e 'quit app "Docker Desktop"' 2>/dev/null || true
osascript -e 'quit app "Docker"' 2>/dev/null || true

# Wait a moment for graceful shutdown
sleep 2

# Kill Docker Desktop processes
echo "Killing Docker Desktop processes..."
pkill -9 -f "Docker Desktop" 2>/dev/null || true
pkill -9 -f "com.docker" 2>/dev/null || true

# Kill Docker daemon and related processes
echo "Killing Docker daemon processes..."
pkill -9 -f "dockerd" 2>/dev/null || true
pkill -9 -f "containerd" 2>/dev/null || true
pkill -9 -f "vpnkit" 2>/dev/null || true
pkill -9 -f "hyperkit" 2>/dev/null || true
pkill -9 -f "qemu-system" 2>/dev/null || true

# Kill any remaining docker processes
pkill -9 -f "docker" 2>/dev/null || true

# Clean up Docker socket if needed
echo "Cleaning up..."
sudo rm -f /var/run/docker.sock 2>/dev/null || true

echo ""
echo "=== Docker Force Stop Complete ==="
echo "To restart Docker Desktop, run: open -a 'Docker Desktop'"
