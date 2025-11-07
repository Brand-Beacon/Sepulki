# Railway GitHub Connection Setup - Complete Guide

## 🎯 Executive Summary

**Status:** ✅ **READY FOR MANUAL CONNECTION**

All preparation work is complete. The Railway services are configured and ready to be connected to GitHub through the Railway web dashboard.

## 📋 What Was Completed

### ✅ Infrastructure Setup
1. **Railway Services Created:**
   - `hammer-orchestrator` (Service ID: b0f943c3-a4f7-4568-96f4-10ba2f29e1f8)
   - `local-auth` (Service ID: 5384e79a-8bcc-4b12-b607-7fc296508abe)

2. **Environment Variables Configured:**
   - All required environment variables set for both services
   - Database connections configured
   - JWT secrets configured
   - Service URLs configured

3. **Deployment Files Created:**
   - `/Dockerfile.railway` - Multi-stage Docker build
   - `/railway.json` - Railway deployment configuration
   - Both committed to `master` branch

4. **Scripts and Documentation:**
   - `/scripts/railway-connect.sh` - Automated connection script (requires interactive mode)
   - `/scripts/railway-github-connect.py` - Python alternative
   - `/docs/railway-github-manual-setup.md` - Step-by-step manual guide
   - `/docs/railway-deployment-status.md` - Current status report

## 🚀 Next Steps (Action Required)

### Option 1: Manual Setup (Recommended - 5 minutes)

1. **Open Railway Dashboard:**
   ```
   https://railway.app/project/cb1982ed-db09-409e-8af5-5bbd40e248f4
   ```

2. **Connect hammer-orchestrator:**
   - Click `hammer-orchestrator` service
   - Settings → Source
   - "Connect to GitHub Repository"
   - Repository: `Brand-Beacon/Sepulki`
   - Branch: `master`
   - Root Directory: `/` ⚠️ **CRITICAL for monorepo**
   - Builder: Dockerfile
   - Dockerfile Path: `Dockerfile.railway`
   - Click "Deploy"

3. **Connect local-auth:**
   - Repeat same steps for `local-auth` service

4. **Monitor Deployments:**
   ```bash
   # Terminal 1: hammer-orchestrator logs
   railway service hammer-orchestrator
   railway logs -f

   # Terminal 2: local-auth logs
   railway service local-auth
   railway logs -f
   ```

### Option 2: Interactive CLI (If Available)

```bash
# Deploy hammer-orchestrator
cd services/hammer-orchestrator
railway service hammer-orchestrator
railway up -d

# Deploy local-auth
cd ../local-auth
railway service local-auth
railway up -d
```

## 📊 Service Configuration

### hammer-orchestrator

**Purpose:** Main GraphQL API orchestrator

**Configuration:**
```yaml
Service ID: b0f943c3-a4f7-4568-96f4-10ba2f29e1f8
Port: 4000
Health Check: /health
Root Directory: /
Dockerfile: Dockerfile.railway
Build Target: hammer-orchestrator
```

**Environment Variables:**
- `PORT=4000`
- `NODE_ENV=production`
- `DATABASE_URL` (configured)
- `REDIS_URL` (configured)
- `JWT_SECRET` (configured)
- `LOCAL_AUTH_URL` (configured)

**Expected Build Time:** 2-3 minutes

### local-auth

**Purpose:** Authentication service

**Configuration:**
```yaml
Service ID: 5384e79a-8bcc-4b12-b607-7fc296508abe
Port: 3001
Health Check: /health
Root Directory: /
Dockerfile: Dockerfile.railway
Build Target: local-auth
```

**Environment Variables:**
- `PORT=3001`
- `NODE_ENV=production`
- `DATABASE_URL` (configured)
- `JWT_SECRET` (configured)
- `JWT_EXPIRES_IN=7d`

**Expected Build Time:** 2-3 minutes

## 🔍 Verification Checklist

After connecting to GitHub and deploying:

### 1. Build Success
- [ ] hammer-orchestrator build completes without errors
- [ ] local-auth build completes without errors
- [ ] Docker images created successfully

### 2. Deployment Status
```bash
# Check hammer-orchestrator
railway service hammer-orchestrator
railway status
# Expected: "Active" or "Deployed"

# Check local-auth
railway service local-auth
railway status
# Expected: "Active" or "Deployed"
```

### 3. Health Checks
```bash
# Get service URLs
railway domain

# Test hammer-orchestrator
curl https://<hammer-url>/health
# Expected: {"status":"ok","service":"hammer-orchestrator"}

# Test local-auth
curl https://<auth-url>/health
# Expected: {"status":"ok","service":"local-auth"}
```

### 4. Logs Verification
```bash
# Check for startup messages
railway logs | grep "Server running"
railway logs | grep "Database connected"
```

## 🐛 Troubleshooting

### Issue: Build Fails

**Check:**
1. Dockerfile.railway exists in root:
   ```bash
   ls -la Dockerfile.railway
   ```

2. Root directory is set to `/` (not a subdirectory)

3. Package.json files exist:
   ```bash
   ls -la services/hammer-orchestrator/package.json
   ls -la services/local-auth/package.json
   ```

**Solution:**
- Review build logs in Railway dashboard
- Verify Dockerfile syntax
- Check dependencies in package.json

### Issue: Health Check Fails

**Check:**
1. Service logs for errors:
   ```bash
   railway logs
   ```

2. Database connection:
   ```bash
   railway variables | grep DATABASE_URL
   ```

3. Port binding (must be `0.0.0.0:$PORT`)

**Solution:**
- Verify environment variables
- Check database service is running
- Review application startup logs

### Issue: "Not Authorized" API Error

**This is expected.** The Railway API token provided has limited permissions. This is why manual dashboard connection is recommended.

**Solution:**
- Use Railway web dashboard (Option 1)
- Or generate new API token with full permissions

## 📈 Post-Deployment

### 1. Get Service URLs
```bash
# hammer-orchestrator
railway service hammer-orchestrator
railway domain
# Note the URL

# local-auth
railway service local-auth
railway domain
# Note the URL
```

### 2. Update Frontend Configuration

Update `apps/forge-ui/.env.production`:
```env
NEXT_PUBLIC_GRAPHQL_URL=https://<hammer-url>/graphql
NEXT_PUBLIC_AUTH_URL=https://<auth-url>
```

### 3. Test API Endpoints

```bash
# Test GraphQL endpoint
curl -X POST https://<hammer-url>/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __schema { queryType { name } } }"}'

# Test authentication
curl -X POST https://<auth-url>/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### 4. Configure Auto-Deploy

✅ Once connected to GitHub:
- Automatic deployments on push to `master`
- Build previews on pull requests (optional)
- Rollback capability

## 📚 Documentation Reference

| Document | Purpose |
|----------|---------|
| `railway-github-manual-setup.md` | Detailed step-by-step manual setup |
| `railway-deployment-status.md` | Current deployment status |
| `RAILWAY_GITHUB_CONNECTION_COMPLETE.md` | This summary document |

## 🔗 Quick Links

- **Railway Project:** https://railway.app/project/cb1982ed-db09-409e-8af5-5bbd40e248f4
- **GitHub Repository:** https://github.com/Brand-Beacon/Sepulki
- **Railway Docs:** https://docs.railway.app
- **Railway Status:** https://status.railway.app

## 🎉 Success Criteria

Your deployment is successful when:

1. ✅ Both services show "Active" status in Railway dashboard
2. ✅ Health endpoints return `{"status":"ok"}`
3. ✅ No errors in deployment logs
4. ✅ GraphQL endpoint responds to queries
5. ✅ Authentication endpoints work correctly
6. ✅ Auto-deploy triggers on git push

## 💡 Tips

1. **Monitor First Deployment:** Watch logs carefully during first deployment to catch any issues early

2. **Test Incrementally:** Test each service individually before testing together

3. **Use Staging First:** Consider creating a staging environment to test changes

4. **Set Up Alerts:** Configure Railway alerts for deployment failures

5. **Document URLs:** Save service URLs in your `.env` files and documentation

## 🆘 Support

If you need help:

1. **Railway Documentation:** https://docs.railway.app/guides/dockerfiles
2. **Railway Discord:** https://discord.gg/railway
3. **Check Logs:** `railway logs` is your best friend
4. **Railway Status:** https://status.railway.app

---

## Summary

### ✅ Completed
- Railway services created and configured
- Environment variables set
- Dockerfile.railway prepared and tested
- railway.json configuration created
- Documentation and scripts provided
- CLI authenticated and ready

### ⚠️ Action Required
**Connect both services to GitHub through Railway web dashboard to complete deployment.**

### 🎯 Time Estimate
**5-10 minutes** for manual GitHub connection and initial deployment

### 📧 Questions?
Review the detailed guides in `/docs/` or check Railway documentation.

---

**Last Updated:** 2025-11-05
**Railway Project ID:** cb1982ed-db09-409e-8af5-5bbd40e248f4
**Repository:** Brand-Beacon/Sepulki
**Branch:** master
