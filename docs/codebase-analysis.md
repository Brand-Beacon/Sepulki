# Sepulki Codebase Analysis Report

**Generated:** November 4, 2024  
**Project:** Sepulki - Robotics-as-a-Service Platform  
**Repository:** https://github.com/CatsMeow492/Sepulki

## Executive Summary

Sepulki is a comprehensive **robotics-as-a-service (RaaS) platform** with a metallurgy-themed branding. The application enables users to design, deploy, and manage robot fleets through an intuitive 3D interface powered by Isaac Sim. The platform uses a **microservices architecture** with a modern tech stack featuring Next.js frontend, Node.js GraphQL backend, and PostgreSQL database.

**Key Metrics:**
- **Architecture:** Microservices-based with monorepo structure
- **Frontend:** React 18 + Next.js 14 + TypeScript
- **Backend:** Node.js + GraphQL (Apollo Server) + PostgreSQL + Redis
- **Test Coverage:** Playwright E2E + Jest unit tests
- **Infrastructure:** Docker Compose (dev) + Kubernetes (prod)

---

## 1. Project Structure & Organization

### 1.1 Root-Level Directory Layout

```
sepulki/
├── apps/                          # Frontend applications
│   └── forge-ui/                  # Main 3D robot design interface
├── services/                      # Microservices
│   ├── hammer-orchestrator/       # GraphQL API gateway
│   ├── local-auth/                # Authentication service
│   ├── video-stream-proxy/        # Isaac Sim video streaming
│   └── anvil-sim/                 # Simulation integration
├── packages/                      # Shared libraries
│   ├── shared-types/              # Common TypeScript types
│   ├── graphql-schema/            # Shared GraphQL schema
│   └── sepulki-sdk/               # Client SDK
├── infrastructure/                # DevOps & IaC
│   └── sql/                       # Database initialization scripts
├── docs/                          # Documentation
├── tests/                         # E2E test suites
├── specs/                         # Project specifications
├── docker-compose.yml             # Development infrastructure
└── package.json                   # Root workspace configuration
```

### 1.2 Monorepo Workspace Structure

**Using npm workspaces** for package management:

```json
{
  "workspaces": {
    "packages": ["apps/*", "services/*", "packages/*"]
  }
}
```

This enables:
- Shared dependencies across all packages
- Coordinated version management
- Unified build and test scripts
- Single `node_modules` installation

---

## 2. Frontend Architecture (Forge UI)

### 2.1 Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js | 14.1.0 |
| UI Library | React | 18.2.0 |
| Type Safety | TypeScript | 5.0+ |
| Styling | Tailwind CSS | 3.3.0 |
| GraphQL Client | Apollo Client | 4.0.8 |
| 3D Rendering | Three.js + React Three Fiber | 0.161.0 + 8.18.0 |
| Maps | Leaflet + React Leaflet | 1.9.4 + 4.2.1 |
| UI Components | Headless UI | 1.7.19 |
| Icons | Lucide React | 0.544.0 |
| Testing | Playwright + Jest | 1.54.2 + 30.0.5 |

### 2.2 Directory Structure

```
apps/forge-ui/
├── src/
│   ├── app/                       # Next.js app directory (routing)
│   │   ├── page.tsx               # Home page
│   │   ├── layout.tsx             # Root layout with auth providers
│   │   ├── dashboard/             # Main dashboard
│   │   ├── fleet/                 # Fleet management
│   │   │   ├── page.tsx           # Fleet list view
│   │   │   ├── [id]/              # Fleet details
│   │   │   └── map/               # Fleet location visualization
│   │   ├── robot/                 # Robot management
│   │   │   ├── [id]/              # Robot details
│   │   │   └── [id]/stream/       # Live video stream
│   │   ├── design/                # Robot design studio
│   │   │   ├── new/               # Create new design
│   │   │   ├── configure/         # Design configuration
│   │   │   └── [id]/              # Design details
│   │   ├── floors/                # Factory floor management
│   │   │   ├── page.tsx           # List floors
│   │   │   ├── new/               # Create floor
│   │   │   └── [id]/              # Floor details
│   │   ├── tasks/                 # Task management
│   │   │   ├── page.tsx           # List tasks
│   │   │   ├── new/               # Create task
│   │   │   └── upload/            # Upload task files
│   │   ├── auth/                  # Authentication pages
│   │   │   ├── signin/            # Sign in page
│   │   │   └── error/             # Auth error page
│   │   ├── isaac-video/           # Isaac Sim video viewer
│   │   ├── review/                # Review page
│   │   ├── analyze/               # Analysis page
│   │   └── quote/                 # Quote/pricing page
│   ├── components/                # Reusable React components
│   │   ├── AuthProvider.tsx       # Authentication context
│   │   ├── ApolloProvider.tsx     # GraphQL client setup
│   │   ├── DemoModeProvider.tsx   # Demo mode state management
│   │   ├── RouteGuard.tsx         # Protected route wrapper
│   │   ├── ProtectedNavigation.tsx # Navigation with auth checks
│   │   ├── SmithProfile.tsx       # User profile component
│   │   ├── FleetDashboard.tsx     # Main fleet overview
│   │   ├── RobotMap.tsx           # Robot location visualization
│   │   ├── FactoryFloorMap.tsx    # Factory floor visualization
│   │   ├── LeafletMap.tsx         # Map component wrapper
│   │   ├── IsaacSimClient.tsx     # Isaac Sim integration
│   │   ├── IsaacSimDisplay.tsx    # Isaac Sim renderer
│   │   ├── IsaacSimControls.tsx   # Isaac Sim control panel
│   │   ├── IsaacSimScene3D.tsx    # 3D scene setup
│   │   ├── RobotModel.tsx         # 3D robot model viewer
│   │   ├── Scene3D.tsx            # 3D scene components
│   │   ├── EnhancedScene3D.tsx    # Enhanced 3D rendering
│   │   ├── JointControls.tsx      # Robot joint control UI
│   │   ├── FileUploader.tsx       # File upload component
│   │   ├── LocationModal.tsx      # Location selection modal
│   │   ├── FleetLocationModal.tsx # Fleet location assignment
│   │   ├── SaveDesignModal.tsx    # Design save dialog
│   │   ├── BuildProgressModal.tsx # Build status indicator
│   │   ├── SimulationMetrics.tsx  # Performance metrics display
│   │   ├── RobotStreamDisplay.tsx # Live video stream viewer
│   │   ├── RenderModeToggle.tsx   # 2D/3D view toggle
│   │   ├── RoutePreview.tsx       # Route visualization
│   │   └── ErrorBanner.tsx        # Error notification
│   ├── lib/                       # Utility functions
│   │   ├── env.ts                 # Environment configuration
│   │   ├── graphql/               # GraphQL queries & mutations
│   │   └── utils/                 # Helper utilities
│   ├── styles/                    # Global stylesheets
│   │   └── globals.css            # Tailwind + custom CSS
│   └── public/                    # Static assets
├── tests/                         # Test files
│   ├── e2e/                       # Playwright E2E tests
│   └── __tests__/                 # Component unit tests
├── jest.config.js                 # Jest configuration
├── playwright.config.ts           # Playwright configuration
├── next.config.js                 # Next.js configuration
├── tailwind.config.js             # Tailwind CSS configuration
└── package.json

```

### 2.3 Key Frontend Features

#### Authentication & Authorization
- **AuthProvider Context:** Centralized auth state management
- **Route Guards:** Protected navigation with role-based access
- **Multi-Auth Support:** Mock auth (dev) + Real auth (prod)
- **Session Management:** Cookie-based with local auth service integration

#### Robot Design & 3D Visualization
- **3D Scene Rendering:** React Three Fiber + Three.js
- **URDF Loader:** Parse robot descriptions from URDF files
- **Isaac Sim Integration:** WebRTC video streaming + control
- **Joint Controls:** Interactive robot manipulation UI
- **Model Preview:** Real-time 3D rendering of robot designs

#### Fleet Management
- **Fleet Dashboard:** Overview of all robots in fleet
- **Location Management:** Map-based robot positioning
- **Status Monitoring:** Real-time robot health and battery status
- **Leaflet Maps:** Geospatial visualization of robot locations

#### Factory Floor Management
- **Blueprint Upload:** Image/PDF blueprint support
- **Floor Configuration:** Dimensions, scaling, origin settings
- **Robot Positioning:** Drag-and-drop robot placement on floor
- **SVG Overlay:** Floor layout visualization

#### Task Management
- **Task Creation:** Support for multiple task types
- **File Upload:** Route/program file uploads
- **Task Assignment:** Assign to individual robots or fleets
- **Progress Tracking:** Real-time task execution monitoring

---

## 3. Backend Architecture (Hammer Orchestrator)

### 3.1 Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Framework | Express.js | 4.18.0 |
| GraphQL | Apollo Server + GraphQL | 4.9.0 + 16.8.0 |
| Database | PostgreSQL | 15 |
| ORM/Query | pg (native driver) | 8.11.0 |
| Cache | Redis (ioredis) | 5.3.0 |
| Auth | jose (JWT) | 5.1.0 |
| File Handling | Multer | 2.0.2 |
| Runtime | Node.js | 18.18.0+ |

### 3.2 GraphQL Architecture

#### Schema Organization
- **Location:** `packages/graphql-schema/schema.graphql`
- **Type Definitions:** Centralized shared schema
- **Resolver Separation:** Each domain has dedicated resolver file

#### Core GraphQL Types

```graphql
type Sepulka {           # Robot design
  id: ID!
  name: String!
  version: String!
  pattern: Pattern
  alloys: [Alloy!]!      # Components
  ingots: [Ingot!]!      # Build artifacts
  status: SepulkaStatus!
}

type Fleet {             # Robot group
  id: ID!
  name: String!
  locus: Locus!          # Location
  robots: [Robot!]!
  status: FleetStatus!
  constraints: [String!]! # Policies
}

type Robot {             # Physical robot instance
  id: ID!
  name: String!
  sepulka: Sepulka!
  fleet: Fleet!
  currentIngot: Ingot!
  status: RobotStatus!
  batteryLevel: Int
  factoryFloor: FactoryFloor
  pose: RobotPose
}

type Task {              # Work assignment
  id: ID!
  name: String!
  type: TaskType!
  assignedRobots: [Robot!]!
  runs: [Run!]!
  status: TaskStatus!
  priority: TaskPriority!
}

type FactoryFloor {      # Physical location
  id: ID!
  name: String!
  blueprint: String      # Image/PDF URL
  robots: [Robot!]!
  dimensions: FloorDimensions!
}
```

#### Resolver Structure

```
services/hammer-orchestrator/src/resolvers/
├── index.ts                    # Resolver aggregation
├── sepulka.ts                  # Robot design queries/mutations
├── alloy.ts                    # Component management
├── fleet.ts                    # Fleet operations
├── robot.ts                    # Robot details (embedded in fleet.ts)
├── task.ts                     # Task management
├── auth.ts                     # Authentication/user management
├── telemetry.ts                # Metrics & subscriptions
├── factory-floor.ts            # Floor management
├── upload.ts                   # File upload operations
├── subscriptions.ts            # Real-time updates
├── isaacSimResolver.ts         # Isaac Sim integration
└── types.ts                    # TypeScript type definitions
```

#### Database Operations
- **Direct SQL Queries:** Using pg driver with parameterized queries
- **Connection Pooling:** Managed through PostgreSQL client
- **Transactions:** For multi-step operations (e.g., floor creation)

### 3.3 Core Services

#### 1. Sepulka (Robot Design) Service
**Endpoints:**
```graphql
Query:
  - sepulka(id: ID!): Sepulka
  - sepulkas(limit: Int, offset: Int): [Sepulka!]!
  - patterns(category: PatternCategory): [Pattern!]!

Mutation:
  - forgeSepulka(input: ForgeInput!): ForgeSepulkaResult!
  - castSepulka(id: ID!): CastResult!
  - temperIngot(id: ID!): TemperResult!
```

**Status Workflow:**
- FORGING → CAST_READY → CASTING → READY/CAST_FAILED

#### 2. Alloy (Component) Service
**Purpose:** Manage robot components (sensors, actuators, controllers)

**Endpoints:**
```graphql
Query:
  - alloy(id: ID!): Alloy
  - alloys(type: AlloyType): [Alloy!]!

Mutation:
  - createAlloy(input: AlloyInput!): Alloy!
  - updateAlloy(id: ID!, input: AlloyInput!): Alloy!
```

#### 3. Fleet Service
**Purpose:** Manage collections of robots and their operations

**Endpoints:**
```graphql
Query:
  - fleet(id: ID!): Fleet
  - fleets(limit: Int, offset: Int): [Fleet!]!
  - robots(fleetId: ID!): [Robot!]!

Mutation:
  - createFleet(input: CreateFleetInput!): Fleet!
  - addRobotToFleet(robotId: ID!, fleetId: ID!): Robot!
  - quenchFleet(id: ID!): QuenchResult!  # Deploy fleet
```

**Robot Status Management:**
- IDLE, WORKING, CHARGING, MAINTENANCE, ERROR, OFFLINE

#### 4. Task Service
**Purpose:** Manage work assignments for robots

**Endpoints:**
```graphql
Query:
  - task(id: ID!): Task
  - tasks(status: TaskStatus, limit: Int): [Task!]!
  - runs(taskId: ID!): [Run!]!

Mutation:
  - createTask(input: CreateTaskInput!): Task!
  - assignTask(taskId: ID!, robotIds: [ID!]!): TaskAssignment!
  - startRun(taskId: ID!, robotId: ID!): Run!
```

**Task Types:**
- PICK_AND_PLACE, ASSEMBLY, INSPECTION, TRANSPORT, MAINTENANCE, PATROL, CUSTOM

#### 5. Telemetry Service
**Purpose:** Real-time metrics, monitoring, and subscriptions

**Endpoints:**
```graphql
Query:
  - telemetry(robotId: ID!): RobotTelemetry
  - metrics(type: String!): [Metric!]!

Subscription:
  - robotStatusChanged(robotId: ID!): StatusUpdate!
  - taskProgress(taskId: ID!): ProgressUpdate!
  - fleetMetrics(fleetId: ID!): MetricsUpdate!
```

#### 6. Factory Floor Service
**Purpose:** Manage physical work locations and robot positioning

**Endpoints:**
```graphql
Query:
  - factoryFloor(id: ID!): FactoryFloor
  - factoryFloors(limit: Int): [FactoryFloor!]!

Mutation:
  - createFactoryFloor(input: FloorInput!): FactoryFloor!
  - updateRobotPosition(robotId: ID!, position: PositionInput!): Robot!
  - uploadBlueprint(floorId: ID!, file: Upload!): Blueprint!
```

#### 7. Authentication Service
**Endpoints:**
```graphql
Query:
  - currentSmith: Smith!
  - smith(id: ID!): Smith

Mutation:
  - signIn(email: String!, password: String!): AuthResult!
  - refreshToken(token: String!): TokenResult!
```

### 3.4 File Upload System

**REST Endpoints (for non-GraphQL uploads):**

1. **POST /api/upload**
   - Accepts: JSON, YAML, GPX files (max 50MB)
   - Creates task from uploaded file
   - Assigns to robot(s)
   - Returns: TaskID, file metadata, assigned robots

2. **POST /api/upload/blueprint**
   - Accepts: PNG, JPG, PDF (max 50MB)
   - Associates with factory floor
   - Returns: File metadata and public URL

3. **POST /api/floors/create**
   - Blueprint + floor metadata
   - Creates factory floor record
   - Stores blueprint image
   - Returns: Floor with all metadata

**File Storage:**
- Location: `services/hammer-orchestrator/uploads/`
- Organization: By type (route, program, blueprint)
- Access: Via `/api/files` static route

### 3.5 Data Loading & N+1 Prevention

**DataLoader Implementation:**
```
src/dataloaders.ts
- Batch loading of related entities
- Prevents N+1 query problems
- Caching within request context
```

---

## 4. Database Schema

### 4.1 PostgreSQL Architecture

**Location:** `infrastructure/sql/init.sql`

#### Core Tables

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| smiths | Users | id, email, role, permissions |
| patterns | Design templates | id, category, parameters, defaults |
| sepulkas | Robot designs | id, name, version, status |
| alloys | Components | id, type, model, specifications |
| ingots | Build artifacts | id, sepulka_id, version, status |
| fleets | Robot groups | id, name, locus_id, status |
| robots | Physical robots | id, sepulka_id, fleet_id, status, battery_level |
| factory_floors | Work locations | id, name, blueprint_url, dimensions |
| robot_floors | Positioning | robot_id, floor_id, position_x, position_y |
| tasks | Work assignments | id, type, status, priority |
| task_robots | Task-robot mapping | task_id, robot_id |
| runs | Task executions | id, task_id, robot_id, status |
| loci | Geographic locations | id, name, coordinates, constraints |
| edicts | Safety policies | id, type, severity, rules |

#### Enum Types

```sql
sepulka_status    → FORGING, CAST_READY, CASTING, CAST_FAILED, READY
robot_status      → IDLE, WORKING, CHARGING, MAINTENANCE, ERROR, OFFLINE
fleet_status      → IDLE, ACTIVE, MAINTENANCE, ERROR, OFFLINE
task_status       → PENDING, ASSIGNED, IN_PROGRESS, COMPLETED, FAILED, CANCELLED
task_type         → PICK_AND_PLACE, ASSEMBLY, INSPECTION, TRANSPORT, MAINTENANCE, PATROL, CUSTOM
task_priority     → LOW, NORMAL, HIGH, URGENT
run_status        → PENDING, RUNNING, COMPLETED, FAILED, CANCELLED
smith_role        → SMITH, OVER_SMITH, ADMIN
edict_type        → SAFETY, PERFORMANCE, COMPLIANCE, OPERATIONAL
edict_severity    → INFO, WARNING, CRITICAL
```

### 4.2 Infrastructure Services

**Docker Compose Services:**

1. **PostgreSQL 15**
   - Port: 5432
   - Database: sepulki
   - User: smith
   - Initialization: SQL schema loaded from init.sql

2. **Redis 7**
   - Port: 6379
   - Purpose: Caching, session storage, real-time data

3. **InfluxDB 2.6**
   - Port: 8086
   - Bucket: bellows
   - Purpose: Time-series telemetry data

4. **MinIO (S3-compatible)**
   - Port: 9000 (API), 9001 (Console)
   - Purpose: File storage for blueprints, artifacts

5. **Hydra (OAuth2/OIDC)**
   - Port: 4444 (public), 4445 (admin)
   - Purpose: Local OAuth provider for development

6. **MailHog**
   - Port: 1025 (SMTP), 8025 (Web UI)
   - Purpose: Email capture for development

7. **MockServer (SMS Mock)**
   - Port: 1080, 1081
   - Purpose: SMS endpoint mocking

---

## 5. Authentication & Security

### 5.1 Authentication Flow

```
Client (Frontend)
    ↓
Next.js Auth Pages
    ↓
Local Auth Service (dev) / Auth.js (prod)
    ↓
GraphQL Context → JWT Token Validation
    ↓
Protected Resolvers
```

### 5.2 Implementation Details

**Frontend:**
- `AuthProvider.tsx`: React Context for auth state
- Session check with local auth service
- Mock auth for development (no authentication required)
- Real auth with token validation in production

**Backend:**
- `jose` library for JWT validation
- Local development: Mock token support (*.mock-signature-for-development)
- Token extraction from Authorization header
- Context creation with smith/session information

**Security Headers:**
- CORS: Restricts to localhost:3000 / 127.0.0.1:3000
- Credentials: Cookie-based session support

### 5.3 User Roles

```typescript
enum SmithRole {
  SMITH = 'SMITH',          # Basic user
  OVER_SMITH = 'OVER_SMITH', # Team lead
  ADMIN = 'ADMIN'           # Administrator
}
```

---

## 6. Third-Party Integrations

### 6.1 Isaac Sim Integration

**Purpose:** 3D physics simulation for robot validation

**Components:**
- `IsaacSimClient.tsx`: WebRTC/direct connection client
- `IsaacSimControls.tsx`: Joint manipulation interface
- `IsaacSimScene3D.tsx`: 3D scene setup
- `isaacSimResolver.ts`: GraphQL Isaac Sim endpoint

**Supported Connections:**
1. **WebRTC Mode:** Video streaming via video-stream-proxy
2. **Direct Mode:** Direct WebSocket connection to Isaac Sim
3. **Fallback:** Hybrid mode with automatic detection

**Stream Configuration:**
```javascript
const ISAAC_SIM_CONFIGS = {
  webrtc: {
    videoUrl: 'http://localhost:8889/stream',
    resolution: '1280x720',
    framerate: 30
  },
  direct: {
    wsUrl: 'ws://localhost:5050',
    protocol: 'Isaac Sim native'
  }
}
```

### 6.2 GraphQL Federation

**Schema Distribution:**
- `packages/graphql-schema/schema.graphql`: Shared schema definition
- Used by frontend Apollo Client
- Used by backend Apollo Server
- Codegen for type safety

### 6.3 File Storage

**MinIO Integration:**
- S3-compatible API
- Stores blueprints, designs, artifacts
- Accessible via HTTP at `/api/files`

### 6.4 Monitoring & Telemetry

**InfluxDB:**
- Time-series database for metrics
- Robot performance data
- Fleet utilization statistics
- Task execution metrics

**Subscription System:**
- GraphQL subscriptions for real-time updates
- Redis pub/sub for multi-service coordination

---

## 7. Current Implementation Status

### 7.1 Completed Features

#### Core Robot Management
- ✅ Robot design (Sepulka) creation and versioning
- ✅ Component (Alloy) management system
- ✅ Robot design compilation (Ingot generation)
- ✅ Design patterns and templates
- ✅ Build artifact management

#### Fleet Operations
- ✅ Fleet creation and management
- ✅ Robot-to-fleet assignment
- ✅ Fleet status tracking
- ✅ Location-based organization (Locus)
- ✅ Robot positioning on factory floors

#### User Interface
- ✅ Authentication and authorization
- ✅ Dashboard with fleet overview
- ✅ Fleet management interface
- ✅ Robot design studio (3D)
- ✅ Factory floor visualization
- ✅ Robot health/status monitoring
- ✅ Location maps (Leaflet)
- ✅ Task creation and assignment

#### Task Management
- ✅ Task creation with multiple types
- ✅ Robot assignment
- ✅ File upload (routes, programs)
- ✅ Task priority management
- ✅ Run tracking

#### Integration
- ✅ Isaac Sim video streaming
- ✅ 3D robot visualization
- ✅ GraphQL API
- ✅ Real-time telemetry subscriptions
- ✅ File upload endpoints

### 7.2 Incomplete/Stub Features

#### High Priority (Critical)
- ⚠️ **Sign-in Redirect** - Currently not working properly (see commits 1ad552c, 07c22aa)
- ⚠️ **Edict (Policy) System** - Stub implementations only:
  - `recallFleet` mutation not implemented
  - `addEdict` mutation not implemented
  - `updateEdict` mutation not implemented
  - `deactivateEdict` mutation not implemented
- ⚠️ **Logout Functionality** - Not yet implemented
- ⚠️ **Robot Location Data** - Fleet data and robot locations incomplete

#### Medium Priority
- ⚠️ **Performance Optimization (Temper)** - Only basic structure
- ⚠️ **Advanced Task Scheduling** - Basic implementation only
- ⚠️ **Comprehensive Telemetry** - Partial implementation
- ⚠️ **Error Recovery** - Limited fallback handling

#### Lower Priority
- ⚠️ **Quote/Pricing** Page - Placeholder only
- ⚠️ **Review** Page - Placeholder only
- ⚠️ **Advanced Analytics** - Not implemented

### 7.3 Known Issues (from Git History)

1. **Sign-in Redirect Issue** (commits 1ad552c, 07c22aa, 07c22aa)
   - Auth redirect not working correctly
   - May be related to Next.js routing

2. **Isaac Sim Integration Challenges** (commit 0bc6c96)
   - WebRTC vs direct connection detection
   - Video stream proxy compatibility issues

3. **Robot Selection Rendering** (commit 96f847a)
   - Fixed in feature branch but may have edge cases

---

## 8. Technology Stack Summary

### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI:** React 18 + TypeScript 5
- **Styling:** Tailwind CSS + PostCSS
- **GraphQL:** Apollo Client 4
- **3D Graphics:** Three.js + React Three Fiber
- **Mapping:** Leaflet + React Leaflet
- **Components:** Headless UI + Lucide Icons
- **Testing:** Playwright (E2E) + Jest (Unit)

### Backend
- **Runtime:** Node.js 18+
- **API:** Express + Apollo Server 4
- **GraphQL:** GraphQL 16 with custom scalars
- **Database:** PostgreSQL 15
- **Cache:** Redis 7
- **Files:** MinIO (S3-compatible)
- **Monitoring:** InfluxDB 2
- **Auth:** jose (JWT) + local OAuth (Hydra)

### Infrastructure
- **Containerization:** Docker + Docker Compose
- **Orchestration:** Kubernetes (manifests ready)
- **IaC:** Terraform-ready structure
- **Development:** Local stack via docker-compose.yml

### Development Tools
- **Package Manager:** npm workspaces
- **TypeScript:** tsc + ts-node-dev
- **Linting:** ESLint
- **Testing:** Jest + Playwright
- **Code Generation:** GraphQL CodeGen

---

## 9. Build & Deployment Pipeline

### 9.1 Development Setup

```bash
# Install dependencies
npm install

# Start infrastructure
npm run docker:up

# Start development servers
npm run dev
  ├── dev:infra    → Docker containers
  └── dev:services → Backend + Frontend (concurrently)

# Outputs:
# - Forge UI: http://localhost:3000
# - GraphQL: http://localhost:4000/graphql
# - MinIO: http://localhost:9001
# - Local Auth: http://localhost:4446
```

### 9.2 Build Process

```bash
npm run build
├── build:packages → Compile shared types and SDK
├── build:services → Build hammer-orchestrator
└── build:apps     → Build forge-ui (Next.js)

Output: dist/ folders in each package
```

### 9.3 Production Deployment

**Kubernetes:**
- Manifests in `infrastructure/kubernetes/`
- Ready for multi-pod deployment
- Service definitions for all components

**Docker:**
- Multi-stage Dockerfile patterns (per service)
- Proper health checks
- Environment variable configuration

### 9.4 Database Migrations

```bash
npm run db:status   # Check current state
npm run db:reset    # Clear and reinitialize
npm run db:seed     # Add test data
npm run db:test-data # Load sample data
```

---

## 10. Project Configuration Files

| File | Purpose |
|------|---------|
| `package.json` | Root workspace configuration |
| `docker-compose.yml` | Local development infrastructure |
| `tsconfig.json` | TypeScript compiler options |
| `.env.local` | Local environment variables |
| `CLAUDE.md` | Development workflow guidelines |
| `README.md` | Project overview |

---

## 11. Identified Gaps & Recommendations

### Critical Issues
1. **Authentication System**
   - Sign-in redirect broken
   - Logout not implemented
   - Session handling incomplete
   - **Recommendation:** Review Auth.js configuration and redirect logic

2. **Policy/Safety System (Edict)**
   - All mutation endpoints are stubs
   - No validation against policies
   - **Recommendation:** Implement full policy engine with constraint validation

3. **Error Handling**
   - Limited error recovery mechanisms
   - Some operations fail without clear user feedback
   - **Recommendation:** Implement comprehensive error boundary system

### Feature Gaps
1. **Robot Telemetry**
   - Real-time metrics incomplete
   - Historical data analysis missing
   - **Recommendation:** Integrate InfluxDB queries, add analytics dashboard

2. **Advanced Task Scheduling**
   - Basic task assignment only
   - No optimization/batching logic
   - **Recommendation:** Implement Choreo Dispatch service (task planning)

3. **Performance Optimization**
   - Temper (optimization) service not implemented
   - No build artifact caching
   - **Recommendation:** Add optimization pipeline with metrics comparison

### Code Quality
1. **Test Coverage**
   - Limited unit test coverage for resolvers
   - E2E tests for critical paths needed
   - **Recommendation:** Add test suite (>80% coverage target)

2. **Documentation**
   - API documentation minimal
   - Type documentation incomplete
   - **Recommendation:** Add JSDoc comments, API schema docs

3. **Performance**
   - N+1 queries possible despite DataLoader
   - No caching layer for frequently accessed data
   - **Recommendation:** Optimize query patterns, add Redis caching

### Scaling Considerations
1. **Multi-Tenancy**
   - Currently single-tenant design
   - No tenant isolation in database
   - **Recommendation:** Add tenant column to core tables if multi-tenant needed

2. **Real-Time Scalability**
   - GraphQL subscriptions via Redis
   - May need message queue for high volume
   - **Recommendation:** Add Kafka/RabbitMQ for production workloads

3. **File Storage**
   - MinIO single instance
   - No replication configured
   - **Recommendation:** Set up MinIO cluster for high availability

---

## 12. Development Workflow

### Local Development Commands

```bash
# Start everything
npm run dev

# Start individual components
npm run dev:backend    # Hammer Orchestrator
npm run dev:frontend   # Forge UI

# Database operations
npm run db:status
npm run db:reset
npm run db:seed

# Testing
npm run test           # All tests
npm run test:e2e       # Only E2E
npm test --workspace @sepulki/hammer-orchestrator

# Linting
npm run lint

# Docker management
npm run docker:up      # Start services
npm run docker:down    # Stop services
npm run docker:logs    # View logs
```

### File Organization Best Practices
- Keep services modular and independently deployable
- Use shared-types for type consistency
- GraphQL schema as source of truth
- Store configuration in environment variables

---

## 13. Recent Development History

**Latest Commits:**
- `7afd89b` - Update .gitignore (Claude Flow files, Windows wrappers)
- `2dee8ba` - Fixed + testing
- `07c22aa` - Fixed
- `1ad552c` - Sign-in redirect and fleet data issues (NOT WORKING)
- `96f847a` - Robot selection rendering fix (merged)
- Previous: Isaac Sim integration work, scene setup

**Active Issues:**
1. Sign-in redirect not working
2. Fleet data and robot locations incomplete
3. Isaac Sim integration in progress

---

## 14. API Reference

### GraphQL Endpoint
- **Development:** `http://localhost:4000/graphql`
- **Production:** `/graphql` (same domain)
- **Type:** GraphQL with subscriptions

### REST Endpoints
- `POST /api/upload` - Upload task files
- `POST /api/upload/blueprint` - Upload floor blueprints
- `POST /api/floors/create` - Create factory floor
- `GET /api/files/:path` - Retrieve uploaded files
- `GET /health` - Health check

### External Services
- **Isaac Sim Video:** `http://localhost:8889/stream`
- **Local Auth:** `http://localhost:4446/auth/*`
- **MinIO Console:** `http://localhost:9001`
- **InfluxDB:** `http://localhost:8086`

---

## 15. Conclusion

Sepulki is a well-architected robotics platform with:
- **Strong foundation** in modern web technologies
- **Clear separation** of concerns (frontend, backend, infrastructure)
- **Extensible design** with GraphQL and microservices
- **Good developer experience** with TypeScript, monorepo, and docker-compose

**Next Steps for Production Readiness:**
1. Fix critical auth issues
2. Complete stub implementations (Edict system, logout)
3. Comprehensive testing (E2E + unit)
4. Performance optimization
5. Security audit and hardening
6. Documentation and API specs
7. Multi-tenant architecture (if needed)
8. High-availability infrastructure setup

---

**Report Generated:** November 4, 2024  
**Analyzed By:** Codebase Analysis System  
**Repository:** https://github.com/CatsMeow492/Sepulki
