# Railway Deployment Guide - Sepulki Backend Services

## 🚂 Overview

This guide covers deploying the Sepulki backend services (hammer-orchestrator and local-auth) to Railway.app, a modern platform-as-a-service with automatic deployments, built-in databases, and simplified configuration.

## 📋 Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Service Configuration](#service-configuration)
4. [Database Setup](#database-setup)
5. [Deployment Steps](#deployment-steps)
6. [Environment Variables](#environment-variables)
7. [Monitoring & Logs](#monitoring--logs)
8. [Cost Estimation](#cost-estimation)
9. [Troubleshooting](#troubleshooting)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Railway Project                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐         ┌────────────────────┐      │
│  │  PostgreSQL DB   │◄────────┤  Hammer Orchestr.  │      │
│  │  (Shared)        │         │  Port: 4000        │      │
│  └────────┬─────────┘         └───────┬────────────┘      │
│           │                            │                    │
│           │                            │ GraphQL API       │
│           │                   ┌────────▼────────────┐      │
│           │                   │   Frontend (Next.js) │      │
│           │                   │   Port: 3000        │      │
│           │                   └─────────────────────┘      │
│           │                                                 │
│           └────────────┐                                    │
│                        │                                    │
│                 ┌──────▼────────┐                          │
│                 │  Local Auth   │                          │
│                 │  Port: 3001   │                          │
│                 └───────────────┘                          │
│                                                             │
│  ┌──────────────────┐                                      │
│  │  Redis Cache     │                                      │
│  │  (Sessions)      │                                      │
│  └──────────────────┘                                      │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## ✅ Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Repository**: Your code should be in a GitHub repository
3. **Railway CLI** (optional): Install for local management
   ```bash
   npm i -g @railway/cli
   railway login
   ```

## 🔧 Service Configuration

### Service 1: Hammer Orchestrator (GraphQL API)

**Purpose**: Main GraphQL API gateway for robot fleet management

**Configuration Files**:
- `services/hammer-orchestrator/railway.json` - Railway service config
- `services/hammer-orchestrator/Dockerfile.railway` - Optimized Docker build

**Key Features**:
- Multi-stage Docker build for minimal image size
- Health check endpoint: `/health`
- File upload support (50MB limit)
- Real-time telemetry generation
- GraphQL Playground (configurable)

### Service 2: Local Auth

**Purpose**: Authentication service with session management

**Configuration Files**:
- `services/local-auth/railway.json` - Railway service config
- `services/local-auth/Dockerfile.railway` - Optimized Docker build

**Key Features**:
- JWT token generation
- Redis session storage
- Rate limiting for security
- CSRF protection
- Production-ready authentication flow

---

## 🗄️ Database Setup

### PostgreSQL Database

**Option 1: Railway PostgreSQL (Recommended)**

1. Create a new PostgreSQL database in Railway dashboard
2. Railway automatically sets `DATABASE_URL` environment variable
3. Connect format: `postgresql://username:password@host:port/database`

**Option 2: External Database (Supabase, AWS RDS)**

1. Create database on external provider
2. Manually set `DATABASE_URL` in Railway environment variables
3. Ensure SSL is enabled: `DATABASE_URL=postgresql://...?sslmode=require`

### Redis Cache

**Option 1: Railway Redis (Recommended)**

1. Add Redis plugin from Railway marketplace
2. Railway automatically sets `REDIS_URL` environment variable
3. Connect format: `redis://default:password@host:port`

**Option 2: External Redis (Upstash, AWS ElastiCache)**

1. Create Redis instance on external provider
2. Manually set `REDIS_URL` in Railway environment variables

### Database Migration

Run migrations after database creation:

```bash
# From project root
psql $DATABASE_URL -f infrastructure/sql/migrations/001_initial_schema.sql
psql $DATABASE_URL -f infrastructure/sql/migrations/002_add_indexes.sql
```

---

## 🚀 Deployment Steps

### Method 1: Railway Dashboard (Recommended for first deployment)

#### Step 1: Create New Project

1. Go to [railway.app/dashboard](https://railway.app/dashboard)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway to access your repository
5. Select your `Sepulki` repository

#### Step 2: Add PostgreSQL Database

1. Click **"+ New"** → **"Database"** → **"Add PostgreSQL"**
2. Wait for database to provision (30-60 seconds)
3. Note: `DATABASE_URL` is automatically added to all services

#### Step 3: Add Redis Cache

1. Click **"+ New"** → **"Database"** → **"Add Redis"**
2. Wait for Redis to provision (30-60 seconds)
3. Note: `REDIS_URL` is automatically added to all services

#### Step 4: Deploy Hammer Orchestrator

1. Click **"+ New"** → **"GitHub Repo"**
2. Configure service:
   - **Name**: `hammer-orchestrator`
   - **Root Directory**: `services/hammer-orchestrator`
   - **Builder**: Dockerfile
   - **Dockerfile Path**: `Dockerfile.railway`
3. Click **"Add Variables"** and configure environment variables (see below)
4. Click **"Deploy"**

#### Step 5: Deploy Local Auth

1. Click **"+ New"** → **"GitHub Repo"**
2. Configure service:
   - **Name**: `local-auth`
   - **Root Directory**: `services/local-auth`
   - **Builder**: Dockerfile
   - **Dockerfile Path**: `Dockerfile.railway`
3. Click **"Add Variables"** and configure environment variables (see below)
4. Click **"Deploy"**

#### Step 6: Generate Public URLs

1. Click on `hammer-orchestrator` service
2. Go to **Settings** → **Networking**
3. Click **"Generate Domain"**
4. Copy the URL (e.g., `hammer-orchestrator-production.up.railway.app`)
5. Repeat for `local-auth` service

### Method 2: Railway CLI (Advanced)

```bash
# Login to Railway
railway login

# Create new project
railway init

# Link to existing project (if already created)
railway link

# Deploy hammer-orchestrator
cd services/hammer-orchestrator
railway up

# Deploy local-auth
cd ../local-auth
railway up
```

---

## 🔐 Environment Variables

### Hammer Orchestrator Environment Variables

**Required Variables:**

```env
# Node Environment
NODE_ENV=production

# Server Configuration
PORT=4000
HOST=0.0.0.0

# Database (automatically set by Railway PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (automatically set by Railway Redis)
REDIS_URL=${{Redis.REDIS_URL}}

# JWT Secret (MUST match local-auth)
JWT_SECRET=<generate-secure-secret>
JWT_EXPIRATION=86400
JWT_ISSUER=sepulki-platform

# CORS (set to your frontend domain)
CORS_ORIGIN=https://your-frontend.railway.app,https://your-custom-domain.com
CORS_CREDENTIALS=true

# GraphQL Configuration
GRAPHQL_PLAYGROUND=false
GRAPHQL_INTROSPECTION=false

# Telemetry
ENABLE_TELEMETRY=true
TELEMETRY_INTERVAL_MS=5000

# Security
ENABLE_SECURITY_HEADERS=true
RATE_LIMIT_ENABLED=true
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
```

**Optional Variables:**

```env
# External Services
ISAAC_SIM_ENDPOINT=https://your-isaac-sim-endpoint.com
VIDEO_PROXY_ENDPOINT=https://your-video-proxy.railway.app

# File Storage (use Railway volumes or S3)
FILE_STORAGE_TYPE=local
FILE_STORAGE_PATH=/app/uploads

# Error Tracking
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
SENTRY_ENVIRONMENT=production
```

### Local Auth Environment Variables

**Required Variables:**

```env
# Node Environment
NODE_ENV=production

# Server Configuration
PORT=3001
HOST=0.0.0.0

# Database (automatically set by Railway PostgreSQL)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# Redis (automatically set by Railway Redis)
REDIS_URL=${{Redis.REDIS_URL}}

# JWT Secret (MUST match hammer-orchestrator)
JWT_SECRET=<same-as-hammer-orchestrator>
JWT_EXPIRATION=24h
JWT_ISSUER=sepulki-platform

# Session Configuration
SESSION_COOKIE_NAME=next-auth.session-token
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_SAME_SITE=lax
SESSION_MAX_AGE=86400000

# CORS (set to your frontend domain)
CORS_ORIGIN=https://your-frontend.railway.app,https://your-custom-domain.com
CORS_CREDENTIALS=true

# Security
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_LOGIN_ATTEMPTS=5
PASSWORD_HASH_ALGORITHM=bcrypt

# Callback URLs
CALLBACK_URL=https://your-frontend.railway.app
SIGNIN_URL=https://your-local-auth.railway.app/auth/signin
```

### Generate Secure Secrets

```bash
# Generate JWT secret (32 bytes)
openssl rand -base64 32

# Generate CSRF secret
openssl rand -base64 32
```

---

## 📊 Monitoring & Logs

### Railway Dashboard Monitoring

1. **Deployments**: View deployment history and status
2. **Metrics**: CPU, memory, network usage graphs
3. **Logs**: Real-time log streaming
4. **Events**: Service events and alerts

### Access Logs

```bash
# View logs via CLI
railway logs

# Follow logs in real-time
railway logs --follow

# Filter by service
railway logs --service hammer-orchestrator
```

### Health Check Endpoints

**Hammer Orchestrator:**
```bash
curl https://your-hammer-orchestrator.railway.app/health
```

**Local Auth:**
```bash
curl https://your-local-auth.railway.app/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "service": "hammer-orchestrator",
  "version": "1.0.0",
  "timestamp": "2025-11-04T23:55:00.000Z"
}
```

### Monitoring Tools Integration

**Option 1: Sentry (Error Tracking)**

```env
SENTRY_DSN=https://your-sentry-dsn@sentry.io/project
SENTRY_ENVIRONMENT=production
```

**Option 2: DataDog (APM & Logs)**

```bash
# Add DataDog agent as Railway plugin
railway add datadog
```

**Option 3: LogTail (Log Management)**

```bash
# Add LogTail integration from Railway marketplace
```

---

## 💰 Cost Estimation

### Railway Pricing Tiers

**Hobby Plan** (Free - $5/month):
- $5 free credits per month
- Pay only for usage beyond credits
- Perfect for development and small projects

**Pro Plan** ($20/month):
- $20 included usage
- Priority support
- Team collaboration

### Estimated Monthly Costs

#### Small Scale (Development/Testing)
- **PostgreSQL**: ~$5-10/month (1GB storage, minimal usage)
- **Redis**: ~$2-5/month (100MB storage)
- **Hammer Orchestrator**: ~$3-7/month (512MB RAM, low traffic)
- **Local Auth**: ~$2-5/month (256MB RAM, low traffic)
- **Total**: **~$12-27/month**

#### Medium Scale (Production - Small Fleet)
- **PostgreSQL**: ~$15-25/month (5GB storage, moderate usage)
- **Redis**: ~$5-10/month (500MB storage)
- **Hammer Orchestrator**: ~$10-20/month (1GB RAM, moderate traffic)
- **Local Auth**: ~$5-10/month (512MB RAM, moderate traffic)
- **Total**: **~$35-65/month**

#### Large Scale (Production - Large Fleet)
- **PostgreSQL**: ~$30-50/month (20GB storage, high usage)
- **Redis**: ~$10-20/month (2GB storage)
- **Hammer Orchestrator**: ~$25-50/month (2GB RAM, high traffic)
- **Local Auth**: ~$10-20/month (1GB RAM, high traffic)
- **Total**: **~$75-140/month**

### Cost Optimization Tips

1. **Use Railway's Free Tier**: Start with free $5/month credits
2. **Optimize Docker Images**: Multi-stage builds reduce deployment time
3. **Enable Caching**: Redis caching reduces database queries
4. **Scale Gradually**: Start small and scale based on demand
5. **Monitor Usage**: Use Railway dashboard to track costs
6. **Use External Databases**: Consider Supabase (has free tier) for PostgreSQL
7. **Sleep Services**: Railway can sleep inactive services to save costs

---

## 🔧 Troubleshooting

### Common Issues

#### 1. Build Failures

**Issue**: Docker build fails during deployment

**Solutions**:
```bash
# Check build logs in Railway dashboard
railway logs --deployment <deployment-id>

# Test build locally
docker build -f Dockerfile.railway -t hammer-orchestrator .
docker run -p 4000:4000 hammer-orchestrator

# Ensure all dependencies are in package.json
npm install --save <missing-package>
```

#### 2. Database Connection Errors

**Issue**: `Error: Connection refused` or `ECONNREFUSED`

**Solutions**:
1. Verify `DATABASE_URL` is set correctly
2. Check database is running in Railway dashboard
3. Ensure SSL mode is correct:
   ```env
   # Railway PostgreSQL uses SSL
   DATABASE_URL=postgresql://...?sslmode=require
   ```
4. Check database connection pool settings:
   ```env
   DATABASE_POOL_MAX=20
   DATABASE_CONNECTION_TIMEOUT_MS=5000
   ```

#### 3. Redis Connection Errors

**Issue**: `Error: Redis connection timeout`

**Solutions**:
1. Verify `REDIS_URL` is set correctly
2. Check Redis is running in Railway dashboard
3. Test Redis connection:
   ```bash
   redis-cli -u $REDIS_URL ping
   ```

#### 4. CORS Errors

**Issue**: `Access-Control-Allow-Origin` errors in browser

**Solutions**:
1. Set correct `CORS_ORIGIN` in environment variables:
   ```env
   CORS_ORIGIN=https://your-frontend.railway.app
   ```
2. Enable credentials:
   ```env
   CORS_CREDENTIALS=true
   ```
3. Check frontend is sending credentials:
   ```javascript
   fetch(url, { credentials: 'include' })
   ```

#### 5. JWT Authentication Errors

**Issue**: `Invalid token` or `Token verification failed`

**Solutions**:
1. Ensure `JWT_SECRET` matches between services:
   ```bash
   # Generate new secret
   openssl rand -base64 32

   # Set in both services
   JWT_SECRET=<same-secret-for-both>
   ```
2. Check token expiration:
   ```env
   JWT_EXPIRATION=86400
   ```
3. Verify token format in Authorization header:
   ```
   Authorization: Bearer <token>
   ```

#### 6. Health Check Failures

**Issue**: Railway shows service as unhealthy

**Solutions**:
1. Test health endpoint locally:
   ```bash
   curl http://localhost:4000/health
   ```
2. Increase health check timeout:
   ```json
   // railway.json
   {
     "deploy": {
       "healthcheckTimeout": 300
     }
   }
   ```
3. Check application logs for startup errors

#### 7. Memory Issues

**Issue**: `FATAL ERROR: Reached heap limit` or service crashes

**Solutions**:
1. Increase memory allocation in Railway settings
2. Optimize database queries (add indexes)
3. Enable connection pooling:
   ```env
   DATABASE_POOL_MAX=10
   ```
4. Use Redis for caching to reduce memory usage

---

## 🔒 Security Best Practices

### 1. Environment Variables

- ✅ **Never commit secrets to Git**
- ✅ Use Railway's secret management
- ✅ Rotate secrets regularly (JWT_SECRET, database passwords)
- ✅ Use different secrets for dev/staging/production

### 2. Database Security

```env
# Always use SSL for production databases
DATABASE_URL=postgresql://...?sslmode=require

# Restrict database access by IP (if possible)
# Set up read replicas for analytics queries
```

### 3. API Security

```env
# Disable GraphQL introspection in production
GRAPHQL_PLAYGROUND=false
GRAPHQL_INTROSPECTION=false

# Enable rate limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100

# Enable security headers
ENABLE_SECURITY_HEADERS=true
```

### 4. Authentication Security

```env
# Use bcrypt for password hashing (not SHA256)
PASSWORD_HASH_ALGORITHM=bcrypt

# Enable secure cookies
SESSION_COOKIE_SECURE=true
SESSION_COOKIE_HTTP_ONLY=true

# Set strict CORS
CORS_ORIGIN=https://your-domain.com
```

---

## 📚 Additional Resources

### Railway Documentation
- [Railway Docs](https://docs.railway.app/)
- [Railway CLI](https://docs.railway.app/develop/cli)
- [Railway Templates](https://railway.app/templates)

### Sepulki Documentation
- [Environment Setup](./ENVIRONMENT_SETUP.md)
- [Security Configuration](./SECURITY_CONFIGURATION.md)
- [Deployment Platforms Comparison](./DEPLOYMENT_PLATFORMS.md)

### Support
- Railway Discord: [discord.gg/railway](https://discord.gg/railway)
- Sepulki GitHub Issues: [github.com/yourorg/sepulki/issues](https://github.com/yourorg/sepulki/issues)

---

## 🚀 Next Steps

1. **Deploy to Railway**: Follow the deployment steps above
2. **Configure Custom Domain**: Set up your custom domain in Railway
3. **Set Up CI/CD**: Enable automatic deployments from GitHub
4. **Monitor Performance**: Set up monitoring and alerts
5. **Scale as Needed**: Adjust resources based on traffic

---

**Last Updated**: November 4, 2025
**Version**: 1.0.0
**Maintained By**: Sepulki Team
