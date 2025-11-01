#!/usr/bin/env python3
"""
Isaac Sim Screenshot-based Streaming
Since WebRTC/WebSocket streaming is broken in Isaac Sim 2023.1.1,
this creates a functional video stream using Isaac Sim's screenshot API.
"""

import asyncio
import base64
import json
from aiohttp import web
from datetime import datetime
import io

# Isaac Sim imports
try:
    from omni.isaac.kit import SimulationApp
    simulation_app = SimulationApp({"headless": True})
    
    import omni
    import omni.kit.viewport.utility as vp_util
    from PIL import Image
    import numpy as np
    
    ISAAC_SIM_AVAILABLE = True
    print("✅ Isaac Sim initialized for screenshot streaming")
except Exception as e:
    print(f"❌ Isaac Sim not available: {e}")
    ISAAC_SIM_AVAILABLE = False


class IsaacScreenshotStreamer:
    def __init__(self):
        self.active_streams = {}
        self.fps = 30
        
    async def capture_frame(self):
        """Capture a frame from Isaac Sim using screenshot API."""
        if not ISAAC_SIM_AVAILABLE:
            # Return black frame
            return self.generate_test_frame()
            
        try:
            # Get viewport
            viewport = vp_util.get_active_viewport()
            if not viewport:
                return self.generate_test_frame()
                
            # Capture screenshot
            screenshot = viewport.schedule_capture()
            
            # Wait for capture
            await asyncio.sleep(0.01)
            
            # Get image data
            img_data = screenshot.get_image_data()
            
            if img_data:
                # Convert to JPEG
                img = Image.fromarray(np.array(img_data))
                buffer = io.BytesIO()
                img.save(buffer, format='JPEG', quality=85)
                return buffer.getvalue()
        except Exception as e:
            print(f"❌ Screenshot capture error: {e}")
            
        return self.generate_test_frame()
    
    def generate_test_frame(self):
        """Generate a test frame when Isaac Sim not available."""
        img = Image.new('RGB', (1280, 720), color=(20, 20, 30))
        from PIL import ImageDraw, ImageFont
        draw = ImageDraw.Draw(img)
        
        text = f"Isaac Sim Screenshot Stream\n{datetime.now().strftime('%H:%M:%S')}"
        draw.text((640, 360), text, fill=(0, 255, 0), anchor="mm")
        
        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=85)
        return buffer.getvalue()
    
    async def stream_handler(self, request):
        """Handle MJPEG streaming."""
        response = web.StreamResponse()
        response.content_type = 'multipart/x-mixed-replace; boundary=frame'
        await response.prepare(request)
        
        frame_count = 0
        
        try:
            while True:
                frame = await self.capture_frame()
                
                # Send frame
                await response.write(b'--frame\r\n')
                await response.write(b'Content-Type: image/jpeg\r\n')
                await response.write(f'Content-Length: {len(frame)}\r\n\r\n'.encode())
                await response.write(frame)
                await response.write(b'\r\n')
                
                frame_count += 1
                if frame_count % 30 == 0:
                    print(f"📹 Streaming frame {frame_count}")
                
                await asyncio.sleep(1 / self.fps)
                
        except asyncio.CancelledError:
            print(f"Stream ended after {frame_count} frames")
        
        return response

async def init_app():
    app = web.Application()
    streamer = IsaacScreenshotStreamer()
    
    async def health(request):
        return web.json_response({
            'status': 'healthy',
            'isaac_sim': ISAAC_SIM_AVAILABLE,
            'streaming_mode': 'screenshot'
        })
    
    app.router.add_get('/health', health)
    app.router.add_get('/stream', streamer.stream_handler)
    
    return app

if __name__ == '__main__':
    app = asyncio.run(init_app())
    web.run_app(app, host='0.0.0.0', port=8002)





