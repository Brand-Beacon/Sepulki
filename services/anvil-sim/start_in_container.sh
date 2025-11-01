#!/bin/bash
# Startup script to run anvil-sim inside Isaac Sim container

echo "⏳ Waiting for Isaac Sim to initialize..."
sleep 20

echo "🔧 Setting up Python environment..."
export ISAAC_SIM_BASE=/isaac-sim
export PYTHONPATH=/isaac-sim/kit/python:/isaac-sim/kit/exts:/isaac-sim/kit/extscore:/isaac-sim/kit/kernel:/isaac-sim/exts:$PYTHONPATH

cd /host/anvil-sim

# Install dependencies if needed
echo "📦 Installing dependencies..."
/isaac-sim/kit/python/bin/python3 -m pip install --quiet aiohttp structlog numpy pillow opencv-python-headless websockets 2>&1 | grep -v "already satisfied" | tail -3

echo "🚀 Starting anvil-sim service..."
exec /isaac-sim/kit/python/bin/python3 src/main.py

