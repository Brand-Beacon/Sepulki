# Railway GitHub Manual Setup Guide

## Overview
This guide walks you through manually connecting Railway services to your GitHub repository through the Railway web dashboard.

## Prerequisites
- ✅ Railway account authenticated
- ✅ GitHub repository: `Brand-Beacon/Sepulki`
- ✅ Railway services created:
  - `hammer-orchestrator` (ID: b0f943c3-a4f7-4568-96f4-10ba2f29e1f8)
  - `local-auth` (ID: 5384e79a-8bcc-4b12-b607-7fc296508abe)
- ✅ Environment variables configured
- ✅ Dockerfile.railway files in place

## Step-by-Step Instructions

### 1. Open Railway Dashboard

```bash
railway open
```

Or visit: https://railway.app/project/cb1982ed-db09-409e-8af5-5bbd40e248f4

### 2. Connect hammer-orchestrator to GitHub

1. **Navigate to hammer-orchestrator service:**
   - Click on the `hammer-orchestrator` service card in the dashboard

2. **Open Settings:**
   - Click the "Settings" tab in the service view

3. **Connect to GitHub:**
   - Scroll to the "Source" section
   - Click "Connect to GitHub Repository"
   - Select repository: `Brand-Beacon/Sepulki`
   - Select branch: `master`
   - **CRITICAL:** Set root directory to: `/` (project root for monorepo)
   - Leave "Build Command" empty (uses Dockerfile.railway)
   - Leave "Start Command" empty (uses Dockerfile.railway CMD)

4. **Configure Build Settings:**
   - Builder: `Dockerfile`
   - Dockerfile Path: `Dockerfile.railway`
   - Build Context: `/` (root)

5. **Save and Deploy:**
   - Click "Deploy" button
   - Monitor build logs in the "Deployments" tab

### 3. Connect local-auth to GitHub

Repeat the same process for `local-auth`:

1. **Navigate to local-auth service:**
   - Click on the `local-auth` service card

2. **Open Settings:**
   - Click "Settings" tab

3. **Connect to GitHub:**
   - Click "Connect to GitHub Repository"
   - Repository: `Brand-Beacon/Sepulki`
   - Branch: `master`
   - **CRITICAL:** Root directory: `/` (project root)

4. **Configure Build Settings:**
   - Builder: `Dockerfile`
   - Dockerfile Path: `Dockerfile.railway`
   - Build Context: `/`

5. **Save and Deploy:**
   - Click "Deploy"
   - Monitor build logs

### 4. Verify Deployments

#### Check hammer-orchestrator:

```bash
cd /Users/dorianhryniewicki/GitHub/Sepulki/services/hammer-orchestrator
railway service hammer-orchestrator
railway logs
```

#### Check local-auth:

```bash
cd /Users/dorianhryniewicki/GitHub/Sepulki/services/local-auth
railway service local-auth
railway logs
```

### 5. Test Health Endpoints

Once deployments are live, test the health endpoints:

```bash
# Get service URLs from Railway dashboard
# Then test:

# hammer-orchestrator health check
curl https://<hammer-orchestrator-url>/health

# local-auth health check
curl https://<local-auth-url>/health
```

## Expected Responses

### Successful Deployment Indicators:

1. **Build logs show:**
   ```
   ✓ Building Docker image
   ✓ Image built successfully
   ✓ Deploying container
   ✓ Health check passed
   ```

2. **Service status:**
   - Status: "Active" (green)
   - Health check: Passing
   - Latest deployment: "Success"

3. **Health endpoints return:**
   ```json
   {
     "status": "ok",
     "service": "hammer-orchestrator" // or "local-auth"
   }
   ```

## Troubleshooting

### Issue: "Failed to build"

**Causes:**
- Dockerfile.railway not found
- Wrong root directory
- Missing dependencies in package.json

**Solutions:**
1. Verify Dockerfile.railway exists in project root
2. Check root directory is set to `/`
3. Review build logs for specific errors

### Issue: "Health check failed"

**Causes:**
- Service not exposing correct PORT
- Health endpoint not implemented
- Database connection failure

**Solutions:**
1. Verify PORT environment variable is set
2. Check service listens on `0.0.0.0:$PORT`
3. Verify database connection strings are correct

### Issue: "Environment variables missing"

**Solution:**
```bash
# Check existing variables
railway variables

# Add missing variables through dashboard:
# Settings → Variables → Add Variable
```

## Automated Deployment on Git Push

Once GitHub is connected, deployments will automatically trigger on:
- Push to `master` branch
- Pull request merge to `master`

### To disable auto-deploy:
1. Go to Settings → Source
2. Toggle "Auto Deploy" off

### To manually trigger deployment:
1. Click "New Deployment" button in service view
2. Or push to GitHub to trigger automatic deployment

## Service URLs

After successful deployment, get your service URLs:

```bash
# Get hammer-orchestrator URL
cd /Users/dorianhryniewicki/GitHub/Sepulki/services/hammer-orchestrator
railway service hammer-orchestrator
railway domain

# Get local-auth URL
cd /Users/dorianhryniewicki/GitHub/Sepulki/services/local-auth
railway service local-auth
railway domain
```

## Next Steps

1. ✅ Verify both services are connected to GitHub
2. ✅ Confirm deployments succeed
3. ✅ Test health endpoints
4. ✅ Configure custom domains (optional)
5. ✅ Set up monitoring and alerts
6. ✅ Test end-to-end API functionality

## Support

If you encounter issues:
1. Check Railway status: https://status.railway.app
2. Review Railway docs: https://docs.railway.app
3. Check service logs: `railway logs`
4. Contact Railway support: https://railway.app/help

## Key Files Reference

- `/Dockerfile.railway` - Multi-stage Docker build for all services
- `/railway.json` - Railway deployment configuration
- `/services/hammer-orchestrator/.env.example` - Environment variable template
- `/services/local-auth/.env.example` - Environment variable template

---

**Last Updated:** 2025-11-05
**Railway Project:** Sepulki (cb1982ed-db09-409e-8af5-5bbd40e248f4)
