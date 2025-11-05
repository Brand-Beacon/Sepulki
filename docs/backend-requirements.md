# Backend Requirements - Robot Fleet Management System

**Analysis Date**: November 4, 2025
**Analyst**: Backend Developer Agent
**Project**: Sepulki - Robotics-as-a-Service Platform

## Executive Summary

The Sepulki platform has a well-architected backend with GraphQL API, PostgreSQL database, and microservices. However, several critical features are incomplete or missing, particularly around real-time telemetry, authentication hardening, and IoT device integration.

**Current Tech Stack**:
- **API Gateway**: Apollo Server (GraphQL) - `services/hammer-orchestrator`
- **Database**: PostgreSQL with UUID primary keys
- **Cache/PubSub**: Redis (ioredis)
- **Authentication**: Mock JWT (development only)
- **File Storage**: Local filesystem service
- **Frontend**: Next.js 14 with Apollo Client

---

## 1. API Endpoints Assessment

### ✅ **Existing & Functional**

#### Design & Build (Complete)
- `forgeSepulka` - Create robot designs
- `deleteSepulka` - Delete designs
- `castIngot` - Build robot artifacts
- `temperIngot` - Optimize builds

#### Robot Management (Mostly Complete)
- `robots` - Query robots with filters
- `robot(id)` - Get individual robot
- `updateRobotStatus` - Change robot state
- `updateRobotLocation` - Update GPS coordinates
- `assignRobotToFloor` - Assign to factory floor
- `updateRobotFloorPosition` - Update floor coordinates
- `updateRobotMobility` - Set mobile/stationary flag

#### Fleet Management (Basic)
- `fleets` - Query fleets
- `fleet(id)` - Get individual fleet
- `updateFleetLocation` - Update fleet GPS location
- `emergencyStop` - Stop all robots in fleet

#### Task Management (Basic)
- `tasks` - Query tasks with filters
- `task(id)` - Get individual task
- `dispatchTask` - Create and assign task
- `cancelTask` - Cancel active task
- `uploadProgram` - Upload program files (REST endpoint)
- `uploadRoute` - Upload route files (REST endpoint)

#### Factory Floors (Complete)
- `factoryFloors` - Query all floors
- `factoryFloor(id)` - Get individual floor
- `createFactoryFloor` - Create with blueprint upload
- `updateFactoryFloor` - Update floor details
- `deleteFactoryFloor` - Remove floor

#### Catalog (Basic)
- `alloys` - Get component catalog
- `patterns` - Get design templates
- Static catalog generator via REST API

### 🔴 **Missing Critical Endpoints**

#### Real-time Telemetry
```graphql
# Currently stubs returning empty data
query {
  bellows(fleetId: ID!, timeRange: TimeRange!) # Returns empty metrics
}

subscription {
  bellowsStream(fleetId: ID!) # Not implemented
  robotStatus(robotId: ID) # Not implemented
  taskUpdates(fleetId: ID) # Not implemented
}
```

**Required Implementation**:
- WebSocket subscriptions via Apollo Server
- Redis pub/sub for real-time events
- Telemetry data aggregation service
- Robot sensor data ingestion endpoint

#### Authentication & User Management
```graphql
# Partially implemented, not production-ready
mutation {
  login(credentials: LoginCredentials!) # Needs hardening
  refreshToken(refreshToken: String!) # Not implemented
  logout # Basic implementation
}

# Missing entirely:
mutation {
  register(input: RegisterInput!)
  resetPassword(email: String!)
  updateProfile(input: ProfileInput!)
  changePassword(old: String!, new: String!)
}
```

**Current Issues**:
- Mock JWT tokens in development
- No password reset flow
- No user registration
- No session management
- No OAuth/SSO support

#### Advanced Task Management
```graphql
# Missing:
mutation {
  scheduleTask(input: ScheduledTaskInput!) # Cron/recurring tasks
  updateTaskPriority(taskId: ID!, priority: TaskPriority!)
  reassignTask(taskId: ID!, robotId: ID!)
  cloneTask(taskId: ID!) # Duplicate existing task
}

query {
  taskHistory(robotId: ID!, limit: Int) # Historical analysis
  taskAnalytics(fleetId: ID!, timeRange: TimeRange!) # Performance metrics
}
```

#### Fleet Analytics
```graphql
query {
  fleetPerformance(fleetId: ID!, timeRange: TimeRange!) # KPIs, uptime, efficiency
  robotHealth(robotId: ID!) # Predictive maintenance metrics
  batteryAnalytics(fleetId: ID!) # Battery usage patterns
  utilizationReport(fleetId: ID!, timeRange: TimeRange!) # Resource utilization
}
```

#### IoT Device Integration
```graphql
mutation {
  registerRobot(input: RobotRegistrationInput!) # Onboard new physical robot
  updateRobotFirmware(robotId: ID!, version: String!)
  calibrateRobot(robotId: ID!, parameters: JSON!)
}

query {
  robotLogs(robotId: ID!, level: LogLevel, limit: Int) # Device logs
  networkStatus(robotId: ID!) # Connectivity status
}
```

---

## 2. Database Schema Assessment

### ✅ **Existing Schema (Comprehensive)**

**Core Tables** (All exist with proper relationships):
- `smiths` - User accounts with RBAC
- `patterns` - Robot design templates
- `alloys` - Component catalog
- `sepulkas` - Robot designs
- `sepulka_alloys` - Component associations
- `ingots` - Build artifacts
- `loci` - Geographic locations
- `fleets` - Robot fleet management
- `robots` - Individual robots
- `tasks` - Task definitions
- `task_robots` - Task assignments
- `runs` - Task execution records
- `factory_floors` - Indoor positioning
- `edicts` - Policy constraints

**Strong Points**:
- ✅ UUID primary keys for distributed systems
- ✅ JSONB for flexible parameters
- ✅ Proper foreign keys and cascading
- ✅ Timestamp tracking (created_at, updated_at)
- ✅ Enum types for status fields
- ✅ Support for indoor (factory floor) and outdoor (GPS) positioning

### 🟡 **Schema Improvements Needed**

#### 1. Missing Indexes
```sql
-- Performance optimization needed
CREATE INDEX idx_robots_fleet_status ON robots(fleet_id, status);
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX idx_runs_robot_started ON runs(robot_id, started_at DESC);
CREATE INDEX idx_robots_factory_floor ON robots(factory_floor_id) WHERE factory_floor_id IS NOT NULL;
CREATE INDEX idx_tasks_created_at ON tasks(created_at DESC);
CREATE INDEX idx_robots_last_seen ON robots(last_seen DESC) WHERE status != 'OFFLINE';
```

#### 2. Missing Tables

**Sessions Table** (for secure authentication):
```sql
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  smith_id UUID NOT NULL REFERENCES smiths(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE,
  INDEX idx_sessions_smith (smith_id),
  INDEX idx_sessions_expires (expires_at)
);
```

**Telemetry Table** (for historical data):
```sql
CREATE TABLE telemetry_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  robot_id UUID NOT NULL REFERENCES robots(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL, -- 'battery', 'pose', 'error', 'sensor'
  data JSONB NOT NULL,
  severity VARCHAR(20) DEFAULT 'INFO',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_telemetry_robot_time (robot_id, timestamp DESC),
  INDEX idx_telemetry_type (event_type, timestamp DESC)
);

-- Partition by time for performance
CREATE TABLE telemetry_events_2025_11 PARTITION OF telemetry_events
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');
```

**Audit Log Table**:
```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  smith_id UUID REFERENCES smiths(id),
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_audit_smith_time (smith_id, timestamp DESC),
  INDEX idx_audit_resource (resource_type, resource_id)
);
```

**Notification Queue**:
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  smith_id UUID NOT NULL REFERENCES smiths(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'task_complete', 'robot_error', 'low_battery'
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  INDEX idx_notifications_smith_read (smith_id, read, created_at DESC)
);
```

#### 3. Schema Enhancements

**Add soft delete support**:
```sql
ALTER TABLE sepulkas ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE robots ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE tasks ADD COLUMN deleted_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_sepulkas_deleted ON sepulkas(deleted_at) WHERE deleted_at IS NULL;
```

**Add materialized views for analytics**:
```sql
CREATE MATERIALIZED VIEW robot_utilization_daily AS
SELECT
  robot_id,
  DATE(started_at) as date,
  COUNT(*) as tasks_completed,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds,
  SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as successful_tasks
FROM runs
WHERE status IN ('COMPLETED', 'FAILED')
GROUP BY robot_id, DATE(started_at);

CREATE UNIQUE INDEX ON robot_utilization_daily (robot_id, date);
```

---

## 3. Authentication & Authorization

### 🔴 **Current State: Development Only**

**Problems**:
- Mock JWT generation in frontend (`lib/graphql.ts:49-68`)
- No signature verification
- No token expiration enforcement
- No refresh token mechanism
- Hardcoded secret "mock-signature-for-development"

### ✅ **Required Production Implementation**

#### 1. JWT Token Service
```typescript
// services/auth-service/src/jwt.ts
import { SignJWT, jwtVerify } from 'jose';

interface TokenPayload {
  sub: string; // smith_id
  email: string;
  role: string;
  permissions: string[];
  sessionId: string;
}

class JWTService {
  private secret: Uint8Array;

  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET required');
    this.secret = new TextEncoder().encode(secret);
  }

  async generateAccessToken(payload: TokenPayload): Promise<string> {
    return new SignJWT({ ...payload })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('15m') // Short-lived
      .sign(this.secret);
  }

  async generateRefreshToken(sessionId: string): Promise<string> {
    return new SignJWT({ sessionId })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d') // Long-lived
      .sign(this.secret);
  }

  async verifyToken(token: string): Promise<TokenPayload> {
    const { payload } = await jwtVerify(token, this.secret);
    return payload as TokenPayload;
  }
}
```

#### 2. Password Security
```typescript
// Use bcrypt with proper rounds (already in package.json)
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}
```

#### 3. Session Management
```typescript
interface CreateSessionInput {
  smithId: string;
  ipAddress: string;
  userAgent: string;
}

async function createSession(input: CreateSessionInput, db: Pool) {
  const sessionId = uuid();
  const accessToken = await jwt.generateAccessToken({...smith, sessionId});
  const refreshToken = await jwt.generateRefreshToken(sessionId);

  await db.query(`
    INSERT INTO sessions (id, smith_id, token_hash, refresh_token_hash, ip_address, user_agent, expires_at)
    VALUES ($1, $2, $3, $4, $5, $6, NOW() + INTERVAL '7 days')
  `, [
    sessionId,
    input.smithId,
    await bcrypt.hash(accessToken, 10),
    await bcrypt.hash(refreshToken, 10),
    input.ipAddress,
    input.userAgent
  ]);

  return { sessionId, accessToken, refreshToken };
}
```

#### 4. Role-Based Access Control (RBAC)

**Already defined in schema** (GraphQL Permission enum):
```typescript
enum Permission {
  // Design
  FORGE_SEPULKA, EDIT_SEPULKA, DELETE_SEPULKA,
  CAST_INGOT, TEMPER_INGOT,

  // Fleet
  QUENCH_TO_FLEET, RECALL_FLEET, EMERGENCY_STOP,
  VIEW_FLEET, MANAGE_FLEET,

  // Robots
  VIEW_ROBOTS, MANAGE_ROBOTS,

  // Tasks
  CREATE_TASK, ASSIGN_TASK, CANCEL_TASK, VIEW_TASKS,

  // Catalog
  VIEW_CATALOG, MANAGE_ALLOYS, MANAGE_PATTERNS,

  // Policy
  VIEW_EDICTS, MANAGE_EDICTS,

  // Telemetry
  VIEW_BELLOWS, EXPORT_TELEMETRY,

  // Admin
  MANAGE_SMITHS, SYSTEM_CONFIG, AUDIT_LOGS
}
```

**Implementation** (already exists in `context.ts`):
```typescript
export async function requirePermission(
  context: Context,
  permission: Permission
): Promise<{ smith: Smith }> {
  if (!context.smith) {
    throw new AuthenticationError('Authentication required');
  }

  if (!context.smith.permissions.includes(permission)) {
    throw new ForbiddenError(`Missing permission: ${permission}`);
  }

  return { smith: context.smith };
}
```

**Role-Permission Mapping Needed**:
```typescript
const ROLE_PERMISSIONS = {
  SMITH: [
    'FORGE_SEPULKA', 'VIEW_CATALOG', 'VIEW_FLEET',
    'VIEW_ROBOTS', 'VIEW_TASKS', 'CREATE_TASK'
  ],
  OVER_SMITH: [
    // All SMITH permissions plus:
    'MANAGE_FLEET', 'MANAGE_ROBOTS', 'ASSIGN_TASK',
    'CANCEL_TASK', 'EMERGENCY_STOP', 'VIEW_BELLOWS'
  ],
  ADMIN: [
    // All permissions
    'MANAGE_SMITHS', 'SYSTEM_CONFIG', 'AUDIT_LOGS',
    'MANAGE_ALLOYS', 'MANAGE_PATTERNS', 'MANAGE_EDICTS'
  ]
};
```

---

## 4. Real-time Features Implementation

### 🔴 **Current State: Not Implemented**

**Stubs Exist**:
- Subscription resolvers defined but return empty data
- Redis client connected but not used for pub/sub
- Frontend hooks ready (`useFleetStatus`, `useRobotStatus`)

### ✅ **Required Implementation**

#### 1. GraphQL Subscriptions Setup

```typescript
// services/hammer-orchestrator/src/index.ts
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { PubSub } from 'graphql-subscriptions';

const pubsub = new PubSub();

// Create WebSocket server
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/graphql',
});

const schema = makeExecutableSchema({ typeDefs, resolvers });

useServer(
  {
    schema,
    context: async (ctx) => {
      // Extract token from connection params
      const token = ctx.connectionParams?.authorization?.replace('Bearer ', '');
      return await createContext({ token });
    },
  },
  wsServer
);
```

#### 2. Subscription Resolvers

```typescript
// services/hammer-orchestrator/src/resolvers/subscriptions.ts
import { withFilter } from 'graphql-subscriptions';

export const subscriptionResolvers = {
  Subscription: {
    bellowsStream: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['FLEET_TELEMETRY']),
        (payload, variables) => {
          return payload.fleetId === variables.fleetId;
        }
      )
    },

    robotStatus: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['ROBOT_STATUS']),
        (payload, variables) => {
          return !variables.robotId || payload.robotId === variables.robotId;
        }
      )
    },

    taskUpdates: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['TASK_UPDATE']),
        async (payload, variables, context) => {
          if (!variables.fleetId) return true;

          // Check if task belongs to fleet
          const task = await context.dataloaders.task.load(payload.taskId);
          const robots = await context.db.query(
            'SELECT fleet_id FROM robots WHERE id IN (SELECT robot_id FROM task_robots WHERE task_id = $1)',
            [payload.taskId]
          );

          return robots.rows.some(r => r.fleet_id === variables.fleetId);
        }
      )
    },

    policyBreaches: {
      subscribe: withFilter(
        () => pubsub.asyncIterator(['POLICY_BREACH']),
        (payload, variables) => {
          return !variables.severity || payload.severity === variables.severity;
        }
      )
    }
  }
};
```

#### 3. Redis Pub/Sub Integration

```typescript
// services/hammer-orchestrator/src/pubsub/redis.ts
import Redis from 'ioredis';
import { RedisPubSub } from 'graphql-redis-subscriptions';

const redisOptions = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  retryStrategy: (times: number) => Math.min(times * 50, 2000),
};

export const pubsub = new RedisPubSub({
  publisher: new Redis(redisOptions),
  subscriber: new Redis(redisOptions),
});

// Publish helper functions
export async function publishRobotStatus(robotId: string, status: any) {
  await pubsub.publish('ROBOT_STATUS', {
    robotId,
    ...status,
    timestamp: new Date().toISOString(),
  });
}

export async function publishFleetTelemetry(fleetId: string, metrics: any[]) {
  await pubsub.publish('FLEET_TELEMETRY', {
    fleetId,
    metrics,
    events: [],
    realTime: true,
    timestamp: new Date().toISOString(),
  });
}

export async function publishTaskUpdate(taskId: string, update: any) {
  await pubsub.publish('TASK_UPDATE', {
    taskId,
    ...update,
    timestamp: new Date().toISOString(),
  });
}
```

#### 4. Telemetry Ingestion Endpoint

```typescript
// services/hammer-orchestrator/src/routes/telemetry.ts
import express from 'express';

const router = express.Router();

router.post('/telemetry/:robotId', async (req, res) => {
  const { robotId } = req.params;
  const { eventType, data } = req.body;

  try {
    // Store in database
    await db.query(`
      INSERT INTO telemetry_events (robot_id, event_type, data)
      VALUES ($1, $2, $3)
    `, [robotId, eventType, data]);

    // Publish to subscribers
    await publishRobotStatus(robotId, {
      id: robotId,
      status: data.status || 'WORKING',
      batteryLevel: data.battery_level,
      healthScore: data.health_score,
      lastSeen: new Date(),
      pose: data.pose,
    });

    // Update robot record
    await db.query(`
      UPDATE robots
      SET last_seen = NOW(),
          battery_level = COALESCE($2, battery_level),
          health_score = COALESCE($3, health_score),
          last_pose = COALESCE($4::jsonb, last_pose)
      WHERE id = $1
    `, [robotId, data.battery_level, data.health_score, data.pose]);

    res.json({ success: true });
  } catch (error) {
    console.error('Telemetry ingestion error:', error);
    res.status(500).json({ error: 'Failed to process telemetry' });
  }
});

export default router;
```

#### 5. Alternative: Server-Sent Events (SSE)

For simpler deployments without WebSocket support:

```typescript
// services/hammer-orchestrator/src/routes/sse.ts
router.get('/events/fleet/:fleetId', async (req, res) => {
  const { fleetId } = req.params;

  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  // Subscribe to Redis channels
  const subscriber = new Redis();
  await subscriber.subscribe('FLEET_TELEMETRY', 'ROBOT_STATUS');

  subscriber.on('message', (channel, message) => {
    const data = JSON.parse(message);
    if (data.fleetId === fleetId || data.fleet_id === fleetId) {
      res.write(`data: ${message}\n\n`);
    }
  });

  req.on('close', () => {
    subscriber.unsubscribe();
    subscriber.quit();
  });
});
```

---

## 5. Integration Requirements

### 🔴 **External APIs Needed**

#### 1. Maps & Navigation
```typescript
// services/navigation-service/
interface NavigationProvider {
  // Google Maps, Mapbox, or OpenStreetMap
  calculateRoute(start: Coordinates, end: Coordinates): Promise<Route>;
  geocode(address: string): Promise<Coordinates>;
  reverseGeocode(coords: Coordinates): Promise<string>;
}

// Integration: Mapbox Directions API
const mapboxClient = new MapboxDirections({
  accessToken: process.env.MAPBOX_API_KEY
});

async function planRoute(robotId: string, waypoints: Coordinates[]) {
  const response = await mapboxClient.getDirections({
    waypoints,
    profile: 'driving', // or 'walking' for indoor robots
    geometries: 'geojson',
  });

  return response.routes[0];
}
```

#### 2. Weather Service
```typescript
// For outdoor fleet operations
interface WeatherService {
  getCurrentWeather(location: Coordinates): Promise<Weather>;
  getForecast(location: Coordinates, hours: number): Promise<Forecast[]>;
}

// Integration: OpenWeather API
async function checkOperationalConditions(fleetId: string) {
  const fleet = await db.query('SELECT coordinates FROM loci WHERE id = (SELECT locus_id FROM fleets WHERE id = $1)', [fleetId]);
  const weather = await weatherService.getCurrentWeather(fleet.coordinates);

  // Check if conditions are safe
  if (weather.windSpeed > 30 || weather.precipitation > 0.5) {
    await emergencyStop(fleetId);
    await publishPolicyBreach({
      edictId: 'weather-safety',
      fleetId,
      severity: 'CRITICAL',
      message: 'Unsafe weather conditions detected',
    });
  }
}
```

#### 3. IoT Device Communication

**MQTT Broker Integration**:
```typescript
// services/iot-bridge/src/mqtt.ts
import mqtt from 'mqtt';

const client = mqtt.connect(process.env.MQTT_BROKER_URL, {
  clientId: 'hammer-orchestrator',
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
});

// Subscribe to robot telemetry
client.subscribe('robots/+/telemetry');

client.on('message', async (topic, payload) => {
  const robotId = topic.split('/')[1];
  const data = JSON.parse(payload.toString());

  // Process telemetry
  await ingestTelemetry(robotId, data);
});

// Publish commands to robots
async function sendCommand(robotId: string, command: any) {
  const topic = `robots/${robotId}/commands`;
  client.publish(topic, JSON.stringify(command));
}
```

**ROS Bridge Integration** (for ROS-based robots):
```typescript
// services/ros-bridge/
import * as ROSLIB from 'roslib';

const ros = new ROSLIB.Ros({
  url: process.env.ROS_BRIDGE_URL || 'ws://localhost:9090'
});

async function subscribeRobotPose(robotId: string) {
  const listener = new ROSLIB.Topic({
    ros,
    name: `/robot_${robotId}/pose`,
    messageType: 'geometry_msgs/PoseStamped',
  });

  listener.subscribe((message) => {
    ingestTelemetry(robotId, {
      eventType: 'pose',
      data: {
        pose: {
          position: message.pose.position,
          orientation: message.pose.orientation,
        },
      },
    });
  });
}
```

#### 4. Third-Party Services

**Email/SMS Notifications** (for alerts):
```typescript
// services/notification-service/
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import twilio from 'twilio';

class NotificationService {
  private ses: SESClient;
  private sms: twilio.Twilio;

  async sendEmail(to: string, subject: string, body: string) {
    await this.ses.send(new SendEmailCommand({
      Source: process.env.FROM_EMAIL,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject },
        Body: { Text: { Data: body } },
      },
    }));
  }

  async sendSMS(to: string, message: string) {
    await this.sms.messages.create({
      to,
      from: process.env.TWILIO_PHONE,
      body: message,
    });
  }
}

// Usage: Alert on critical events
async function handleCriticalError(robotId: string, error: string) {
  const robot = await db.query('SELECT * FROM robots WHERE id = $1', [robotId]);
  const fleet = await db.query('SELECT * FROM fleets WHERE id = $1', [robot.fleet_id]);
  const admins = await db.query('SELECT email, phone FROM smiths WHERE role = $1', ['ADMIN']);

  for (const admin of admins.rows) {
    await notifications.sendEmail(
      admin.email,
      `CRITICAL: Robot ${robot.name} Error`,
      `Robot ${robot.name} in fleet ${fleet.name} encountered critical error: ${error}`
    );

    if (admin.phone) {
      await notifications.sendSMS(admin.phone, `ALERT: Robot ${robot.name} error - ${error}`);
    }
  }
}
```

**Cloud Storage** (for large files):
```typescript
// Replace FileStorageService with S3-compatible storage
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

class CloudStorageService {
  private s3: S3Client;

  async uploadFile(buffer: Buffer, filename: string, type: string) {
    const key = `${type}/${Date.now()}-${filename}`;

    await this.s3.send(new PutObjectCommand({
      Bucket: process.env.S3_BUCKET,
      Key: key,
      Body: buffer,
      ContentType: this.getContentType(filename),
    }));

    return {
      fileId: key,
      url: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${key}`,
    };
  }
}
```

---

## 6. Implementation Plan

### 📊 **Priority Levels**

**P0 - Critical (Block Production)**:
1. Authentication hardening (JWT + sessions)
2. Real-time telemetry ingestion endpoint
3. WebSocket subscriptions for robot status
4. Database indexes for performance
5. Audit logging

**P1 - High (Needed for MVP)**:
1. MQTT/IoT device bridge
2. Task scheduling and queuing
3. Fleet analytics endpoints
4. Email notifications
5. Password reset flow

**P2 - Medium (Post-MVP)**:
1. Weather API integration
2. Advanced route planning
3. Predictive maintenance ML
4. Multi-factor authentication
5. SSO/OAuth providers

**P3 - Low (Nice to Have)**:
1. SMS notifications
2. Mobile app backend
3. Advanced analytics dashboards
4. Export/import APIs
5. Webhook support

---

### 🗓️ **Development Timeline**

#### **Week 1-2: Authentication & Security (P0)**
- [ ] Implement JWT service with proper signing
- [ ] Create sessions table and management
- [ ] Add password reset flow
- [ ] Implement refresh token rotation
- [ ] Add rate limiting middleware
- [ ] Create audit log system

**Estimated Time**: 60-80 hours
**Dependencies**: None
**Blockers**: None

#### **Week 3-4: Real-time Infrastructure (P0)**
- [ ] Setup GraphQL subscriptions with WebSocket
- [ ] Implement Redis pub/sub for events
- [ ] Create telemetry ingestion REST endpoint
- [ ] Build subscription resolvers (robot status, tasks)
- [ ] Add telemetry_events table with partitioning
- [ ] Test with frontend hooks

**Estimated Time**: 50-70 hours
**Dependencies**: Redis cluster
**Blockers**: None

#### **Week 5: Database Optimization (P0)**
- [ ] Add all recommended indexes
- [ ] Create sessions table
- [ ] Create telemetry_events table with partitions
- [ ] Create audit_logs table
- [ ] Create notifications table
- [ ] Add materialized views for analytics
- [ ] Run load testing

**Estimated Time**: 20-30 hours
**Dependencies**: Database migration tool
**Blockers**: Production data migration

#### **Week 6-7: IoT Integration (P1)**
- [ ] Setup MQTT broker (Mosquitto/AWS IoT)
- [ ] Create IoT bridge service
- [ ] Implement device registration flow
- [ ] Build command publishing system
- [ ] Add ROS bridge for ROS-based robots
- [ ] Create device authentication

**Estimated Time**: 40-60 hours
**Dependencies**: MQTT broker infrastructure
**Blockers**: Physical robot access for testing

#### **Week 8: Task Management Enhancements (P1)**
- [ ] Add task scheduling (cron)
- [ ] Implement task queueing system
- [ ] Build task reassignment logic
- [ ] Create task cloning functionality
- [ ] Add task templates
- [ ] Implement smart task assignment algorithm

**Estimated Time**: 30-40 hours
**Dependencies**: None
**Blockers**: Business logic decisions needed

#### **Week 9: Analytics & Reporting (P1)**
- [ ] Build fleet performance endpoints
- [ ] Create robot health metrics
- [ ] Add battery analytics
- [ ] Implement utilization reports
- [ ] Create materialized views
- [ ] Build export functionality

**Estimated Time**: 30-40 hours
**Dependencies**: Telemetry data collection
**Blockers**: None

#### **Week 10: Notifications (P1)**
- [ ] Setup email service (AWS SES)
- [ ] Create notification templates
- [ ] Implement alert rules engine
- [ ] Build notification preferences
- [ ] Add in-app notifications
- [ ] Create notification digest system

**Estimated Time**: 25-35 hours
**Dependencies**: Email service provider
**Blockers**: None

---

### 🧪 **Testing Strategy**

#### Unit Tests
- All resolvers with 80%+ coverage
- Authentication flows
- Permission checking
- Data validation
- Error handling

#### Integration Tests
- GraphQL queries end-to-end
- Subscription flows
- Authentication flows
- Database transactions
- File uploads

#### Load Tests
- 1000 concurrent WebSocket connections
- 100 requests/second to API
- Telemetry ingestion at 10 events/sec/robot
- Database query performance under load

#### E2E Tests
- Complete user workflows
- Robot registration to task completion
- Authentication flows
- Real-time updates in UI

---

## 7. Infrastructure Requirements

### 🖥️ **Services Architecture**

```
┌─────────────────────────────────────────────────┐
│                   API Gateway                    │
│         (Apollo Server + GraphQL)                │
│         Port: 4000                               │
└─────────────────┬───────────────────────────────┘
                  │
    ┌─────────────┼─────────────┬────────────┐
    │             │             │            │
    ▼             ▼             ▼            ▼
┌───────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐
│ Auth  │  │   IoT    │  │Telemetry │  │Notification│
│Service│  │ Bridge   │  │ Service  │  │  Service   │
│:3001  │  │  :3002   │  │  :3003   │  │   :3004    │
└───┬───┘  └────┬─────┘  └────┬─────┘  └─────┬──────┘
    │           │             │              │
    └───────────┴─────────────┴──────────────┘
                      │
            ┌─────────┴──────────┐
            │                    │
            ▼                    ▼
    ┌──────────────┐    ┌──────────────┐
    │  PostgreSQL  │    │    Redis     │
    │   (Primary)  │    │  (Pub/Sub +  │
    │   Port: 5432 │    │    Cache)    │
    └──────────────┘    │  Port: 6379  │
                        └──────────────┘
```

### 📦 **Service Specifications**

#### 1. hammer-orchestrator (API Gateway)
- **Role**: GraphQL API, subscriptions, REST endpoints
- **CPU**: 2 vCPU
- **RAM**: 4 GB
- **Scaling**: Horizontal (2-10 instances)
- **Health Check**: `/health`

#### 2. auth-service (Authentication)
- **Role**: JWT generation, session management, RBAC
- **CPU**: 1 vCPU
- **RAM**: 2 GB
- **Scaling**: Horizontal (2-5 instances)
- **Health Check**: `/health`

#### 3. iot-bridge (Device Communication)
- **Role**: MQTT broker client, ROS bridge, telemetry ingestion
- **CPU**: 2 vCPU
- **RAM**: 4 GB
- **Scaling**: Horizontal (2-8 instances based on robot count)
- **Health Check**: MQTT connection status

#### 4. telemetry-service (Data Processing)
- **Role**: Process telemetry, aggregate metrics, trigger alerts
- **CPU**: 2 vCPU
- **RAM**: 8 GB
- **Scaling**: Horizontal with queue workers
- **Health Check**: Queue depth monitoring

#### 5. notification-service (Alerts)
- **Role**: Email, SMS, push notifications
- **CPU**: 1 vCPU
- **RAM**: 2 GB
- **Scaling**: Horizontal (2-4 instances)
- **Health Check**: Email service connection

### 🗄️ **Database Requirements**

#### PostgreSQL
- **Version**: 15+
- **Storage**: 100 GB SSD (grows with telemetry data)
- **Connections**: 200 max
- **Replication**: Primary + 1 read replica
- **Backup**: Daily snapshots + WAL archiving
- **Partitioning**: telemetry_events by month

#### Redis
- **Version**: 7+
- **Memory**: 8 GB
- **Persistence**: RDB + AOF
- **Replication**: Primary + 1 replica
- **Use Cases**: Pub/Sub, session cache, rate limiting

### ☁️ **Cloud Infrastructure**

**Recommended: AWS**
- **Compute**: ECS Fargate or EKS
- **Database**: RDS PostgreSQL (Multi-AZ)
- **Cache**: ElastiCache Redis
- **Storage**: S3 for files
- **Monitoring**: CloudWatch + X-Ray
- **Secrets**: AWS Secrets Manager

**Alternative: Self-Hosted**
- **Orchestration**: Docker Compose or Kubernetes
- **Database**: PostgreSQL with streaming replication
- **Cache**: Redis Cluster
- **Storage**: MinIO (S3-compatible)
- **Monitoring**: Prometheus + Grafana

---

## 8. Security Considerations

### 🔒 **Critical Security Requirements**

#### 1. API Security
- ✅ HTTPS only in production (add redirect middleware)
- ✅ CORS configured (already implemented)
- ⚠️ Rate limiting (needs implementation)
- ⚠️ Request size limits (needs enforcement)
- ⚠️ SQL injection protection (use parameterized queries - mostly done)
- ❌ GraphQL query complexity limits (needs implementation)
- ❌ Introspection disabled in production

```typescript
// Add rate limiting
import rateLimit from 'express-rate-limit';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP',
});

app.use('/graphql', apiLimiter);

// Add GraphQL complexity limits
import { createComplexityLimitRule } from 'graphql-validation-complexity';

const server = new ApolloServer({
  validationRules: [
    createComplexityLimitRule(1000, {
      onCost: (cost) => console.log('query cost:', cost),
    }),
  ],
});
```

#### 2. Authentication Security
- ❌ Password complexity requirements
- ❌ Account lockout after failed attempts
- ❌ Password reset with time-limited tokens
- ❌ Session timeout and cleanup
- ❌ Multi-factor authentication (optional)

```typescript
// Password validation
import zxcvbn from 'zxcvbn';

function validatePassword(password: string) {
  const strength = zxcvbn(password);
  if (strength.score < 3) {
    throw new ValidationError('Password too weak', 'password');
  }
  if (password.length < 12) {
    throw new ValidationError('Password must be at least 12 characters', 'password');
  }
}

// Account lockout
async function checkLoginAttempts(email: string) {
  const key = `login_attempts:${email}`;
  const attempts = await redis.incr(key);
  await redis.expire(key, 15 * 60); // 15 minutes

  if (attempts > 5) {
    throw new AuthenticationError('Account temporarily locked due to multiple failed login attempts');
  }
}
```

#### 3. Data Protection
- ⚠️ Sensitive data encryption at rest (database-level)
- ✅ Connection encryption (TLS)
- ❌ PII data masking in logs
- ❌ Secrets management (use env vars, not hardcoded)
- ❌ API key rotation policy

```typescript
// Mask sensitive data in logs
function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

function sanitizeLogData(data: any) {
  return {
    ...data,
    email: maskEmail(data.email),
    password: undefined,
    token: undefined,
  };
}
```

#### 4. Network Security
- ✅ VPC with private subnets
- ✅ Security groups restricting access
- ⚠️ WAF for DDoS protection
- ⚠️ Certificate management (Let's Encrypt)

#### 5. Monitoring & Incident Response
- ❌ Audit logging for all mutations
- ❌ Anomaly detection (unusual API usage)
- ❌ Automated alerts for security events
- ❌ Incident response plan

---

## 9. Performance Optimization

### ⚡ **Current Performance Issues**

1. **N+1 Query Problem** - ✅ **SOLVED** (DataLoaders implemented)
2. **Missing Database Indexes** - ❌ **NEEDS FIX**
3. **No Query Result Caching** - ⚠️ **PARTIAL** (Redis connected but not used)
4. **Large Payload Sizes** - ⚠️ **NEEDS MONITORING**

### 🚀 **Optimization Strategies**

#### 1. Database Indexing (High Impact)
```sql
-- Add indexes (from section 2)
CREATE INDEX idx_robots_fleet_status ON robots(fleet_id, status);
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX idx_runs_robot_started ON runs(robot_id, started_at DESC);
CREATE INDEX idx_telemetry_robot_time ON telemetry_events(robot_id, timestamp DESC);
```

**Expected Impact**: 50-80% reduction in query time for common operations

#### 2. Query Result Caching
```typescript
// Cache frequently accessed data
async function getFleet(id: string, context: Context) {
  const cacheKey = `fleet:${id}`;

  // Try cache first
  const cached = await context.redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  // Query database
  const fleet = await context.db.query('SELECT * FROM fleets WHERE id = $1', [id]);

  // Cache for 5 minutes
  await context.redis.setex(cacheKey, 300, JSON.stringify(fleet.rows[0]));

  return fleet.rows[0];
}
```

#### 3. Connection Pooling
```typescript
// Already implemented in context.ts
const pool = new Pool({
  max: 20, // maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

**Tune based on load**:
- Development: max 10
- Staging: max 20
- Production: max 50-100

#### 4. Pagination Enforcement
```typescript
// Add default limits to prevent large queries
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 500;

function validatePagination(limit?: number, offset?: number) {
  const validLimit = Math.min(limit || DEFAULT_LIMIT, MAX_LIMIT);
  const validOffset = Math.max(offset || 0, 0);
  return { limit: validLimit, offset: validOffset };
}
```

#### 5. Response Compression
```typescript
// Add compression middleware
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
  threshold: 1024, // Only compress responses > 1KB
}));
```

---

## 10. Monitoring & Observability

### 📊 **Metrics to Track**

#### Application Metrics
- GraphQL operation duration (p50, p95, p99)
- Resolver execution time
- Database query time
- Cache hit/miss ratio
- WebSocket connection count
- Active subscriptions

#### Business Metrics
- Active robots per fleet
- Task completion rate
- Average task duration
- Robot uptime percentage
- Battery levels across fleet
- Error rate by robot/fleet

#### Infrastructure Metrics
- CPU/Memory usage per service
- Database connection pool usage
- Redis memory usage
- Network throughput
- Disk I/O

### 🔍 **Observability Stack**

#### Option 1: Cloud Native (AWS)
```typescript
// AWS X-Ray for distributed tracing
import AWSXRay from 'aws-xray-sdk';

const app = express();
app.use(AWSXRay.express.openSegment('hammer-orchestrator'));

// CloudWatch Metrics
import { CloudWatch } from '@aws-sdk/client-cloudwatch';

async function recordMetric(name: string, value: number) {
  await cloudwatch.putMetricData({
    Namespace: 'Sepulki',
    MetricData: [{
      MetricName: name,
      Value: value,
      Timestamp: new Date(),
      Unit: 'Count',
    }],
  });
}
```

#### Option 2: Open Source
```typescript
// Prometheus metrics
import promClient from 'prom-client';

const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register],
});

// Expose metrics endpoint
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});
```

#### Logging Strategy
```typescript
// Structured logging with winston
import winston from 'winston';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'hammer-orchestrator' },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Usage
logger.info('Task dispatched', {
  taskId: task.id,
  robotId: robot.id,
  smithId: context.smith.id,
});
```

---

## Summary & Next Steps

### ✅ **Strengths**
1. Well-architected GraphQL schema
2. Comprehensive database design
3. Proper use of DataLoaders
4. RBAC permissions defined
5. File upload system working
6. Frontend-backend contracts clear

### 🔴 **Critical Gaps**
1. Production-ready authentication
2. Real-time telemetry pipeline
3. IoT device integration
4. Database performance (indexes)
5. Security hardening

### 🎯 **Recommended Immediate Actions**

**Week 1 Focus**:
1. Add database indexes (2 hours)
2. Implement JWT service (8-12 hours)
3. Create sessions table (2 hours)
4. Add rate limiting (2 hours)

**Week 2 Focus**:
1. Setup WebSocket subscriptions (8-12 hours)
2. Build telemetry ingestion endpoint (6-8 hours)
3. Test real-time updates with frontend (4-6 hours)

**Week 3-4 Focus**:
1. IoT bridge service (20-30 hours)
2. Task scheduling system (15-20 hours)

### 📞 **Support Needed**

1. **DevOps**: Redis cluster setup, MQTT broker deployment
2. **Frontend**: WebSocket connection handling, error states
3. **Product**: Business logic for task assignment algorithm
4. **Security**: Penetration testing, compliance review

---

## Appendix: Code Examples

### A. Complete Authentication Flow

See inline code examples in Section 3.

### B. WebSocket Subscription Example

See inline code examples in Section 4.

### C. Database Migration Script

```sql
-- migrations/002_add_indexes_and_tables.sql
BEGIN;

-- Add indexes
CREATE INDEX CONCURRENTLY idx_robots_fleet_status ON robots(fleet_id, status);
CREATE INDEX CONCURRENTLY idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX CONCURRENTLY idx_runs_robot_started ON runs(robot_id, started_at DESC);

-- Add sessions table
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  smith_id UUID NOT NULL REFERENCES smiths(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  refresh_token_hash VARCHAR(255) NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_sessions_smith ON sessions(smith_id);
CREATE INDEX idx_sessions_expires ON sessions(expires_at);

-- Add telemetry table
CREATE TABLE telemetry_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  robot_id UUID NOT NULL REFERENCES robots(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  data JSONB NOT NULL,
  severity VARCHAR(20) DEFAULT 'INFO',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
) PARTITION BY RANGE (timestamp);

-- Create first partition
CREATE TABLE telemetry_events_2025_11 PARTITION OF telemetry_events
  FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE INDEX idx_telemetry_robot_time ON telemetry_events(robot_id, timestamp DESC);

COMMIT;
```

### D. Environment Variables Reference

```bash
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/sepulki
DATABASE_POOL_SIZE=20

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# Authentication
JWT_SECRET=your-256-bit-secret-here
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
SESSION_SECRET=your-session-secret-here

# MQTT
MQTT_BROKER_URL=mqtt://localhost:1883
MQTT_USERNAME=
MQTT_PASSWORD=

# Email
AWS_SES_REGION=us-east-1
FROM_EMAIL=noreply@sepulki.com

# SMS (Optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE=

# Storage
S3_BUCKET=sepulki-uploads
S3_REGION=us-east-1

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=

# External APIs
MAPBOX_API_KEY=
OPENWEATHER_API_KEY=

# Server
PORT=4000
NODE_ENV=production
CORS_ORIGIN=https://app.sepulki.com
```

---

**Document Status**: ✅ Complete
**Last Updated**: November 4, 2025
**Next Review**: After P0 implementation completion
