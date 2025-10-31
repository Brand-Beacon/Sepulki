#!/bin/bash
# Final deployment: Run Isaac Sim container, then start anvil-sim inside it

set -e

AWS_IP="${1:-54.173.1.156}"
SSH_KEY="/Users/taylormohney/Documents/GitHub/Sepulki/sepulki-isaac-sim.pem"

echo "🚀 Final Deployment: Isaac Sim + anvil-sim"
echo "   AWS IP: $AWS_IP"
echo ""

# Transfer code
echo "📤 Transferring anvil-sim code..."
rsync -avz -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    --exclude 'node_modules' --exclude '__pycache__' --exclude '*.pyc' --exclude '.git' \
    services/anvil-sim/ ubuntu@$AWS_IP:~/anvil-sim/

# Deploy
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$AWS_IP bash << 'DEPLOY'
set -e

cd ~/anvil-sim

# Install dependencies in container Python
echo "📦 Installing dependencies..."
docker exec -i isaac-sim-container /isaac-sim/kit/python/bin/python3 -m pip install --quiet aiohttp structlog numpy pillow opencv-python-headless websockets 2>&1 | tail -3 || {
    echo "⚠️  Container not running yet, will install later"
}

# Stop old container
docker stop isaac-sim-container 2>/dev/null || true
docker rm isaac-sim-container 2>/dev/null || true

# Start Isaac Sim container (with extension support)
echo "🎬 Starting Isaac Sim container..."
docker run -d \
    --name isaac-sim-container \
    --gpus all \
    -e "ACCEPT_EULA=Y" \
    -e "PRIVACY_CONSENT=Y" \
    -p 8000:8000 \
    -p 8001:8001 \
    -p 8002:8002 \
    -p 8211:8211 \
    -p 8765:8765 \
    -p 8889:8889 \
    -v /home/ubuntu/anvil-sim:/host/anvil-sim \
    -v /home/ubuntu/omni.sepulki.streamer:/ext/omni.sepulki.streamer \
    nvcr.io/nvidia/isaac-sim:2023.1.1 \
    ./runheadless.native.sh --no-window --allow-root

echo "⏳ Waiting for Isaac Sim to initialize (60 seconds)..."
sleep 60

echo "📊 Checking Isaac Sim status..."
docker logs isaac-sim-container 2>&1 | grep -i "app ready\|error\|fatal" | tail -5

# Install dependencies if container is ready
docker exec isaac-sim-container /isaac-sim/kit/python/bin/python3 -m pip install --quiet aiohttp structlog numpy pillow opencv-python-headless websockets 2>&1 | tail -3 || true

# Start anvil-sim inside container
echo ""
echo "🚀 Starting anvil-sim service in container..."
docker exec -d isaac-sim-container bash -c "
    cd /host/anvil-sim
    export ISAAC_SIM_BASE=/isaac-sim
    export PYTHONPATH=/isaac-sim/kit/python:/isaac-sim/kit/exts:/isaac-sim/kit/extscore:/isaac-sim/kit/kernel:/isaac-sim/exts:\$PYTHONPATH
    /isaac-sim/kit/python/bin/python3 src/main.py > /tmp/anvil.log 2>&1
"

echo "⏳ Waiting for anvil-sim to start..."
sleep 15

echo "📋 Checking anvil-sim process..."
docker exec isaac-sim-container ps aux | grep "main.py\|python" | grep -v grep || echo "Process not found"

echo ""
echo "📊 anvil-sim logs:"
docker exec isaac-sim-container tail -20 /tmp/anvil.log 2>&1 || echo "No logs yet"

echo ""
echo "🧪 Testing health endpoint..."
docker exec isaac-sim-container curl -s http://localhost:8002/health || echo "Health check failed"
DEPLOY

# Test from outside
echo ""
echo "⏳ Waiting for port forwarding..."
sleep 10

echo "🧪 Testing from outside..."
for i in {1..10}; do
    RESPONSE=$(curl -s --max-time 5 "http://$AWS_IP:8002/health" 2>&1 || echo "")
    if [ ! -z "$RESPONSE" ] && ([[ "$RESPONSE" == *"healthy"* ]] || [[ "$RESPONSE" == *"status"* ]] || [[ "$RESPONSE" == *"{"* ]]); then
        echo "✅✅✅ Service is accessible from outside!"
        echo "$RESPONSE"
        break
    fi
    echo "   Attempt $i/10: Not ready yet..."
    sleep 5
done

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Service URLs:"
echo "   Health: http://$AWS_IP:8002/health"
echo "   Scene Status: http://$AWS_IP:8002/debug/scene_status"
echo "   Frame Stats: http://$AWS_IP:8002/debug/frame_stats"
echo ""
echo "📝 Check logs:"
echo "   ssh -i $SSH_KEY ubuntu@$AWS_IP 'docker exec isaac-sim-container tail -f /tmp/anvil.log'"

