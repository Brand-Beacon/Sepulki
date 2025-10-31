# Quick Start: Video Stream Proxy

Get the Isaac Sim video stream running in your frontend in 5 minutes.

## Prerequisites

- Node.js 20+ installed
- Isaac Sim running on AWS EC2 (IP: 18.234.83.45)
- Access to ports 8889 (proxy) and 3000 (frontend)

## 5-Minute Setup

### 1. Install Dependencies (1 minute)

```bash
cd services/video-stream-proxy
npm install
```

### 2. Start Video Proxy (30 seconds)

```bash
./scripts/start-video-proxy.sh
```

You should see:
```
╔════════════════════════════════════════════════════════════════╗
║           📹 Video Stream Proxy Server Started                ║
║  Port: 8889  Isaac Sim IP: 18.234.83.45                      ║
╚════════════════════════════════════════════════════════════════╝
```

### 3. Test Proxy (30 seconds)

```bash
# Health check
curl http://localhost:8889/health

# Create test session
curl -X POST http://localhost:8889/session/create \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","robotName":"demo"}'
```

### 4. Start Frontend (1 minute)

```bash
cd apps/forge-ui
npm run dev
```

### 5. View Stream (30 seconds)

Open browser:
```
http://localhost:3000/configure
```

You should see the Isaac Sim stream!

---

## Verify It's Working

### ✅ Checklist

- [ ] Video proxy health endpoint returns 200 OK
- [ ] Session creation succeeds
- [ ] Frontend loads without errors
- [ ] Isaac Sim display component visible
- [ ] Status HUD shows "Streaming"

### 🔍 Troubleshooting

**Proxy won't start?**
```bash
# Kill existing process on port 8889
kill -9 $(lsof -t -i:8889)
./scripts/start-video-proxy.sh
```

**Can't see stream?**
```bash
# Check Isaac Sim is accessible
curl http://18.234.83.45:8211/ping

# Check proxy logs
tail -f /tmp/video-proxy.log

# Try direct embed URL
open "http://localhost:8889/stream/{sessionId}/embed"
```

**Frontend errors?**
```bash
# Check browser console for errors
# Verify proxy URL in environment
cat apps/forge-ui/.env.local | grep VIDEO_PROXY
```

---

## Test Commands

```bash
# Test proxy health
curl http://localhost:8889/health | jq .

# Create session
curl -X POST http://localhost:8889/session/create \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","robotName":"demo"}' | jq .

# Get session info (replace SESSION_ID)
curl http://localhost:8889/session/SESSION_ID | jq .

# Destroy session
curl -X POST http://localhost:8889/session/SESSION_ID/destroy | jq .

# View embed page
open http://localhost:8889/stream/SESSION_ID/embed

# View MJPEG stream
open http://localhost:8889/stream/SESSION_ID/mjpeg
```

---

## Running Tests

```bash
cd apps/forge-ui
npx playwright test tests/video-proxy-integration.spec.ts
```

Expected: 6/8 tests passing (2 require frontend)

---

## Common URLs

| Service | URL |
|---------|-----|
| Video Proxy Health | http://localhost:8889/health |
| Frontend | http://localhost:3000/configure |
| Isaac Sim (Direct) | http://18.234.83.45:8211 |

---

## Architecture at a Glance

```
Browser → Proxy (localhost:8889) → Isaac Sim (18.234.83.45:8211)
```

**Why a proxy?**
- Handles CORS
- Manages sessions
- Supports multiple clients
- Provides fallback streaming modes

---

## Next Steps

1. **Customize**: Edit `services/video-stream-proxy/.env` for your setup
2. **Deploy**: See `VIDEO_PROXY_SETUP.md` for production deployment
3. **Integrate**: Use `IsaacSimProxyDisplay` component in your pages
4. **Scale**: Add load balancing and multiple Isaac Sim instances

---

## Need Help?

- **Setup Guide**: `VIDEO_PROXY_SETUP.md`
- **API Docs**: `services/video-stream-proxy/README.md`
- **Full Report**: `VIDEO_PROXY_IMPLEMENTATION_COMPLETE.md`
- **Logs**: `tail -f /tmp/video-proxy.log`

---

**🚀 You're all set! The video stream should now be working.**





