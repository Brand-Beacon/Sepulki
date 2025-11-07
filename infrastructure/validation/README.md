# Deployment Validation Suite

Comprehensive validation tool for Sepulki's production infrastructure.

## Overview

This validation suite performs end-to-end testing of all deployed services to ensure production readiness. It validates:

- ✅ Health checks for all services
- ✅ Database connectivity and performance
- ✅ Redis cache operations
- ✅ API endpoint availability
- ✅ Authentication flows
- ✅ Environment configuration
- ✅ Response times and performance
- ✅ Error handling

## Services Validated

### 1. Frontend (Vercel)
- Page load and rendering
- Next.js build artifacts
- Response time (<3s recommended)
- HTML structure integrity

### 2. Hammer Orchestrator (Railway)
- Health endpoint: `/health`
- GraphQL endpoint: `/graphql`
- Database connectivity
- Redis connectivity
- Response time per endpoint

### 3. Local Auth (Railway)
- Health endpoint: `/health`
- Authentication endpoints:
  - `/auth/signin`
  - `/auth/signup`
- Protected route validation
- Database connectivity

### 4. Database (Neon PostgreSQL)
- Connection establishment
- Query execution
- Connection pooling
- Table existence
- Performance metrics

### 5. Redis (Upstash)
- Connection establishment
- SET/GET operations
- Key expiration
- Performance metrics

## Usage

### Prerequisites

```bash
# Install dependencies
npm install
```

### Environment Variables

Required environment variables (see `.env.example`):

```bash
# Database
DATABASE_URL=postgresql://user:pass@host/db

# Redis
REDIS_URL=redis://default:pass@host:port

# Services
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
NEXT_PUBLIC_GRAPHQL_ENDPOINT=https://hammer-orchestrator.railway.app/graphql
NEXT_PUBLIC_AUTH_ENDPOINT=https://local-auth.railway.app

# Security
JWT_SECRET=your-secret-key
```

### Running Validation

```bash
# Run once
npm run validate

# Watch mode (re-run on changes)
npm run validate:watch

# Direct execution
ts-node deployment-validator.ts
```

### Exit Codes

- `0` - All services healthy (PASS)
- `1` - Some services unhealthy (PARTIAL)
- `2` - Critical failures (FAIL)
- `3` - Validation error

## Validation Report

The validator generates a comprehensive report with:

### Service Status
Each service reports:
- ✅ Healthy / ⚠️ Unhealthy / ❌ Unreachable
- Response time
- Errors (if any)
- Warnings (if any)
- Detailed metrics

### Example Output

```
================================================================================
DEPLOYMENT VALIDATION REPORT
================================================================================
Timestamp: 2025-11-05T10:30:00.000Z
Overall Status: ✅ PASS
================================================================================

📊 SERVICE STATUS:

✅ Frontend (Vercel)
   URL: https://sepulki.vercel.app
   Response Time: 1247ms
   📋 Details: {
      "responseTime": "1247ms",
      "htmlSize": "125.43 KB",
      "hasNextJS": true,
      "statusCode": 200
   }

✅ Hammer Orchestrator (Railway)
   URL: https://hammer-orchestrator-production.up.railway.app
   Response Time: 342ms
   📋 Details: {
      "health": {
         "responseTime": "342ms",
         "status": "healthy",
         "dependencies": {
            "database": "connected",
            "cache": "connected"
         }
      }
   }

✅ Database (Neon PostgreSQL)
   URL: neon.tech
   📋 Details: {
      "connectionTime": "156ms",
      "queryTime": "23ms",
      "version": "PostgreSQL 15.3",
      "tableCount": 12,
      "connectionPooling": "working"
   }

💡 RECOMMENDATIONS:

   1. ✅ All services are healthy and production-ready

================================================================================
END REPORT
================================================================================
```

## Integration with CI/CD

### GitHub Actions

```yaml
name: Deployment Validation

on:
  deployment_status:

jobs:
  validate:
    runs-on: ubuntu-latest
    if: github.event.deployment_status.state == 'success'

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        working-directory: infrastructure/validation
        run: npm install

      - name: Run validation
        working-directory: infrastructure/validation
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          REDIS_URL: ${{ secrets.REDIS_URL }}
          NEXT_PUBLIC_GRAPHQL_ENDPOINT: ${{ secrets.GRAPHQL_ENDPOINT }}
          NEXT_PUBLIC_AUTH_ENDPOINT: ${{ secrets.AUTH_ENDPOINT }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
        run: npm run validate
```

## Validation Criteria

### Health Check Requirements
- All `/health` endpoints must return 200 OK
- Response time < 5 seconds
- Must include dependency status

### Database Requirements
- Connection established < 500ms
- Query execution < 100ms
- Connection pooling functional
- Essential tables present

### Redis Requirements
- Connection established < 500ms
- SET/GET operations < 50ms
- Key expiration working

### Frontend Requirements
- Page load < 3 seconds
- Valid HTML structure
- Next.js build artifacts present

### Backend Requirements
- Health check passes
- All endpoints accessible
- Authentication properly enforced
- Database and Redis connected

## Troubleshooting

### Database Connection Failed
```bash
# Check connection string format
echo $DATABASE_URL

# Test direct connection
psql $DATABASE_URL
```

### Redis Connection Failed
```bash
# Check connection string format
echo $REDIS_URL

# Test with redis-cli
redis-cli -u $REDIS_URL ping
```

### Service Unreachable
- Verify service is deployed and running
- Check Railway/Vercel deployment logs
- Verify environment variables are set
- Check network connectivity

### Slow Response Times
- Check service logs for performance issues
- Verify database query performance
- Check Redis cache hit rates
- Review resource allocation (CPU/Memory)

## Best Practices

1. **Run after every deployment** - Automated validation catches issues early
2. **Set up alerts** - Integrate with monitoring tools (Sentry, DataDog)
3. **Regular testing** - Schedule periodic validation runs
4. **Document issues** - Keep track of recurring problems
5. **Update thresholds** - Adjust performance expectations as system evolves

## Production Validation Checklist

Before declaring deployment complete:

- [ ] All health checks return 200 OK
- [ ] Database queries execute successfully
- [ ] Redis operations work correctly
- [ ] Frontend loads without errors
- [ ] Authentication endpoints functional
- [ ] All environment variables configured
- [ ] No critical issues in report
- [ ] Response times meet requirements
- [ ] Error handling works correctly
- [ ] Logs show no configuration errors

## Support

For issues or questions:
- Review validation report details
- Check service logs in Railway/Vercel
- Verify environment configuration
- Test individual services manually
- Contact DevOps team
