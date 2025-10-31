# 🔥 Sepulki Developer Guide

Complete guide to local development with the Sepulki robotics-as-a-service platform.

## 🚀 Quick Start (30 seconds)

```bash
git clone https://github.com/CatsMeow492/Sepulki.git
cd Sepulki
npm install
npm run dev
```

**That's it!** Your complete development environment is now running with:
- ✅ **Frontend**: http://localhost:3000
- ✅ **GraphQL API**: http://localhost:4000/graphql  
- ✅ **Database**: Pre-seeded with test data
- ✅ **Authentication**: Auto-login as "Development Smith"

## 🛠️ Development Tools

### Core Commands

```bash
# Start everything (infrastructure + frontend + backend)
npm run dev

# Check status of all services
npm run status

# Stop everything
npm run stop

# Nuclear reset (destroys all data)
npm run reset
```

### Database Management

```bash
# View database status and data
npm run db:status

# Reset database with fresh schema + seed data
npm run db:reset

# Add more test data
npm run db:test-data

# Seed development data only
npm run db:seed
```

### Service Management

```bash
# View logs
npm run docker:logs

# Restart infrastructure
npm run docker:reset

# Start just the frontend
npm run dev:forge

# Start just the backend  
npm run dev:hammer
```

## 👥 Test Users (Pre-seeded)

| Email | Password | Role | Permissions |
|-------|----------|------|-------------|
| **dev@sepulki.com** | `dev123` | Over-Smith | Full development access |
| **demo@sepulki.com** | `demo123` | Smith | Basic user permissions |
| **test@sepulki.com** | `test123` | Over-Smith | Advanced testing permissions |
| **admin@sepulki.com** | `admin123` | Admin | Full system access |

## 🤖 Pre-seeded Test Data

### Robot Designs (Sepulkas)
- **DevBot-001** - Ready for deployment
- **WarehouseWorker-Demo** - Ready to cast
- **AssemblyBot-Test** - Currently being forged

### Active Fleets
- **Dev Fleet Alpha** (ACTIVE) - 2 robots
- **Demo Warehouse Bots** (IDLE) - 2 robots  
- **Factory Test Units** (MAINTENANCE) - 0 robots

### Running Tasks
- **Pick and Place Demo** (IN_PROGRESS) - Warehouse automation
- **Assembly Testing** (PENDING) - Precision assembly
- **Quality Inspection** (COMPLETED) - Visual inspection
- **Fleet Patrol** (ASSIGNED) - Security patrol

### Component Library (Alloys)
- **ServoMax Pro 3000** - High-torque servo actuator
- **VisionEye 4K** - AI-powered vision system
- **GripForce Elite** - Adaptive parallel gripper
- **PowerCore 500W** - Industrial power supply
- **TurboMove 5000** - High-speed linear actuator
- **SmartSense Pro** - Multi-modal sensor array
- **FlexGrip Universal** - Universal adaptive gripper
- **MegaBase Chassis** - Heavy-duty mobile platform

## 🏗️ Local Development Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Forge UI      │◄──►│ Hammer           │◄──►│   PostgreSQL    │
│  localhost:3000 │    │ Orchestrator     │    │  localhost:5432 │
│                 │    │ localhost:4000   │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                        │                        │
         │                        ▼                        │
         │              ┌──────────────────┐               │
         │              │     Redis        │               │
         │              │  localhost:6379  │               │
         │              └──────────────────┘               │
         │                        │                        │
         └────────────────────────┼────────────────────────┘
                                  ▼
                        ┌──────────────────┐
                        │     MinIO        │
                        │ localhost:9000   │
                        │ Console: :9001   │
                        └──────────────────┘
```

## 🔐 Authentication Flow

### Development Mode (Default)
- **Auto-login** as "Development Smith" (Over-Smith role)
- **No OAuth setup required** - works immediately
- **Full permissions** for testing all features
- **Branded UI** with Sepulki theme

### Production Mode (Optional)
Set environment variables to enable GitHub OAuth:
```bash
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
NEXTAUTH_SECRET=random_string
```

## 🧪 Testing Workflows

### 1. Robot Design Flow
```bash
# Start environment
npm run dev

# Go to: http://localhost:3000
# 1. Enter use case: "I need a warehouse robot"
# 2. Navigate to /configure 
# 3. Test 3D viewer with joint controls
# 4. Save design as new Sepulka
```

### 2. Fleet Management Flow
```bash
# Check current fleets
npm run db:status

# Test GraphQL queries
curl -X POST http://localhost:4000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { fleets { name status robots { name status batteryLevel } } }"}'
```

### 3. Database Reset & Testing
```bash
# Add more test data
npm run db:test-data

# Reset everything to clean state
npm run db:reset

# View all data
npm run db:status
```

## 📊 Service Endpoints

| Service | URL | Purpose |
|---------|-----|---------|
| **Forge UI** | http://localhost:3000 | 3D robot design interface |
| **GraphQL API** | http://localhost:4000/graphql | Main API gateway |
| **Health Check** | http://localhost:4000/health | Service health status |
| **MinIO Console** | http://localhost:9001 | Asset storage (sepulki/vault_dev_key) |
| **PostgreSQL** | localhost:5432 | Database (smith/forge_dev) |
| **Redis** | localhost:6379 | Cache and sessions |

## 🐳 Docker Services

```bash
# Start infrastructure only
docker-compose up -d postgres redis minio

# View service status
docker-compose ps

# View logs
docker-compose logs -f postgres

# Connect to database directly
docker exec -it sepulki-postgres-1 psql -U smith -d sepulki
```

## 🔍 Debugging

### Common Issues

**"Database connection failed"**
```bash
npm run docker:up
npm run db:status
```

**"GraphQL service not responding"**
```bash
# Check if port 4000 is in use
lsof -i :4000

# Restart the service
npm run restart
```

**"Frontend compilation errors"**
```bash
# Clear Next.js cache
rm -rf apps/forge-ui/.next
npm run dev:forge
```

### Development Logs
```bash
# View all logs
npm run docker:logs

# View specific service logs  
npm run docker:logs postgres
npm run docker:logs redis
```

## 🤖 Isaac Sim Real 3D Rendering

### Overview

The anvil-sim service provides real-time 3D rendering using NVIDIA Isaac Sim with actual robot models visible in the browser. The system uses Isaac Sim's Camera API for headless rendering, which captures real 3D frames (not placeholders).

### Configuration

**Environment Variables:**
```bash
# Isaac Sim installation path
ISAAC_SIM_BASE=/home/shadeform/isaac-sim/isaac-sim-2023.1.1

# Or in Docker container
ISAAC_SIM_BASE=/isaac-sim
```

**Default Settings:**
- Default Robot: TurtleBot3 (`/Isaac/Robots/TurtleBot3/turtlebot3.usd`)
- Camera Position: `[2.0, 2.0, 1.5]`
- Camera Target: `[0.0, 0.0, 0.3]`
- FOV: `60.0`
- Max Frame Rate: `30 FPS`

### API Endpoints

**Camera Control:**
```bash
POST http://localhost:8002/update_camera
Content-Type: application/json

{
  "position": [3.0, 3.0, 2.0],
  "target": [0.0, 0.0, 0.5],
  "fov": 70.0
}
```

**Debug Endpoints:**

Check scene status:
```bash
GET http://localhost:8002/debug/scene_status
```

Check frame statistics:
```bash
GET http://localhost:8002/debug/frame_stats
```

### Troubleshooting

**Black Frames / No Rendering:**

1. Check scene initialization:
   ```bash
   curl http://localhost:8002/debug/scene_status | jq .
   ```
   Verify `scene_initialized: true` and `camera_exists: true`

2. Check frame statistics:
   ```bash
   curl http://localhost:8002/debug/frame_stats | jq .
   ```
   Verify `frame_stats.is_black: false` and `frame_stats.mean > 0.01`

3. Verify Isaac Sim path:
   - Check `ISAAC_SIM_BASE` environment variable
   - Ensure Isaac Sim is installed at the specified path
   - In Docker: ensure `/isaac-sim` is accessible

**Robot Not Loading:**

1. Check robot path in logs:
   - Default: `/Isaac/Robots/TurtleBot3/turtlebot3.usd`
   - Verify robot asset exists in Isaac Sim installation

2. Check scene status for robot_loaded:
   ```bash
   curl http://localhost:8002/debug/scene_status | jq .robot_loaded
   ```

3. If robot fails to load, service continues with empty scene (camera will show ground/lighting)

**Camera Control Not Working:**

1. Verify camera exists:
   ```bash
   curl http://localhost:8002/debug/scene_status | jq .camera_exists
   ```

2. Check camera update response:
   ```bash
   curl -X POST http://localhost:8002/update_camera \
     -H "Content-Type: application/json" \
     -d '{"position": [2,2,1.5], "target": [0,0,0.3], "fov": 60}' | jq .
   ```

3. Verify camera state updated:
   ```bash
   curl http://localhost:8002/debug/frame_stats | jq .camera_state
   ```

### Browser Verification

Run the Playwright test to verify real rendering:
```bash
cd apps/forge-ui
npx playwright test isaac-sim-real-rendering.spec.ts
```

The test verifies:
- ✅ Scene initialization
- ✅ Non-black frames
- ✅ Camera control endpoint
- ✅ Frame statistics
- ✅ Robot presence

### Technical Details

**Rendering Pipeline:**
1. Isaac Sim initializes in headless mode with RayTracedLighting renderer
2. Scene loads: ground plane, dome light, TurtleBot3 robot
3. Camera captures frames using `Camera.get_rgba()`
4. Frames converted: RGBA float [0-1] → BGR uint8 [0-255]
5. Frame validation rejects black frames
6. Frames streamed via WebRTC or MJPEG HTTP

**Frame Validation:**
- Rejects frames with mean < 0.01 or max < 0.1
- Logs frame statistics every 60 frames
- Automatic retry on capture failure

**Camera API:**
- Uses `omni.isaac.sensor.Camera`
- Requires `world.step(render=True)` + `app.update()` for rendering
- Headless mode supported (unlike viewport capture APIs)

## 🔄 Migration & Schema Changes

### Schema Migrations
```bash
# Apply schema changes
npm run db:migrate

# Reset with new schema  
npm run db:reset
```

### Seed Data Management
```bash
# Reseed development data
npm run db:seed

# Generate additional test data
npm run db:test-data

# Check what's in the database
npm run db:status
```

## 🎯 Production Preparation

### Environment Variables
```bash
# Production database
DATABASE_URL=postgresql://user:pass@host:5432/sepulki

# Production auth
GITHUB_CLIENT_ID=prod_client_id
GITHUB_CLIENT_SECRET=prod_secret
NEXTAUTH_SECRET=secure_random_string

# Production APIs
OPENAI_API_KEY=prod_openai_key
```

### Build & Deploy
```bash
# Build everything
npm run build

# Run production build locally
npm run start
```

## ✨ Developer Experience Features

### 🎯 **Zero Configuration**
- Works immediately after `git clone`
- No manual database setup required
- Automatic test data generation

### 🔄 **Easy Reset**
- One command to reset everything
- Preserves development workflow
- Fast iteration cycles

### 👥 **Realistic Test Data**
- Multiple user roles for permission testing
- Active fleets with running tasks
- Real robot poses and telemetry

### 🛡️ **Safe Development**
- Mock authentication in development
- No production credentials required
- Clear separation between dev/prod

### 📊 **Comprehensive Monitoring**
- Health checks for all services
- Database status and content viewing
- Centralized logging

This setup provides an **enterprise-grade development experience** while maintaining the simplicity needed for rapid iteration! 🚀
