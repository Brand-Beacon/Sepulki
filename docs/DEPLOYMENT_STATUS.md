# Current Deployment Status

**Last Updated**: 2025-11-04

---

## 🌐 Current Setup

### Frontend (Forge UI)
**Status**: Likely deployed to Vercel
**Location**: `apps/forge-ui/`
**Framework**: Next.js 14

**Auto-Detection Logic**:
```typescript
// From apps/forge-ui/src/lib/env.ts
const graphqlEndpoint = process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT ||
  (isProduction
    ? (process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}/api/graphql`  // ⚠️ This expects API at /api/graphql
        : '/api/graphql')
    : 'http://localhost:4000/graphql')
```

**Problem**: The code expects the GraphQL API at `/api/graphql` on the same domain when deployed to Vercel, but there's **NO Next.js API route** at that path!

---

### Backend (Hammer Orchestrator)
**Status**: ⚠️ NEEDS DEPLOYMENT
**Location**: `services/hammer-orchestrator/`
**Framework**: Express.js + Apollo GraphQL
**Port**: 4000 (locally)

**Current State**:
- ✅ Runs locally at `http://localhost:4000/graphql`
- ❌ No production deployment detected
- ❌ No Railway/Render/Fly.io config found
- ❌ No Next.js API proxy configured

---

## ❌ The Problem

Your frontend on Vercel is trying to call:
```
https://your-vercel-app.vercel.app/api/graphql
```

But this endpoint **doesn't exist** because:
1. ❌ There's no Next.js API route at `pages/api/graphql.ts` or `app/api/graphql/route.ts`
2. ❌ The backend service (hammer-orchestrator) isn't deployed anywhere
3. ❌ No proxy is configured to forward `/api/graphql` to the backend

---

## ✅ Solution Options

### Option 1: Deploy Backend Separately (Recommended)
Deploy `hammer-orchestrator` to Railway/Render and point frontend to it:

**Steps**:
1. Deploy backend to Railway:
   ```bash
   # In services/hammer-orchestrator
   railway init
   railway up
   ```

2. Set environment variable on Vercel:
   ```bash
   NEXT_PUBLIC_GRAPHQL_ENDPOINT=https://your-backend.railway.app/graphql
   ```

**Pros**: Separate scaling, better architecture
**Cons**: Requires CORS configuration

---

### Option 2: Create Next.js API Proxy
Create an API route that proxies to the backend:

**Create**: `apps/forge-ui/app/api/graphql/route.ts`
```typescript
import { NextRequest } from 'next/server'

const BACKEND_URL = process.env.GRAPHQL_BACKEND_URL || 'http://localhost:4000/graphql'

export async function POST(request: NextRequest) {
  const body = await request.json()

  const response = await fetch(BACKEND_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const data = await response.json()
  return Response.json(data)
}

export async function GET(request: NextRequest) {
  // GraphQL playground or schema introspection
  return Response.json({ error: 'Use POST for GraphQL queries' }, { status: 405 })
}
```

**Pros**: Single domain, no CORS issues
**Cons**: All requests go through Next.js

---

### Option 3: Use Vercel Serverless Functions
Deploy GraphQL as Vercel serverless function:

**Create**: `apps/forge-ui/app/api/graphql/route.ts` with full Apollo Server

**Pros**: Everything on Vercel
**Cons**: Serverless limitations (10s timeout, cold starts)

---

## 🚀 Recommended Deployment Plan

### Step 1: Deploy Backend to Railway

1. **Create Railway Project**:
   ```bash
   cd services/hammer-orchestrator
   railway login
   railway init
   railway link
   ```

2. **Add Environment Variables**:
   ```bash
   railway variables set DATABASE_URL=<neon-postgres-url>
   railway variables set REDIS_URL=<upstash-redis-url>
   railway variables set JWT_SECRET=<random-secret>
   railway variables set NODE_ENV=production
   ```

3. **Deploy**:
   ```bash
   railway up
   ```

4. **Get URL**:
   ```bash
   railway domain
   # Returns: https://hammer-orchestrator-production.up.railway.app
   ```

---

### Step 2: Update Frontend Environment Variables

On Vercel:
```bash
vercel env add NEXT_PUBLIC_GRAPHQL_ENDPOINT production
# Enter: https://hammer-orchestrator-production.up.railway.app/graphql

vercel env add NEXT_PUBLIC_GRAPHQL_ENDPOINT preview
# Enter: https://hammer-orchestrator-staging.up.railway.app/graphql
```

---

### Step 3: Configure CORS on Backend

Update `services/hammer-orchestrator/src/index.ts`:
```typescript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-vercel-app.vercel.app',
    /\.vercel\.app$/  // Allow all Vercel preview deployments
  ],
  credentials: true
}))
```

---

### Step 4: Deploy Both

```bash
# Backend
cd services/hammer-orchestrator
railway up

# Frontend
cd apps/forge-ui
vercel --prod
```

---

## 📋 Current Issues

1. ❌ **Backend Not Deployed** - GraphQL API only runs locally
2. ❌ **No Production Database** - Need Neon/Supabase PostgreSQL
3. ❌ **No Production Redis** - Need Upstash Redis
4. ❌ **Frontend Calls Wrong URL** - Trying to hit `/api/graphql` that doesn't exist
5. ❌ **Auth Service Not Deployed** - `local-auth` only runs locally
6. ❌ **Video Proxy Not Deployed** - Isaac Sim streaming not available

---

## 🎯 Next Steps

**To get production working:**

1. **Deploy Database** (30 min):
   - Sign up for Neon (https://neon.tech)
   - Create production database
   - Run migrations
   - Seed with demo data

2. **Deploy Redis** (15 min):
   - Sign up for Upstash (https://upstash.com)
   - Create Redis instance
   - Get connection URL

3. **Deploy Backend** (1 hour):
   - Railway for hammer-orchestrator
   - Set all environment variables
   - Deploy and test

4. **Update Frontend** (15 min):
   - Set `NEXT_PUBLIC_GRAPHQL_ENDPOINT` on Vercel
   - Redeploy frontend

5. **Test End-to-End** (30 min):
   - Sign in
   - View fleet dashboard
   - Create task
   - Verify real-time updates

---

## 💡 Quick Fix for Demo

**If you need it working NOW for YC demo:**

Create this file to proxy GraphQL locally:

**File**: `apps/forge-ui/app/api/graphql/route.ts`
```typescript
import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.GRAPHQL_BACKEND_URL ||
  (process.env.NODE_ENV === 'production'
    ? 'https://your-backend.railway.app/graphql'
    : 'http://localhost:4000/graphql')

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const response = await fetch(BACKEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('GraphQL proxy error:', error)
    return NextResponse.json(
      { errors: [{ message: 'Backend unavailable' }] },
      { status: 503 }
    )
  }
}
```

Then deploy backend to Railway and you're good!

---

## 🔍 How to Check Current Status

```bash
# Check if frontend is on Vercel
vercel ls

# Check Vercel environment variables
vercel env ls

# Check if backend is deployed
railway status  # or check Railway dashboard

# Test GraphQL endpoint
curl -X POST https://your-backend.railway.app/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "{ __typename }"}'
```

---

**Status**: Frontend likely deployed ✅ | Backend needs deployment ❌
