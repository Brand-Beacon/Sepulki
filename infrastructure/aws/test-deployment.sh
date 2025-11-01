#!/bin/bash
# Test Isaac Sim AWS Deployment
# Validates that Isaac Sim is properly deployed and WebRTC streaming works

set -e

echo "🧪 Testing Isaac Sim AWS Deployment..."

# Check if connection info file exists
if [[ ! -f "isaac-sim-connection.info" ]]; then
    echo "❌ Connection info file not found. Please run deploy-isaac-sim.sh first."
    exit 1
fi

# Extract connection info
PUBLIC_IP=$(grep "Public IP:" isaac-sim-connection.info | cut -d' ' -f3)
INSTANCE_ID=$(grep "Instance ID:" isaac-sim-connection.info | cut -d' ' -f3)
KEY_NAME=$(grep "ssh -i" isaac-sim-connection.info | cut -d' ' -f3 | cut -d'.' -f1)

echo "📍 Testing instance: $INSTANCE_ID"
echo "📍 Public IP: $PUBLIC_IP"

# Test 1: Instance is running
echo "🔍 Test 1: Checking instance status..."
INSTANCE_STATE=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].State.Name' \
    --output text)

if [[ "$INSTANCE_STATE" == "running" ]]; then
    echo "✅ Instance is running"
else
    echo "❌ Instance is not running. State: $INSTANCE_STATE"
    exit 1
fi

# Test 2: SSH connectivity
echo "🔍 Test 2: Testing SSH connectivity..."
if ssh -i "$KEY_NAME.pem" -o ConnectTimeout=10 -o StrictHostKeyChecking=no ubuntu@"$PUBLIC_IP" "echo 'SSH connection successful'" 2>/dev/null; then
    echo "✅ SSH connection successful"
else
    echo "❌ SSH connection failed"
    echo "   Make sure the key file $KEY_NAME.pem exists and has correct permissions (chmod 400)"
    exit 1
fi

# Test 3: Isaac Sim service status
echo "🔍 Test 3: Checking Isaac Sim service status..."
SERVICE_STATUS=$(ssh -i "$KEY_NAME.pem" -o StrictHostKeyChecking=no ubuntu@"$PUBLIC_IP" \
    "sudo systemctl is-active isaac-sim" 2>/dev/null || echo "inactive")

if [[ "$SERVICE_STATUS" == "active" ]]; then
    echo "✅ Isaac Sim service is active"
else
    echo "⚠️  Isaac Sim service is not active. Status: $SERVICE_STATUS"
    echo "   Run: ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP 'sudo systemctl start isaac-sim'"
fi

# Test 4: WebRTC client accessibility
echo "🔍 Test 4: Testing WebRTC client accessibility..."
if curl -s -f "http://$PUBLIC_IP:8211/streaming/webrtc-client" > /dev/null; then
    echo "✅ WebRTC client is accessible"
    echo "🌐 URL: http://$PUBLIC_IP:8211/streaming/webrtc-client?server=$PUBLIC_IP"
else
    echo "❌ WebRTC client not accessible"
    echo "   Check if Isaac Sim service is running and ports are open"
fi

# Test 5: GPU availability
echo "🔍 Test 5: Checking GPU availability..."
GPU_INFO=$(ssh -i "$KEY_NAME.pem" -o StrictHostKeyChecking=no ubuntu@"$PUBLIC_IP" \
    "nvidia-smi --query-gpu=name,memory.total --format=csv,noheader" 2>/dev/null || echo "GPU not available")

if [[ "$GPU_INFO" != "GPU not available" ]]; then
    echo "✅ GPU available: $GPU_INFO"
else
    echo "❌ GPU not available or NVIDIA drivers not installed"
fi

# Test 6: Docker container status
echo "🔍 Test 6: Checking Docker container status..."
CONTAINER_STATUS=$(ssh -i "$KEY_NAME.pem" -o StrictHostKeyChecking=no ubuntu@"$PUBLIC_IP" \
    "docker ps --filter name=isaac-sim-webrtc --format '{{.Status}}'" 2>/dev/null || echo "Container not found")

if [[ "$CONTAINER_STATUS" == *"Up"* ]]; then
    echo "✅ Isaac Sim container is running: $CONTAINER_STATUS"
else
    echo "❌ Isaac Sim container not running. Status: $CONTAINER_STATUS"
fi

# Test 7: Network ports
echo "🔍 Test 7: Checking network ports..."
PORTS=(8211 49100 47998)
for port in "${PORTS[@]}"; do
    if nc -z "$PUBLIC_IP" "$port" 2>/dev/null; then
        echo "✅ Port $port is open"
    else
        echo "❌ Port $port is not accessible"
    fi
done

# Summary
echo ""
echo "📊 Deployment Test Summary"
echo "=========================="
echo "Instance ID: $INSTANCE_ID"
echo "Public IP: $PUBLIC_IP"
echo "Instance State: $INSTANCE_STATE"
echo "SSH: ✅ Working"
echo "Isaac Sim Service: $SERVICE_STATUS"
echo "WebRTC Client: $(curl -s -f "http://$PUBLIC_IP:8211/streaming/webrtc-client" > /dev/null && echo "✅ Accessible" || echo "❌ Not accessible")"
echo "GPU: $(echo "$GPU_INFO" | grep -q "GPU not available" && echo "❌ Not available" || echo "✅ Available")"
echo "Container: $(echo "$CONTAINER_STATUS" | grep -q "Up" && echo "✅ Running" || echo "❌ Not running")"

echo ""
echo "🌐 WebRTC Client URL:"
echo "   http://$PUBLIC_IP:8211/streaming/webrtc-client?server=$PUBLIC_IP"
echo ""
echo "🔧 Management Commands:"
echo "   SSH: ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP"
echo "   Start service: ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP 'sudo systemctl start isaac-sim'"
echo "   Check logs: ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP 'sudo journalctl -u isaac-sim -f'"
echo "   Health check: ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP './health-check.sh'"

# Check if all critical tests passed
if [[ "$INSTANCE_STATE" == "running" && "$SERVICE_STATUS" == "active" && "$GPU_INFO" != "GPU not available" ]]; then
    echo ""
    echo "🎉 Isaac Sim deployment test PASSED!"
    echo "   Ready for robot loading and WebRTC streaming"
else
    echo ""
    echo "⚠️  Isaac Sim deployment test has issues"
    echo "   Please resolve the failed tests before proceeding"
    exit 1
fi

