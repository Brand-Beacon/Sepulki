#!/bin/bash
# Isaac Sim Installation Script for AWS EC2
# Installs Isaac Sim 2023.1.1 with WebRTC streaming support

set -e

echo "🎬 Installing Isaac Sim on AWS EC2..."

# Check if running on Ubuntu
if ! grep -q "Ubuntu" /etc/os-release; then
    echo "❌ This script is designed for Ubuntu. Current OS:"
    cat /etc/os-release
    exit 1
fi

echo "✅ Ubuntu detected"

# Update system
echo "📦 Updating system packages..."
sudo apt-get update
sudo apt-get upgrade -y

# Install Docker
echo "🐳 Installing Docker..."
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker ubuntu
    rm get-docker.sh
    echo "✅ Docker installed"
else
    echo "✅ Docker already installed"
fi

# Install NVIDIA Container Toolkit
echo "🔧 Installing NVIDIA Container Toolkit..."
if ! command -v nvidia-container-runtime &> /dev/null; then
    distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
    curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
    curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list

    sudo apt-get update
    sudo apt-get install -y nvidia-docker2
    sudo systemctl restart docker
    echo "✅ NVIDIA Container Toolkit installed"
else
    echo "✅ NVIDIA Container Toolkit already installed"
fi

# Verify GPU access
echo "🔍 Verifying GPU access..."
if docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi; then
    echo "✅ GPU access verified"
else
    echo "⚠️  Docker GPU test failed, but nvidia-smi works. Continuing..."
fi

# Create Isaac Sim directory
echo "📁 Creating Isaac Sim directory..."
ISAAC_SIM_DIR="/home/ubuntu/isaac-sim"
mkdir -p "$ISAAC_SIM_DIR"
cd "$ISAAC_SIM_DIR"

# Pull Isaac Sim Docker image
echo "📥 Pulling Isaac Sim Docker image..."
docker pull nvcr.io/nvidia/isaac-sim:2023.1.1

echo "✅ Isaac Sim Docker image pulled"

# Create startup script
echo "🔧 Creating Isaac Sim startup script..."
cat > start-isaac-sim.sh << 'EOF'
#!/bin/bash
# Start Isaac Sim in headless WebRTC mode

echo "🎬 Starting Isaac Sim in WebRTC mode..."

# Get public IP
PUBLIC_IP=$(curl -s ifconfig.me)
echo "📍 Public IP: $PUBLIC_IP"

# Create Isaac Sim container
docker run --gpus all -d \
  --name isaac-sim-webrtc \
  --restart unless-stopped \
  -p 8211:8211 \
  -p 49100:49100 \
  -p 47998:47998/udp \
  -e OMNI_SERVER=$PUBLIC_IP \
  -v /home/ubuntu/isaac-sim/assets:/assets \
  -v /home/ubuntu/isaac-sim/logs:/var/log/isaac-sim \
  nvcr.io/nvidia/isaac-sim:2023.1.1 \
  ./isaac-sim.headless.webrtc.sh

echo "✅ Isaac Sim started in WebRTC mode"
echo "🌐 WebRTC Client: http://$PUBLIC_IP:8211/streaming/webrtc-client?server=$PUBLIC_IP"
EOF

chmod +x start-isaac-sim.sh

# Create systemd service
echo "🔧 Creating systemd service..."
sudo tee /etc/systemd/system/isaac-sim.service > /dev/null << EOF
[Unit]
Description=Isaac Sim WebRTC Service
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
User=ubuntu
WorkingDirectory=$ISAAC_SIM_DIR
ExecStart=$ISAAC_SIM_DIR/start-isaac-sim.sh
ExecStop=/usr/bin/docker stop isaac-sim-webrtc
ExecStopPost=/usr/bin/docker rm isaac-sim-webrtc
TimeoutStartSec=300

[Install]
WantedBy=multi-user.target
EOF

# Create directories for assets and logs
mkdir -p "$ISAAC_SIM_DIR/assets"
mkdir -p "$ISAAC_SIM_DIR/logs"

# Create health check script
echo "🏥 Creating health check script..."
cat > health-check.sh << 'EOF'
#!/bin/bash
# Health check for Isaac Sim service

echo "🏥 Checking Isaac Sim service health..."

# Check if container is running
if docker ps | grep -q isaac-sim-webrtc; then
    echo "✅ Isaac Sim container is running"
    
    # Check if WebRTC client is accessible
    PUBLIC_IP=$(curl -s ifconfig.me)
    if curl -s -f "http://$PUBLIC_IP:8211/streaming/webrtc-client" > /dev/null; then
        echo "✅ WebRTC client is accessible"
        echo "🌐 URL: http://$PUBLIC_IP:8211/streaming/webrtc-client?server=$PUBLIC_IP"
    else
        echo "❌ WebRTC client not accessible"
        exit 1
    fi
    
    # Check GPU usage
    echo "🔍 GPU Status:"
    nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits
    
    echo "🎉 Isaac Sim service is healthy!"
else
    echo "❌ Isaac Sim container is not running"
    exit 1
fi
EOF

chmod +x health-check.sh

# Create monitoring script
echo "📊 Creating monitoring script..."
cat > monitor.sh << 'EOF'
#!/bin/bash
# Monitor Isaac Sim service

echo "📊 Isaac Sim Service Monitor"
echo "=========================="

while true; do
    clear
    echo "📊 Isaac Sim Service Monitor - $(date)"
    echo "=========================="
    
    # Service status
    echo "🔧 Service Status:"
    systemctl status isaac-sim --no-pager -l
    
    echo ""
    echo "🐳 Container Status:"
    docker ps | grep isaac-sim-webrtc || echo "Container not running"
    
    echo ""
    echo "💾 GPU Usage:"
    nvidia-smi --query-gpu=utilization.gpu,memory.used,memory.total --format=csv,noheader,nounits
    
    echo ""
    echo "🌐 Network Status:"
    netstat -tlnp | grep -E ":(8211|49100|47998)"
    
    echo ""
    echo "📝 Recent Logs:"
    docker logs --tail 5 isaac-sim-webrtc 2>/dev/null || echo "No logs available"
    
    sleep 5
done
EOF

chmod +x monitor.sh

# Enable and start the service
echo "🚀 Enabling Isaac Sim service..."
sudo systemctl daemon-reload
sudo systemctl enable isaac-sim

echo ""
echo "🎉 Isaac Sim installation completed!"
echo ""
echo "📋 Available commands:"
echo "   Start service:    sudo systemctl start isaac-sim"
echo "   Stop service:     sudo systemctl stop isaac-sim"
echo "   Check status:     sudo systemctl status isaac-sim"
echo "   Health check:     ./health-check.sh"
echo "   Monitor:          ./monitor.sh"
echo "   Manual start:     ./start-isaac-sim.sh"
echo ""
echo "🔧 To start Isaac Sim now:"
echo "   sudo systemctl start isaac-sim"
echo ""
echo "⏳ Service will take 2-3 minutes to fully start up."
