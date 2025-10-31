#!/bin/bash
# Script to configure frontend to connect to AWS Isaac Sim instance

set -e

AWS_IP="${1:-54.173.1.156}"  # Default to current IP, can override
ANVIL_PORT="8002"

echo "🔧 Configuring frontend to connect to AWS Isaac Sim"
echo "   AWS IP: $AWS_IP"
echo "   Port: $ANVIL_PORT"
echo ""

# Create/update .env.local in forge-ui
FORGE_UI_ENV="apps/forge-ui/.env.local"

# Check if file exists, create if not
if [ ! -f "$FORGE_UI_ENV" ]; then
    echo "📝 Creating $FORGE_UI_ENV"
    touch "$FORGE_UI_ENV"
fi

# Update or add ANVIL_SIM_ENDPOINT
if grep -q "NEXT_PUBLIC_ANVIL_SIM_ENDPOINT" "$FORGE_UI_ENV"; then
    echo "📝 Updating NEXT_PUBLIC_ANVIL_SIM_ENDPOINT in $FORGE_UI_ENV"
    sed -i '' "s|NEXT_PUBLIC_ANVIL_SIM_ENDPOINT=.*|NEXT_PUBLIC_ANVIL_SIM_ENDPOINT=http://${AWS_IP}:${ANVIL_PORT}|" "$FORGE_UI_ENV"
else
    echo "📝 Adding NEXT_PUBLIC_ANVIL_SIM_ENDPOINT to $FORGE_UI_ENV"
    echo "NEXT_PUBLIC_ANVIL_SIM_ENDPOINT=http://${AWS_IP}:${ANVIL_PORT}" >> "$FORGE_UI_ENV"
fi

echo ""
echo "✅ Frontend configuration updated!"
echo ""
echo "📋 To apply changes:"
echo "   1. Restart frontend: cd apps/forge-ui && npm run dev"
echo "   2. Check service: curl http://${AWS_IP}:${ANVIL_PORT}/health"
echo ""
echo "🌐 Service URL: http://${AWS_IP}:${ANVIL_PORT}"

