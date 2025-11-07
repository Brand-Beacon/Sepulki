# 🚀 Deployment Guide

## Quick Deploy

```bash
npm run deploy              # Deploy everything
npm run deploy:backend      # Backend services only  
npm run deploy:frontend     # Frontend only
```

## Backend (Railway)

### Individual Services
```bash
npm run deploy:hammer       # Hammer Orchestrator
npm run deploy:auth         # Local Auth
```

### Manual Deployment
```bash
cd services/hammer-orchestrator
railway up --detach
```

## Frontend (Vercel)

```bash
npm run deploy:frontend     # Production
npm run deploy:preview      # Preview
```

## CI/CD

### Automatic Deployments
- **Backend**: Push to `master` → Production, `dev` → Development
- **Frontend**: Push to `master` → Production, PR → Preview

### Tests Status
⚠️ Tests are **non-blocking** - deployments proceed regardless

## Monitoring

```bash
gh run list                 # List workflows
gh run watch               # Watch current run
```

## Troubleshooting

**"Project Token not found"**
- Ensure secrets are configured in GitHub
- Check RAILWAY_SERVICE_* and RAILWAY_ENVIRONMENT_* secrets

**Build fails**
- Check logs: `gh run view <id>`
- Review environment variables in Railway/Vercel dashboard

## Health Checks

Services expose `/health` endpoints:
- Hammer Orchestrator: `/health` and `/graphql`
- Local Auth: `/health` and `/auth/*`

Health checks are non-blocking.
