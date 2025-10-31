#!/bin/bash

# Deploy Upgraded Isaac Sim Instance
# g5.2xlarge with 32GB RAM and latest Isaac Sim

set -e

echo "🚀 Deploying Upgraded Isaac Sim Instance"
echo "=========================================="
echo ""

# Configuration
INSTANCE_TYPE="g5.2xlarge"  # 32GB RAM, NVIDIA A10G GPU
AMI_ID="ami-0e001c9271cf7f3b9"  # Ubuntu 22.04 LTS
KEY_NAME="sepulki-isaac-sim"
SECURITY_GROUP="isaac-sim-sg"
INSTANCE_NAME="isaac-sim-upgraded"
VOLUME_SIZE=250  # Increased for Isaac Sim 2024

echo "📋 Configuration:"
echo "   Instance Type: $INSTANCE_TYPE"
echo "   AMI: Ubuntu 22.04 LTS"
echo "   Storage: ${VOLUME_SIZE}GB"
echo "   GPU: NVIDIA A10G (24GB VRAM)"
echo "   RAM: 32GB"
echo ""

# Check if security group exists, create if not
SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$SECURITY_GROUP" --query "SecurityGroups[0].GroupId" --output text 2>/dev/null || echo "None")

if [ "$SG_ID" = "None" ]; then
    echo "Creating security group..."
    SG_ID=$(aws ec2 create-security-group \
        --group-name $SECURITY_GROUP \
        --description "Security group for Isaac Sim streaming" \
        --query 'GroupId' \
        --output text)
    
    # Add rules
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 22 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 8211 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 8765 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 8889 --cidr 0.0.0.0/0
    aws ec2 authorize-security-group-ingress --group-id $SG_ID --protocol tcp --port 48010 --cidr 0.0.0.0/0
    
    echo "✅ Security group created: $SG_ID"
else
    echo "✅ Using existing security group: $SG_ID"
fi

echo ""
echo "🚀 Launching EC2 instance..."

# Launch instance
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id $AMI_ID \
    --instance-type $INSTANCE_TYPE \
    --key-name $KEY_NAME \
    --security-group-ids $SG_ID \
    --block-device-mappings "[{\"DeviceName\":\"/dev/sda1\",\"Ebs\":{\"VolumeSize\":$VOLUME_SIZE,\"VolumeType\":\"gp3\",\"DeleteOnTermination\":true}}]" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "✅ Instance launched: $INSTANCE_ID"
echo ""
echo "⏳ Waiting for instance to start..."

# Wait for instance to be running
aws ec2 wait instance-running --instance-ids $INSTANCE_ID

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids $INSTANCE_ID \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "✅ Instance running"
echo ""
echo "📊 Instance Details:"
echo "   Instance ID: $INSTANCE_ID"
echo "   Public IP: $PUBLIC_IP"
echo "   Instance Type: $INSTANCE_TYPE"
echo "   Storage: ${VOLUME_SIZE}GB"
echo ""

# Save connection info
cat > /Users/taylormohney/Documents/GitHub/Sepulki/isaac-sim-upgraded.info << EOF
Isaac Sim AWS Deployment - Upgraded
====================================
Instance ID: $INSTANCE_ID
Public IP: $PUBLIC_IP
Instance Type: $INSTANCE_TYPE (32GB RAM, NVIDIA A10G)
Storage: ${VOLUME_SIZE}GB gp3

Connection:
  SSH: ssh -i sepulki-isaac-sim.pem ubuntu@$PUBLIC_IP

Ports:
  8211  - Isaac Sim HTTP
  8765  - Screenshot Streamer
  8889  - WebRTC Client
  48010 - Native Livestream

Next Steps:
  1. Wait for instance to fully boot (2-3 minutes)
  2. Run: ./infrastructure/aws/install-isaac-sim-latest.sh $PUBLIC_IP
  3. Test: curl http://$PUBLIC_IP:8765/health

Cost: ~$1.21/hour
EOF

echo "✅ Connection info saved to isaac-sim-upgraded.info"
echo ""
echo "⏳ Waiting for SSH to be available (60 seconds)..."
sleep 60

echo ""
echo "🎉 Instance ready!"
echo ""
echo "Next step:"
echo "  ./infrastructure/aws/install-isaac-sim-latest.sh $PUBLIC_IP"
echo ""




