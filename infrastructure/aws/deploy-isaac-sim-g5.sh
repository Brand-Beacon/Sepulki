#!/bin/bash

# Isaac Sim AWS Deployment Script - g5.xlarge with proper storage
# This script deploys Isaac Sim on a g5.xlarge instance with 200GB storage

set -e

# Configuration
INSTANCE_TYPE="g5.xlarge"
KEY_NAME="sepulki-isaac-sim"
SECURITY_GROUP_NAME="sepulki-isaac-sim-sg"
INSTANCE_NAME="sepulki-isaac-sim-g5"

# Ubuntu 24.04 LTS AMI (not Deep Learning AMI to avoid bloat)
UBUNTU_AMI="ami-0c7217cdde317cfec"  # Ubuntu 24.04 LTS in us-east-1

# Storage configuration
ROOT_VOLUME_SIZE=200  # 200GB root volume
VOLUME_TYPE="gp3"    # GP3 for better performance

echo "🚀 Deploying Isaac Sim on AWS EC2 g5.xlarge..."

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI configured"

# Get default VPC and subnet
echo "🔍 Getting default VPC and subnet..."
VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)
SUBNET_ID=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[0].SubnetId' --output text)

echo "📍 Using VPC: $VPC_ID"
echo "📍 Using Subnet: $SUBNET_ID"

# Create security group
echo "🔒 Creating security group..."
SECURITY_GROUP_ID=$(aws ec2 create-security-group \
    --group-name "$SECURITY_GROUP_NAME" \
    --description "Security group for Isaac Sim WebRTC streaming" \
    --vpc-id "$VPC_ID" \
    --query 'GroupId' \
    --output text 2>/dev/null || \
    aws ec2 describe-security-groups \
    --filters "Name=group-name,Values=$SECURITY_GROUP_NAME" \
    --query 'SecurityGroups[0].GroupId' \
    --output text)

echo "✅ Security group: $SECURITY_GROUP_ID"

# Configure security group rules
echo "🔧 Configuring security group rules..."

# SSH access
aws ec2 authorize-security-group-ingress \
    --group-id "$SECURITY_GROUP_ID" \
    --protocol tcp \
    --port 22 \
    --cidr 0.0.0.0/0 2>/dev/null || echo "SSH rule already exists"

# Isaac Sim WebRTC streaming port
aws ec2 authorize-security-group-ingress \
    --group-id "$SECURITY_GROUP_ID" \
    --protocol tcp \
    --port 8211 \
    --cidr 0.0.0.0/0 2>/dev/null || echo "Port 8211 rule already exists"

# WebRTC signaling ports
aws ec2 authorize-security-group-ingress \
    --group-id "$SECURITY_GROUP_ID" \
    --protocol tcp \
    --port 49100 \
    --cidr 0.0.0.0/0 2>/dev/null || echo "Port 49100 rule already exists"

aws ec2 authorize-security-group-ingress \
    --group-id "$SECURITY_GROUP_ID" \
    --protocol udp \
    --port 47998 \
    --cidr 0.0.0.0/0 2>/dev/null || echo "Port 47998 rule already exists"

# WebRTC media ports
aws ec2 authorize-security-group-ingress \
    --group-id "$SECURITY_GROUP_ID" \
    --protocol tcp \
    --port 47995-48012 \
    --cidr 0.0.0.0/0 2>/dev/null || echo "WebRTC TCP range already exists"

aws ec2 authorize-security-group-ingress \
    --group-id "$SECURITY_GROUP_ID" \
    --protocol udp \
    --port 47995-48012 \
    --cidr 0.0.0.0/0 2>/dev/null || echo "WebRTC UDP range already exists"

aws ec2 authorize-security-group-ingress \
    --group-id "$SECURITY_GROUP_ID" \
    --protocol tcp \
    --port 49000-49007 \
    --cidr 0.0.0.0/0 2>/dev/null || echo "WebRTC TCP range 2 already exists"

aws ec2 authorize-security-group-ingress \
    --group-id "$SECURITY_GROUP_ID" \
    --protocol udp \
    --port 49000-49007 \
    --cidr 0.0.0.0/0 2>/dev/null || echo "WebRTC UDP range 2 already exists"

echo "✅ Security group rules configured"

# Check if key pair exists
echo "🔑 Checking key pair..."
if ! aws ec2 describe-key-pairs --key-names "$KEY_NAME" > /dev/null 2>&1; then
    echo "❌ Key pair $KEY_NAME not found. Please create it first."
    exit 1
fi
echo "✅ Key pair found: $KEY_NAME"

# Launch EC2 instance with custom storage
echo "🚀 Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$UBUNTU_AMI" \
    --count 1 \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$SECURITY_GROUP_ID" \
    --subnet-id "$SUBNET_ID" \
    --block-device-mappings "[
        {
            \"DeviceName\": \"/dev/sda1\",
            \"Ebs\": {
                \"VolumeSize\": $ROOT_VOLUME_SIZE,
                \"VolumeType\": \"$VOLUME_TYPE\",
                \"DeleteOnTermination\": true
            }
        }
    ]" \
    --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=$INSTANCE_NAME}]" \
    --query 'Instances[0].InstanceId' \
    --output text)

echo "✅ Instance launched: $INSTANCE_ID"

# Wait for instance to be running
echo "⏳ Waiting for instance to be running..."
aws ec2 wait instance-running --instance-ids "$INSTANCE_ID"

# Get public IP
PUBLIC_IP=$(aws ec2 describe-instances \
    --instance-ids "$INSTANCE_ID" \
    --query 'Reservations[0].Instances[0].PublicIpAddress' \
    --output text)

echo "✅ Instance is running!"
echo "📍 Public IP: $PUBLIC_IP"

# Save connection information
cat > isaac-sim-g5-connection.info << EOF
Isaac Sim AWS Deployment - g5.xlarge
====================================
Instance ID: $INSTANCE_ID
Public IP: $PUBLIC_IP
Instance Type: $INSTANCE_TYPE
Storage: ${ROOT_VOLUME_SIZE}GB $VOLUME_TYPE
GPU: NVIDIA A10G (24GB VRAM)

Connection:
  SSH: ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP
  
WebRTC URLs:
  Isaac Sim: http://$PUBLIC_IP:8211/streaming/webrtc-client?server=$PUBLIC_IP
  Mock Client: http://$PUBLIC_IP:8211/webrtc-client.html

Next Steps:
  1. Wait for instance to fully boot (2-3 minutes)
  2. Run: ./infrastructure/aws/install-isaac-sim-g5.sh
  3. Test: ./infrastructure/aws/test-isaac-sim-deployment.sh

Cost: ~$1.006/hour
EOF

echo ""
echo "🎉 Isaac Sim AWS deployment completed!"
echo ""
echo "📋 Connection Information:"
echo "   Instance ID: $INSTANCE_ID"
echo "   Public IP: $PUBLIC_IP"
echo "   SSH: ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP"
echo "   WebRTC: http://$PUBLIC_IP:8211/streaming/webrtc-client?server=$PUBLIC_IP"
echo ""
echo "📄 Full details saved to: isaac-sim-g5-connection.info"
echo ""
echo "🔧 Next step: Wait 2-3 minutes for instance to fully boot, then run the installation script"





