# Kennel Demo Setup Guide

## Quick Start Checklist

### Prerequisites
- [ ] Node.js 18+ installed
- [ ] PostgreSQL running (or Docker)
- [ ] Redis running (or Docker)
- [ ] Video-stream-proxy service running
- [ ] Isaac Sim accessible (or mock streams configured)

### Services to Start

#### 1. Database
```bash
# Using Docker
docker-compose up -d postgres redis

# Or manually
psql -U smith -d sepulki < infrastructure/sql/init.sql
psql -U smith -d sepulki < scripts/seed-dev-data.sql
```

#### 2. Backend (GraphQL API)
```bash
cd services/hammer-orchestrator
npm install
npm run dev
# Should start on http://localhost:4000
```

#### 3. Video Stream Proxy
```bash
cd services/video-stream-proxy
npm install
npm start
# Should start on http://localhost:8889
```

#### 4. Frontend
```bash
cd apps/forge-ui
npm install
npm run dev
# Should start on http://localhost:3000
```

### Environment Variables

#### Frontend (`.env.local`)
```env
NEXT_PUBLIC_GRAPHQL_URL=http://localhost:4000/graphql
NEXT_PUBLIC_GRAPHQL_WS_URL=ws://localhost:4000/graphql
NEXT_PUBLIC_VIDEO_PROXY_URL=http://localhost:8889
NEXT_PUBLIC_API_URL=http://localhost:4000
```

#### Backend (`.env`)
```env
DATABASE_URL=postgresql://smith:forge_dev@localhost:5432/sepulki
REDIS_URL=redis://localhost:6379
PORT=4000
CORS_ORIGIN=http://localhost:3000
FILE_STORAGE_PATH=./storage/files
```

#### Video Proxy (`.env`)
```env
VIDEO_PROXY_PORT=8889
ISAAC_SIM_IP=18.232.113.137  # Your Isaac Sim instance
ISAAC_SIM_PORT=8211
ISAAC_STREAM_PORT=8765
```

## Demo Script

### 1. Show Fleet Dashboard
Navigate to: `http://localhost:3000/fleet`
- Show real-time fleet status
- Show robot counts and battery levels
- Click on a fleet

### 2. Show Kennel View
Navigate to: `http://localhost:3000/fleet/[fleetId]/kennel`
- Show multiple robot streams in grid
- Explain public access (no auth needed)
- Show connection status indicators

### 3. Show Individual Stream
Navigate to: `http://localhost:3000/robot/[robotId]/stream`
- Show live camera/LiDAR feed
- Show robot status and battery
- Demonstrate fullscreen mode

### 4. Upload Program/Route
Navigate to: `http://localhost:3000/tasks/upload?fleetId=[fleetId]`
- Select "Route" or "Program"
- Upload a JSON/GPX file
- Show task creation
- Show deployment to robots

### 5. Show Map View
Navigate to: `http://localhost:3000/fleet/[fleetId]/map`
- Show robot positions on map
- Click markers for details
- Show fleet boundaries

## Testing Checklist

### Pre-Demo Tests
- [ ] All services start without errors
- [ ] Fleet dashboard loads data
- [ ] Kennel view shows streams
- [ ] File upload works
- [ ] Map displays correctly
- [ ] Navigation works between pages

### Health Checks
```bash
# GraphQL API
curl http://localhost:4000/health

# Video Proxy
curl http://localhost:8889/health

# Frontend
curl http://localhost:3000
```

## Troubleshooting

### Streams Not Loading
- Check video-stream-proxy is running
- Check Isaac Sim is accessible
- Check network connectivity
- Verify CORS settings

### File Upload Fails
- Check GraphQL API is running
- Check file storage directory exists
- Check file size/type validation
- Check authentication (if required)

### Map Not Displaying
- Check Leaflet CSS is loaded
- Check robot positions exist
- Check GPS coordinate conversion
- Check browser console for errors

## Demo Data Setup

### Create Test Fleet
```sql
INSERT INTO fleets (id, name, status, locus_id)
VALUES (gen_random_uuid(), 'Kennel Demo Fleet', 'ACTIVE', (SELECT id FROM loci LIMIT 1));
```

### Create Test Robots
```sql
INSERT INTO robots (id, name, fleet_id, status, battery_level)
VALUES 
  (gen_random_uuid(), 'Robot Dog Alpha', (SELECT id FROM fleets LIMIT 1), 'WORKING', 85),
  (gen_random_uuid(), 'Robot Dog Beta', (SELECT id FROM fleets LIMIT 1), 'WORKING', 92);
```

## Public Access Setup

For the kennel demo to work without authentication:
- Streams are set to `publicAccess={true}`
- Navigation may require auth for other pages
- Consider creating a public demo route

## Ready to Demo! 🎉

All critical features are implemented and ready for the Twitch kennel demo!

