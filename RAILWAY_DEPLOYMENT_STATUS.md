# Railway Deployment Status

## ✅ Completed via CLI

### Services Created
- **hammer-orchestrator** (Service ID: `b0f943c3-a4f7-4568-96f4-10ba2f29e1f8`)
  - URL: https://hammer-orchestrator-production.up.railway.app
  - Port: 4000

- **local-auth** (Service ID: `5384e79a-8bcc-4b12-b607-7fc296508abe`)
  - URL: https://local-auth-production.up.railway.app
  - Port: 3001

### Configuration Files Committed to `master` Branch ✓
```
✓ services/hammer-orchestrator/railway.json
✓ services/hammer-orchestrator/Dockerfile.railway
✓ services/hammer-orchestrator/.railwayignore
✓ services/local-auth/railway.json
✓ services/local-auth/Dockerfile.railway
✓ services/local-auth/.railwayignore
```

### Base Environment Variables Configured ✓
Both services have:
- `NODE_ENV=production`
- `PORT=4000` (hammer-orchestrator) / `PORT=3001` (local-auth)
- Railway auto-generated variables (service URLs, domains, etc.)

## ⚠️ Action Required: Connect Services to GitHub

Railway CLI cannot connect services to GitHub repositories. This must be done via the Railway dashboard.

### Why GitHub Connection is Required:
1. **railway.json Configuration**: Railway will automatically use `railway.json` settings once connected to GitHub
2. **Correct Dockerfile**: Will use `Dockerfile.railway` instead of the default `Dockerfile`
3. **Auto-Deployment**: Pushes to `master` branch will automatically trigger deployments
4. **No More Timeouts**: GitHub integration bypasses CLI upload timeouts

### Steps to Connect (5 minutes):

1. **Open Railway Dashboard:**
   ```
   https://railway.app/project/cb1982ed-db09-409e-8af5-5bbd40e248f4
   ```

2. **Connect hammer-orchestrator:**
   - Click on `hammer-orchestrator` service
   - Go to `Settings` → `Source`
   - Click `Connect Repo`
   - Select repository: `Brand-Beacon/Sepulki` (formerly `CatsMeow492/Sepulki`)
   - Set Root Directory: `/`  ← **IMPORTANT: Use project root, not service directory**
   - Branch: `master`
   - Click `Connect`

3. **Connect local-auth:**
   - Click on `local-auth` service
   - Go to `Settings` → `Source`
   - Click `Connect Repo`
   - Select repository: `Brand-Beacon/Sepulki`
   - Set Root Directory: `/`  ← **IMPORTANT: Use project root**
   - Branch: `master`
   - Click `Connect`

4. **Verify Deployments:**
   Once connected, Railway will automatically:
   - Detect `railway.json` in each service directory
   - Use `Dockerfile.railway` for builds
   - Build from project root (required for monorepo)
   - Deploy automatically

## 🔐 Environment Variables Still Needed

After GitHub connection succeeds, add these variables via Railway dashboard or CLI:

### hammer-orchestrator Additional Variables:
```bash
railway service hammer-orchestrator
railway variables --set "DATABASE_URL=<neon-postgresql-url>"
railway variables --set "REDIS_URL=<upstash-redis-url>"
railway variables --set "JWT_SECRET=<generate-with-openssl>"
railway variables --set "CORS_ORIGIN=<vercel-app-url>"
```

### local-auth Additional Variables:
```bash
railway service local-auth
railway variables --set "DATABASE_URL=<neon-postgresql-url>"
railway variables --set "REDIS_URL=<upstash-redis-url>"
railway variables --set "JWT_SECRET=<same-as-hammer>"
railway variables --set "SESSION_SECRET=<generate-with-openssl>"
railway variables --set "CORS_ORIGIN=<vercel-app-url>"
```

### Generate Secrets:
```bash
# JWT_SECRET
openssl rand -base64 32

# SESSION_SECRET
openssl rand -base64 32
```

## 📋 Deployment Configuration Summary

### railway.json Configuration:
Both services use:
- **Builder**: DOCKERFILE
- **Dockerfile**: `services/{service}/Dockerfile.railway`
- **Watch Patterns**: Auto-deploy on file changes
- **Health Check**: `/health` endpoint
- **Restart Policy**: ON_FAILURE (max 10 retries)

### Dockerfile.railway Features:
- Multi-stage builds (builder + production)
- Builds from project root (monorepo compatible)
- Installs shared packages (`packages/shared-types`, `packages/graphql-schema`)
- Security: Non-root user (nodejs:1001)
- Health check: Built-in HTTP check
- Process manager: dumb-init for signal handling

## 🚀 Next Steps (In Order)

1. **Connect services to GitHub** (via Railway dashboard)
2. **Wait for automatic deployments** (~3-5 minutes per service)
3. **Add remaining environment variables** (DATABASE_URL, REDIS_URL, JWT_SECRET, etc.)
4. **Redeploy services** after adding variables:
   ```bash
   railway service hammer-orchestrator
   railway redeploy -y

   railway service local-auth
   railway redeploy -y
   ```
5. **Verify health checks**:
   ```bash
   curl https://hammer-orchestrator-production.up.railway.app/health
   curl https://local-auth-production.up.railway.app/health
   ```

## 🔧 Troubleshooting

### If Deployments Fail After GitHub Connection:

1. **Check deployment logs:**
   ```bash
   railway service hammer-orchestrator
   railway logs

   railway service local-auth
   railway logs
   ```

2. **Verify railway.json is being used:**
   - Look for log line: `Using config file: railway.json`
   - Should show: `Dockerfile path: services/{service}/Dockerfile.railway`

3. **Common Issues:**
   - **Wrong Root Directory**: Must be `/` (project root), not `/services/hammer-orchestrator`
   - **Missing Environment Variables**: Services need DATABASE_URL, REDIS_URL, JWT_SECRET
   - **Port Mismatch**: Check `PORT` environment variable matches Dockerfile EXPOSE

## 📊 What Railway Does Automatically After GitHub Connection:

✅ Reads `railway.json` from service directory
✅ Uses `Dockerfile.railway` for builds
✅ Builds from project root (monorepo support)
✅ Excludes files via `.railwayignore`
✅ Deploys on push to `master` branch
✅ Runs health checks on `/health` endpoint
✅ Auto-restarts on failure (up to 10 retries)
✅ Provides service discovery via environment variables

## 🎯 Current Blockers

- [ ] GitHub connection (requires Railway dashboard access)
- [ ] Neon database credentials (DATABASE_URL)
- [ ] Upstash Redis credentials (REDIS_URL)
- [ ] JWT secret generation
- [ ] Session secret generation
- [ ] Vercel app URL (CORS_ORIGIN)

---

**Status**: Services created and configured via CLI. Waiting for GitHub connection via Railway dashboard.

**Estimated Time to Completion**: 10 minutes
- 5 minutes: Connect to GitHub + auto-deploy
- 3 minutes: Add environment variables
- 2 minutes: Verify health checks
