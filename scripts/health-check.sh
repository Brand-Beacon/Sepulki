#!/bin/bash
# Health check script for Railway services

set -e

SERVICE_NAME=$1
SERVICE_URL=$2
MAX_RETRIES=${3:-30}
RETRY_INTERVAL=${4:-10}

if [ -z "$SERVICE_NAME" ] || [ -z "$SERVICE_URL" ]; then
  echo "Usage: $0 <service-name> <service-url> [max-retries] [retry-interval]"
  exit 1
fi

echo "🔍 Checking health of $SERVICE_NAME at $SERVICE_URL"

for i in $(seq 1 $MAX_RETRIES); do
  RESPONSE=$(curl -sf "$SERVICE_URL/health" 2>/dev/null || echo "")

  if [ -n "$RESPONSE" ]; then
    # Try to parse JSON status
    STATUS=$(echo "$RESPONSE" | jq -r '.status' 2>/dev/null || echo "unknown")

    if [ "$STATUS" == "ok" ] || [ "$STATUS" == "healthy" ]; then
      echo "✅ $SERVICE_NAME is healthy"
      echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
      exit 0
    elif [ "$STATUS" == "degraded" ]; then
      echo "⚠️  $SERVICE_NAME is degraded but operational"
      echo "$RESPONSE" | jq '.' 2>/dev/null || echo "$RESPONSE"
      exit 0
    fi
  fi

  echo "⏳ Waiting for $SERVICE_NAME... ($i/$MAX_RETRIES)"
  sleep $RETRY_INTERVAL
done

echo "❌ $SERVICE_NAME health check failed after $MAX_RETRIES attempts"
exit 1
