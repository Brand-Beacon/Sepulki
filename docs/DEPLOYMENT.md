# Deployment Guide

## Overview

Sepulki deployments are managed through **GitHub Actions workflows**. All secrets are stored in GitHub repository settings, and deployments are triggered explicitly on push to `master` or `dev` branches.

**Key Principle:** GitHub repository secrets are the **single source of truth**. No secrets are stored in code or config files.

---

## Architecture

### Deployment Flow

```
Push to master/dev
    ↓
GitHub Actions Triggered
    ↓
Inject Secrets from GitHub
    ↓
Deploy to Railway & Vercel
    ↓
Health Checks
    ↓
✅ Success or ↩️ Rollback
```

### Environments

| Branch | Environment | Backend (Railway) | Frontend (Vercel) |
|--------|-------------|-------------------|-------------------|
| `master` | Production | Production env | Production deployment |
| `dev` | Development | Development env | Preview deployment |

---

## Services

### Backend Services (Railway)

1. **hammer-orchestrator** (Port 4000)
   - GraphQL API server
   - REST endpoints
   - Service ID: `b0f943c3-a4f7-4568-96f4-10ba2f29e1f8`
   - Health: `/health`

2. **local-auth** (Port 3001)
   - Authentication service
   - Session management
   - Service ID: `5384e79a-8bcc-4b12-b607-7fc296508abe`
   - Health: `/health`

### Frontend (Vercel)

- **forge-ui** - Next.js application
- Project ID: `prj_BGEfxDbNnVpfhlebVDxk5CSgALTT`
- Production URL: https://sepulki-forge-2ex4yvbuu-monermakers.vercel.app

---

## Deployment Workflows

### Production Deployment

**File:** `.github/workflows/deploy-production.yml`

**Triggers:**
- Push to `master` branch
- Manual dispatch via GitHub Actions UI

**Process:**
1. Inject PROD_* secrets to Railway services
2. Deploy hammer-orchestrator
3. Deploy local-auth
4. Run health checks
5. Deploy frontend to Vercel
6. Create deployment summary

**Protection:**
- Requires manual approval
- 5-minute wait timer
- Environment: `production`

### Development Deployment

**File:** `.github/workflows/deploy-dev.yml`

**Triggers:**
- Push to `dev` branch
- Manual dispatch via GitHub Actions UI

**Process:**
- Same as production but uses DEV_* secrets
- Deploys to Railway development environment
- Deploys to Vercel preview

---

## Manual Deployment

### Via GitHub Actions UI

1. Go to: https://github.com/CatsMeow492/Sepulki/actions
2. Select workflow: "Deploy to Production" or "Deploy to Development"
3. Click "Run workflow"
4. Select branch
5. Click "Run workflow" button

### Via GitHub CLI

```bash
# Deploy to production
gh workflow run deploy-production.yml

# Deploy to development
gh workflow run deploy-dev.yml
```

---

## Secrets Management

### GitHub Repository Secrets

All secrets are stored in: **Settings → Secrets and variables → Actions**

**Secret Categories:**

1. **Platform Authentication (2)**
   - `VERCEL_TOKEN` - Vercel API token
   - `RAILWAY_TOKEN` - Railway API token

2. **Platform Identifiers (7)**
   - `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
   - `RAILWAY_PROJECT_ID`
   - `RAILWAY_ENVIRONMENT_PROD_ID`, `RAILWAY_ENVIRONMENT_DEV_ID`
   - `RAILWAY_SERVICE_HAMMER_ID`, `RAILWAY_SERVICE_AUTH_ID`

3. **Production Secrets (17 - PROD_* prefix)**
   - Frontend: `PROD_NEXT_PUBLIC_*` (6 vars)
   - Auth: `PROD_NEXTAUTH_SECRET`, `PROD_NEXTAUTH_URL`
   - Redis: `PROD_KV_*` (4 Upstash vars), `PROD_REDIS_URL`
   - Backend: `PROD_RAILWAY_*` (4 vars)

4. **Development Secrets (17 - DEV_* prefix)**
   - Same structure as PROD_* with development values

**Total Secrets:** 43

### Secret Naming Convention

```
PROD_*          → Production environment (master branch)
DEV_*           → Development environment (dev branch)
No prefix       → Platform identifiers and tokens
```

### Adding/Updating Secrets

**Via GitHub UI:**
1. Go to Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Enter name and value
4. Click "Add secret"

**Via GitHub CLI:**
```bash
gh secret set PROD_DATABASE_URL -b"postgresql://..."
gh secret set DEV_DATABASE_URL -b"postgresql://..."
```

---

## Monitoring & Health Checks

### Health Check Endpoints

Both services expose `/health` endpoints:

```bash
# Production
curl https://hammer-orchestrator-production.up.railway.app/health
curl https://local-auth-production.up.railway.app/health

# Response format
{
  "status": "ok",
  "timestamp": "2025-11-07T15:45:00Z",
  "service": "hammer-orchestrator",
  "version": "1.0.0",
  "checks": {
    "database": { "status": "healthy", "latency": 15 },
    "redis": { "status": "healthy", "latency": 5 }
  },
  "uptime": 3600
}
```

### Automated Health Checks

Workflows automatically run health checks after deployment:
- 30-second stabilization wait
- 30 retry attempts with 10-second intervals
- Fails deployment if unhealthy after 5 minutes

### Manual Health Check

```bash
# Use the health check script
./scripts/health-check.sh "hammer-orchestrator" "https://hammer-orchestrator-production.up.railway.app"

./scripts/health-check.sh "local-auth" "https://local-auth-production.up.railway.app"
```

---

## Rollback Procedures

### Automatic Rollback

Workflows automatically rollback if:
- Health checks fail
- Deployment process errors
- Build failures

### Manual Rollback

**Railway:**
```bash
railway login
railway link cb1982ed-db09-409e-8af5-5bbd40e248f4

# Rollback specific service
railway rollback --service hammer-orchestrator --environment production
railway rollback --service local-auth --environment production

# Rollback to specific deployment
railway rollback --service hammer-orchestrator --deployment <DEPLOYMENT_ID>
```

**Vercel:**
```bash
vercel login
vercel ls

# Rollback to previous deployment
vercel rollback <DEPLOYMENT_URL>
```

**GitHub Actions:**
1. Revert the commit that broke production
2. Push to `master` - triggers new deployment
3. Or manually run workflow with last known good commit

---

## Troubleshooting

### Deployment Fails with "Secret Not Found"

**Cause:** Secret name mismatch or secret not set

**Fix:**
1. Check secret name matches exactly (case-sensitive)
2. Verify secret exists in GitHub Settings → Secrets
3. Ensure workflow references correct secret name

### Railway Deployment Times Out

**Cause:** Build takes longer than 10 minutes

**Fix:**
1. Check Railway build logs for errors
2. Optimize Docker build (cache layers)
3. Check for dependency installation issues

### Vercel Build Fails

**Cause:** Environment variable missing or build error

**Fix:**
1. Check GitHub Actions logs for build output
2. Verify all NEXT_PUBLIC_* vars are set
3. Test build locally: `npm run build --workspace @sepulki/forge-ui`

### Health Checks Fail

**Cause:** Service not ready or actual health issue

**Fix:**
1. Check Railway logs: `railway logs --service hammer-orchestrator`
2. Verify database/Redis connections
3. Check if service crashed on startup
4. Increase health check timeout if services need more time

### Auto-Deploy Still Happening

**Cause:** Platform git integration not disabled

**Fix:**
1. Railway: Settings → Source → Disconnect
2. Vercel: Settings → Git → Disable deployments
3. Check `vercel.json` has `deploymentEnabled: false`

---

## CI/CD Pipeline Details

### Build Process

1. **Checkout code**
2. **Setup Node.js 20** with npm cache
3. **Install dependencies** (`npm ci`)
4. **Build packages** in monorepo order
5. **Build services** with production config
6. **Run tests** (if configured)

### Deployment Process

**Backend (Railway):**
1. Install Railway CLI
2. Link to project
3. Set environment variables via `railway variables set`
4. Deploy via `railway up --detach`
5. Wait 30 seconds for stabilization
6. Run health checks with retry logic

**Frontend (Vercel):**
1. Build Next.js with all environment variables
2. Install Vercel CLI
3. Deploy via `vercel deploy --prod`
4. Output deployment URL

### Concurrency

- Backend services deploy in parallel
- Frontend waits for backend (needs: deploy-backend)
- Notification job always runs (if: always())

---

## Best Practices

### Development Workflow

1. **Feature Development:**
   ```bash
   git checkout -b feature/new-feature
   # Make changes
   git commit -m "feat: add new feature"
   git push origin feature/new-feature
   ```

2. **Create Pull Request to `dev`:**
   - No auto-deployment on feature branches
   - Review and merge to `dev`

3. **Test in Development:**
   - Merge to `dev` triggers deployment
   - Test thoroughly in dev environment

4. **Promote to Production:**
   ```bash
   git checkout master
   git merge dev
   git push origin master
   ```
   - Requires approval before deployment
   - 5-minute wait timer for rollback window

### Secret Rotation

**Quarterly Rotation Schedule:**

1. **Generate new secrets:**
   ```bash
   # Generate 64-character hex secrets
   openssl rand -hex 32
   ```

2. **Update GitHub secrets:**
   ```bash
   gh secret set PROD_RAILWAY_JWT_SECRET -b"<new-value>"
   gh secret set PROD_RAILWAY_SESSION_SECRET -b"<new-value>"
   ```

3. **Trigger deployment:**
   - Push to master or run workflow manually
   - New secrets automatically injected

4. **Verify services:**
   - Check health endpoints
   - Test authentication flows

5. **Invalidate old secrets:**
   - Update in Neon/Upstash dashboards if needed

### Monitoring

**Recommended Tools:**
- **Railway Logs:** Built-in log viewer
- **Vercel Analytics:** Deployment and runtime metrics
- **Uptime Robot:** External health monitoring
- **Sentry:** Error tracking (if configured)

---

## Emergency Contacts

- **Railway Dashboard:** https://railway.app/project/cb1982ed-db09-409e-8af5-5bbd40e248f4
- **Vercel Dashboard:** https://vercel.com/team_kInU2r2UcEzXkzNsM64AemCb/sepulki-forge-ui
- **GitHub Actions:** https://github.com/CatsMeow492/Sepulki/actions
- **Neon Console:** https://console.neon.tech
- **Upstash Console:** https://console.upstash.com

---

## Migration History

**Date:** November 7, 2025

**Migration:** Moved from platform auto-deploy to GitHub Actions-controlled deployments

**Changes:**
- ✅ All secrets migrated to GitHub repository settings
- ✅ Railway auto-deploy disabled
- ✅ Vercel auto-deploy disabled
- ✅ Removed `deploy/env/production.secrets.json` from repository
- ✅ Created new deployment workflows
- ✅ Added health check automation

**Backup:** `backup-migration-20251107/`

**Rollback:** If needed, run `./backup-migration-20251107/RESTORE.sh`

---

## Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Vercel Documentation](https://vercel.com/docs)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Sepulki Architecture](./ARCHITECTURE.md)
- [Contributing Guide](../CONTRIBUTING.md)
