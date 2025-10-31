#!/bin/bash
# Start Isaac Sim container with anvil-sim service running inside

set -e

AWS_IP="${1:-54.173.1.156}"
SSH_KEY="/Users/taylormohney/Documents/GitHub/Sepulki/sepulki-isaac-sim.pem"

echo "🚀 Starting Isaac Sim with anvil-sim service"
echo "   AWS IP: $AWS_IP"
echo ""

# Transfer anvil-sim code
echo "📤 Transferring anvil-sim code..."
rsync -avz -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    --exclude 'node_modules' --exclude '__pycache__' --exclude '*.pyc' --exclude '.git' \
    services/anvil-sim/ ubuntu@$AWS_IP:~/anvil-sim/

# Deploy and start
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$AWS_IP << 'DEPLOY_END'
set -e

cd ~/anvil-sim

# Install Python dependencies (if not already installed)
echo "📦 Installing Python dependencies..."
/isaac-sim/kit/python/bin/python3 -m pip install --quiet aiohttp structlog numpy pillow opencv-python-headless websockets 2>&1 | tail -3 || true

# Stop existing container
docker stop isaac-sim-container 2>/dev/null || true
docker rm isaac-sim-container 2>/dev/null || true

# Start Isaac Sim container with anvil-sim mounted and running
echo "🎬 Starting Isaac Sim container with anvil-sim..."
docker run -d \
    --name isaac-sim-container \
    --gpus all \
    -e "ACCEPT_EULA=Y" \
    -e "PRIVACY_CONSENT=Y" \
    -e "ISAAC_SIM_BASE=/isaac-sim" \
    -p 8000:8000 \
    -p 8001:8001 \
    -p 8002:8002 \
    -p 8211:8211 \
    -p 8765:8765 \
    -p 8889:8889 \
    -v /home/ubuntu/anvil-sim:/host/anvil-sim \
    nvcr.io/nvidia/isaac-sim:2023.1.1 \
    bash -c "
        echo '⏳ Waiting for Isaac Sim to initialize...'
        sleep 10
        echo '🚀 Starting anvil-sim service...'
        cd /host/anvil-sim
        export ISAAC_SIM_BASE=/isaac-sim
        export PYTHONPATH=/isaac-sim/kit/python:/isaac-sim/kit/exts:/isaac-sim/kit/extscore:/isaac-sim/kit/kernel:/isaac-sim/exts:\$PYTHONPATH
        /isaac-sim/kit/python/bin/python3 src/main.py &
        ANVIL_PID=\$!
        echo '✅ anvil-sim started (PID: '\$ANVIL_PID')'
        # Also start Isaac Sim extension if needed
        /isaac-sim/kit/kit --no-window --allow-root --ext-folder /host/omni.sepulki.streamer --enable omni.sepulki.streamer &
        wait
    "

echo "⏳ Waiting for services to start..."
sleep 15

# Check if services are running
echo ""
echo "📊 Checking service status..."
docker logs isaac-sim-container 2>&1 | tail -20

echo ""
echo "🧪 Testing health endpoint..."
sleep 5
curl -s http://localhost:8002/health || echo "Health check failed"
DEPLOY_END

# Update security group
echo ""
echo "🔒 Updating security group..."
INSTANCE_ID=$(aws ec2 describe-instances --filters "Name=ip-address,Values=$AWS_IP" --query 'Reservations[0].Instances[0].InstanceId' --output text 2>/dev/null || echo "")
if [ ! -z "$INSTANCE_ID" ]; then
    SG_ID=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)
    for port in 8000 8001 8002; do
        aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port $port --cidr 0.0.0.0/0 2>/dev/null || echo "Port $port may already be open"
    done
fi

# Test from outside
echo ""
echo "🧪 Testing from outside..."
sleep 10
curl -s "http://$AWS_IP:8002/health" | head -20 || echo "Not yet accessible"

echo ""
echo "✅ Deployment attempt complete!"
echo ""
echo "📋 Service URLs:"
echo "   Health: http://$AWS_IP:8002/health"
echo "   Scene Status: http://$AWS_IP:8002/debug/scene_status"
echo ""
echo "📝 To check logs:"
echo "   ssh -i $SSH_KEY ubuntu@$AWS_IP 'docker logs -f isaac-sim-container'"

