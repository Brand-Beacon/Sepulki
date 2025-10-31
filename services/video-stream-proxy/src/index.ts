import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Configuration
const PORT = process.env.VIDEO_PROXY_PORT || 8889;
const ISAAC_SIM_IP = process.env.ISAAC_SIM_IP || '18.232.113.137'; // g5.2xlarge - 32GB RAM
const ISAAC_SIM_PORT = process.env.ISAAC_SIM_PORT || '8211';
const ISAAC_SIM_WS_PORT = process.env.ISAAC_SIM_WS_PORT || '8211';
const ISAAC_STREAM_PORT = process.env.ISAAC_STREAM_PORT || '8765'; // Screenshot streamer port

// Enable CORS for all routes
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Session management
interface StreamSession {
  id: string;
  userId: string;
  robotName?: string;
  createdAt: Date;
  lastActivity: Date;
  wsConnections: Set<WebSocket>;
  isaacSimWs?: WebSocket;
}

const sessions = new Map<string, StreamSession>();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'video-stream-proxy',
    version: '1.0.0',
    isaac_sim_ip: ISAAC_SIM_IP,
    isaac_sim_port: ISAAC_SIM_PORT,
    active_sessions: sessions.size,
    timestamp: new Date().toISOString()
  });
});

// Create streaming session
app.post('/session/create', async (req, res) => {
  try {
    const { userId, robotName, robotId } = req.body;
    
    // Generate session ID - reuse if robotId provided (persistent session per robot)
    let sessionId: string;
    if (robotId) {
      // Try to reuse existing session for this robot
      const existingSession = Array.from(sessions.values()).find(
        s => s.robotName === robotName || (req.body.robotId && s.id.includes(`robot_${robotId}`))
      );
      
      if (existingSession && existingSession.wsConnections.size < 10) {
        sessionId = existingSession.id;
        console.log(`♻️ Reusing existing session: ${sessionId} for robot: ${robotId}`);
      } else {
        sessionId = `robot_${robotId}_${Date.now()}`;
      }
    } else {
      sessionId = `stream_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    console.log(`📹 Creating streaming session: ${sessionId} for user: ${userId}, robot: ${robotName || robotId}`);

    // Check if Isaac Sim is accessible
    try {
      const healthCheck = await axios.get(`http://${ISAAC_SIM_IP}:${ISAAC_SIM_PORT}/ping`, {
        timeout: 5000
      });
      console.log(`✅ Isaac Sim health check passed:`, healthCheck.data);
    } catch (error) {
      console.warn(`⚠️ Isaac Sim health check failed, proceeding anyway:`, (error as Error).message);
    }

    // Update or create session
    if (sessions.has(sessionId)) {
      const existingSession = sessions.get(sessionId)!;
      existingSession.lastActivity = new Date();
      if (userId) existingSession.userId = userId;
      if (robotName) existingSession.robotName = robotName;
    } else {
      const session: StreamSession = {
        id: sessionId,
        userId: userId || 'anonymous',
        robotName: robotName || `robot_${robotId}` || 'default',
        createdAt: new Date(),
        lastActivity: new Date(),
        wsConnections: new Set()
      };
      sessions.set(sessionId, session);
    }

    console.log(`✅ Session created/updated: ${sessionId}`);

    res.json({
      success: true,
      sessionId,
      wsUrl: `ws://localhost:${PORT}/stream/${sessionId}`,
      httpStreamUrl: `http://localhost:${PORT}/stream/${sessionId}/mjpeg`,
      embedUrl: `http://localhost:${PORT}/stream/${sessionId}/embed`,
      message: 'Streaming session created'
    });
  } catch (error) {
    console.error('❌ Failed to create session:', error);
    res.status(500).json({
      success: false,
      error: (error as Error).message
    });
  }
});

// Get session info
app.get('/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }

  res.json({
    success: true,
    session: {
      id: session.id,
      userId: session.userId,
      robotName: session.robotName,
      createdAt: session.createdAt,
      lastActivity: session.lastActivity,
      connections: session.wsConnections.size,
      isIsaacSimConnected: !!session.isaacSimWs
    }
  });
});

// Destroy session
app.post('/session/:sessionId/destroy', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Session not found'
    });
  }

  console.log(`🗑️ Destroying session: ${sessionId}`);

  // Close all WebSocket connections
  session.wsConnections.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  });

  // Close Isaac Sim WebSocket if connected
  if (session.isaacSimWs && session.isaacSimWs.readyState === WebSocket.OPEN) {
    session.isaacSimWs.close();
  }

  sessions.delete(sessionId);

  res.json({
    success: true,
    message: 'Session destroyed'
  });
});

// MJPEG streaming endpoint (HTTP fallback) - Proxy to Isaac screenshot streamer
app.get('/stream/:sessionId/mjpeg', async (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).json({
      error: 'Session not found'
    });
  }

  console.log(`📹 Proxying MJPEG stream from Isaac screenshot streamer for session: ${sessionId}`);

  try {
    // Forward request to Isaac screenshot streamer
    const streamUrl = `http://${ISAAC_SIM_IP}:${ISAAC_STREAM_PORT}/stream`;
    const response = await axios.get(streamUrl, {
      responseType: 'stream',
      timeout: 30000
    });

    // Set appropriate headers
    res.writeHead(200, {
      'Content-Type': response.headers['content-type'] || 'multipart/x-mixed-replace; boundary=frame',
      'Cache-Control': 'no-cache',
      'Connection': 'close',
      'Access-Control-Allow-Origin': '*'
    });

    // Pipe the stream
    response.data.pipe(res);

    response.data.on('end', () => {
      console.log(`📹 MJPEG stream ended for session: ${sessionId}`);
    });

    response.data.on('error', (error: any) => {
      console.error(`❌ Stream error for session ${sessionId}:`, error.message);
    });

    req.on('close', () => {
      response.data.destroy();
      console.log(`📹 Client disconnected from MJPEG stream: ${sessionId}`);
    });

  } catch (error) {
    console.error(`❌ Failed to connect to Isaac screenshot streamer:`, (error as Error).message);
    res.status(500).json({ error: 'Stream unavailable' });
  }
});

// Serve custom WebSocket client HTML
app.get('/websocket-client', (req, res) => {
  const fs = require('fs');
  const path = require('path');
  const htmlPath = path.join(__dirname, 'websocket-client.html');
  
  fs.readFile(htmlPath, 'utf8', (err: any, data: string) => {
    if (err) {
      res.status(500).send('Error loading client');
      return;
    }
    res.send(data);
  });
});

// Proxy streaming endpoint (iframe embedding) - Custom WebSocket client
app.get('/stream/:sessionId/embed', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).send('Session not found');
  }

  // Check if this is a robot-specific stream
  const isRobotStream = sessionId.startsWith('robot_');
  const robotName = session.robotName || 'Robot';
  
  // Redirect to Isaac Sim screenshot stream (working solution)
  const streamUrl = `http://${ISAAC_SIM_IP}:${ISAAC_STREAM_PORT}/stream`;
  
  // Create an HTML wrapper for the MJPEG stream with connection status
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>${robotName} Stream - Sepulki</title>
  <style>
    body { 
      margin: 0; 
      padding: 0; 
      background: #000; 
      overflow: hidden; 
      font-family: Arial, sans-serif;
    }
    img { 
      width: 100%; 
      height: 100vh; 
      object-fit: contain; 
      display: block; 
    }
    #status {
      position: absolute;
      top: 10px;
      left: 10px;
      background: rgba(0, 0, 0, 0.7);
      color: #0f0;
      padding: 8px 16px;
      border-radius: 4px;
      font-size: 12px;
      z-index: 1000;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    #status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #0f0;
      animation: pulse 2s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
  </style>
</head>
<body>
  <div id="status">
    <div id="status-indicator"></div>
    <span>LIVE - ${robotName}</span>
  </div>
  <img src="${streamUrl}" alt="${robotName} Live Stream" onerror="document.getElementById('status').innerHTML='<span style=\\"color:#f00;\\">❌ Stream Unavailable</span>'"/>
</body>
</html>
  `;
  
  res.send(html);
});

// Alternative: Direct embed with our own wrapper
app.get('/stream/:sessionId/embed-wrapper', (req, res) => {
  const { sessionId } = req.params;
  const session = sessions.get(sessionId);

  if (!session) {
    return res.status(404).send('Session not found');
  }

  // Generate HTML page that embeds the Omniverse WebRTC client
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Isaac Sim Stream - ${sessionId}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background: #000;
      overflow: hidden;
      font-family: Arial, sans-serif;
    }
    #stream-container {
      width: 100vw;
      height: 100vh;
    }
    #omniverse-client {
      width: 100%;
      height: 100%;
      border: none;
    }
    #status {
      position: absolute;
      top: 20px;
      left: 20px;
      background: rgba(0, 0, 0, 0.8);
      color: #0f0;
      padding: 10px 20px;
      border-radius: 5px;
      font-family: monospace;
      z-index: 1000;
    }
  </style>
</head>
<body>
  <div id="status">✅ Loading Omniverse WebRTC Client...</div>
  <div id="stream-container">
    <iframe 
      id="omniverse-client"
      src="http://${ISAAC_SIM_IP}:8889/?server=${ISAAC_SIM_IP}"
      allow="camera; microphone; autoplay; fullscreen"
    ></iframe>
  </div>

  <script>
    const statusEl = document.getElementById('status');
    const iframe = document.getElementById('omniverse-client');
    
    iframe.onload = () => {
      statusEl.textContent = '✅ Omniverse WebRTC Client Loaded';
      setTimeout(() => {
        statusEl.style.display = 'none';
      }, 3000);
    };
    
    iframe.onerror = () => {
      statusEl.textContent = '❌ Failed to load Omniverse client';
      statusEl.style.color = '#f00';
    };
  </script>
</body>
</html>
  `;

  res.send(html);
});

// WebSocket proxy handler
wss.on('connection', (ws, req) => {
  const pathMatch = req.url?.match(/\/stream\/([^/]+)/);
  
  if (!pathMatch) {
    console.error('❌ Invalid WebSocket path:', req.url);
    ws.close();
    return;
  }

  const sessionId = pathMatch[1];
  const session = sessions.get(sessionId);

  if (!session) {
    console.error('❌ Session not found:', sessionId);
    ws.send(JSON.stringify({ 
      type: 'error', 
      message: 'Session not found' 
    }));
    ws.close();
    return;
  }

  console.log(`🔌 Client connected to session: ${sessionId}`);
  
  // Add connection to session
  session.wsConnections.add(ws);
  session.lastActivity = new Date();

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'status',
    message: '✅ Connected to video stream proxy'
  }));

  // Connect to Isaac Sim WebSocket if not already connected
  if (!session.isaacSimWs || session.isaacSimWs.readyState !== WebSocket.OPEN) {
    connectToIsaacSim(session);
  }

  // Handle messages from client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log('📨 Received from client:', data.type);

      // Forward control messages to Isaac Sim
      if (session.isaacSimWs && session.isaacSimWs.readyState === WebSocket.OPEN) {
        session.isaacSimWs.send(message);
      }
    } catch (error) {
      console.error('❌ Error processing client message:', error);
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log(`🔌 Client disconnected from session: ${sessionId}`);
    session.wsConnections.delete(ws);

    // Close Isaac Sim connection if no more clients
    if (session.wsConnections.size === 0 && session.isaacSimWs) {
      console.log(`🔌 No more clients, closing Isaac Sim connection for session: ${sessionId}`);
      session.isaacSimWs.close();
      session.isaacSimWs = undefined;
    }
  });

  ws.on('error', (error) => {
    console.error('❌ Client WebSocket error:', error);
  });
});

// Connect to Isaac Sim WebSocket
function connectToIsaacSim(session: StreamSession) {
  console.log(`🔌 Connecting to Isaac Sim for session: ${session.id}`);

  try {
    // Connect to Isaac Sim WebSocket
    const isaacWsUrl = `ws://${ISAAC_SIM_IP}:${ISAAC_SIM_WS_PORT}/streaming/webrtc`;
    console.log(`🔌 Isaac Sim WebSocket URL: ${isaacWsUrl}`);

    const isaacWs = new WebSocket(isaacWsUrl);
    session.isaacSimWs = isaacWs;

    isaacWs.on('open', () => {
      console.log(`✅ Connected to Isaac Sim for session: ${session.id}`);
      
      // Broadcast connection status to all clients
      session.wsConnections.forEach(clientWs => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'status',
            message: '✅ Connected to Isaac Sim'
          }));
        }
      });
    });

    isaacWs.on('message', (data) => {
      // Forward video frames to all connected clients
      session.wsConnections.forEach(clientWs => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(data);
        }
      });
    });

    isaacWs.on('error', (error) => {
      console.error(`❌ Isaac Sim WebSocket error for session ${session.id}:`, error.message);
      
      // Notify clients
      session.wsConnections.forEach(clientWs => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'error',
            message: 'Isaac Sim connection error'
          }));
        }
      });
    });

    isaacWs.on('close', () => {
      console.log(`🔌 Isaac Sim WebSocket closed for session: ${session.id}`);
      session.isaacSimWs = undefined;

      // Notify clients
      session.wsConnections.forEach(clientWs => {
        if (clientWs.readyState === WebSocket.OPEN) {
          clientWs.send(JSON.stringify({
            type: 'status',
            message: '🔌 Disconnected from Isaac Sim'
          }));
        }
      });
    });
  } catch (error) {
    console.error(`❌ Failed to connect to Isaac Sim for session ${session.id}:`, error);
  }
}

// Cleanup old sessions periodically
setInterval(() => {
  const now = new Date();
  sessions.forEach((session, sessionId) => {
    const inactiveTime = now.getTime() - session.lastActivity.getTime();
    
    // Remove sessions inactive for more than 1 hour
    if (inactiveTime > 60 * 60 * 1000) {
      console.log(`🗑️ Removing inactive session: ${sessionId}`);
      
      session.wsConnections.forEach(ws => ws.close());
      if (session.isaacSimWs) {
        session.isaacSimWs.close();
      }
      
      sessions.delete(sessionId);
    }
  });
}, 5 * 60 * 1000); // Check every 5 minutes

// Start server
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║           📹 Video Stream Proxy Server Started                ║
║                                                                ║
║  Port:           ${PORT}                                      ║
║  Isaac Sim IP:   ${ISAAC_SIM_IP}                             ║
║  Isaac Sim Port: ${ISAAC_SIM_PORT}                           ║
║                                                                ║
║  Endpoints:                                                    ║
║  • POST   /session/create                                      ║
║  • GET    /session/:id                                         ║
║  • POST   /session/:id/destroy                                 ║
║  • GET    /stream/:id/mjpeg                                    ║
║  • GET    /stream/:id/embed                                    ║
║  • WS     /stream/:id                                          ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down video stream proxy...');
  
  // Close all sessions
  sessions.forEach((session, sessionId) => {
    console.log(`🔌 Closing session: ${sessionId}`);
    session.wsConnections.forEach(ws => ws.close());
    if (session.isaacSimWs) {
      session.isaacSimWs.close();
    }
  });

  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

