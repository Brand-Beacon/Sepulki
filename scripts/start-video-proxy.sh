#!/bin/bash

# Start Video Stream Proxy
# This script starts the video streaming proxy service for Isaac Sim integration

set -e

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                                                                ║"
echo "║           📹 Starting Video Stream Proxy                      ║"
echo "║                                                                ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# Navigate to video-stream-proxy directory
cd "$(dirname "$0")/../services/video-stream-proxy"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install
  echo ""
fi

# Check if .env exists
if [ ! -f ".env" ]; then
  echo "⚙️ Creating .env file from template..."
  cp .env.example .env
  echo ""
fi

# Display configuration
echo "📋 Configuration:"
echo "  • Port: 8889"
echo "  • Isaac Sim IP: 18.234.83.45"
echo "  • Isaac Sim Port: 8211"
echo ""

# Start the proxy
echo "🚀 Starting video stream proxy..."
echo ""

npm run dev





