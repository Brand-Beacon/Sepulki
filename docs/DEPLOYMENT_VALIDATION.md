# Deployment Validation Guide

## Overview

Comprehensive guide for validating Sepulki's production deployment infrastructure. This validator ensures all services are properly deployed, configured, and production-ready.

## Quick Start

```bash
# Navigate to validation directory
cd infrastructure/validation

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your deployment URLs

# Run validation
npm run validate
```

## What Gets Validated

### 1. Environment Configuration ✅
- Required environment variables present
- Optional variables configured
- No missing critical configuration

**Required Variables:**
- `DATABASE_URL` - Neon PostgreSQL connection
- `REDIS_URL` - Upstash Redis connection
- `JWT_SECRET` - Authentication secret
- `NEXT_PUBLIC_GRAPHQL_ENDPOINT` - GraphQL API URL
- `NEXT_PUBLIC_AUTH_ENDPOINT` - Auth service URL

### 2. Frontend (Vercel) ✅
- Page loads successfully
- HTML structure valid
- Next.js build artifacts present
- Response time < 3 seconds
- No JavaScript errors

**Checks:**
```typescript
- GET https://your-app.vercel.app
- Verify 200 OK status
- Check for <!DOCTYPE html>
- Check for _next artifacts
- Measure response time
```

### 3. Hammer Orchestrator (Railway) ✅
- Health endpoint accessible
- GraphQL endpoint functional
- Database connected
- Redis connected
- Response times acceptable

**Endpoints:**
```
GET  /health       → Should return 200 with dependencies status
POST /graphql      → Should return 200 or 400 (not 500)
```

### 4. Local Auth (Railway) ✅
- Health endpoint accessible
- Authentication endpoints functional
- Protected routes secured
- Database connected
- Session management working

**Endpoints:**
```
GET  /health       → Should return 200
POST /auth/signin  → Should return 400 without body (not 500)
POST /auth/signup  → Should return 400 without body (not 500)
```

### 5. Database (Neon PostgreSQL) ✅
- Connection established
- Queries execute successfully
- Connection pooling works
- Tables exist
- Performance acceptable

**Tests:**
```sql
SELECT version()             → Verify PostgreSQL version
SELECT current_database()    → Verify database name
SELECT table_name FROM information_schema.tables → Check migrations
```

### 6. Redis (Upstash) ✅
- Connection established
- SET operations work
- GET operations work
- DELETE operations work
- Expiration works

**Tests:**
```
PING                        → Verify connection
SET key value EX 60         → Test write with expiration
GET key                     → Test read
DEL key                     → Test delete
```

## Validation Results

### Pass Criteria (Exit Code 0)
- All services return 200 OK on health checks
- Database queries execute successfully
- Redis operations complete without error
- Response times meet requirements
- No critical issues detected

### Partial Pass (Exit Code 1)
- Most services healthy
- Some warnings present
- Non-critical issues detected
- Manual review recommended

### Fail Criteria (Exit Code 2)
- One or more services unreachable
- Database connection failed
- Redis connection failed
- Critical configuration missing
- Health checks timing out

## Interpreting the Report

### Example Healthy Report
```
================================================================================
DEPLOYMENT VALIDATION REPORT
================================================================================
Overall Status: ✅ PASS

✅ Frontend (Vercel)
   Response Time: 1247ms
   ✓ HTML structure valid
   ✓ Next.js artifacts present

✅ Hammer Orchestrator (Railway)
   Response Time: 342ms
   ✓ Database connected
   ✓ Redis connected

✅ Database (Neon PostgreSQL)
   Connection Time: 156ms
   ✓ 12 tables found
   ✓ Connection pooling working

✅ Redis (Upstash)
   Connection Time: 89ms
   ✓ SET/GET/DEL operations working

💡 RECOMMENDATIONS:
   1. ✅ All services are healthy and production-ready
================================================================================
```

### Example Problematic Report
```
================================================================================
DEPLOYMENT VALIDATION REPORT
================================================================================
Overall Status: ⚠️ PARTIAL

✅ Frontend (Vercel)
   Response Time: 2847ms
   ⚠️ Slow response time (recommended: <3000ms)

⚠️ Hammer Orchestrator (Railway)
   Response Time: 4532ms
   ⚠️ Slow response time
   ❌ Redis connection failed

✅ Database (Neon PostgreSQL)
   Connection Time: 245ms
   ⚠️ No tables found - migrations may not have run

❌ Redis (Upstash)
   ✗ Connection failed: ECONNREFUSED

🚨 CRITICAL ISSUES:
   1. Redis (Upstash) is unreachable
   2. Hammer Orchestrator cannot connect to Redis

💡 RECOMMENDATIONS:
   1. 🔧 Redis issues detected - verify REDIS_URL
   2. 🔧 Database issues detected - run migrations
   3. ⚠️ Multiple warnings - review configurations
================================================================================
```

## Troubleshooting

### Issue: Database Connection Failed

**Symptoms:**
```
❌ Database (Neon PostgreSQL)
   ✗ Connection failed: ECONNREFUSED
```

**Solutions:**
1. Verify `DATABASE_URL` format:
   ```bash
   postgresql://user:password@host.neon.tech/database?sslmode=require
   ```

2. Check Neon dashboard for database status
3. Verify IP allowlist (if configured)
4. Test connection manually:
   ```bash
   psql $DATABASE_URL
   ```

### Issue: Redis Connection Failed

**Symptoms:**
```
❌ Redis (Upstash)
   ✗ Connection failed: Authentication failed
```

**Solutions:**
1. Verify `REDIS_URL` format:
   ```bash
   rediss://default:password@host.upstash.io:6379
   ```

2. Check Upstash dashboard for Redis status
3. Verify password is correct
4. Test connection manually:
   ```bash
   redis-cli -u $REDIS_URL ping
   ```

### Issue: Service Unreachable

**Symptoms:**
```
❌ Hammer Orchestrator (Railway)
   ✗ Failed to reach service: ETIMEDOUT
```

**Solutions:**
1. Check Railway deployment status
2. View deployment logs in Railway dashboard
3. Verify service is running (not sleeping)
4. Check environment variables are set
5. Verify custom domain is configured correctly

### Issue: No Tables Found

**Symptoms:**
```
⚠️ Database (Neon PostgreSQL)
   ⚠️ No tables found - migrations may not have run
```

**Solutions:**
1. Run database migrations:
   ```bash
   npm run migrate
   ```

2. Check migration files exist:
   ```bash
   ls infrastructure/sql/migrations/
   ```

3. Verify database schema manually:
   ```sql
   \dt
   ```

### Issue: Slow Response Times

**Symptoms:**
```
⚠️ Frontend (Vercel)
   Response Time: 5234ms
   ⚠️ Slow response time
```

**Solutions:**
1. Check Vercel deployment logs
2. Review bundle size and optimization
3. Verify CDN is enabled
4. Check for blocking API calls
5. Review database query performance

## CI/CD Integration

### GitHub Actions Workflow

The validation automatically runs after successful deployments via GitHub Actions:

```yaml
# .github/workflows/deployment-validation.yml
- Triggers on deployment_status success
- Runs validation suite
- Uploads report as artifact
- Comments results on PR
- Sends Slack notification
- Fails workflow if validation fails
```

### Manual Trigger

Manually trigger validation from GitHub:

1. Go to Actions tab
2. Select "Deployment Validation" workflow
3. Click "Run workflow"
4. Select environment (production/staging)
5. Click "Run workflow"

## Best Practices

### 1. Always Validate After Deployment
```bash
# In your deployment script
deploy_to_production()
verify_deployment()  # Run validator
rollback_if_failed()
```

### 2. Set Up Monitoring Alerts
- Configure Sentry for error tracking
- Set up Uptime Robot for availability
- Use Railway metrics for performance
- Enable Vercel Analytics

### 3. Regular Health Checks
```bash
# Add to cron job
0 */6 * * * cd /path/to/validation && npm run validate
```

### 4. Document Issues
Keep a log of validation failures and resolutions:
```markdown
## 2025-11-05: Redis Connection Failed
- **Issue**: REDIS_URL incorrect format
- **Resolution**: Updated to use rediss:// protocol
- **Prevention**: Added format validation to deployment script
```

### 5. Performance Baselines
Track response times over time:
- Frontend: < 2 seconds (95th percentile)
- Backend API: < 500ms (95th percentile)
- Database queries: < 100ms (95th percentile)
- Redis operations: < 50ms (95th percentile)

## Automated Monitoring

### Sentry Integration
```typescript
// In health check endpoint
import * as Sentry from '@sentry/node';

app.get('/health', async (req, res) => {
  try {
    // Health checks
    const dbHealthy = await checkDatabase();
    const redisHealthy = await checkRedis();

    if (!dbHealthy || !redisHealthy) {
      Sentry.captureMessage('Health check failed', {
        level: 'error',
        extra: { database: dbHealthy, redis: redisHealthy }
      });
    }

    res.json({ status: 'healthy', dependencies: { database: dbHealthy, redis: redisHealthy }});
  } catch (error) {
    Sentry.captureException(error);
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});
```

### Uptime Monitoring
Configure Uptime Robot or similar:
- Monitor all health endpoints every 5 minutes
- Alert via email/SMS on downtime
- Track uptime percentage
- Measure response times

## Pre-Flight Checklist

Before declaring deployment complete:

- [ ] Run validation suite: `npm run validate`
- [ ] All services return 200 OK
- [ ] Database queries execute successfully
- [ ] Redis operations work correctly
- [ ] Frontend loads without errors
- [ ] Authentication flows work
- [ ] Environment variables configured
- [ ] No critical issues in report
- [ ] Response times meet requirements
- [ ] Logs show no errors
- [ ] Monitoring alerts configured
- [ ] Team notified of deployment

## Support

For validation issues:

1. **Check the validation report** - Contains detailed error messages
2. **Review service logs** - Railway/Vercel deployment logs
3. **Verify environment** - Ensure all variables are set correctly
4. **Test manually** - Use curl/postman to test endpoints
5. **Contact DevOps** - For persistent issues

## Resources

- [Railway Documentation](https://docs.railway.app/)
- [Vercel Documentation](https://vercel.com/docs)
- [Neon Documentation](https://neon.tech/docs)
- [Upstash Documentation](https://docs.upstash.com/)
- [Deployment Strategy Guide](./DEPLOYMENT_STATUS.md)
