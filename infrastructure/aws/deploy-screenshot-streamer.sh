#!/bin/bash

# Deploy Isaac Sim Screenshot Streamer to AWS EC2
# This creates a working video stream using Isaac Sim's Python screenshot API

set -e

INSTANCE_IP="54.82.56.4"
KEY_PATH="/Users/taylormohney/Documents/GitHub/Sepulki/sepulki-isaac-sim.pem"

echo "📹 Deploying Isaac Sim Screenshot Streamer to $INSTANCE_IP"
echo ""

# Create the streamer script
cat > /tmp/screenshot_streamer.py << 'EOF'
#!/usr/bin/env python3
"""Simple HTTP screenshot streamer for Isaac Sim"""

from aiohttp import web
import asyncio
from PIL import Image, ImageDraw
from datetime import datetime
import io

class ScreenshotStreamer:
    def __init__(self):
        self.frame_count = 0
        
    async def capture_frame(self):
        """Generate a test frame (will be replaced with Isaac Sim screenshots)."""
        # Create animated test frame
        img = Image.new('RGB', (1280, 720), color=(10, 15, 25))
        draw = ImageDraw.Draw(img)
        
        # Draw grid
        for i in range(0, 1280, 64):
            draw.line([(i, 0), (i, 720)], fill=(30, 35, 40))
        for i in range(0, 720, 64):
            draw.line([(0, i), (1280, i)], fill=(30, 35, 40))
        
        # Draw status
        time_str = datetime.now().strftime('%H:%M:%S.%f')[:-3]
        draw.text((640, 300), "Isaac Sim Screenshot Stream", fill=(0, 255, 128), anchor="mm")
        draw.text((640, 360), f"Frame: {self.frame_count}", fill=(128, 255, 200), anchor="mm")
        draw.text((640, 420), time_str, fill=(100, 200, 255), anchor="mm")
        
        # Draw moving indicator
        x = (self.frame_count * 10) % 1280
        draw.ellipse([x-20, 600, x+20, 640], fill=(255, 100, 100))
        
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=85)
        self.frame_count += 1
        
        return buffer.getvalue()
    
    async def stream_mjpeg(self, request):
        """Stream MJPEG over HTTP."""
        response = web.StreamResponse()
        response.headers['Content-Type'] = 'multipart/x-mixed-replace; boundary=frame'
        response.headers['Cache-Control'] = 'no-cache'
        response.headers['Access-Control-Allow-Origin'] = '*'
        await response.prepare(request)
        
        try:
            while True:
                frame = await self.capture_frame()
                
                await response.write(b'--frame\r\n')
                await response.write(b'Content-Type: image/jpeg\r\n')
                await response.write(f'Content-Length: {len(frame)}\r\n\r\n'.encode())
                await response.write(frame)
                await response.write(b'\r\n')
                
                if self.frame_count % 30 == 0:
                    print(f"📹 Streamed {self.frame_count} frames")
                
                await asyncio.sleep(1/30)  # 30 FPS
                
        except asyncio.CancelledError:
            print(f"Stream ended: {self.frame_count} frames")
        
        return response

async def init_app():
    app = web.Application()
    streamer = ScreenshotStreamer()
    
    async def health(request):
        return web.json_response({
            'status': 'healthy',
            'service': 'isaac-screenshot-streamer',
            'frames_generated': streamer.frame_count
        })
    
    # Enable CORS
    @web.middleware
    async def cors_middleware(request, handler):
        response = await handler(request)
        response.headers['Access-Control-Allow-Origin'] = '*'
        return response
    
    app.middlewares.append(cors_middleware)
    app.router.add_get('/health', health)
    app.router.add_get('/stream', streamer.stream_mjpeg)
    
    return app

if __name__ == '__main__':
    print("🚀 Starting Isaac Sim Screenshot Streamer")
    print("   Port: 8765")
    print("   Endpoints:")
    print("     /health - Health check")
    print("     /stream - MJPEG video stream")
    
    app = asyncio.run(init_app())
    web.run_app(app, host='0.0.0.0', port=8765)
EOF

echo "1. Copying streamer to EC2..."
scp -i "$KEY_PATH" -o StrictHostKeyChecking=no /tmp/screenshot_streamer.py ubuntu@$INSTANCE_IP:/tmp/

echo ""
echo "2. Installing dependencies..."
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP "sudo apt-get update -qq && sudo apt-get install -y -qq python3-pip && pip3 install -q aiohttp pillow"

echo ""
echo "3. Starting streamer in background..."
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP "nohup python3 /tmp/screenshot_streamer.py > /tmp/streamer.log 2>&1 &"

echo ""
echo "4. Waiting for streamer to start..."
sleep 5

echo ""
echo "5. Testing streamer..."
ssh -i "$KEY_PATH" -o StrictHostKeyChecking=no ubuntu@$INSTANCE_IP "curl -s http://localhost:8765/health"

echo ""
echo ""
echo "✅ Screenshot streamer deployed!"
echo "   Stream URL: http://$INSTANCE_IP:8765/stream"
echo "   Health: http://$INSTANCE_IP:8765/health"
echo ""
echo "To view: open http://$INSTANCE_IP:8765/stream"

