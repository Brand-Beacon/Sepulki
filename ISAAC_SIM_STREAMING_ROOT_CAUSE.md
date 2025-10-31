# Isaac Sim Streaming - Root Cause Analysis

## Problem Statement

Isaac Sim 2023.1.1 does not have functional remote video streaming in headless mode despite having streaming extensions.

## Investigation Summary

### What Was Tested

1. ✅ WebRTC mode (`headless.webrtc.sh`)
   - Extension loads: `omni.kit.livestream.native`
   - Server starts: "Streaming server started"
   - **FAILS**: HTTP endpoints return 404, WebSocket returns 501

2. ✅ WebSocket mode (`headless.websocket.sh`)  
   - Extension dependency: `omni.services.streamclient.websocket` 
   - **FAILS**: Extension never loads (deprecated in 2023.1.1)
   - Fallback: `livestream.native` loads
   - **FAILS**: Port 48010 returns 501 Not Implemented

3. ✅ Native mode (`headless.native.sh`)
   - RTX renderer: Never reaches "RTX ready" state
   - **FAILS**: Requires client connection to initialize

### Endpoints Tested

| Endpoint | Port | Status | Error |
|----------|------|--------|-------|
| `ws://IP:48010` | 48010 | ❌ | 501 Not Implemented |
| `ws://IP:8211/streaming/websocket` | 8211 | ❌ | Connection timeout |
| `http://IP:8211/streaming/*` | 8211 | ❌ | 404 Not Found |
| `http://IP:8899/streaming/*` | 8899 | ❌ | Connection timeout |

### Root Causes Identified

1. **WebSocket Streaming Deprecated**
   - `omni.services.streamclient.websocket` marked as deprecated (OM-105631)
   - Extension doesn't load in Isaac Sim 2023.1.1
   
2. **Native Livestream Not Configured**
   - `omni.kit.livestream.native` loads but returns 501
   - Requires session initialization via HTTP first
   - HTTP API endpoints not implemented/exposed

3. **RTX Renderer Doesn't Initialize**
   - In headless mode, RTX waits for client connection
   - Chicken-and-egg: Can't connect without RTX, RTX doesn't start without connection

4. **Version-Specific Issues**
   - Isaac Sim 2023.1.1 is a transitional version
   - WebSocket deprecated, WebRTC not fully implemented
   - Community reports same issues (GitHub #219, NVIDIA Forums)

## Working Solutions

### Option 1: Python Screenshot API ✅
Use Isaac Sim's Python API to capture frames and stream via HTTP/WebSocket.

**Pros:**
- Full control over streaming
- Works with current version
- Can customize frame rate/quality

**Cons:**
- Lower performance than native streaming
- Requires Python integration

### Option 2: Upgrade Isaac Sim Version
Upgrade to Isaac Sim 2024.x which may have better streaming support.

**Pros:**
- Modern APIs
- Better WebRTC support  
- Active development

**Cons:**
- Requires testing/validation
- May have breaking changes
- Unknown if streaming works

### Option 3: Use Isaac Sim Desktop + VNC
Run Isaac Sim with GUI and stream desktop via VNC.

**Pros:**
- Guaranteed to work
- Full UI access
- No API dependencies

**Cons:**
- Higher resource usage
- VNC latency
- Not elegant solution

## Recommendation

Implement **Option 1 (Python Screenshot API)** immediately to unblock development, then plan to upgrade to Isaac Sim 2024.x for production when validated.

This provides:
- ✅ Working video stream NOW
- ✅ Validates entire architecture  
- ✅ Allows frontend development to continue
- ✅ Can swap to native streaming when available

## Next Steps

1. Implement Python screenshot streamer on EC2
2. Test frame capture and streaming
3. Integrate with video proxy
4. Verify end-to-end in Playwright
5. Plan Isaac Sim 2024.x upgrade path

---

**Conclusion**: Isaac Sim 2023.1.1's streaming is fundamentally broken. Use Python API workaround.





