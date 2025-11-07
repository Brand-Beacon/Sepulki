# 🚀 Railway Quick Start - Connect & Deploy

## ⚡ 5-Minute Setup

### 1️⃣ Open Railway Dashboard
```
https://railway.app/project/cb1982ed-db09-409e-8af5-5bbd40e248f4
```

### 2️⃣ Connect Services to GitHub

#### For `hammer-orchestrator`:
1. Click service → Settings → Source
2. "Connect to GitHub Repository"
3. Select: `Brand-Beacon/Sepulki`
4. Branch: `master`
5. **Root Directory: `/`** ⚠️ Important!
6. Builder: Dockerfile
7. Dockerfile Path: `Dockerfile.railway`
8. Click "Deploy"

#### For `local-auth`:
Repeat steps above for `local-auth` service

### 3️⃣ Monitor Deployments
```bash
railway service hammer-orchestrator
railway logs -f
```

### 4️⃣ Verify Health
```bash
# Get URLs
railway domain

# Test
curl https://<service-url>/health
```

## ✅ Expected Results

### Build Success:
```
✓ Building Docker image
✓ Image built successfully
✓ Deploying container
✓ Health check passed
```

### Health Check:
```json
{"status":"ok","service":"hammer-orchestrator"}
{"status":"ok","service":"local-auth"}
```

## 🎯 Service IDs

- **hammer-orchestrator:** `b0f943c3-a4f7-4568-96f4-10ba2f29e1f8`
- **local-auth:** `5384e79a-8bcc-4b12-b607-7fc296508abe`

## 📚 Full Documentation

- **Complete Guide:** `/docs/RAILWAY_GITHUB_CONNECTION_COMPLETE.md`
- **Manual Setup:** `/docs/railway-github-manual-setup.md`
- **Status Report:** `/docs/railway-deployment-status.md`

## 🐛 Quick Troubleshooting

### Build fails?
- Check root directory is `/`
- Verify Dockerfile.railway exists
- Review build logs in dashboard

### Health check fails?
- Check logs: `railway logs`
- Verify DATABASE_URL is set
- Ensure PORT binding is correct

## 🆘 Help

- **Railway Docs:** https://docs.railway.app
- **Project URL:** https://railway.app/project/cb1982ed-db09-409e-8af5-5bbd40e248f4
- **Repository:** https://github.com/Brand-Beacon/Sepulki

---

**That's it!** Once connected, deployments auto-trigger on git push to `master`.
