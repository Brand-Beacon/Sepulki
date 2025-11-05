# Environment Setup Guide

Complete guide to setting up environment variables for the Sepulki platform across all services and deployment environments.

## Table of Contents

- [Quick Start](#quick-start)
- [Environment Files Overview](#environment-files-overview)
- [Development Setup](#development-setup)
- [Production Setup](#production-setup)
- [Service-Specific Configuration](#service-specific-configuration)
- [Obtaining API Keys](#obtaining-api-keys)
- [Security Best Practices](#security-best-practices)
- [Troubleshooting](#troubleshooting)
- [Environment Variables Reference](#environment-variables-reference)

---

## Quick Start

### Development (Local)

1. **Copy example environment files:**

```bash
# Frontend
cp apps/forge-ui/.env.example apps/forge-ui/.env.local

# Backend services
cp services/hammer-orchestrator/.env.example services/hammer-orchestrator/.env
cp services/local-auth/.env.example services/local-auth/.env
cp services/video-stream-proxy/.env.example services/video-stream-proxy/.env

# Docker Compose (optional)
cp .env.example .env
```

2. **Start development services:**

```bash
# Start Docker Compose services (PostgreSQL, Redis, MinIO, etc.)
docker-compose up -d

# Start backend services
cd services/hammer-orchestrator && npm run dev &
cd services/local-auth && npm run dev &
cd services/video-stream-proxy && npm run dev &

# Start frontend
cd apps/forge-ui && npm run dev
```

3. **Access the application:**
   - Frontend: http://localhost:3000
   - GraphQL API: http://localhost:4000/graphql
   - Local Auth: http://localhost:4446/auth/signin

### Production (Quick)

1. **Set required environment variables** in your deployment platform (Vercel, Railway, Render, etc.)
2. **Generate secure secrets** (see [Security Best Practices](#security-best-practices))
3. **Configure external services** (database, Redis, S3, etc.)
4. **Run validation script** before deployment

```bash
chmod +x scripts/validate-env.sh
./scripts/validate-env.sh production
```

---

## Environment Files Overview

| File | Purpose | Required |
|------|---------|----------|
| `apps/forge-ui/.env.local` | Frontend environment variables (Next.js) | Yes |
| `services/hammer-orchestrator/.env` | GraphQL API service configuration | Yes |
| `services/local-auth/.env` | Authentication service configuration | Yes (dev) |
| `services/video-stream-proxy/.env` | Video streaming proxy configuration | Optional |
| `.env` | Docker Compose configuration | Optional |

### Important Notes:

- **Never commit** `.env.local` or `.env` files to version control
- Use `.env.example` files as templates
- Different values for development, staging, and production
- Store production secrets in a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)

---

## Development Setup

### Prerequisites

- Node.js 18+ installed
- Docker and Docker Compose installed
- PostgreSQL 15+ (via Docker or local)
- Redis 7+ (via Docker or local)

### Step-by-Step Development Configuration

#### 1. Frontend (forge-ui)

Create `apps/forge-ui/.env.local`:

```bash
# Required for local development
NODE_ENV=development
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=dev-secret-change-me

# Optional but recommended
NEXT_PUBLIC_ISAAC_SIM_IP=18.234.83.45
NEXT_PUBLIC_ISAAC_SIM_PORT=8211
NEXT_PUBLIC_VIDEO_PROXY_URL=http://localhost:8889
NEXT_PUBLIC_MINIO_ENDPOINT=http://localhost:9000
```

#### 2. Backend (hammer-orchestrator)

Create `services/hammer-orchestrator/.env`:

```bash
# Required
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://smith:forge_dev@localhost:5432/sepulki
REDIS_URL=redis://localhost:6379
JWT_SECRET=local-auth-jwt-secret
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000

# Optional
GRAPHQL_PLAYGROUND=true
ENABLE_TELEMETRY=true
FILE_STORAGE_TYPE=local
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=sepulki
MINIO_SECRET_KEY=vault_dev_key
```

#### 3. Authentication Service (local-auth)

Create `services/local-auth/.env`:

```bash
# Required
NODE_ENV=development
PORT=4446
DATABASE_URL=postgresql://smith:forge_dev@localhost:5432/sepulki
REDIS_URL=redis://localhost:6379
JWT_SECRET=local-auth-jwt-secret
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000

# Optional
SESSION_COOKIE_DOMAIN=localhost
SHOW_TEST_USERS=true
DEBUG_MODE=true
```

#### 4. Video Stream Proxy (video-stream-proxy)

Create `services/video-stream-proxy/.env`:

```bash
# Required
NODE_ENV=development
PORT=8889
CORS_ORIGIN=http://localhost:3000,http://127.0.0.1:3000

# Optional
LOG_LEVEL=info
ENABLE_AUTH=false
```

#### 5. Docker Compose

Create `.env` in project root:

```bash
# PostgreSQL
POSTGRES_DB=sepulki
POSTGRES_USER=smith
POSTGRES_PASSWORD=forge_dev

# Redis (no config needed for local)

# MinIO
MINIO_ROOT_USER=sepulki
MINIO_ROOT_PASSWORD=vault_dev_key

# InfluxDB (optional)
INFLUXDB_USERNAME=smith
INFLUXDB_PASSWORD=bellows_dev
INFLUXDB_ORG=sepulki
INFLUXDB_BUCKET=bellows
```

---

## Production Setup

### Prerequisites

- Managed PostgreSQL database (AWS RDS, Supabase, etc.)
- Managed Redis instance (AWS ElastiCache, Redis Cloud, etc.)
- S3-compatible storage (AWS S3, MinIO, etc.)
- Domain with SSL certificate

### Production Environment Variables

#### Frontend (Vercel/Railway/Render)

```bash
# Core
NODE_ENV=production
NEXT_PUBLIC_GRAPHQL_URL=https://api.your-domain.com/graphql
NEXT_PUBLIC_API_URL=https://api.your-domain.com
NEXTAUTH_URL=https://your-domain.com

# Security - GENERATE UNIQUE SECRET!
NEXTAUTH_SECRET=<generate-with-openssl-rand-base64-32>

# OAuth (Production)
GITHUB_CLIENT_ID=<your-github-oauth-client-id>
GITHUB_CLIENT_SECRET=<your-github-oauth-client-secret>

# External Services
NEXT_PUBLIC_ISAAC_SIM_IP=<your-isaac-sim-cluster-ip>
NEXT_PUBLIC_VIDEO_PROXY_URL=https://video.your-domain.com
NEXT_PUBLIC_MINIO_ENDPOINT=https://s3.your-domain.com

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=<your-sentry-dsn>
NEXT_PUBLIC_SENTRY_ENVIRONMENT=production

# Optional
OPENAI_API_KEY=<your-openai-api-key>
```

#### Backend (Railway/Render/AWS)

```bash
# Core
NODE_ENV=production
PORT=4000
DATABASE_URL=postgresql://user:pass@host:5432/sepulki?sslmode=require
REDIS_URL=redis://user:pass@host:6379
JWT_SECRET=<generate-with-openssl-rand-base64-32>

# CORS - Use your actual domain
CORS_ORIGIN=https://your-domain.com,https://www.your-domain.com

# Security
GRAPHQL_PLAYGROUND=false
GRAPHQL_INTROSPECTION=false
ENABLE_SECURITY_HEADERS=true

# File Storage - AWS S3
FILE_STORAGE_TYPE=s3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=<your-aws-access-key>
AWS_SECRET_ACCESS_KEY=<your-aws-secret-key>
AWS_S3_BUCKET=sepulki-production-files
AWS_S3_PUBLIC_URL=https://cdn.your-domain.com

# Error Tracking
SENTRY_DSN=<your-sentry-dsn>
SENTRY_ENVIRONMENT=production

# Performance
DATABASE_POOL_MAX=20
REDIS_MAX_RETRIES_PER_REQUEST=3
```

---

## Service-Specific Configuration

### Frontend (Next.js)

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_GRAPHQL_URL` | GraphQL API endpoint | `http://localhost:4000/graphql` |
| `NEXTAUTH_URL` | Frontend base URL | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | JWT signing secret | Generate with `openssl rand -base64 32` |

#### Optional Variables

- `NEXT_PUBLIC_ISAAC_SIM_IP` - Isaac Sim WebSocket IP
- `NEXT_PUBLIC_VIDEO_PROXY_URL` - Video streaming proxy URL
- `NEXT_PUBLIC_MINIO_ENDPOINT` - File storage endpoint
- `OPENAI_API_KEY` - OpenAI API key (server-side only)
- `GITHUB_CLIENT_ID/SECRET` - GitHub OAuth (production)
- `GOOGLE_CLIENT_ID/SECRET` - Google OAuth (production)

### Backend (Hammer Orchestrator)

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/sepulki` |
| `REDIS_URL` | Redis connection string | `redis://host:6379` |
| `JWT_SECRET` | JWT signing secret (MUST match local-auth) | Generate with `openssl rand -base64 32` |

#### Optional Variables

- `MINIO_*` - MinIO/S3 configuration for file uploads
- `INFLUXDB_*` - InfluxDB for telemetry (optional)
- `ENABLE_TELEMETRY` - Auto-generate demo telemetry data
- `SENTRY_DSN` - Error tracking

### Authentication Service (Local Auth)

#### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://user:pass@host:5432/sepulki` |
| `REDIS_URL` | Redis connection string | `redis://host:6379` |
| `JWT_SECRET` | JWT signing secret (MUST match hammer-orchestrator) | Same as hammer-orchestrator |

#### Important Notes

- **JWT_SECRET synchronization**: The `JWT_SECRET` MUST be identical across `local-auth` and `hammer-orchestrator` for authentication to work
- **Session cookies**: Configure `SESSION_COOKIE_DOMAIN` properly for your environment
- **CORS origins**: Must match your frontend URL exactly

---

## Obtaining API Keys

### GitHub OAuth

1. Go to https://github.com/settings/developers
2. Click "New OAuth App"
3. Set Authorization callback URL: `https://your-domain.com/api/auth/callback/github`
4. Copy Client ID and Client Secret

### Google OAuth

1. Go to https://console.cloud.google.com/apis/credentials
2. Create OAuth 2.0 Client ID
3. Add authorized redirect URI: `https://your-domain.com/api/auth/callback/google`
4. Copy Client ID and Client Secret

### Supabase (Database + Auth)

1. Create project at https://supabase.com
2. Get database URL from Settings > Database
3. Format: `postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres`
4. Enable connection pooling for production

### Upstash (Redis)

1. Create database at https://upstash.com
2. Copy Redis URL from dashboard
3. Format: `redis://default:[password]@[host].upstash.io:6379`

### AWS S3

1. Create S3 bucket in AWS Console
2. Create IAM user with S3 permissions
3. Generate access key and secret
4. Configure CORS for your frontend domain

### Sentry (Error Tracking)

1. Create project at https://sentry.io
2. Copy DSN from Settings > Client Keys (DSN)
3. Set environment (development, staging, production)

### OpenAI API

1. Go to https://platform.openai.com/api-keys
2. Create new API key
3. Add to backend service only (never expose in frontend)

---

## Security Best Practices

### Generating Secure Secrets

```bash
# Generate a strong JWT secret
openssl rand -base64 32

# Generate a strong NextAuth secret
openssl rand -base64 32

# Generate webhook secrets
openssl rand -hex 32
```

### Production Security Checklist

- [ ] Use unique, strong secrets for each environment
- [ ] Never commit `.env` files to version control
- [ ] Use HTTPS/WSS in production (SSL/TLS)
- [ ] Enable database SSL connections (`?sslmode=require`)
- [ ] Set `GRAPHQL_PLAYGROUND=false` in production
- [ ] Set `GRAPHQL_INTROSPECTION=false` in production
- [ ] Enable `SESSION_COOKIE_SECURE=true` in production
- [ ] Configure proper CORS origins (no wildcards)
- [ ] Use managed secrets services (AWS Secrets Manager, Vault)
- [ ] Rotate secrets regularly (every 90 days)
- [ ] Enable rate limiting in production
- [ ] Set up error tracking (Sentry)
- [ ] Configure security headers (`ENABLE_SECURITY_HEADERS=true`)
- [ ] Use connection pooling for databases
- [ ] Enable Redis AUTH password in production
- [ ] Review and minimize exposed environment variables
- [ ] Use least-privilege IAM roles for AWS services

### Environment-Specific Secrets

| Environment | Secret Strength | Rotation Frequency |
|-------------|----------------|-------------------|
| Development | Moderate | Never |
| Staging | Strong | Every 90 days |
| Production | Very Strong | Every 30-60 days |

### .gitignore Configuration

Ensure these files are in `.gitignore`:

```
# Environment files
.env
.env.local
.env.production
.env.development
.env.test
.env*.local

# Service-specific
apps/forge-ui/.env.local
services/*/.env
*.pem
*.key
```

---

## Troubleshooting

### Common Issues

#### 1. Authentication Fails Between Services

**Problem**: Frontend can't authenticate with backend

**Solutions**:
- Ensure `JWT_SECRET` matches in `local-auth` and `hammer-orchestrator`
- Check `CORS_ORIGIN` includes your frontend URL
- Verify `SESSION_COOKIE_DOMAIN` is set correctly
- Check Redis connection is working

```bash
# Test Redis connection
redis-cli -h localhost -p 6379 ping
# Should return: PONG

# Test PostgreSQL connection
psql postgresql://smith:forge_dev@localhost:5432/sepulki -c "SELECT 1;"
```

#### 2. GraphQL Queries Fail with CORS Errors

**Problem**: Browser shows CORS errors when accessing GraphQL API

**Solutions**:
- Add frontend URL to `CORS_ORIGIN` in hammer-orchestrator
- Include `http://localhost:3000` AND `http://127.0.0.1:3000`
- Check for trailing slashes in URLs
- Verify CORS credentials are enabled

#### 3. File Uploads Fail

**Problem**: File uploads return 500 errors

**Solutions**:
- Check `FILE_STORAGE_TYPE` is set correctly
- Verify MinIO/S3 credentials are correct
- Ensure bucket exists and is accessible
- Check file size limits

```bash
# Test MinIO connection (if using MinIO)
curl http://localhost:9000/minio/health/live
```

#### 4. Database Connection Fails

**Problem**: Services can't connect to PostgreSQL

**Solutions**:
- Verify `DATABASE_URL` format is correct
- Check database is running: `docker-compose ps postgres`
- Ensure database exists: `psql -l`
- Check firewall rules allow connection
- For production, verify SSL mode is set: `?sslmode=require`

#### 5. Video Streams Don't Load

**Problem**: Robot video streams fail to display

**Solutions**:
- Check `NEXT_PUBLIC_VIDEO_PROXY_URL` is accessible
- Verify video-stream-proxy service is running
- Check CORS configuration in video-stream-proxy
- Ensure WebSocket connections are allowed

#### 6. Environment Variables Not Loading

**Problem**: Next.js doesn't see environment variables

**Solutions**:
- Prefix browser-accessible variables with `NEXT_PUBLIC_`
- Restart dev server after changing `.env.local`
- Check file is named `.env.local` not `.env`
- Verify file is in the correct directory (`apps/forge-ui/`)

```bash
# Restart Next.js dev server
cd apps/forge-ui
rm -rf .next
npm run dev
```

### Debugging Environment Variables

#### Check loaded variables in Next.js:

```typescript
// Add to any page component
console.log('Environment:', {
  graphqlUrl: process.env.NEXT_PUBLIC_GRAPHQL_URL,
  apiUrl: process.env.NEXT_PUBLIC_API_URL,
  nodeEnv: process.env.NODE_ENV
});
```

#### Check loaded variables in backend:

```typescript
// Add to services/hammer-orchestrator/src/index.ts
console.log('Environment:', {
  databaseUrl: process.env.DATABASE_URL?.replace(/:[^:]*@/, ':***@'), // Hide password
  redisUrl: process.env.REDIS_URL?.replace(/:[^:]*@/, ':***@'),
  jwtSecret: process.env.JWT_SECRET ? '***' : 'NOT SET',
  nodeEnv: process.env.NODE_ENV
});
```

### Validation Script

Run the environment validation script to check for common issues:

```bash
chmod +x scripts/validate-env.sh

# Validate development environment
./scripts/validate-env.sh development

# Validate production environment
./scripts/validate-env.sh production

# Validate specific service
./scripts/validate-env.sh development forge-ui
```

---

## Environment Variables Reference

### Complete Variable List

#### Frontend (forge-ui)

<details>
<summary>Click to expand complete frontend variables</summary>

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | development | Environment: development, production, test |
| `NEXT_PUBLIC_GRAPHQL_URL` | Yes | - | GraphQL API endpoint |
| `NEXT_PUBLIC_API_URL` | Yes | - | REST API endpoint |
| `NEXTAUTH_URL` | Yes | - | Frontend base URL |
| `NEXTAUTH_SECRET` | Yes | - | JWT signing secret |
| `NEXT_PUBLIC_GRAPHQL_WS_URL` | No | - | WebSocket endpoint for subscriptions |
| `LOCAL_OAUTH_ISSUER` | No | - | Local OAuth issuer URL |
| `LOCAL_OAUTH_CLIENT_ID` | No | - | Local OAuth client ID |
| `LOCAL_OAUTH_CLIENT_SECRET` | No | - | Local OAuth client secret |
| `GITHUB_CLIENT_ID` | No | - | GitHub OAuth client ID |
| `GITHUB_CLIENT_SECRET` | No | - | GitHub OAuth client secret |
| `GOOGLE_CLIENT_ID` | No | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | - | Google OAuth client secret |
| `EMAIL_SERVER` | No | - | SMTP server URL |
| `EMAIL_FROM` | No | - | From email address |
| `SENDGRID_API_KEY` | No | - | SendGrid API key |
| `NEXT_PUBLIC_ISAAC_SIM_IP` | No | - | Isaac Sim IP address |
| `NEXT_PUBLIC_ISAAC_SIM_PORT` | No | - | Isaac Sim port |
| `NEXT_PUBLIC_VIDEO_PROXY_URL` | No | - | Video proxy URL |
| `NEXT_PUBLIC_MINIO_ENDPOINT` | No | - | MinIO/S3 endpoint |
| `NEXT_PUBLIC_MINIO_BUCKET` | No | - | MinIO/S3 bucket name |
| `OPENAI_API_KEY` | No | - | OpenAI API key (server-side) |
| `NEXT_PUBLIC_SENTRY_DSN` | No | - | Sentry error tracking DSN |
| `NEXT_PUBLIC_SENTRY_ENVIRONMENT` | No | - | Sentry environment |
| `NEXT_PUBLIC_GA_TRACKING_ID` | No | - | Google Analytics ID |

</details>

#### Backend (hammer-orchestrator)

<details>
<summary>Click to expand complete backend variables</summary>

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | development | Environment |
| `PORT` | No | 4000 | Server port |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | Yes | - | Redis connection string |
| `JWT_SECRET` | Yes | - | JWT signing secret |
| `CORS_ORIGIN` | Yes | - | Allowed CORS origins |
| `GRAPHQL_PLAYGROUND` | No | true | Enable GraphQL playground |
| `GRAPHQL_INTROSPECTION` | No | true | Enable introspection |
| `FILE_STORAGE_TYPE` | No | local | Storage type: local, minio, s3 |
| `FILE_STORAGE_PATH` | No | ./uploads | Local storage path |
| `MINIO_ENDPOINT` | No | - | MinIO endpoint |
| `MINIO_ACCESS_KEY` | No | - | MinIO access key |
| `MINIO_SECRET_KEY` | No | - | MinIO secret key |
| `AWS_REGION` | No | - | AWS region |
| `AWS_ACCESS_KEY_ID` | No | - | AWS access key |
| `AWS_SECRET_ACCESS_KEY` | No | - | AWS secret key |
| `AWS_S3_BUCKET` | No | - | S3 bucket name |
| `ENABLE_TELEMETRY` | No | true | Generate telemetry data |
| `SENTRY_DSN` | No | - | Sentry DSN |
| `RATE_LIMIT_ENABLED` | No | true | Enable rate limiting |

</details>

#### Authentication (local-auth)

<details>
<summary>Click to expand complete auth service variables</summary>

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | Yes | development | Environment |
| `PORT` | No | 4446 | Server port |
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | Yes | - | Redis connection string |
| `JWT_SECRET` | Yes | - | JWT signing secret (MUST match hammer-orchestrator) |
| `CORS_ORIGIN` | Yes | - | Allowed CORS origins |
| `SESSION_COOKIE_DOMAIN` | No | localhost | Cookie domain |
| `SESSION_COOKIE_SECURE` | No | false | Secure cookies (HTTPS) |
| `PASSWORD_HASH_ALGORITHM` | No | sha256 | Password hashing algorithm |
| `EMAIL_SERVER` | No | - | SMTP server URL |
| `SHOW_TEST_USERS` | No | true | Show test users on login page |
| `DEBUG_MODE` | No | true | Enable debug logging |

</details>

---

## Deployment Platform Guides

### Vercel (Frontend)

1. Import project from GitHub
2. Framework preset: Next.js
3. Build command: `npm run build`
4. Output directory: `.next`
5. Install command: `npm install`
6. Environment variables: Add all `NEXT_PUBLIC_*` and auth variables

### Railway (Backend)

1. New project from GitHub
2. Add PostgreSQL and Redis services
3. Set environment variables from railway-provided connection strings
4. Deploy command: `npm run build && npm start`

### Render (Backend)

1. New Web Service from GitHub
2. Build command: `npm run build`
3. Start command: `npm start`
4. Add PostgreSQL and Redis as separate services
5. Connect via internal URLs

### AWS Elastic Beanstalk

1. Create application and environment
2. Use `.ebextensions` for configuration
3. Set environment variables in EB console
4. Configure RDS and ElastiCache

---

## Additional Resources

- [Next.js Environment Variables Documentation](https://nextjs.org/docs/basic-features/environment-variables)
- [NextAuth.js Configuration](https://next-auth.js.org/configuration/options)
- [PostgreSQL Connection Strings](https://www.postgresql.org/docs/current/libpq-connect.html#LIBPQ-CONNSTRING)
- [Redis Connection Strings](https://redis.io/docs/reference/clients/#connection-strings)
- [Docker Compose Environment Variables](https://docs.docker.com/compose/environment-variables/)

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Run the validation script: `./scripts/validate-env.sh`
3. Review service logs for specific error messages
4. Open an issue on GitHub with relevant logs and configuration

**Never share actual secrets or credentials in issues or support requests!**
