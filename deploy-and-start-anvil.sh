#!/bin/bash
# Deploy and start anvil-sim properly on AWS

set -e

AWS_IP="${1:-54.173.1.156}"
SSH_KEY="/Users/taylormohney/Documents/GitHub/Sepulki/sepulki-isaac-sim.pem"

echo "🚀 Deploying anvil-sim service to AWS"
echo "   Target: ubuntu@$AWS_IP"
echo ""

# Transfer files
echo "📤 Transferring anvil-sim code..."
rsync -avz -e "ssh -i $SSH_KEY -o StrictHostKeyChecking=no" \
    --exclude 'node_modules' --exclude '__pycache__' --exclude '*.pyc' --exclude '.git' \
    services/anvil-sim/ ubuntu@$AWS_IP:~/anvil-sim/

# Deploy to container
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no ubuntu@$AWS_IP bash << 'REMOTE_SCRIPT'
set -e

cd ~/anvil-sim
chmod +x start_in_container.sh

# Stop and remove existing container
docker stop isaac-sim-container 2>/dev/null || true
docker rm isaac-sim-container 2>/dev/null || true

echo "🎬 Starting Isaac Sim container with anvil-sim..."

# Start Isaac Sim container with anvil-sim
docker run -d \
    --name isaac-sim-container \
    --gpus all \
    -e "ACCEPT_EULA=Y" \
    -e "PRIVACY_CONSENT=Y" \
    -e "ISAAC_SIM_BASE=/isaac-sim" \
    -p 8000:8000 \
    -p 8001:8001 \
    -p 8002:8002 \
    -p 8211:8211 \
    -p 8765:8765 \
    -p 8889:8889 \
    -v /home/ubuntu/anvil-sim:/host/anvil-sim \
    nvcr.io/nvidia/isaac-sim:2023.1.1 \
    bash -c "/host/anvil-sim/start_in_container.sh"

echo "⏳ Waiting for container to start..."
sleep 10

echo "📊 Container status:"
docker ps | grep isaac-sim-container || echo "Container not running"

echo ""
echo "📋 Checking logs..."
docker logs isaac-sim-container 2>&1 | tail -30

echo ""
echo "🧪 Testing health endpoint in container..."
sleep 20
docker exec isaac-sim-container curl -s http://localhost:8002/health || echo "Health check failed"
REMOTE_SCRIPT

# Update security group
echo ""
echo "🔒 Ensuring security group allows port 8002..."
INSTANCE_ID=$(aws ec2 describe-instances --filters "Name=ip-address,Values=$AWS_IP" --query 'Reservations[0].Instances[0].InstanceId' --output text 2>/dev/null || echo "")
if [ ! -z "$INSTANCE_ID" ]; then
    SG_ID=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' --output text)
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 8002 --cidr 0.0.0.0/0 2>/dev/null || echo "Port 8002 already open"
fi

# Test from outside
echo ""
echo "⏳ Waiting for service..."
sleep 30

echo "🧪 Testing from outside..."
for i in {1..10}; do
    RESPONSE=$(curl -s --max-time 3 "http://$AWS_IP:8002/health" 2>&1 || echo "")
    if [ ! -z "$RESPONSE" ] && [[ "$RESPONSE" == *"healthy"* ]] || [[ "$RESPONSE" == *"status"* ]]; then
        echo "✅ Service is accessible!"
        echo "$RESPONSE" | head -5
        break
    fi
    echo "   Attempt $i/10: Service not yet ready..."
    sleep 5
done

echo ""
echo "📋 Service URLs:"
echo "   Health: http://$AWS_IP:8002/health"
echo "   Scene Status: http://$AWS_IP:8002/debug/scene_status"
echo "   Frame Stats: http://$AWS_IP:8002/debug/frame_stats"
echo ""
echo "📝 To check logs:"
echo "   ssh -i $SSH_KEY ubuntu@$AWS_IP 'docker logs -f isaac-sim-container'"

