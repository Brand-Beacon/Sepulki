#!/bin/bash
# Deploy anvil-sim service to AWS EC2 instance

set -e

AWS_IP="${1:-54.173.1.156}"
SSH_KEY="/Users/taylormohney/Documents/GitHub/Sepulki/sepulki-isaac-sim.pem"

if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found: $SSH_KEY"
    exit 1
fi

echo "🚀 Deploying anvil-sim service to AWS"
echo "   Target: ubuntu@$AWS_IP"
echo ""

# Wait for SSH to be ready
echo "⏳ Waiting for SSH to be available..."
for i in {1..30}; do
    if ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=5 ubuntu@$AWS_IP "echo 'SSH ready'" > /dev/null 2>&1; then
        echo "✅ SSH is ready"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "❌ SSH not available after 30 attempts"
        exit 1
    fi
    sleep 2
done

echo ""
echo "📦 Setting up anvil-sim service..."

# Create deployment script on remote
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$AWS_IP << 'DEPLOY_SCRIPT'
set -e

echo "🔧 Installing prerequisites..."
sudo apt-get update -qq
sudo apt-get install -y -qq python3-pip python3-venv git docker.io docker-compose > /dev/null 2>&1

# Install NVIDIA Docker
if ! docker run --rm --gpus all nvidia/cuda:11.0.3-base-ubuntu20.04 nvidia-smi > /dev/null 2>&1; then
    echo "📦 Setting up NVIDIA Docker..."
    distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
    curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
    curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
    sudo apt-get update -qq
    sudo apt-get install -y -qq nvidia-docker2 > /dev/null 2>&1
    sudo systemctl restart docker
fi

# Create anvil-sim directory
mkdir -p ~/sepulki/services/anvil-sim
cd ~/sepulki/services/anvil-sim

echo "📥 Cloning/updating code..."
if [ -d ".git" ]; then
    git pull || true
else
    # If no git, we'll transfer files via SSH
    echo "⚠️  No git repo found, will transfer files manually"
fi

echo "✅ Prerequisites installed"
DEPLOY_SCRIPT

# Transfer anvil-sim service files
echo ""
echo "📤 Transferring anvil-sim service files..."
rsync -avz -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    --exclude 'node_modules' \
    --exclude '__pycache__' \
    --exclude '*.pyc' \
    --exclude '.git' \
    services/anvil-sim/ ubuntu@$AWS_IP:~/sepulki/services/anvil-sim/

# Setup and start service
echo ""
echo "🔧 Setting up service..."
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$AWS_IP << 'SETUP_SCRIPT'
set -e

cd ~/sepulki/services/anvil-sim

# Set Isaac Sim path
export ISAAC_SIM_BASE=/isaac-sim

# Install Python dependencies
echo "📦 Installing Python dependencies..."
python3 -m venv venv || true
source venv/bin/activate
pip install -q --upgrade pip
pip install -q -r requirements.txt || pip install -q aiohttp structlog numpy pillow opencv-python-headless

# Make main.py executable
chmod +x src/main.py

# Create systemd service
echo "📝 Creating systemd service..."
sudo tee /etc/systemd/system/anvil-sim.service > /dev/null << 'EOF'
[Unit]
Description=Anvil Sim - Isaac Sim Integration Service
After=docker.service
Requires=docker.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/sepulki/services/anvil-sim
Environment="ISAAC_SIM_BASE=/isaac-sim"
Environment="ANVIL_HEADLESS=true"
Environment="ANVIL_LOG_LEVEL=INFO"
Environment="PATH=/home/ubuntu/sepulki/services/anvil-sim/venv/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
ExecStart=/home/ubuntu/sepulki/services/anvil-sim/venv/bin/python3 src/main.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd and start service
sudo systemctl daemon-reload
sudo systemctl enable anvil-sim
sudo systemctl restart anvil-sim

echo "⏳ Waiting for service to start..."
sleep 5

# Check service status
if sudo systemctl is-active --quiet anvil-sim; then
    echo "✅ Service is running"
else
    echo "❌ Service failed to start"
    sudo systemctl status anvil-sim --no-pager
    exit 1
fi

# Wait for health check
for i in {1..30}; do
    if curl -s http://localhost:8002/health > /dev/null 2>&1; then
        echo "✅ Service health check passed"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "⚠️  Health check not responding (may need more time)"
        sudo journalctl -u anvil-sim --no-pager -n 20
    fi
    sleep 2
done
SETUP_SCRIPT

# Update security group to allow port 8002
echo ""
echo "🔒 Updating security group..."
INSTANCE_ID=$(aws ec2 describe-instances --filters "Name=ip-address,Values=$AWS_IP" --query 'Reservations[0].Instances[0].InstanceId' --output text 2>/dev/null || echo "")

if [ ! -z "$INSTANCE_ID" ]; then
    SG_ID=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 8002 --cidr 0.0.0.0/0 2>/dev/null || echo "Port 8002 may already be open"
    echo "✅ Security group updated"
fi

# Test connection
echo ""
echo "🧪 Testing service..."
sleep 3
RESPONSE=$(curl -s http://$AWS_IP:8002/health || echo "")

if [ ! -z "$RESPONSE" ]; then
    echo "✅ Service is accessible!"
    echo "$RESPONSE" | jq . || echo "$RESPONSE"
else
    echo "⚠️  Service not yet accessible (may need more time or check logs)"
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$AWS_IP "sudo journalctl -u anvil-sim --no-pager -n 30"
fi

echo ""
echo "🎉 Deployment complete!"
echo ""
echo "📋 Service URL: http://$AWS_IP:8002"
echo "   Health: http://$AWS_IP:8002/health"
echo "   Scene Status: http://$AWS_IP:8002/debug/scene_status"
echo ""
echo "🔧 To check service logs:"
echo "   ssh -i $SSH_KEY ubuntu@$AWS_IP 'sudo journalctl -u anvil-sim -f'"

