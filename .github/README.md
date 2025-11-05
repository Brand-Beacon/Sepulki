# GitHub Actions CI/CD Workflows

This directory contains production-ready GitHub Actions workflows for automated testing, building, and deployment of the Sepulki application.

## 📁 Workflow Files

### Core Deployment Workflows

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| **Frontend Deploy** | `frontend-deploy.yml` | Push to main, PRs | Build and deploy Next.js app to Vercel |
| **Backend Deploy** | `backend-deploy.yml` | Push to main (services/*) | Build Docker images and deploy services |
| **Test Suite** | `test.yml` | All PRs, push to main | Run unit, integration, and E2E tests |
| **Database Migrations** | `db-migrations.yml` | Manual workflow_dispatch | Run database migrations with safety checks |

### Supporting Workflows

| Workflow | File | Trigger | Purpose |
|----------|------|---------|---------|
| **Code Quality** | `code-quality.yml` | PRs, push to main | Security scanning, dependency review |
| **Dependabot Auto-Merge** | `dependabot-auto-merge.yml` | Dependabot PRs | Auto-merge minor/patch updates |
| **Cleanup** | `cleanup.yml` | Weekly schedule | Clean up old runs, artifacts, caches |

## 🚀 Quick Start

### 1. Configure Secrets

Add these secrets in `Settings > Secrets and variables > Actions`:

**Frontend (Required)**:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_API_URL`

**Backend (Choose one deployment method)**:
- `RAILWAY_TOKEN` (for Railway)
- OR `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY` (for SSH)
- OR `KUBECONFIG` (for Kubernetes)

**Database**:
- `DEV_DATABASE_URL`
- `STAGING_DATABASE_URL`
- `PROD_DATABASE_URL`

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete setup instructions.

### 2. Enable Workflows

Workflows are automatically enabled when you push to your repository. The first run may require approval.

### 3. Configure Branch Protection

Recommended settings for `main`/`master` branch:

```
Settings > Branches > Branch protection rules
✓ Require pull request reviews before merging
✓ Require status checks to pass before merging
  - Test Suite Status
  - Code Quality Analysis
  - Security Scan
✓ Require conversation resolution before merging
✓ Do not allow bypassing the above settings
```

## 📊 Workflow Details

### Frontend Deployment

**Workflow**: `frontend-deploy.yml`

**Jobs**:
1. **Install** - Cache dependencies for faster builds
2. **Type Check** - Validate TypeScript types
3. **Lint** - Check code style with ESLint
4. **Build** - Build Next.js application
5. **Deploy** - Deploy to Vercel (production or preview)

**Optimizations**:
- Parallel type checking and linting
- Dependency caching with pnpm
- Next.js build caching
- Conditional deployment (main = production, PRs = preview)

**Example Run Time**: ~4-6 minutes

### Backend Deployment

**Workflow**: `backend-deploy.yml`

**Jobs**:
1. **Detect Changes** - Auto-detect which services changed
2. **Build Services** - Build Docker images (parallel for each service)
3. **Deploy Services** - Deploy to Railway/SSH/Kubernetes
4. **Health Check** - Verify deployment success
5. **Rollback** - Auto-rollback on failure

**Features**:
- Smart change detection (only builds changed services)
- Multi-service support (hammer-orchestrator, local-auth, anvil-sim)
- Docker layer caching for faster builds
- Automatic health checks post-deployment

**Example Run Time**: ~8-12 minutes (depends on services changed)

### Test Suite

**Workflow**: `test.yml`

**Jobs**:
1. **Frontend Unit Tests** - Jest/Vitest tests with coverage
2. **Backend Unit Tests** - Service-specific tests (matrix strategy)
3. **Integration Tests** - Full-stack tests with Postgres/Redis
4. **E2E Tests** - Playwright tests (Chromium, Firefox, WebKit)
5. **Performance Tests** - Lighthouse CI (PRs only)
6. **Coverage Report** - Aggregate and report coverage

**Test Infrastructure**:
- PostgreSQL 15 service container
- Redis 7 service container
- Playwright with 3 browsers
- Codecov integration

**Example Run Time**: ~10-15 minutes

### Database Migrations

**Workflow**: `db-migrations.yml`

**Jobs**:
1. **Pre-Migration Checks** - Validate environment and require approval
2. **Backup Database** - Create pg_dump backup (optional but recommended)
3. **Run Migrations** - Execute Prisma/Knex migrations
4. **Verify Migration** - Health checks and tests
5. **Emergency Rollback** - Auto-restore from backup on failure

**Safety Features**:
- Manual approval required for production
- Automatic backups before migration
- Health checks after migration
- Emergency rollback on failure
- Backup artifacts retained 30 days

**Example Run Time**: ~5-10 minutes (excluding approval wait)

### Code Quality

**Workflow**: `code-quality.yml`

**Jobs**:
1. **Security Scan** - Trivy vulnerability scanner
2. **Dependency Review** - Check for vulnerable dependencies
3. **Code Quality** - ESLint and Prettier checks

**Integrations**:
- GitHub Security tab (SARIF reports)
- npm audit
- Dependency review action

**Example Run Time**: ~3-5 minutes

## 🎯 Best Practices

### 1. Parallel Execution

Jobs run in parallel where possible:
```yaml
jobs:
  typecheck:
    needs: install
  lint:
    needs: install  # Both run in parallel
```

### 2. Caching Strategy

Multiple caching layers:
- **Dependencies**: pnpm store, npm cache
- **Build artifacts**: Next.js cache, Docker layers
- **Test results**: Coverage reports

### 3. Conditional Execution

Skip unnecessary work:
```yaml
if: github.event_name == 'push' && github.ref == 'refs/heads/main'
```

### 4. Matrix Strategy

Test across multiple configurations:
```yaml
strategy:
  matrix:
    service: [hammer-orchestrator, local-auth, anvil-sim]
    browser: [chromium, firefox, webkit]
```

### 5. Fail-Fast Prevention

```yaml
strategy:
  fail-fast: false  # Continue testing other browsers
```

## 🔧 Customization

### Adding a New Service

1. Add service to backend deployment workflow:
```yaml
# .github/workflows/backend-deploy.yml
jobs:
  detect-changes:
    steps:
      - name: Check for service changes
        run: |
          if git diff --name-only | grep -q "services/new-service"; then
            echo "new_service=true" >> $GITHUB_OUTPUT
          fi
```

2. Create build job (copy existing service job)

3. Add to deployment step

### Changing Deployment Platform

**From Railway to Kubernetes**:
1. Remove Railway deployment step
2. Uncomment Kubernetes deployment step
3. Add `KUBECONFIG` secret
4. Create Kubernetes manifests

**From Vercel to Netlify**:
1. Replace `vercel-action` with `netlify-actions`
2. Update secrets (NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID)
3. Adjust build configuration

### Adding Test Frameworks

**For Jest**:
```yaml
- name: Run tests
  run: npm test -- --coverage --ci
```

**For Vitest**:
```yaml
- name: Run tests
  run: npm run test:coverage
```

**For Cypress**:
```yaml
- name: Run Cypress
  uses: cypress-io/github-action@v6
  with:
    start: npm start
```

## 📈 Monitoring

### Workflow Status Badges

Add to your README.md:
```markdown
![Frontend Deploy](https://github.com/your-org/sepulki/actions/workflows/frontend-deploy.yml/badge.svg)
![Backend Deploy](https://github.com/your-org/sepulki/actions/workflows/backend-deploy.yml/badge.svg)
![Test Suite](https://github.com/your-org/sepulki/actions/workflows/test.yml/badge.svg)
```

### GitHub Actions Dashboard

View all workflow runs:
```
https://github.com/your-org/sepulki/actions
```

### Email Notifications

Configure in GitHub settings:
```
Settings > Notifications > Actions
✓ Send notifications for failed workflows
```

## 🐛 Troubleshooting

### Common Issues

**Build fails with "No cache found"**:
- First run won't have cache
- Subsequent runs will be faster

**Test timeout**:
- Increase timeout: `timeout-minutes: 60`
- Or optimize test suite

**Docker build fails**:
- Check Dockerfile syntax
- Verify build context
- Test locally: `docker build -t test .`

**Vercel deployment fails**:
- Verify token hasn't expired
- Check project ID is correct
- Ensure environment variables are set

### Debug Mode

Enable debug logging:
```
Settings > Secrets and variables > Variables
Name: ACTIONS_RUNNER_DEBUG
Value: true
```

### Local Testing

Test workflows locally with [act](https://github.com/nektos/act):
```bash
# Install act
brew install act

# Run workflow locally
act push -W .github/workflows/test.yml
```

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Workflow Syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Deployment Guide](./DEPLOYMENT.md) - Complete deployment setup
- [Security Best Practices](https://docs.github.com/en/actions/security-guides/security-hardening-for-github-actions)

## 🤝 Contributing

When modifying workflows:

1. Test locally with `act` if possible
2. Test on a feature branch first
3. Request review from DevOps team (see CODEOWNERS)
4. Document changes in pull request
5. Update this README if adding new workflows

## 📝 Workflow Maintenance

### Regular Tasks

- [ ] Review and update Node.js version quarterly
- [ ] Update GitHub Actions to latest versions monthly
- [ ] Review and rotate secrets every 90 days
- [ ] Check Dependabot PRs weekly
- [ ] Review failed workflow runs daily
- [ ] Monitor cache hit rates monthly
- [ ] Review and optimize slow workflows monthly

### Workflow Health Checklist

- [ ] All workflows have descriptive names
- [ ] Jobs are parallelized where possible
- [ ] Caching is implemented
- [ ] Secrets are not exposed in logs
- [ ] Error handling is in place
- [ ] Notifications are configured
- [ ] Cleanup jobs are running

---

**Last Updated**: 2025-11-04
**Maintained By**: DevOps Team
**Questions?**: Create an issue or check [DEPLOYMENT.md](./DEPLOYMENT.md)
