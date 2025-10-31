#!/bin/bash
# Run anvil-sim on host, configured to use Isaac Sim from container

set -e

AWS_IP="${1:-54.173.1.156}"
SSH_KEY="/Users/taylormohney/Documents/GitHub/Sepulki/sepulki-isaac-sim.pem"

echo "🚀 Setting up anvil-sim on host to work with Isaac Sim container"
echo "   AWS IP: $AWS_IP"
echo ""

# Transfer files
rsync -avz -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    --exclude 'node_modules' --exclude '__pycache__' --exclude '*.pyc' --exclude '.git' \
    services/anvil-sim/ ubuntu@$AWS_IP:~/anvil-sim/

# Setup on host
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$AWS_IP bash << 'HOST_SETUP'
set -e

cd ~/anvil-sim

# Install dependencies
echo "📦 Installing Python dependencies..."
pip3 install --user aiohttp structlog numpy pillow opencv-python-headless websockets 2>&1 | tail -5

# Create wrapper script that uses container's Python
cat > ~/run-anvil-with-container.sh << 'WRAPPER'
#!/bin/bash
# Run anvil-sim using Isaac Sim Python from container

CONTAINER_NAME="isaac-sim-container"

# Make sure container is running
if ! docker ps | grep -q $CONTAINER_NAME; then
    echo "❌ Isaac Sim container not running"
    exit 1
fi

cd ~/anvil-sim

# Set paths to use container's Isaac Sim
export ISAAC_SIM_BASE=/isaac-sim
export PYTHONPATH="/isaac-sim/kit/python:/isaac-sim/kit/exts:/isaac-sim/kit/extscore:/isaac-sim/kit/kernel:/isaac-sim/exts:$PYTHONPATH"

# Extract Isaac Sim Python from container
ISAAC_PYTHON=$(docker exec $CONTAINER_NAME which python3)
echo "Using Isaac Sim Python: $ISAAC_PYTHON"

# BUT: anvil-sim needs to initialize SimulationApp itself
# So we need to run it in a way that can access Isaac Sim

# Option: Run anvil-sim INSIDE container but as separate process
docker exec -d $CONTAINER_NAME bash -c "
    cd /host/anvil-sim
    export ISAAC_SIM_BASE=/isaac-sim
    export PYTHONPATH=/isaac-sim/kit/python:/isaac-sim/kit/exts:/isaac-sim/kit/extscore:/isaac-sim/kit/kernel:/isaac-sim/exts:\$PYTHONPATH
    /isaac-sim/kit/python/bin/python3 src/main.py
"

echo "✅ anvil-sim started in container"
echo "   Check logs: docker exec $CONTAINER_NAME tail -f /tmp/anvil.log"
WRAPPER

chmod +x ~/run-anvil-with-container.sh

echo "✅ Setup complete"
HOST_SETUP

# Start Isaac Sim container (normal way, no anvil)
echo ""
echo "🎬 Starting Isaac Sim container (headless)..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@54.173.1.156 bash << 'START_CONTAINER'
docker stop isaac-sim-container 2>/dev/null || true
docker rm isaac-sim-container 2>/dev/null || true

docker run -d \
    --name isaac-sim-container \
    --gpus all \
    -e "ACCEPT_EULA=Y" \
    -e "PRIVACY_CONSENT=Y" \
    -p 8211:8211 \
    -p 8765:8765 \
    -p 8889:8889 \
    -v /home/ubuntu/anvil-sim:/host/anvil-sim \
    -v /home/ubuntu/omni.sepulki.streamer:/ext/omni.sepulki.streamer \
    nvcr.io/nvidia/isaac-sim:2023.1.1 \
    ./runheadless.native.sh --no-window --allow-root

echo "⏳ Waiting for Isaac Sim to initialize..."
sleep 30
docker logs isaac-sim-container 2>&1 | tail -10
START_CONTAINER

# Start anvil-sim inside container
echo ""
echo "🚀 Starting anvil-sim service in container..."
sleep 10
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@54.173.1.156 "~/run-anvil-with-container.sh"

# Wait and test
echo ""
echo "⏳ Waiting for service..."
sleep 20

for i in {1..5}; do
    RESPONSE=$(curl -s --max-time 3 "http://54.173.1.156:8002/health" 2>&1 || echo "")
    if [ ! -z "$RESPONSE" ]; then
        echo "✅ Service responding!"
        echo "$RESPONSE" | head -3
        break
    fi
    echo "   Attempt $i/5..."
    sleep 5
done

echo ""
echo "🎉 Setup complete!"
echo "   Health: http://54.173.1.156:8002/health"
echo "   Logs: ssh -i $SSH_KEY ubuntu@54.173.1.156 'docker exec isaac-sim-container ps aux | grep main.py'"

