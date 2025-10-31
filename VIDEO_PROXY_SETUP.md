# Video Stream Proxy Setup Guide

This guide explains how to set up and use the custom video streaming proxy for Isaac Sim integration.

## Architecture

The video streaming proxy acts as a bridge between the frontend application and Isaac Sim running on AWS EC2:

```
┌─────────────┐         ┌──────────────┐         ┌────────────────┐
│   Frontend  │  HTTP   │ Video Proxy  │   WS    │   Isaac Sim    │
│  Next.js    │◄───────►│   Node.js    │◄───────►│   AWS EC2      │
│ localhost:  │         │ localhost:   │         │ 18.234.83.45:  │
│    3000     │         │    8889      │         │     8211       │
└─────────────┘         └──────────────┘         └────────────────┘
```

### Why a Custom Proxy?

1. **CORS Handling**: Avoids cross-origin issues when connecting to Isaac Sim
2. **Session Management**: Manages multiple streaming sessions
3. **Connection Pooling**: Reuses WebSocket connections efficiently
4. **Fallback Options**: Supports both WebSocket and MJPEG streaming
5. **Error Recovery**: Handles disconnections and reconnects automatically

## Installation

### 1. Install Dependencies

```bash
cd services/video-stream-proxy
npm install
```

### 2. Configure Environment

The `.env` file should already be created with these settings:

```env
VIDEO_PROXY_PORT=8889
ISAAC_SIM_IP=18.234.83.45
ISAAC_SIM_PORT=8211
ISAAC_SIM_WS_PORT=8211
```

### 3. Start the Proxy

**Option A: Using the convenience script**
```bash
./scripts/start-video-proxy.sh
```

**Option B: Direct npm command**
```bash
cd services/video-stream-proxy
npm run dev
```

## Usage

### 1. Start the Video Proxy

```bash
./scripts/start-video-proxy.sh
```

You should see:
```
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║           📹 Video Stream Proxy Server Started                ║
║                                                                ║
║  Port:           8889                                          ║
║  Isaac Sim IP:   18.234.83.45                                 ║
║  Isaac Sim Port: 8211                                         ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
```

### 2. Start the Frontend

In a separate terminal:
```bash
cd apps/forge-ui
npm run dev
```

### 3. View the Stream

Navigate to the configure page in your browser:
```
http://localhost:3000/configure
```

The page will now use the `IsaacSimProxyDisplay` component which connects through the video proxy.

## Testing

### Test Proxy Health

```bash
curl http://localhost:8889/health
```

Expected response:
```json
{
  "status": "healthy",
  "service": "video-stream-proxy",
  "version": "1.0.0",
  "isaac_sim_ip": "18.234.83.45",
  "isaac_sim_port": "8211",
  "active_sessions": 0,
  "timestamp": "2025-10-17T..."
}
```

### Create a Test Session

```bash
curl -X POST http://localhost:8889/session/create \
  -H "Content-Type: application/json" \
  -d '{"userId": "test-user", "robotName": "test-robot"}'
```

Expected response:
```json
{
  "success": true,
  "sessionId": "stream_1234567890_abc123",
  "wsUrl": "ws://localhost:8889/stream/stream_1234567890_abc123",
  "httpStreamUrl": "http://localhost:8889/stream/stream_1234567890_abc123/mjpeg",
  "message": "Streaming session created"
}
```

### Test MJPEG Stream

Open in browser:
```
http://localhost:8889/stream/stream_1234567890_abc123/mjpeg
```

### Test Embed Page

Open in browser:
```
http://localhost:8889/stream/stream_1234567890_abc123/embed
```

## Frontend Integration

### Option 1: Using IsaacSimProxyDisplay Component

```tsx
import { IsaacSimProxyDisplay } from '@/components/IsaacSimProxyDisplay'

export default function ConfigurePage() {
  return (
    <IsaacSimProxyDisplay
      robotName="demo-robot"
      userId="user123"
      environment="warehouse"
      qualityProfile="engineering"
      enablePhysics={true}
      className="w-full h-[600px]"
    />
  )
}
```

### Option 2: Direct API Usage

```tsx
// Create session
const response = await fetch('http://localhost:8889/session/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    robotName: 'demo-robot'
  })
})

const { sessionId, httpStreamUrl } = await response.json()

// Display stream
<img src={httpStreamUrl} alt="Isaac Sim Stream" />
```

## Troubleshooting

### Proxy Won't Start

**Error: Port 8889 already in use**
```bash
# Find process using port
lsof -i :8889

# Kill process
kill -9 <PID>

# Or use a different port in .env
VIDEO_PROXY_PORT=8890
```

### Can't Connect to Isaac Sim

**Check Isaac Sim Status**
```bash
curl http://18.234.83.45:8211/ping
```

If this fails:
1. Check AWS EC2 instance is running
2. Verify security group allows inbound traffic on port 8211
3. Ensure Isaac Sim Docker container is running on EC2

**Check Proxy Logs**
The proxy logs all connections and errors. Look for:
```
🔌 Connecting to Isaac Sim for session: stream_xxx
❌ Isaac Sim WebSocket error: <error message>
```

### Stream Not Displaying

**Check Browser Console**
Look for errors related to:
- CORS issues
- WebSocket connection failures
- iframe loading problems

**Try Different Stream Modes**
The proxy supports multiple streaming modes:
- `embed`: iframe with WebRTC client (default)
- `mjpeg`: HTTP MJPEG stream (fallback)

Switch modes using the control panel in the UI.

### Session Not Found

Sessions are automatically cleaned up after 1 hour of inactivity. Create a new session:

```bash
curl -X POST http://localhost:8889/session/create \
  -H "Content-Type: application/json" \
  -d '{"userId": "user123", "robotName": "demo-robot"}'
```

## Production Deployment

### Using Docker

```bash
cd services/video-stream-proxy
docker build -t video-stream-proxy .
docker run -d \
  -p 8889:8889 \
  -e ISAAC_SIM_IP=18.234.83.45 \
  -e ISAAC_SIM_PORT=8211 \
  --name video-proxy \
  video-stream-proxy
```

### Environment Variables for Production

```env
VIDEO_PROXY_PORT=8889
ISAAC_SIM_IP=<your-isaac-sim-ip>
ISAAC_SIM_PORT=8211
ISAAC_SIM_WS_PORT=8211
NODE_ENV=production
```

### Reverse Proxy Configuration (nginx)

```nginx
server {
    listen 80;
    server_name proxy.yourdomain.com;

    location / {
        proxy_pass http://localhost:8889;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## API Reference

See [services/video-stream-proxy/README.md](services/video-stream-proxy/README.md) for complete API documentation.

## Architecture Diagrams

### Session Lifecycle

```
┌────────────┐
│   Create   │
│  Session   │
└─────┬──────┘
      │
      ▼
┌────────────┐     ┌──────────────┐
│  Connect   │────►│  Isaac Sim   │
│  WebSocket │     │   WebSocket  │
└─────┬──────┘     └──────┬───────┘
      │                   │
      ▼                   ▼
┌────────────┐     ┌──────────────┐
│   Stream   │◄────│  Video Data  │
│   Frames   │     │   Received   │
└─────┬──────┘     └──────────────┘
      │
      ▼
┌────────────┐
│  Destroy   │
│  Session   │
└────────────┘
```

### Data Flow

```
Frontend                 Proxy                   Isaac Sim
   │                      │                         │
   │──── POST /create ───►│                         │
   │◄─── sessionId ───────│                         │
   │                      │                         │
   │──── WS connect ─────►│                         │
   │                      │──── WS connect ────────►│
   │                      │◄─── frame data ─────────│
   │◄─── frame data ──────│                         │
   │                      │                         │
   │──── POST /destroy ──►│                         │
   │                      │──── WS close ──────────►│
```

## Next Steps

1. **Test with Real Isaac Sim**: Ensure Isaac Sim is running on AWS EC2
2. **Monitor Performance**: Check frame rates and latency
3. **Add Authentication**: Implement user authentication for production
4. **Scale Horizontally**: Deploy multiple proxy instances for load balancing
5. **Add Recording**: Implement session recording for playback

## Support

For issues or questions:
- Check logs: `npm run dev` output
- Review API docs: [services/video-stream-proxy/README.md](services/video-stream-proxy/README.md)
- Test Isaac Sim directly: http://18.234.83.45:8211/

## License

MIT





