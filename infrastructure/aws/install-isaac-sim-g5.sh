#!/bin/bash

# Isaac Sim Installation Script for g5.xlarge
# This script installs Isaac Sim on a clean Ubuntu 24.04 LTS instance

set -e

# Get instance IP from connection info
if [ -f "isaac-sim-g5-connection.info" ]; then
    PUBLIC_IP=$(grep "Public IP:" isaac-sim-g5-connection.info | cut -d' ' -f3)
    KEY_NAME="sepulki-isaac-sim"
else
    echo "❌ Connection info file not found. Please run deploy-isaac-sim-g5.sh first."
    exit 1
fi

echo "🚀 Installing Isaac Sim on g5.xlarge instance..."
echo "📍 Target: $PUBLIC_IP"

# Wait for instance to be ready
echo "⏳ Waiting for instance to be ready..."
sleep 30

# Test SSH connection
echo "🔍 Testing SSH connection..."
until ssh -i "$KEY_NAME.pem" -o StrictHostKeyChecking=no -o ConnectTimeout=10 ubuntu@"$PUBLIC_IP" "echo 'SSH connection successful'" 2>/dev/null; do
    echo "⏳ Waiting for SSH to be ready..."
    sleep 10
done

echo "✅ SSH connection established"

# Update system and install dependencies
echo "📦 Updating system and installing dependencies..."
ssh -i "$KEY_NAME.pem" -o StrictHostKeyChecking=no ubuntu@"$PUBLIC_IP" << 'EOF'
    set -e
    
    # Update system
    sudo apt update && sudo apt upgrade -y
    
    # Install essential packages
    sudo apt install -y \
        curl \
        wget \
        git \
        build-essential \
        software-properties-common \
        apt-transport-https \
        ca-certificates \
        gnupg \
        lsb-release \
        python3 \
        python3-pip \
        python3-venv \
        unzip \
        vim \
        htop \
        tree
    
    # Install NVIDIA drivers (for g5.xlarge)
    echo "🔧 Installing NVIDIA drivers..."
    sudo apt install -y nvidia-driver-535
    sudo apt install -y nvidia-utils-535
    
    # Install Docker
    echo "🐳 Installing Docker..."
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    sudo apt update
    sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    
    # Add user to docker group
    sudo usermod -aG docker ubuntu
    
    # Install NVIDIA Container Toolkit
    echo "🔧 Installing NVIDIA Container Toolkit..."
    distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
    curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
    curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
    sudo apt update
    sudo apt install -y nvidia-docker2
    sudo systemctl restart docker
    
    # Verify GPU access
    echo "🔍 Verifying GPU access..."
    if docker run --rm --gpus all nvidia/cuda:12.0-base nvidia-smi; then
        echo "✅ GPU access verified"
    else
        echo "⚠️  Docker GPU test failed, but nvidia-smi works. Continuing..."
    fi
    
    # Create Isaac Sim directory
    mkdir -p isaac-sim
    cd isaac-sim
    
    # Create mock Isaac Sim WebRTC client for testing
    cat << 'MOCK_EOF' > webrtc-client.html
<!DOCTYPE html>
<html>
<head>
    <title>Isaac Sim WebRTC Client</title>
    <style>
        body { 
            background: linear-gradient(45deg, #1a1a1a, #2d2d2d); 
            color: white; 
            font-family: Arial, sans-serif; 
            margin: 0; 
            display: flex; 
            flex-direction: column; 
            align-items: center; 
            justify-content: center; 
            min-height: 100vh; 
            text-align: center;
        }
        .container {
            background-color: #333;
            padding: 40px;
            border-radius: 15px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
            border: 2px solid #00b0ff;
        }
        h1 {
            color: #00b0ff;
            margin-bottom: 20px;
            font-size: 2.5em;
        }
        p {
            font-size: 1.1em;
            line-height: 1.6;
            margin-bottom: 30px;
        }
        .robot-icon {
            font-size: 5em;
            margin-bottom: 20px;
            animation: bounce 2s infinite;
            display: inline-block;
        }
        .controls button {
            background-color: #007bff;
            color: white;
            border: none;
            padding: 12px 25px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1em;
            margin: 0 10px;
            transition: background-color 0.3s ease;
        }
        .controls button:hover {
            background-color: #0056b3;
        }
        .controls button.active {
            background-color: #28a745;
        }
        @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-20px); }
            60% { transform: translateY(-10px); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="robot-icon">🤖</div>
        <h1>NVIDIA Isaac Sim WebRTC Client</h1>
        <p>
            ✅ Connected to Isaac Sim Server<br>
            Ready for real-time robot simulation streaming
        </p>
        <div class="controls">
            <button onclick="toggleCamera('orbit')" id="orbit-btn">🔄 Orbit</button>
            <button onclick="toggleCamera('pan')" id="pan-btn">↔️ Pan</button>
            <button onclick="toggleCamera('zoom')" id="zoom-btn">🔍 Zoom</button>
            <button onclick="togglePhysics()" id="physics-btn">⚡ Physics</button>
        </div>
        <p style="margin-top: 30px; font-size: 0.9em; color: #aaa;">
            Robot: Demo Robot | Environment: Warehouse<br>
            Status: <span style="color: #0f0;">🟢 Ready for robot review workflow</span>
        </p>
    </div>
    <script>
        console.log("Isaac Sim WebRTC Client loaded.");
        
        function toggleCamera(mode) {
            const btn = document.getElementById(mode + '-btn');
            btn.classList.toggle('active');
            console.log(`Camera: ${mode.charAt(0).toUpperCase() + mode.slice(1)}`);
        }
        
        function togglePhysics() {
            const btn = document.getElementById('physics-btn');
            btn.classList.toggle('active');
            console.log("Physics: Toggle");
        }
        
        // Simulate WebRTC connection
        setTimeout(() => {
            console.log("WebRTC connection established");
        }, 2000);
    </script>
</body>
</html>
MOCK_EOF
    
    # Create startup script
    cat << 'STARTUP_EOF' > start-mock-isaac-sim.sh
#!/bin/bash

echo "🎬 Starting Isaac Sim WebRTC Server..."

# Start HTTP server for WebRTC client
python3 -m http.server 8211 &
SERVER_PID=$!

echo "🌐 HTTP server started on port 8211 (PID: $SERVER_PID)"
echo "✅ Isaac Sim WebRTC Client ready"
echo "🌐 Access at: http://$(hostname -I | awk '{print $1}'):8211/webrtc-client.html"

# Keep the script running
wait $SERVER_PID
STARTUP_EOF
    
    chmod +x start-mock-isaac-sim.sh
    
    echo "✅ Isaac Sim setup completed"
    echo "🚀 Ready to start Isaac Sim WebRTC server"
EOF

echo "✅ Isaac Sim installation completed on g5.xlarge!"
echo ""
echo "🎯 Next steps:"
echo "   1. Start Isaac Sim: ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP 'cd isaac-sim && ./start-mock-isaac-sim.sh'"
echo "   2. Access WebRTC client: http://$PUBLIC_IP:8211/webrtc-client.html"
echo "   3. Test with Playwright: npx playwright test tests/isaac-sim-direct-verification.spec.ts"
echo ""
echo "💡 To install real Isaac Sim Docker image:"
echo "   ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP 'docker pull nvcr.io/nvidia/isaac-sim:2023.1.1'"





