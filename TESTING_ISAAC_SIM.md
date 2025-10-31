# Testing Isaac Sim Real 3D Rendering

## Prerequisites

Before running the tests, ensure:

1. **Anvil Sim service is running** on port 8002
2. **Isaac Sim is available** (either installed locally or in Docker)
3. **Playwright is installed** in the frontend

## Starting the Anvil Sim Service

### Option 1: Local Development (without Isaac Sim)
```bash
cd services/anvil-sim
docker-compose up -d anvil-sim-dev
# Wait for service to be ready
curl http://localhost:8002/health
```

### Option 2: With Isaac Sim (requires GPU)
```bash
cd services/anvil-sim
# Set Isaac Sim path
export ISAAC_SIM_BASE=/path/to/isaac-sim
# Start service
python3 src/main.py
```

### Option 3: Docker with Isaac Sim
```bash
cd services/anvil-sim
docker-compose up -d anvil-sim-prod
# Wait for service to be ready
curl http://localhost:8002/health
```

## Running the Browser Verification Test

```bash
cd apps/forge-ui

# Set ANVIL_SIM_URL if service is on different host
export ANVIL_SIM_URL=http://localhost:8002

# Run the test
npx playwright test isaac-sim-real-rendering.spec.ts

# Run with UI for debugging
npx playwright test isaac-sim-real-rendering.spec.ts --ui

# Run with verbose output
npx playwright test isaac-sim-real-rendering.spec.ts --reporter=list --verbose
```

## Manual Testing

### 1. Check Service Health
```bash
curl http://localhost:8002/health | jq .
```

Expected response:
```json
{
  "status": "healthy",
  "service": "anvil-sim-real",
  "isaac_sim_available": true
}
```

### 2. Check Scene Status
```bash
curl http://localhost:8002/debug/scene_status | jq .
```

Expected response:
```json
{
  "isaac_sim_available": true,
  "scene_initialized": true,
  "camera_exists": true,
  "robot_loaded": true,
  "robot_config": {
    "name": "TurtleBot3",
    "isaac_sim_path": "/Isaac/Robots/TurtleBot3/turtlebot3.usd"
  }
}
```

### 3. Check Frame Statistics
```bash
curl http://localhost:8002/debug/frame_stats | jq .
```

Expected response:
```json
{
  "scene_initialized": true,
  "robot_loaded": true,
  "camera_exists": true,
  "frame_count": 123,
  "frame_stats": {
    "shape": [1080, 1920, 3],
    "mean": 0.45,
    "max": 1.0,
    "is_black": false
  }
}
```

### 4. Test Camera Control
```bash
curl -X POST http://localhost:8002/update_camera \
  -H "Content-Type: application/json" \
  -d '{
    "position": [3.0, 3.0, 2.0],
    "target": [0.0, 0.0, 0.5],
    "fov": 70.0
  }' | jq .
```

Expected response:
```json
{
  "success": true,
  "position": [3.0, 3.0, 2.0],
  "target": [0.0, 0.0, 0.5],
  "fov": 70.0,
  "message": "Camera updated successfully"
}
```

### 5. Verify Camera State Updated
```bash
curl http://localhost:8002/debug/frame_stats | jq .camera_state
```

## Troubleshooting

### Service Not Running
```bash
# Check if port is in use
lsof -i :8002

# Check service logs
cd services/anvil-sim
docker-compose logs -f anvil-sim-dev
```

### Isaac Sim Not Available
If `isaac_sim_available: false`:
1. Check `ISAAC_SIM_BASE` environment variable
2. Verify Isaac Sim is installed at the specified path
3. Check Python path includes Isaac Sim modules

### Black Frames
If `frame_stats.is_black: true`:
1. Check scene status - verify `scene_initialized: true`
2. Check camera exists - verify `camera_exists: true`
3. Check robot loaded - verify `robot_loaded: true`
4. Review service logs for errors

### Test Failures
```bash
# Run test with debug output
DEBUG=pw:api npx playwright test isaac-sim-real-rendering.spec.ts --debug

# Run specific test case
npx playwright test isaac-sim-real-rendering.spec.ts -g "verifies real 3D rendering"
```

## Expected Test Results

**Test 1: verifies real 3D rendering with camera controls**
- ✅ Scene status check passes
- ✅ Frame statistics show non-black frames
- ✅ Camera control endpoint works
- ✅ Multiple camera positions tested successfully
- ✅ Frame quality maintained after camera updates

**Test 2: verifies HTTP video stream contains real frames**
- ✅ Scene created successfully
- ✅ Frames are non-black (real 3D content)
- ✅ Robot (TurtleBot3) is loaded and visible

## Success Criteria

All tests should verify:
1. ✅ Scene initialization succeeds
2. ✅ Camera exists and is functional
3. ✅ Robot (TurtleBot3) loads successfully
4. ✅ Frames are generated and are NOT black
5. ✅ Camera control API works correctly
6. ✅ Frame statistics show valid rendering

