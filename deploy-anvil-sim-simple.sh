#!/bin/bash
# Simplified anvil-sim deployment to AWS

set -e

AWS_IP="${1:-54.173.1.156}"
SSH_KEY="/Users/taylormohney/Documents/GitHub/Sepulki/sepulki-isaac-sim.pem"

echo "🚀 Deploying anvil-sim to $AWS_IP"

# Transfer files
echo "📤 Transferring files..."
rsync -avz -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    --exclude 'node_modules' --exclude '__pycache__' --exclude '*.pyc' --exclude '.git' \
    services/anvil-sim/src/ ubuntu@$AWS_IP:~/anvil-sim/src/

rsync -avz -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    services/anvil-sim/config/ ubuntu@$AWS_IP:~/anvil-sim/config/

rsync -avz -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    services/anvil-sim/requirements.txt ubuntu@$AWS_IP:~/anvil-sim/

# Setup Python environment
echo "🔧 Setting up Python environment..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$AWS_IP bash << 'ENDSSH'
cd ~/anvil-sim

# Install dependencies
pip3 install --user aiohttp structlog numpy pillow opencv-python-headless websockets aiortc 2>&1 | tail -5

# Set Isaac Sim path (for Docker container)
export ISAAC_SIM_BASE=/isaac-sim

# Create run script
cat > ~/run-anvil-sim.sh << 'EOFSCRIPT'
#!/bin/bash
cd ~/anvil-sim
export ISAAC_SIM_BASE=/isaac-sim
export PYTHONPATH=/isaac-sim/kit/python:$PYTHONPATH
python3 src/main.py
EOFSCRIPT

chmod +x ~/run-anvil-sim.sh

# Check if Isaac Sim Docker container exists
if docker ps -a | grep -q isaac-sim-container; then
    echo "✅ Isaac Sim container found"
    
    # Try to run anvil-sim INSIDE the Isaac Sim container
    docker exec -d isaac-sim-container bash -c "pip install aiohttp structlog numpy pillow opencv-python-headless websockets aiortc && python3 /host/anvil-sim/src/main.py" || echo "Could not run in container"
else
    echo "⚠️  Isaac Sim container not running"
    echo "   Starting anvil-sim on host (will need Isaac Sim available)"
fi
ENDSSH

# Update security group
echo "🔒 Checking security group..."
INSTANCE_ID=$(aws ec2 describe-instances --filters "Name=ip-address,Values=$AWS_IP" --query 'Reservations[0].Instances[0].InstanceId' --output text 2>/dev/null || echo "")
if [ ! -z "$INSTANCE_ID" ]; then
    SG_ID=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 8002 --cidr 0.0.0.0/0 2>/dev/null || echo "Port 8002 may already be open"
fi

echo ""
echo "✅ Deployment complete!"
echo "🌐 Service should be at: http://$AWS_IP:8002"
echo ""
echo "📝 To start service manually:"
echo "   ssh -i $SSH_KEY ubuntu@$AWS_IP 'cd ~/anvil-sim && python3 src/main.py'"
echo ""
echo "🧪 Test connection:"
echo "   curl http://$AWS_IP:8002/health"

