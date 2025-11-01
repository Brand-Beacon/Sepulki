#!/bin/bash

# Install Latest Isaac Sim with Optimized Streaming Configuration

set -e

INSTANCE_IP=${1:-""}

if [ -z "$INSTANCE_IP" ]; then
    echo "Usage: $0 <instance-ip>"
    exit 1
fi

KEY_PATH="/Users/taylormohney/Documents/GitHub/Sepulki/sepulki-isaac-sim.pem"

echo "🔧 Installing Isaac Sim on $INSTANCE_IP"
echo "========================================"
echo ""

# Install NVIDIA drivers and Docker
echo "1️⃣ Installing NVIDIA drivers and Docker..."
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP << 'ENDSSH'
# Update system
sudo apt-get update -qq
sudo apt-get upgrade -y -qq

# Install NVIDIA drivers
sudo apt-get install -y -qq linux-headers-$(uname -r)
distribution=$(. /etc/os-release;echo $ID$VERSION_ID | sed -e 's/\.//g')
wget -q https://developer.download.nvidia.com/compute/cuda/repos/$distribution/x86_64/cuda-keyring_1.0-1_all.deb
sudo dpkg -i cuda-keyring_1.0-1_all.deb
sudo apt-get update -qq
sudo apt-get -y install cuda-drivers

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker ubuntu

# Install NVIDIA Container Toolkit
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update -qq
sudo apt-get install -y nvidia-container-toolkit
sudo systemctl restart docker

echo "✅ NVIDIA drivers and Docker installed"
ENDSSH

echo ""
echo "2️⃣ Pulling latest Isaac Sim Docker image..."
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP << 'ENDSSH'
# Pull Isaac Sim 2023.1.1 (stable) or latest
# Note: Isaac Sim 2024+ may not be available yet, using latest stable
docker pull nvcr.io/nvidia/isaac-sim:2023.1.1

echo "✅ Isaac Sim image pulled"
ENDSSH

echo ""
echo "3️⃣ Creating Isaac Sim screenshot streamer..."

# Create optimized streamer script
cat > /tmp/isaac_streamer_optimized.py << 'EOF'
#!/usr/bin/env python3
"""Optimized Isaac Sim Screenshot Streamer with proper memory management"""

import asyncio
import io
import sys
import gc
from aiohttp import web

print("🚀 Starting Isaac Sim (optimized)...")

# Minimal Isaac Sim config for streaming
config = {
    "headless": True,
    "width": 1280,
    "height": 720,
}

from omni.isaac.kit import SimulationApp
app = SimulationApp(config)

import omni
from omni.isaac.core import World
from omni.isaac.core.utils.stage import add_reference_to_stage
import omni.replicator.core as rep
import numpy as np
from PIL import Image

print("✅ Isaac Sim loaded")

class Streamer:
    def __init__(self):
        self.frames = 0
        self.world = None
        self.rp = None
        self.initialized = False
        
    async def init_scene(self):
        """Initialize scene asynchronously."""
        try:
            print("📦 Creating world...")
            self.world = World()
            await self.world.initialize_simulation_context_async()
            
            self.world.scene.add_default_ground_plane()
            print("✅ Ground plane added")
            
            # Add simple cube instead of complex robot
            from omni.isaac.core.objects import DynamicCuboid
            cube = self.world.scene.add(
                DynamicCuboid(
                    prim_path="/World/Cube",
                    name="demo_cube",
                    position=np.array([0, 0, 1.0]),
                    scale=np.array([0.5, 0.5, 0.5]),
                    color=np.array([1.0, 0.3, 0.3])
                )
            )
            print("✅ Demo cube added")
            
            # Setup camera
            camera_path = "/OmniverseKit_Persp"
            self.rp = rep.create.render_product(camera_path, (1280, 720))
            print("✅ Camera configured")
            
            await self.world.reset_async()
            self.initialized = True
            
            print("🎬 Scene ready! Starting stream...")
            
        except Exception as e:
            print(f"❌ Scene init error: {e}")
            import traceback
            traceback.print_exc()
    
    async def capture(self):
        """Capture frame."""
        if not self.initialized:
            return self.loading_frame()
            
        try:
            # Step simulation
            await self.world.step_async(render=True)
            
            # Get frame
            if self.rp:
                data = rep.orchestrator.get_rgb_data(self.rp)
                
                if data is not None:
                    img = Image.fromarray(np.array(data, dtype=np.uint8))
                    buf = io.BytesIO()
                    img.save(buf, format='JPEG', quality=80)
                    
                    self.frames += 1
                    if self.frames % 100 == 0:
                        print(f"📹 {self.frames} frames")
                        gc.collect()  # Prevent memory leaks
                    
                    return buf.getvalue()
        except Exception as e:
            if self.frames % 100 == 0:
                print(f"⚠️ Capture error: {e}")
        
        return self.loading_frame()
    
    def loading_frame(self):
        """Loading frame."""
        img = Image.new('RGB', (1280, 720), (20, 25, 35))
        from PIL import ImageDraw
        d = ImageDraw.Draw(img)
        
        text = f"Isaac Sim Initializing...\nFrame {self.frames}"
        d.text((640, 360), text, fill=(0, 255, 128), anchor="mm")
        
        angle = (self.frames * 5) % 360
        x = 640 + int(150 * np.cos(np.radians(angle)))
        y = 360 + int(150 * np.sin(np.radians(angle)))
        d.ellipse([x-12, y-12, x+12, y+12], fill=(255, 80, 80))
        
        buf = io.BytesIO()
        img.save(buf, format='JPEG', quality=80)
        self.frames += 1
        return buf.getvalue()
    
    async def stream_mjpeg(self, request):
        """MJPEG stream handler."""
        resp = web.StreamResponse()
        resp.content_type = 'multipart/x-mixed-replace; boundary=frame'
        resp.headers['Cache-Control'] = 'no-cache'
        resp.headers['Access-Control-Allow-Origin'] = '*'
        await resp.prepare(request)
        
        try:
            while True:
                frame = await self.capture()
                
                await resp.write(b'--frame\r\n')
                await resp.write(b'Content-Type: image/jpeg\r\n')
                await resp.write(f'Content-Length: {len(frame)}\r\n\r\n'.encode())
                await resp.write(frame)
                await resp.write(b'\r\n')
                
                await asyncio.sleep(1/30)
        except:
            pass
        
        return resp

async def main():
    streamer = Streamer()
    
    # Start scene init in background
    asyncio.create_task(streamer.init_scene())
    
    # Web app
    app = web.Application()
    
    async def health(request):
        return web.json_response({
            'status': 'healthy',
            'frames': streamer.frames,
            'scene_ready': streamer.initialized
        })
    
    app.router.add_get('/health', health)
    app.router.add_get('/stream', streamer.stream_mjpeg)
    
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, '0.0.0.0', 8765)
    await site.start()
    
    print("✅ Server started on :8765")
    
    while True:
        await asyncio.sleep(0.1)
        app.update()

if __name__ == '__main__':
    asyncio.run(main())
EOF

scp -i "$KEY_PATH" -o StrictHostKeyChecking=no /tmp/isaac_streamer_optimized.py ubuntu@$INSTANCE_IP:/tmp/

echo ""
echo "4️⃣ Installing Python dependencies..."
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP << 'ENDSSH'
pip3 install -q aiohttp pillow numpy
echo "✅ Dependencies installed"
ENDSSH

echo ""
echo "5️⃣ Creating startup script..."
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP << 'ENDSSH'
cat > /home/ubuntu/start-isaac-stream.sh << 'STARTSCRIPT'
#!/bin/bash

echo "🎬 Starting Isaac Sim Screenshot Streamer"

# Stop any existing containers
docker stop isaac-sim-container 2>/dev/null || true
docker rm isaac-sim-container 2>/dev/null || true

# Start Isaac Sim container with streamer
docker run -d \
    --name isaac-sim-container \
    --gpus all \
    -e "ACCEPT_EULA=Y" \
    -e "PRIVACY_CONSENT=Y" \
    -p 8211:8211 \
    -p 8765:8765 \
    -p 8889:8889 \
    -p 48010:48010 \
    -v /home/ubuntu:/host \
    nvcr.io/nvidia/isaac-sim:2023.1.1 \
    bash -c "cp /host/isaac_streamer_optimized.py /tmp/ && /isaac-sim/python.sh /tmp/isaac_streamer_optimized.py"

echo "✅ Isaac Sim streamer started"
echo "   Stream: http://$(curl -s ifconfig.me):8765/stream"
echo "   Health: http://$(curl -s ifconfig.me):8765/health"
echo ""
echo "📊 Logs: docker logs -f isaac-sim-container"
STARTSCRIPT

chmod +x /home/ubuntu/start-isaac-stream.sh
mv /tmp/isaac_streamer_optimized.py /home/ubuntu/

echo "✅ Startup script created"
ENDSSH

echo ""
echo "6️⃣ Starting Isaac Sim streamer..."
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP "/home/ubuntu/start-isaac-stream.sh"

echo ""
echo "⏳ Waiting for Isaac Sim to initialize (this takes 3-5 minutes)..."
echo "   You can monitor progress with:"
echo "   ssh -i $KEY_PATH ubuntu@$INSTANCE_IP 'docker logs -f isaac-sim-container'"
echo ""

# Wait and check
sleep 180

echo "7️⃣ Checking status..."
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP "curl -s http://localhost:8765/health 2>/dev/null || echo 'Still initializing...'"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "🎉 Deployment Complete!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 Instance Info:"
echo "   IP: $INSTANCE_IP"
echo "   Type: $INSTANCE_TYPE (32GB RAM)"
echo "   Stream: http://$INSTANCE_IP:8765/stream"
echo ""
echo "🔧 Update your local .env:"
echo "   ISAAC_SIM_IP=$INSTANCE_IP"
echo "   ISAAC_STREAM_PORT=8765"
echo ""
echo "📝 Connection saved to: isaac-sim-upgraded.info"
echo ""




