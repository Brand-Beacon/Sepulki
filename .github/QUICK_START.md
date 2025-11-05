# Quick Start Guide - GitHub Actions CI/CD

Get your CI/CD pipelines up and running in 15 minutes.

## 🚀 Step-by-Step Setup

### Step 1: Fork/Clone Repository (1 min)

```bash
git clone https://github.com/your-org/sepulki.git
cd sepulki
```

### Step 2: Configure GitHub Secrets (5 mins)

Go to: `Settings > Secrets and variables > Actions > New repository secret`

**Minimum Required Secrets**:

```bash
# Vercel (Frontend)
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# API
NEXT_PUBLIC_API_URL=https://api.yourdomain.com

# Database
DEV_DATABASE_URL=postgresql://localhost:5432/sepulki_dev
STAGING_DATABASE_URL=postgresql://staging.host/sepulki_staging
PROD_DATABASE_URL=postgresql://prod.host/sepulki_prod
```

**Optional (Choose deployment method)**:
```bash
# Option 1: Railway
RAILWAY_TOKEN=your_railway_token

# Option 2: SSH
DEPLOY_HOST=your.server.com
DEPLOY_USER=deploy
DEPLOY_SSH_KEY=-----BEGIN PRIVATE KEY-----...

# Option 3: Kubernetes
KUBECONFIG=<base64 encoded kubeconfig>
```

### Step 3: Get Vercel Credentials (3 mins)

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Generate token
vercel tokens create "GitHub Actions"

# Link project
cd app
vercel link

# Get IDs
vercel project ls
```

Copy the Organization ID and Project ID to GitHub secrets.

### Step 4: Enable Branch Protection (2 mins)

Go to: `Settings > Branches > Add branch protection rule`

**Branch name pattern**: `main` (or `master`)

Enable:
- ✅ Require pull request reviews
- ✅ Require status checks to pass
- ✅ Require conversation resolution

**Required status checks**:
- `Test Suite Status`
- `Code Quality Analysis`
- `Security Scan`

### Step 5: Test Your Setup (4 mins)

```bash
# Create a test branch
git checkout -b test/ci-cd-setup

# Make a small change
echo "# CI/CD Test" >> README.md

# Commit and push
git add README.md
git commit -m "test: CI/CD setup"
git push origin test/ci-cd-setup

# Create PR via GitHub UI
# Watch workflows run!
```

## ✅ Verify Everything Works

### Check Frontend Workflow

1. Go to `Actions` tab
2. Find "Frontend CI/CD" workflow
3. Should see: ✅ Install, ✅ Type Check, ✅ Lint, ✅ Build, ✅ Deploy Preview

### Check Test Workflow

1. Find "Test Suite" workflow
2. Should see: ✅ Frontend tests, ✅ Backend tests, ✅ E2E tests

### Check Code Quality

1. Find "Code Quality" workflow
2. Should see: ✅ Security scan, ✅ Dependency review

## 🎯 Next Steps

### Optional: Setup Railway (Backend)

```bash
# Install CLI
npm i -g @railway/cli

# Login
railway login

# For each service
cd services/hammer-orchestrator
railway init
railway up

# Get token
railway tokens create
```

Add `RAILWAY_TOKEN` to GitHub secrets.

### Optional: Setup Codecov (Test Coverage)

1. Sign up at [codecov.io](https://codecov.io)
2. Add repository
3. Copy token
4. Add `CODECOV_TOKEN` to GitHub secrets

### Optional: Setup Slack/Discord Notifications

**Slack**:
1. Create webhook: https://api.slack.com/messaging/webhooks
2. Add `SLACK_WEBHOOK` secret
3. Uncomment notification steps in workflows

**Discord**:
1. Server Settings > Integrations > Webhooks
2. Add `DISCORD_WEBHOOK` secret

## 📊 What Gets Deployed

### On Pull Request

✅ Frontend preview deployment (Vercel)
✅ All tests run
✅ Security scanning
✅ Code quality checks
❌ No production deployment

### On Push to Main

✅ Frontend production deployment (Vercel)
✅ Backend services deployment (Railway/SSH/K8s)
✅ All tests run
✅ Security scanning
✅ Docker images pushed to registry

### On Manual Trigger

You can manually run:
- Database migrations (`workflow_dispatch`)
- Backend deployment for specific service
- Cleanup workflows

## 🐛 Troubleshooting

### "No cache found" warning

**Normal!** First run won't have cache. Subsequent runs will be faster.

### Vercel deployment fails

```bash
# Check token validity
vercel whoami

# Verify project link
cd app
vercel link

# Test deployment locally
vercel deploy
```

### Tests fail

```bash
# Run tests locally
cd app
pnpm test

# Check logs in Actions tab
# Fix failing tests
# Push again
```

### Docker build fails

```bash
# Test Docker build locally
cd services/hammer-orchestrator
docker build -t test-build .

# If works locally but fails in CI:
# - Check secrets are set
# - Verify Dockerfile path
# - Check build context
```

### Database migration fails

```bash
# Test migration locally
export DATABASE_URL=postgresql://...
npx prisma migrate status

# Dry run
npx prisma migrate deploy --preview-feature
```

## 🎨 Customization

### Change Node Version

Edit workflows:
```yaml
env:
  NODE_VERSION: '20'  # Change to 18, 20, 21, etc.
```

### Skip Workflows on Certain Paths

```yaml
on:
  push:
    paths:
      - 'app/**'      # Only run on app changes
      - '!docs/**'    # Ignore docs changes
```

### Add New Test Framework

```yaml
- name: Run tests
  run: |
    # Add your test command
    npm run test:unit
    npm run test:integration
```

## 📚 Learn More

- [Full Deployment Guide](./DEPLOYMENT.md) - Complete setup
- [Workflow Details](./README.md) - Technical documentation
- [GitHub Actions Docs](https://docs.github.com/en/actions)

## 💡 Pro Tips

1. **Start Small**: Get frontend deployment working first
2. **Test Locally**: Use `act` to test workflows locally
3. **Monitor Runs**: Watch the Actions tab for first few PRs
4. **Iterate**: Start with basic workflows, add features gradually
5. **Cache Everything**: Caching speeds up builds 2-3x

## ❓ Common Questions

**Q: How long do workflows take?**
A: Frontend: 4-6 min, Backend: 8-12 min, Tests: 10-15 min

**Q: Can I deploy without PRs?**
A: Yes, push directly to main (not recommended for production)

**Q: How much does this cost?**
A: GitHub Actions: 2000 free minutes/month (plenty for most projects)

**Q: Can I run workflows locally?**
A: Yes, use [act](https://github.com/nektos/act): `act push`

**Q: What if deployment fails?**
A: Workflows have automatic rollback. Previous version keeps running.

**Q: How do I skip CI on a commit?**
A: Add `[skip ci]` to commit message: `git commit -m "docs: update [skip ci]"`

## 🆘 Getting Help

1. Check [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed docs
2. Review workflow logs in Actions tab
3. Search existing issues
4. Create new issue with logs

---

**Setup Time**: ~15 minutes
**First Deploy**: ~10 minutes
**Subsequent Deploys**: ~5-6 minutes (with caching)

Ready to deploy? Push to main and watch the magic happen! 🚀
