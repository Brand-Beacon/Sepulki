# Video Stream Proxy

Custom video streaming proxy for Isaac Sim WebRTC integration. This service bridges the connection between the frontend application and Isaac Sim running on AWS EC2.

## Features

- **WebSocket Proxy**: Proxies WebSocket connections between frontend and Isaac Sim
- **Session Management**: Creates and manages streaming sessions
- **MJPEG Streaming**: HTTP fallback for video streaming
- **Embed Support**: Provides embeddable HTML pages for Isaac Sim streams
- **Health Monitoring**: Built-in health check endpoints
- **Auto-Cleanup**: Automatically removes inactive sessions

## Architecture

```
Frontend (Next.js) → Video Proxy (Node.js) → Isaac Sim (AWS EC2)
   localhost:3000      localhost:8889         18.234.83.45:8211
```

## Installation

```bash
cd services/video-stream-proxy
npm install
```

## Configuration

Create a `.env` file:

```env
VIDEO_PROXY_PORT=8889
ISAAC_SIM_IP=18.234.83.45
ISAAC_SIM_PORT=8211
ISAAC_SIM_WS_PORT=8211
```

## Usage

### Development

```bash
npm run dev
```

### Production

```bash
npm run build
npm start
```

## API Endpoints

### REST API

#### POST `/session/create`
Create a new streaming session.

**Request:**
```json
{
  "userId": "user123",
  "robotName": "demo-robot"
}
```

**Response:**
```json
{
  "success": true,
  "sessionId": "stream_1234567890_abc123",
  "wsUrl": "ws://localhost:8889/stream/stream_1234567890_abc123",
  "httpStreamUrl": "http://localhost:8889/stream/stream_1234567890_abc123/mjpeg",
  "message": "Streaming session created"
}
```

#### GET `/session/:sessionId`
Get session information.

**Response:**
```json
{
  "success": true,
  "session": {
    "id": "stream_1234567890_abc123",
    "userId": "user123",
    "robotName": "demo-robot",
    "createdAt": "2025-10-17T...",
    "lastActivity": "2025-10-17T...",
    "connections": 1,
    "isIsaacSimConnected": true
  }
}
```

#### POST `/session/:sessionId/destroy`
Destroy a streaming session.

**Response:**
```json
{
  "success": true,
  "message": "Session destroyed"
}
```

#### GET `/health`
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "service": "video-stream-proxy",
  "version": "1.0.0",
  "isaac_sim_ip": "18.234.83.45",
  "isaac_sim_port": "8211",
  "active_sessions": 2,
  "timestamp": "2025-10-17T..."
}
```

### Streaming Endpoints

#### GET `/stream/:sessionId/mjpeg`
MJPEG video stream (HTTP).

Returns a multipart/x-mixed-replace stream.

#### GET `/stream/:sessionId/embed`
Embeddable HTML page with Isaac Sim stream.

Returns an HTML page that connects to Isaac Sim via WebSocket.

### WebSocket API

#### WS `/stream/:sessionId`
WebSocket connection for real-time video streaming.

**Messages from server:**
```json
{
  "type": "status",
  "message": "✅ Connected to video stream proxy"
}
```

```json
{
  "type": "frame",
  "data": "base64_encoded_frame_data"
}
```

```json
{
  "type": "error",
  "message": "Error description"
}
```

## Integration with Frontend

### Using WebSocket

```typescript
const sessionResponse = await fetch('http://localhost:8889/session/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    userId: 'user123',
    robotName: 'demo-robot'
  })
});

const { sessionId, wsUrl } = await sessionResponse.json();

const ws = new WebSocket(wsUrl);

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  
  if (data.type === 'frame') {
    // Display video frame
  } else if (data.type === 'status') {
    console.log(data.message);
  }
};
```

### Using Embed

```tsx
<iframe
  src={`http://localhost:8889/stream/${sessionId}/embed`}
  width="1280"
  height="720"
  frameBorder="0"
  allow="autoplay; fullscreen"
/>
```

### Using MJPEG

```tsx
<img 
  src={`http://localhost:8889/stream/${sessionId}/mjpeg`}
  alt="Isaac Sim Stream"
/>
```

## Troubleshooting

### Connection Issues

1. **Check Isaac Sim Status**
   ```bash
   curl http://18.234.83.45:8211/ping
   ```

2. **Check Proxy Status**
   ```bash
   curl http://localhost:8889/health
   ```

3. **Check Firewall Rules**
   - Ensure port 8889 is open on your local machine
   - Ensure ports 8211 and WebSocket port are open on AWS EC2

### Debug Logging

The proxy logs all connections and errors to console:

```
🔌 Client connected to session: stream_1234567890_abc123
✅ Connected to Isaac Sim for session: stream_1234567890_abc123
📹 Received frame from proxy
```

## License

MIT





