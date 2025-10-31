#!/bin/bash
# Quick test script for Isaac Sim rendering

echo "🧪 Testing Isaac Sim Real 3D Rendering"
echo ""

# Check if service is running
echo "1️⃣ Checking service health..."
if curl -s http://localhost:8002/health > /dev/null 2>&1; then
    echo "✅ Service is running"
    curl -s http://localhost:8002/health | jq .
else
    echo "❌ Service is not running on port 8002"
    echo "   Start it with: cd services/anvil-sim && docker-compose up -d anvil-sim-dev"
    exit 1
fi

echo ""
echo "2️⃣ Checking scene status..."
SCENE_STATUS=$(curl -s http://localhost:8002/debug/scene_status)
echo "$SCENE_STATUS" | jq .

ISAAC_AVAILABLE=$(echo "$SCENE_STATUS" | jq -r .isaac_sim_available)
if [ "$ISAAC_AVAILABLE" != "true" ]; then
    echo "⚠️  Warning: Isaac Sim not available (this is expected in dev mode without GPU)"
fi

echo ""
echo "3️⃣ Checking frame statistics..."
FRAME_STATS=$(curl -s http://localhost:8002/debug/frame_stats)
echo "$FRAME_STATS" | jq .

echo ""
echo "4️⃣ Testing camera control..."
CAMERA_RESPONSE=$(curl -s -X POST http://localhost:8002/update_camera \
  -H "Content-Type: application/json" \
  -d '{"position": [3.0, 3.0, 2.0], "target": [0.0, 0.0, 0.5], "fov": 70.0}')
echo "$CAMERA_RESPONSE" | jq .

SUCCESS=$(echo "$CAMERA_RESPONSE" | jq -r .success)
if [ "$SUCCESS" = "true" ]; then
    echo "✅ Camera control test passed"
else
    echo "❌ Camera control test failed"
fi

echo ""
echo "✅ Manual testing complete!"
echo "   Run full browser test: cd apps/forge-ui && npx playwright test isaac-sim-real-rendering.spec.ts"
