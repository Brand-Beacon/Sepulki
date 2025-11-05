# 🚂 Railway Setup - Action Required

## ⚠️ CLI Upload Timeout Issue

Railway CLI uploads are timing out due to network connectivity issues:
```
error sending request for url (https://backboard.railway.com/.../up?serviceId=...)
Caused by: operation timed out
```

## ✅ Solution: GitHub Integration (RECOMMENDED)

GitHub integration is more reliable than CLI uploads and enables automatic deployments.

### Services Created ✓
- ✅ hammer-orchestrator (Service ID: b0f943c3-a4f7-4568-96f4-10ba2f29e1f8)
- ✅ local-auth (Service ID created)

### Quick Setup Instructions

#### Option 1: Automated Script (Easy)

```bash
./scripts/railway-github-setup.sh
```

This script will guide you through the process step-by-step.

#### Option 2: Manual Dashboard Setup

1. **Open Railway Project:**
   ```
   https://railway.app/project/cb1982ed-db09-409e-8af5-5bbd40e248f4
   ```

2. **Connect hammer-orchestrator to GitHub:**
   - Click on `hammer-orchestrator` service
   - Go to Settings → Source
   - Click "Connect Repo"
   - Select: `CatsMeow492/Sepulki`
   - Root Directory: `/services/hammer-orchestrator`
   - Branch: `master`
   - Click "Connect"

3. **Connect local-auth to GitHub:**
   - Click on `local-auth` service
   - Go to Settings → Source
   - Click "Connect Repo"
   - Select: `CatsMeow492/Sepulki`
   - Root Directory: `/services/local-auth`
   - Branch: `master`
   - Click "Connect"

4. **Configure Environment Variables:**

   **For hammer-orchestrator:**
   ```
   NODE_ENV=production
   PORT=4000
   DATABASE_URL=<neon-postgresql-url>
   REDIS_URL=<upstash-redis-url>
   JWT_SECRET=<generate-with-openssl>
   CORS_ORIGIN=<vercel-app-url>
   ```

   **For local-auth:**
   ```
   NODE_ENV=production
   PORT=3001
   DATABASE_URL=<neon-postgresql-url>
   REDIS_URL=<upstash-redis-url>
   JWT_SECRET=<same-as-hammer>
   SESSION_SECRET=<generate-with-openssl>
   CORS_ORIGIN=<vercel-app-url>
   ```

5. **Deployments:**
   - Railway will automatically deploy when you connect to GitHub
   - Each push to `master` branch triggers redeployment
   - Manual deploy: Click "Deploy" button in service

### Configuration Files Already Created ✓

- ✅ `services/hammer-orchestrator/railway.json`
- ✅ `services/hammer-orchestrator/Dockerfile`
- ✅ `services/hammer-orchestrator/.railwayignore`
- ✅ `services/local-auth/railway.json`
- ✅ `services/local-auth/Dockerfile`
- ✅ `services/local-auth/.railwayignore`

Railway will automatically use these configurations!

### What Railway Does Automatically

Once connected to GitHub:
- ✅ Reads `railway.json` for configuration
- ✅ Uses `Dockerfile` for builds
- ✅ Excludes files via `.railwayignore`
- ✅ Deploys on git push to master
- ✅ Runs health checks on `/health` endpoint
- ✅ Auto-restarts on failure (up to 10 retries)

### Verify Deployment

After setup, check:

```bash
# Get deployment URLs
railway domain --service hammer-orchestrator
railway domain --service local-auth

# Check health endpoints
curl https://your-hammer-url.up.railway.app/health
curl https://your-auth-url.up.railway.app/health
```

### CI/CD Integration

Once services are deployed:
1. I'll configure GitHub Actions to trigger deploys
2. Automatic deployments on push to master
3. Health check verification

### Next Steps

1. Run `./scripts/railway-github-setup.sh` OR complete manual setup
2. Wait for initial deployments (~5 minutes)
3. Get service URLs from Railway dashboard
4. Provide me the URLs
5. I'll configure the CI/CD pipeline

---

**Status**: Services created, waiting for GitHub connection
**Action Required**: Connect services to GitHub via dashboard
**Estimated Time**: 5 minutes
