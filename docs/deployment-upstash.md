# Upstash Redis Deployment Guide

## Table of Contents
- [Overview](#overview)
- [Architecture](#architecture)
- [Data Structures](#data-structures)
- [Setup Instructions](#setup-instructions)
- [Usage Patterns](#usage-patterns)
- [Cache Invalidation](#cache-invalidation)
- [Monitoring](#monitoring)
- [Performance Optimization](#performance-optimization)
- [Troubleshooting](#troubleshooting)

---

## Overview

This guide covers the Upstash Redis integration for the Sepulki platform, providing high-performance caching, session management, and real-time features using serverless Redis infrastructure.

### Key Features

- ✅ **Session Management** - Secure user session storage with automatic expiration
- ✅ **API Caching** - GraphQL query result caching with intelligent invalidation
- ✅ **Real-time Telemetry** - Buffering and streaming of robot telemetry data
- ✅ **Rate Limiting** - Built-in rate limiting for API, auth, and telemetry endpoints
- ✅ **WebSocket Management** - Connection tracking and room-based subscriptions
- ✅ **Task Queue** - Priority-based task queuing using sorted sets
- ✅ **Notifications** - User notification queuing with automatic cleanup

### Why Upstash?

1. **Serverless** - Pay only for what you use, no infrastructure management
2. **Global** - Multi-region replication for low-latency access
3. **REST API** - HTTP-based access works in any environment (edge, serverless, containers)
4. **Reliable** - Built-in persistence and automatic backups
5. **Developer-Friendly** - Simple setup, excellent TypeScript support

---

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Forge UI    │  │   Mobile     │  │  Dashboard   │         │
│  │ (Next.js)    │  │    Apps      │  │   (Admin)    │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
└─────────┼──────────────────┼──────────────────┼────────────────┘
          │                  │                  │
          └──────────────────┴──────────────────┘
                             │
                    ┌────────▼─────────┐
                    │  API Gateway     │
                    │  (Rate Limited)  │
                    └────────┬─────────┘
                             │
          ┌──────────────────┴──────────────────┐
          │                                     │
┌─────────▼─────────┐              ┌───────────▼──────────┐
│   Local Auth      │              │ Hammer Orchestrator  │
│   Service         │              │     (GraphQL)        │
│                   │              │                      │
│ • JWT tokens      │              │ • Query caching      │
│ • Sessions        │              │ • Real-time data     │
│ • User auth       │              │ • WebSocket rooms    │
└─────────┬─────────┘              └───────────┬──────────┘
          │                                    │
          └────────────────┬───────────────────┘
                           │
                  ┌────────▼─────────┐
                  │  Upstash Redis   │
                  │  (Serverless)    │
                  │                  │
                  │ • 10 Data Types  │
                  │ • Auto-scaling   │
                  │ • Global CDN     │
                  └────────┬─────────┘
                           │
          ┌────────────────┴────────────────┐
          │                                 │
┌─────────▼─────────┐          ┌───────────▼──────────┐
│  PostgreSQL       │          │  Telemetry Storage   │
│  (Primary DB)     │          │  (TimescaleDB)       │
│                   │          │                      │
│ • Robot data      │          │ • Historical data    │
│ • Tasks           │          │ • Analytics          │
│ • Users           │          │ • Aggregates         │
└───────────────────┘          └──────────────────────┘
```

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Request Flow                      │
└─────────────────────────────────────────────────────────────┘

1. Authentication Flow:
   ┌─────────┐    ┌──────────┐    ┌───────┐    ┌──────────┐
   │ Client  │───▶│ Rate     │───▶│ Redis │───▶│ Local    │
   │ Login   │    │ Limiter  │    │ Check │    │ Auth     │
   └─────────┘    └──────────┘    └───────┘    └──────────┘
                                                      │
                                   ┌──────────────────┘
                                   ▼
                            ┌──────────┐
                            │  Redis   │
                            │  Store   │
                            │ Session  │
                            └──────────┘

2. GraphQL Query Flow (Cache Hit):
   ┌─────────┐    ┌───────────┐    ┌────────────┐
   │ Client  │───▶│ GraphQL   │───▶│   Redis    │
   │ Query   │    │ Resolver  │    │   Cache    │
   └─────────┘    └───────────┘    └─────┬──────┘
                                          │
                                   ┌──────▼──────┐
                                   │   Return    │
                                   │   Cached    │
                                   │   Result    │
                                   └─────────────┘

3. GraphQL Query Flow (Cache Miss):
   ┌─────────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐
   │ Client  │───▶│ GraphQL   │───▶│  Redis   │───▶│   DB     │
   │ Query   │    │ Resolver  │    │  Miss    │    │  Query   │
   └─────────┘    └───────────┘    └──────────┘    └────┬─────┘
                                                         │
                                          ┌──────────────┘
                                          ▼
                                   ┌──────────┐
                                   │  Redis   │
                                   │  Cache   │
                                   │  Store   │
                                   └──────────┘

4. Real-time Telemetry Flow:
   ┌─────────┐    ┌───────────┐    ┌────────────┐
   │ Robot   │───▶│  Buffer   │───▶│   Redis    │
   │ Sensor  │    │  (Queue)  │    │   Stream   │
   └─────────┘    └───────────┘    └─────┬──────┘
                                          │
                      ┌───────────────────┴────────────┐
                      ▼                                ▼
               ┌──────────┐                    ┌──────────┐
               │   DB     │                    │  WebSoc  │
               │  Batch   │                    │  Pub/Sub │
               │  Write   │                    │  Clients │
               └──────────┘                    └──────────┘

5. Cache Invalidation Flow:
   ┌─────────┐    ┌───────────┐    ┌────────────┐
   │ Mutation│───▶│  Trigger  │───▶│   Redis    │
   │  Event  │    │ Invalidate│    │   Delete   │
   └─────────┘    └───────────┘    └─────┬──────┘
                                          │
                                   ┌──────▼──────┐
                                   │    Log      │
                                   │    Event    │
                                   │   Stream    │
                                   └─────────────┘
```

---

## Data Structures

### 1. Sessions (`session:{sessionId}`)

**Type**: String (JSON)
**TTL**: 24 hours
**Purpose**: Store authenticated user session data

**Schema**:
```typescript
{
  userId: string;
  email: string;
  createdAt: number;        // Unix timestamp
  lastActivity: number;     // Unix timestamp
  ipAddress: string;
  userAgent: string;
  permissions: {
    [key: string]: boolean;
  };
}
```

**Operations**:
- `setSession(sessionId, data)` - Store session
- `getSession(sessionId)` - Retrieve session
- `touchSession(sessionId)` - Update last activity
- `deleteSession(sessionId)` - Revoke session

**Usage**:
```typescript
import { setSession, getSession } from '../services/shared/redis-client';

// Create session
await setSession('sess_abc123', {
  userId: 'user_xyz',
  email: 'user@example.com',
  createdAt: Date.now(),
  lastActivity: Date.now(),
  ipAddress: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
  permissions: {
    'tasks:create': true,
    'tasks:delete': false
  }
});

// Retrieve session
const session = await getSession('sess_abc123');
```

---

### 2. JWT Tokens (`token:{tokenHash}`)

**Type**: String (JSON)
**TTL**: 7 days
**Purpose**: Map JWT token hashes to user/session for revocation

**Schema**:
```typescript
{
  userId: string;
  sessionId: string;
  issuedAt: number;
  expiresAt: number;
  tokenType: 'jwt' | 'refresh';
}
```

**Operations**:
- `setToken(hash, userId, sessionId, expiresAt)` - Store token
- `verifyToken(hash)` - Check if token is valid
- `revokeToken(hash)` - Revoke specific token

---

### 3. API Cache (`cache:api:{endpoint}:{queryHash}`)

**Type**: String (JSON)
**TTL**: 5 minutes (configurable)
**Purpose**: Cache GraphQL query results

**Schema**:
```typescript
{
  data: any;                // Query result
  cachedAt: number;         // Cache timestamp
  tags: string[];           // For invalidation
}
```

**Operations**:
- `cacheApiResponse(endpoint, hash, data, options)` - Cache result
- `getCachedApiResponse(endpoint, hash)` - Retrieve cached result
- `invalidateCache(pattern)` - Clear by pattern
- `invalidateCacheByTags(tags)` - Clear by tags

**Example**:
```typescript
import { cacheApiResponse, getCachedApiResponse } from '../services/shared/redis-client';

// In GraphQL resolver
const cachedResult = await getCachedApiResponse('robots', queryHash);
if (cachedResult) return cachedResult;

const result = await db.query('SELECT * FROM robots');
await cacheApiResponse('robots', queryHash, result, {
  ttl: 300,
  tags: ['robots', 'fleet']
});
```

---

### 4. Telemetry Buffer (`telemetry:buffer:{robotId}`)

**Type**: List
**Max Length**: 1000 items
**TTL**: 1 hour
**Purpose**: Buffer incoming telemetry before batch DB writes

**Operations**:
- `bufferTelemetry(robotId, data)` - Add telemetry point
- `getBufferedTelemetry(robotId, count)` - Retrieve buffered data
- `flushTelemetryBuffer(robotId)` - Clear buffer after DB write

**Flow**:
1. Robot sends telemetry → Buffer in Redis
2. Background job reads buffer every 10s → Batch write to DB
3. Clear buffer after successful write

---

### 5. Telemetry Stream (`telemetry:stream:{robotId}`)

**Type**: Redis Stream
**Max Length**: 10,000 entries
**Purpose**: Real-time telemetry pub/sub for WebSocket clients

**Consumer Groups**:
- `forge-ui` - Frontend dashboard subscribers
- `analytics` - Analytics processing
- `monitoring` - Alert system

**Operations**:
```typescript
// Producer (when buffering)
await redis.getClient().xadd(
  'telemetry:stream:robot_1',
  '*',
  { data: JSON.stringify(telemetryData) }
);

// Consumer
const messages = await redis.getClient().xread(
  'BLOCK', 5000,
  'STREAMS', 'telemetry:stream:robot_1', '0'
);
```

---

### 6. Rate Limits (`ratelimit:{identifier}:{window}`)

**Type**: Managed by @upstash/ratelimit
**Purpose**: Prevent abuse with sliding window rate limiting

**Limits**:
- **API**: 1000 requests/hour per user
- **Auth**: 10 requests/15 minutes per IP
- **Telemetry**: 10,000 requests/minute per robot

**Usage**:
```typescript
import { checkRateLimit } from '../services/shared/redis-client';

const result = await checkRateLimit('api', userId);
if (!result.success) {
  throw new Error(`Rate limit exceeded. Retry after ${result.reset}`);
}
```

---

### 7. WebSocket Connections (`ws:connection:{connectionId}`)

**Type**: String (JSON)
**TTL**: 2 hours
**Purpose**: Track active WebSocket connections

**Schema**:
```typescript
{
  userId: string;
  connectedAt: number;
  subscriptions: string[];  // ['robot:1', 'task:5']
  lastPing: number;
}
```

**Operations**:
- `registerWebSocket(connId, userId, subs)` - Register connection
- `removeWebSocket(connId)` - Clean up on disconnect

---

### 8. WebSocket Rooms (`ws:room:{roomId}`)

**Type**: Set
**TTL**: 2 hours
**Purpose**: Track which connections are subscribed to each room

**Operations**:
- `subscribeToRoom(roomId, connId)` - Join room
- `unsubscribeFromRoom(roomId, connId)` - Leave room
- `getRoomMembers(roomId)` - Get all subscribers

**Example**:
```typescript
// When user subscribes to robot updates
await subscribeToRoom('robot:1', connectionId);

// To broadcast to all subscribers
const members = await getRoomMembers('robot:1');
for (const connId of members) {
  wss.sendToConnection(connId, telemetryUpdate);
}
```

---

### 9. Notifications (`notification:{userId}`)

**Type**: List
**Max Length**: 100 items
**TTL**: 30 days
**Purpose**: Queue notifications for users

**Operations**:
- `queueNotification(userId, notification)` - Add notification
- `getNotifications(userId, count)` - Retrieve notifications
- `clearNotifications(userId)` - Mark all as read

---

### 10. Robot Status (`robot:status:{robotId}`)

**Type**: String (JSON)
**TTL**: 5 minutes
**Purpose**: Cache current robot status for quick access

**Schema**:
```typescript
{
  online: boolean;
  batteryLevel: number;
  lastSeen: number;
  currentTask: string;
  location: {
    lat: number;
    lng: number;
  };
  lastUpdated: number;
}
```

---

### 11. Task Queue (`queue:tasks:priority`)

**Type**: Sorted Set
**Score**: Priority (higher = higher priority)
**Purpose**: Priority-based task queuing

**Operations**:
- `enqueueTask(taskId, priority)` - Add task
- `dequeueTask()` - Get highest priority task
- `getQueueLength()` - Get queue size

---

### 12. Cache Invalidation Log (`invalidation:log`)

**Type**: Stream
**Max Length**: 1000 entries
**Purpose**: Audit trail of cache invalidations

**Usage**: Monitor cache invalidation patterns for optimization

---

## Setup Instructions

### 1. Create Upstash Redis Database

1. Go to [Upstash Console](https://console.upstash.com/)
2. Click "Create Database"
3. Choose:
   - **Name**: `sepulki-production`
   - **Type**: Regional (for single region) or Global (for multi-region)
   - **Region**: Choose closest to your deployment
   - **Eviction**: `allkeys-lru` (least recently used)

### 2. Get Credentials

From the Upstash dashboard, copy:
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `UPSTASH_REDIS_REST_READONLY_TOKEN` (optional)

### 3. Configure Environment Variables

Add to `.env` files in each service:

**`services/local-auth/.env`**:
```bash
# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
UPSTASH_REDIS_REST_READONLY_TOKEN=your_readonly_token_here

# Session Configuration
SESSION_TTL=86400
TOKEN_TTL=604800
```

**`services/hammer-orchestrator/.env`**:
```bash
# Upstash Redis
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
UPSTASH_REDIS_REST_READONLY_TOKEN=your_readonly_token_here

# Cache Configuration
CACHE_TTL=300
ENABLE_QUERY_CACHE=true
```

**`apps/forge-ui/.env.local`**:
```bash
# Upstash Redis (for Next.js API routes)
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here
```

### 4. Install Dependencies

```bash
npm install @upstash/redis @upstash/ratelimit --workspace=services/shared
```

### 5. Import Redis Client

In your service files:

```typescript
import redis, {
  setSession,
  getSession,
  cacheApiResponse
} from '../shared/redis-client';

// Health check
const isHealthy = await redis.ping();
```

### 6. Verify Setup

```bash
# Run test script
node -e "
  const redis = require('./services/shared/redis-client').default;
  redis.ping().then(result => {
    console.log('Redis ping:', result ? 'SUCCESS' : 'FAILED');
    process.exit(result ? 0 : 1);
  });
"
```

---

## Usage Patterns

### Pattern 1: Session Management (local-auth)

```typescript
import { setSession, getSession, deleteSession } from '../shared/redis-client';

// On login
async function createSession(userId: string, email: string, req: Request) {
  const sessionId = generateSecureId();

  await setSession(sessionId, {
    userId,
    email,
    createdAt: Date.now(),
    lastActivity: Date.now(),
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    permissions: await getUserPermissions(userId)
  });

  return sessionId;
}

// On each request
async function validateSession(sessionId: string): Promise<SessionData | null> {
  const session = await getSession(sessionId);

  if (!session) return null;

  // Update last activity
  await touchSession(sessionId);

  return session;
}

// On logout
async function logout(sessionId: string) {
  await deleteSession(sessionId);
}
```

---

### Pattern 2: GraphQL Query Caching (hammer-orchestrator)

```typescript
import { cacheApiResponse, getCachedApiResponse, invalidateCache } from '../shared/redis-client';
import crypto from 'crypto';

// Resolver wrapper with caching
function withCache(resolver: Function, options: { ttl?: number; tags?: string[] } = {}) {
  return async (parent: any, args: any, context: any, info: any) => {
    // Generate cache key
    const queryHash = crypto
      .createHash('sha256')
      .update(JSON.stringify({ query: info.fieldName, args }))
      .digest('hex');

    const endpoint = info.fieldName;

    // Try cache first
    const cached = await getCachedApiResponse(endpoint, queryHash);
    if (cached) {
      console.log(`Cache HIT: ${endpoint}`);
      return cached;
    }

    // Cache miss - execute resolver
    console.log(`Cache MISS: ${endpoint}`);
    const result = await resolver(parent, args, context, info);

    // Cache result
    await cacheApiResponse(endpoint, queryHash, result, options);

    return result;
  };
}

// Usage in GraphQL schema
const resolvers = {
  Query: {
    getRobots: withCache(
      async () => {
        return await db.query('SELECT * FROM robots');
      },
      { ttl: 300, tags: ['robots', 'fleet'] }
    ),

    getRobot: withCache(
      async (_: any, { id }: { id: string }) => {
        return await db.query('SELECT * FROM robots WHERE id = $1', [id]);
      },
      { ttl: 300, tags: ['robots'] }
    )
  },

  Mutation: {
    updateRobot: async (_: any, { id, input }: any) => {
      const result = await db.query(
        'UPDATE robots SET ... WHERE id = $1',
        [id, ...]
      );

      // Invalidate related caches
      await invalidateCache('cache:api:*/robot*');
      await invalidateCache('cache:api:*/fleet*');

      return result;
    }
  }
};
```

---

### Pattern 3: Real-time Telemetry (hammer-orchestrator)

```typescript
import { bufferTelemetry, getBufferedTelemetry, flushTelemetryBuffer } from '../shared/redis-client';

// On telemetry ingestion
async function ingestTelemetry(robotId: string, data: TelemetryData) {
  // Buffer in Redis
  await bufferTelemetry(robotId, data);

  // Broadcast to WebSocket clients (via stream - handled automatically)
  // Stream consumers will receive this data in real-time
}

// Background job (every 10 seconds)
async function flushTelemetryToDatabase() {
  const robots = await getActiveRobots();

  for (const robot of robots) {
    const buffered = await getBufferedTelemetry(robot.id, 1000);

    if (buffered.length > 0) {
      // Batch insert to database
      await db.query(
        'INSERT INTO telemetry (robot_id, timestamp, metrics) VALUES ...',
        buffered
      );

      // Clear buffer
      await flushTelemetryBuffer(robot.id);
    }
  }
}

setInterval(flushTelemetryToDatabase, 10000);
```

---

### Pattern 4: Rate Limiting (API Gateway)

```typescript
import { checkRateLimit } from '../shared/redis-client';

// Middleware
async function rateLimitMiddleware(req: Request, res: Response, next: NextFunction) {
  const identifier = req.user?.id || req.ip;
  const limiterType = req.path.startsWith('/auth') ? 'auth' : 'api';

  const result = await checkRateLimit(limiterType, identifier);

  // Set rate limit headers
  res.setHeader('X-RateLimit-Limit', result.limit);
  res.setHeader('X-RateLimit-Remaining', result.remaining);
  res.setHeader('X-RateLimit-Reset', result.reset);

  if (!result.success) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((result.reset - Date.now()) / 1000)
    });
  }

  next();
}

app.use(rateLimitMiddleware);
```

---

### Pattern 5: WebSocket Room Management

```typescript
import {
  registerWebSocket,
  subscribeToRoom,
  unsubscribeFromRoom,
  getRoomMembers,
  removeWebSocket
} from '../shared/redis-client';

// On WebSocket connection
wss.on('connection', async (ws, req) => {
  const connectionId = generateId();
  const userId = req.user.id;

  // Register connection
  await registerWebSocket(connectionId, userId, []);

  ws.on('message', async (message) => {
    const data = JSON.parse(message);

    if (data.type === 'subscribe') {
      // Subscribe to robot updates
      await subscribeToRoom(`robot:${data.robotId}`, connectionId);
    }

    if (data.type === 'unsubscribe') {
      await unsubscribeFromRoom(`robot:${data.robotId}`, connectionId);
    }
  });

  ws.on('close', async () => {
    await removeWebSocket(connectionId);
  });
});

// Broadcasting telemetry updates
async function broadcastTelemetry(robotId: string, data: any) {
  const roomId = `robot:${robotId}`;
  const members = await getRoomMembers(roomId);

  for (const connectionId of members) {
    const ws = wss.getConnection(connectionId);
    ws?.send(JSON.stringify({ type: 'telemetry', data }));
  }
}
```

---

## Cache Invalidation

### Invalidation Strategies

#### 1. **Pattern-Based Invalidation**

Invalidate all keys matching a pattern:

```typescript
// After robot update
await invalidateCache('cache:api:*/robot*');
await invalidateCache('cache:api:*/fleet*');
```

#### 2. **Tag-Based Invalidation**

Invalidate by semantic tags:

```typescript
// When caching
await cacheApiResponse('getRobots', hash, data, {
  tags: ['robots', 'fleet', 'dashboard']
});

// When invalidating
await invalidateCacheByTags(['robots', 'fleet']);
```

#### 3. **Event-Driven Invalidation**

Trigger invalidation on database events:

```typescript
// In mutation resolver
const resolvers = {
  Mutation: {
    createTask: async (_: any, { input }: any) => {
      const task = await db.createTask(input);

      // Invalidate task-related caches
      await invalidateCache('cache:api:*/task*');
      await invalidateCache(`cache:api:*/robot:${task.robotId}/task*`);

      return task;
    }
  }
};
```

#### 4. **Time-Based Invalidation**

Use appropriate TTLs:

- **Static data**: 1 hour
- **Frequently updated**: 5 minutes
- **Real-time data**: 30 seconds
- **Computed metrics**: 1 minute with background refresh

### Invalidation Rules (from config)

```typescript
const invalidationRules = {
  robot: {
    triggers: ['robot:create', 'robot:update', 'robot:delete'],
    patterns: ['cache:api:*/robots*', 'cache:api:*/fleet*', 'robot:status:*']
  },
  task: {
    triggers: ['task:create', 'task:update', 'task:complete'],
    patterns: ['cache:api:*/tasks*', 'cache:api:*/robot:*/tasks*']
  },
  telemetry: {
    triggers: ['telemetry:batch'],
    patterns: ['cache:api:*/telemetry*', 'cache:api:*/metrics*'],
    debounce: 30000 // Wait 30s before invalidating (batch updates)
  }
};
```

---

## Monitoring

### Key Metrics to Track

#### 1. **Cache Performance**

```typescript
import redis from '../shared/redis-client';

async function getCacheMetrics() {
  const info = await redis.getInfo();

  return {
    hitRate: calculateHitRate(info),
    missRate: calculateMissRate(info),
    evictions: info.stats.evicted_keys,
    memoryUsage: await redis.getMemoryUsage()
  };
}
```

#### 2. **Connection Health**

```typescript
async function getConnectionHealth() {
  const info = await redis.getInfo();

  return {
    connected: await redis.ping(),
    activeConnections: await redis.getConnectionCount(),
    totalCommands: info.stats.total_commands_processed,
    opsPerSecond: info.stats.instantaneous_ops_per_sec
  };
}
```

#### 3. **Rate Limit Status**

```typescript
async function getRateLimitStats() {
  const keys = await redis.getKeys('ratelimit:*');

  const stats = {
    totalLimited: 0,
    byType: {} as Record<string, number>
  };

  for (const key of keys) {
    const [_, type] = key.split(':');
    stats.byType[type] = (stats.byType[type] || 0) + 1;
    stats.totalLimited++;
  }

  return stats;
}
```

### Upstash Dashboard Monitoring

The Upstash console provides built-in monitoring:

1. **Requests per second**
2. **Latency (p50, p95, p99)**
3. **Memory usage**
4. **Command statistics**
5. **Error rate**

Access at: [console.upstash.com](https://console.upstash.com/)

### Alerts Configuration

Set up alerts in Upstash console:

- **Memory > 85%**: Scale up or enable eviction
- **Error rate > 1%**: Investigate connectivity issues
- **Latency > 100ms**: Check network or query optimization
- **Requests > 10,000/s**: Consider upgrading plan

---

## Performance Optimization

### 1. **Connection Pooling**

Upstash REST API handles connection pooling automatically. No manual configuration needed.

### 2. **Pipeline Operations**

Batch multiple commands for better performance:

```typescript
import redis from '../shared/redis-client';

// Instead of multiple await calls
await redis.set('key1', 'value1');
await redis.set('key2', 'value2');
await redis.set('key3', 'value3');

// Use pipeline
await redis.pipeline([
  ['set', 'key1', 'value1'],
  ['set', 'key2', 'value2'],
  ['set', 'key3', 'value3']
]);
```

### 3. **Compression**

Enable compression for large values (>1KB):

```typescript
import { compress, decompress } from 'lz4';

async function cacheWithCompression(key: string, data: any) {
  const serialized = JSON.stringify(data);

  if (serialized.length > 1024) {
    const compressed = compress(Buffer.from(serialized));
    await redis.getClient().set(key, compressed.toString('base64'));
  } else {
    await redis.getClient().set(key, serialized);
  }
}
```

### 4. **Read Replicas**

Use read-only token for read-heavy operations:

```typescript
// Writes use primary token
await redis.getClient().set('key', 'value');

// Reads use read replica
const value = await redis.getReadClient().get('key');
```

### 5. **TTL Optimization**

Set appropriate TTLs to avoid unnecessary evictions:

```typescript
const ttlStrategies = {
  staticData: 3600,        // 1 hour
  userSessions: 86400,     // 24 hours
  apiCache: 300,           // 5 minutes
  robotStatus: 60,         // 1 minute
  telemetryBuffer: 600     // 10 minutes
};
```

### 6. **Lazy Loading**

Load data on-demand rather than preloading:

```typescript
async function getRobotWithCache(id: string) {
  // Check cache first
  const cached = await redis.getRobotStatus(id);
  if (cached) return cached;

  // Load from DB
  const robot = await db.query('SELECT * FROM robots WHERE id = $1', [id]);

  // Cache for next time
  await redis.updateRobotStatus(id, robot);

  return robot;
}
```

### 7. **Background Cache Warming**

Preload frequently accessed data:

```typescript
async function warmCache() {
  // Warm up fleet statistics
  const stats = await db.query('SELECT * FROM fleet_stats');
  await redis.cacheApiResponse('fleetStats', 'default', stats, { ttl: 300 });

  // Warm up robot list
  const robots = await db.query('SELECT * FROM robots WHERE active = true');
  await redis.cacheApiResponse('robots', 'active', robots, { ttl: 300 });
}

// Run on startup and every 5 minutes
warmCache();
setInterval(warmCache, 300000);
```

---

## Troubleshooting

### Issue 1: High Memory Usage

**Symptoms**:
- Upstash shows >85% memory usage
- Evictions increasing
- Cache misses increasing

**Solutions**:
1. Lower TTLs for less critical data
2. Enable compression for large values
3. Review and clean up unused keys
4. Upgrade Upstash plan

```typescript
// Audit key sizes
async function auditKeySize() {
  const keys = await redis.getKeys('*');
  const sizes: Array<{ key: string; size: number }> = [];

  for (const key of keys) {
    const size = await redis.getClient().strlen(key);
    sizes.push({ key, size });
  }

  // Sort by size
  sizes.sort((a, b) => b.size - a.size);

  console.log('Top 10 largest keys:', sizes.slice(0, 10));
}
```

---

### Issue 2: High Latency

**Symptoms**:
- Requests taking >100ms
- Upstash dashboard shows high p95 latency

**Solutions**:
1. Enable read replicas for read-heavy workloads
2. Use pipeline for batch operations
3. Check network connectivity
4. Consider multi-region setup

---

### Issue 3: Rate Limit False Positives

**Symptoms**:
- Legitimate users hitting rate limits
- Rate limit errors in logs

**Solutions**:
1. Adjust rate limit windows in config
2. Use user ID instead of IP for authenticated users
3. Implement exponential backoff

```typescript
// Adjust rate limits
const adjustedLimits = {
  api: { requests: 2000, window: 3600 },  // Increased from 1000
  auth: { requests: 20, window: 900 }     // Increased from 10
};
```

---

### Issue 4: Cache Invalidation Not Working

**Symptoms**:
- Stale data being served
- Updates not reflected immediately

**Solutions**:
1. Verify invalidation patterns match cache keys
2. Check invalidation logs
3. Reduce cache TTLs temporarily

```typescript
// Debug invalidation
async function debugInvalidation(pattern: string) {
  console.log('Invalidation pattern:', pattern);

  const keys = await redis.getKeys(pattern);
  console.log('Matching keys:', keys);

  const deleted = await redis.invalidateCache(pattern);
  console.log('Deleted keys:', deleted);
}
```

---

### Issue 5: WebSocket Connections Not Cleaned Up

**Symptoms**:
- Growing number of `ws:connection:*` keys
- Memory usage increasing

**Solutions**:
1. Verify `removeWebSocket` is called on disconnect
2. Implement periodic cleanup job
3. Reduce WebSocket connection TTL

```typescript
// Cleanup job (every 5 minutes)
async function cleanupStaleWebSockets() {
  const keys = await redis.getKeys('ws:connection:*');

  for (const key of keys) {
    const conn = await redis.getClient().get(key);
    if (!conn) continue;

    const parsed = JSON.parse(conn);
    const timeSinceLastPing = Date.now() - parsed.lastPing;

    // Remove if no ping for 10 minutes
    if (timeSinceLastPing > 600000) {
      await redis.removeWebSocket(key.replace('ws:connection:', ''));
    }
  }
}

setInterval(cleanupStaleWebSockets, 300000);
```

---

## Cost Optimization

### Upstash Pricing Model

Upstash charges based on:
1. **Commands**: Per 100,000 commands
2. **Storage**: Per GB stored
3. **Bandwidth**: Data transfer (free tier available)

### Cost Reduction Strategies

1. **Use appropriate TTLs**: Don't cache forever
2. **Enable compression**: Reduce storage costs
3. **Use read replicas**: Lower costs for read-heavy workloads
4. **Pipeline operations**: Reduce command count
5. **Batch operations**: Combine multiple operations

### Estimated Costs (Example)

**Assumptions**:
- 10,000 active users
- 100 robots sending telemetry
- 1M API requests/day
- 100GB cached data

**Breakdown**:
- Commands: ~50M/month = ~$25
- Storage: 100GB = ~$10
- Total: **~$35/month**

Compare to managed Redis (AWS ElastiCache): **~$200/month**

---

## Security Best Practices

### 1. **Environment Variables**

Never commit credentials to git:

```bash
# .gitignore
.env
.env.local
.env.*.local
```

### 2. **Read-Only Tokens**

Use read-only tokens for read operations:

```typescript
// Production configuration
const redisClient = process.env.NODE_ENV === 'production'
  ? redis.getReadClient()  // Uses read-only token
  : redis.getClient();     // Uses read-write token
```

### 3. **Token Rotation**

Rotate Upstash tokens quarterly:

1. Generate new token in Upstash console
2. Update environment variables
3. Deploy with zero downtime
4. Revoke old token after 24 hours

### 4. **Network Security**

Upstash provides TLS encryption by default. Ensure:
- All connections use HTTPS
- No plain HTTP connections allowed
- Enable VPC peering for private network access (enterprise)

### 5. **Data Encryption**

For sensitive data, encrypt before storing:

```typescript
import crypto from 'crypto';

function encrypt(data: string, key: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
  const encrypted = Buffer.concat([cipher.update(data), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(data: string, key: string): string {
  const parts = data.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const encrypted = Buffer.from(parts[1], 'hex');
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), iv);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString();
}
```

---

## Next Steps

1. ✅ Complete Upstash account setup
2. ✅ Configure environment variables
3. ✅ Integrate Redis client into services
4. ⏳ Implement caching in hammer-orchestrator
5. ⏳ Add session management to local-auth
6. ⏳ Set up telemetry buffering
7. ⏳ Configure rate limiting
8. ⏳ Implement WebSocket room management
9. ⏳ Set up monitoring and alerts
10. ⏳ Load test and optimize

---

## Additional Resources

- [Upstash Redis Documentation](https://docs.upstash.com/redis)
- [@upstash/redis NPM Package](https://www.npmjs.com/package/@upstash/redis)
- [@upstash/ratelimit Documentation](https://github.com/upstash/ratelimit)
- [Redis Best Practices](https://redis.io/docs/management/optimization/)
- [Redis Patterns](https://redis.io/docs/manual/patterns/)

---

## Support

For Upstash-specific issues:
- Upstash Discord: https://discord.gg/upstash
- Upstash Support: support@upstash.com

For project-specific issues:
- Create an issue in the repository
- Contact the platform team

---

**Last Updated**: 2025-11-04
**Version**: 1.0.0
**Maintainer**: Platform Team
