#!/bin/bash
# Isaac Sim AWS Deployment Script
# Deploys EC2 instance with Isaac Sim WebRTC streaming capabilities

set -e

echo "🚀 Deploying Isaac Sim on AWS EC2..."

# Configuration
INSTANCE_TYPE="g4dn.xlarge"
KEY_NAME="sepulki-isaac-sim"
SECURITY_GROUP_NAME="sepulki-isaac-sim-sg"
INSTANCE_NAME="sepulki-isaac-sim"

# Deep Learning AMI (Ubuntu 24.04) with NVIDIA drivers
DEEP_LEARNING_AMI="ami-00b0c75dadcafff50"

# Check if AWS CLI is configured
if ! aws sts get-caller-identity > /dev/null 2>&1; then
    echo "❌ AWS CLI not configured. Please run 'aws configure' first."
    exit 1
fi

echo "✅ AWS CLI configured"

# Get default VPC and subnet
echo "🔍 Getting default VPC and subnet..."
DEFAULT_VPC=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)
DEFAULT_SUBNET=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$DEFAULT_VPC" --query 'Subnets[0].SubnetId' --output text)

echo "📍 Using VPC: $DEFAULT_VPC"
echo "📍 Using Subnet: $DEFAULT_SUBNET"

# Create security group
echo "🔒 Creating security group..."
SECURITY_GROUP_ID=$(aws ec2 create-security-group \
    --group-name "$SECURITY_GROUP_NAME" \
    --description "Isaac Sim WebRTC streaming security group" \
    --vpc-id "$DEFAULT_VPC" \
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

# Isaac Sim WebRTC ports
aws ec2 authorize-security-group-ingress \
    --group-id "$SECURITY_GROUP_ID" \
    --protocol tcp \
    --port 8211 \
    --cidr 0.0.0.0/0 2>/dev/null || echo "Port 8211 rule already exists"

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

# WebRTC range
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

# Additional WebRTC range
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
    echo "❌ Key pair '$KEY_NAME' not found. Please create it first:"
    echo "   aws ec2 create-key-pair --key-name $KEY_NAME --query 'KeyMaterial' --output text > $KEY_NAME.pem"
    echo "   chmod 400 $KEY_NAME.pem"
    exit 1
fi

echo "✅ Key pair found: $KEY_NAME"

# Launch EC2 instance
echo "🚀 Launching EC2 instance..."
INSTANCE_ID=$(aws ec2 run-instances \
    --image-id "$DEEP_LEARNING_AMI" \
    --instance-type "$INSTANCE_TYPE" \
    --key-name "$KEY_NAME" \
    --security-group-ids "$SECURITY_GROUP_ID" \
    --subnet-id "$DEFAULT_SUBNET" \
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

# Create connection info file
cat > isaac-sim-connection.info << EOF
Isaac Sim AWS Instance Information
==================================

Instance ID: $INSTANCE_ID
Public IP: $PUBLIC_IP
Instance Type: $INSTANCE_TYPE
Security Group: $SECURITY_GROUP_ID

SSH Connection:
ssh -i $KEY_NAME.pem ubuntu@$PUBLIC_IP

WebRTC Client URL:
http://$PUBLIC_IP:8211/streaming/webrtc-client?server=$PUBLIC_IP

Next Steps:
1. SSH into the instance
2. Run: ./infrastructure/aws/install-isaac-sim.sh
3. Test WebRTC client in browser

Cost Information:
- Instance: $INSTANCE_TYPE (~$0.526/hour)
- Estimated monthly cost (24/7): ~$380
- With auto-shutdown (8h/day): ~$127
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
echo "📄 Full details saved to: isaac-sim-connection.info"
echo ""
echo "🔧 Next step: Run the Isaac Sim installation script on the instance"
