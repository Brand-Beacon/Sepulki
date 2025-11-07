# 🔥 Sepulki - Robotics as a Service Platform

A comprehensive robotics-as-a-service platform with metallurgy-themed branding, enabling users to design, deploy, and manage robot fleets through an intuitive 3D interface powered by Isaac Sim.

## 🏗️ Architecture Overview

Sepulki follows a microservices architecture with a metallurgy/smithing theme:

### Core Services

- **🔨 Hammer Orchestrator** - GraphQL API gateway and fleet coordination
- **⚒️ Forge UI** - 3D robot design studio and fleet management dashboard  
- **🏭 Foundry Pipeline** - Build and deployment automation
- **🔧 Anvil Sim** - Physics simulation and validation (Isaac Sim integration)
- **📦 Vault Registry** - Component library and artifact storage
- **📊 Bellows Telemetry** - Real-time metrics and monitoring
- **⚖️ Tongs Policy** - Safety constraints and compliance engine  
- **🎯 Choreo Dispatch** - Task planning and optimization

### Technology Stack

- **Frontend**: Next.js, React, TypeScript, React Three Fiber
- **Backend**: Node.js, GraphQL (Apollo Server), PostgreSQL, Redis
- **Simulation**: Isaac Sim, Python
- **Infrastructure**: Docker, Kubernetes, MinIO
- **Monitoring**: InfluxDB, Grafana

## 🚀 Quick Start

### Prerequisites

- Node.js 20.19.x (LTS)
- Docker & Docker Compose
- Git

> **Why Node 20?** Native modules such as `better-sqlite3` (pulled in by the Claude Flow tooling) currently ship prebuilt binaries for Node 20.x. Using Node 22+ causes install/runtime failures, so we pin the toolchain to 20.19.x.

### Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/CatsMeow492/Sepulki.git
   cd Sepulki
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start infrastructure services**
   ```bash
   npm run docker:up
   ```

4. **Run the development servers**
   ```bash
   npm run dev
   ```

5. **Access the applications**
   - **Forge UI**: http://localhost:3000
   - **GraphQL Playground**: http://localhost:4000/graphql  
   - **MinIO Console**: http://localhost:9001

### Migration from Artifex

If migrating from the previous Artifex project:

```bash
npm run migrate
```

This will:
- Rename and restructure directories
- Update package configurations  
- Set up the new service architecture
- Preserve existing 3D components

## 📁 Project Structure

```
sepulki/
├── apps/
│   └── forge-ui/                 # 3D Robot Design Studio
├── services/
│   ├── hammer-orchestrator/      # GraphQL API Gateway
│   ├── foundry-pipeline/         # Build & CI/CD
│   ├── anvil-sim/               # Isaac Sim Integration
│   ├── vault-registry/          # Component Catalog
│   ├── bellows-telemetry/       # Metrics & Monitoring  
│   ├── tongs-policy/            # Safety & Compliance
│   └── choreo-dispatch/         # Task Planning
├── packages/
│   ├── shared-types/            # Common TypeScript Types
│   ├── graphql-schema/          # Shared GraphQL Schema
│   └── sepulki-sdk/             # Client SDK
├── infrastructure/
│   ├── sql/                     # Database Schemas
│   ├── kubernetes/              # K8s Manifests  
│   └── terraform/               # Infrastructure as Code
└── docs/                        # Documentation
```

## 🎨 Brand Guidelines

Sepulki uses a consistent metallurgy/smithing theme throughout:

### Core Concepts
- **Sepulka** - Robot design (singular unit)
- **Alloy** - Component (hardware/software module) 
- **Pattern** - Design template
- **Ingot** - Compiled build artifact
- **Fleet** - Group of robots
- **Locus** - Physical location
- **Smith** - User/designer
- **Edict** - Policy rule

### Operations
- **Forge** - Create/design
- **Cast** - Compile/build
- **Temper** - Optimize  
- **Quench** - Deploy
- **Recall** - Rollback

## 🚀 Deployment

Deployments are automated via **GitHub Actions**:

- **Production**: Deploys automatically when merging to `master` branch (requires approval)
- **Development**: Deploys automatically when merging to `dev` branch

All secrets are managed in GitHub repository settings. See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for the complete deployment guide.

### Quick Deploy

```bash
# Manual deployment via GitHub CLI
gh workflow run deploy-production.yml
```

**Important:** All secrets are stored in GitHub Secrets. Never commit `.env` files or `*.secrets.json` to the repository.

---

## 🔧 Development

### Available Scripts

- `npm run dev` - Start all development servers
- `npm run build` - Build all packages and services
- `npm run test` - Run all tests
- `npm run lint` - Lint all code
- `npm run docker:up` - Start infrastructure
- `npm run docker:down` - Stop infrastructure

### Service Development

Each service is independently developed:

```bash
# Work on the orchestrator  
cd services/hammer-orchestrator
npm run dev

# Work on the UI
cd apps/forge-ui  
npm run dev
```

### Isaac Sim & Video Streaming

For 3D robot visualization with Isaac Sim:

```bash
# Start video stream proxy
cd services/video-stream-proxy
npm install
npm start  # Runs on port 8889

# Start Isaac Sim service (if available)
cd services/anvil-sim
# Follow README for deployment options
```

**Configuration**:
- Video Proxy: `http://localhost:8889`
- Isaac Sim endpoints: Configure via `services/anvil-sim/.env`
- Stream URLs: See `services/video-stream-proxy/README.md`

### Database Management

```bash
# View database logs
npm run docker:logs db

# Connect to database
docker exec -it sepulki_postgres_1 psql -U smith -d sepulki
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run E2E tests
npm run test:e2e

# Test specific service
npm test --workspace @sepulki/hammer-orchestrator

# Run frontend tests (Playwright)
cd apps/forge-ui
npx playwright test

# Test video streaming integration
npx playwright test tests/video-proxy-integration.spec.ts
```

## 📊 GraphQL API

The Hammer Orchestrator exposes a comprehensive GraphQL API:

### Key Queries
```graphql
query GetFleets {
  fleets {
    id
    name
    status
    robots {
      id
      name
      status
      batteryLevel
    }
  }
}
```

### Key Mutations  
```graphql
mutation ForgeSepulka($input: ForgeInput!) {
  forgeSepulka(input: $input) {
    sepulka {
      id
      name
      status
    }
    errors {
      code
      message
    }
  }
}
```

## 🚢 Deployment

### Production Deployment (YC Demo Ready)

Sepulki is configured for cost-effective deployment using:

| Service | Platform | Cost | Purpose |
|---------|----------|------|---------|
| Frontend | Vercel | Free | Next.js app + CDN |
| Backend | Railway | $10-15/mo | 2 services |
| Database | Neon | Free | PostgreSQL |
| Cache | Upstash | Free | Redis |

**Total: ~$10-15/month** - Perfect for YC demos and MVP!

#### Quick Deployment

```bash
# 1. Validate configuration
./scripts/validate-deployment.sh

# 2. Deploy all services
./scripts/quick-deploy.sh
```

#### Manual Deployment Steps

1. **Create Accounts**:
   - [Vercel](https://vercel.com/signup) - Frontend hosting
   - [Railway](https://railway.app/) - Backend services
   - [Neon](https://neon.tech/) - PostgreSQL database
   - [Upstash](https://upstash.com/) - Redis cache

2. **Configure Environment Variables**:
   ```bash
   # Generate secrets
   openssl rand -base64 32  # For JWT_SECRET
   openssl rand -base64 32  # For SESSION_SECRET
   openssl rand -base64 32  # For NEXTAUTH_SECRET
   ```

3. **Deploy Database**:
   ```bash
   export DATABASE_URL="your-neon-connection-string"
   ./infrastructure/scripts/neon-setup.sh
   ```

4. **Deploy Backend Services**:
   ```bash
   cd services/hammer-orchestrator
   railway up

   cd services/local-auth
   railway up
   ```

5. **Deploy Frontend**:
   ```bash
   cd apps/forge-ui
   vercel --prod
   ```

#### CI/CD Automation

GitHub Actions workflows automatically deploy on push to `master`:

- `.github/workflows/deploy-frontend.yml` - Vercel deployment
- `.github/workflows/deploy-backend.yml` - Railway deployment
- `.github/workflows/run-migrations.yml` - Database migrations

**Required GitHub Secrets**:
- `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`
- `RAILWAY_TOKEN`
- `NEON_DATABASE_URL_DEV`, `NEON_DATABASE_URL_PROD`

#### Deployment Documentation

For comprehensive deployment instructions, see:

- **Complete Guide**: [docs/DEPLOYMENT_COMPLETE.md](./docs/DEPLOYMENT_COMPLETE.md)
- **Checklist**: [docs/deployment-checklist.md](./docs/deployment-checklist.md)
- **Quick Reference**: [DEPLOYMENT_STATUS.md](./DEPLOYMENT_STATUS.md)

#### Health Checks

Verify deployment health:

```bash
# Frontend
curl https://your-domain.vercel.app/api/health

# Hammer Orchestrator
curl https://your-hammer.railway.app/health

# Local Auth
curl https://your-auth.railway.app/health
```

### Local Development
Uses Docker Compose for local infrastructure

```bash
npm run docker:up
```

### Alternative: Kubernetes
For enterprise deployments, Kubernetes manifests are in `infrastructure/kubernetes/`

```bash
kubectl apply -f infrastructure/kubernetes/
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Documentation**: [docs/](./docs/)
- **Architecture**: [docs/migration/NEW_ARCHITECTURE.md](./docs/migration/NEW_ARCHITECTURE.md)
- **API Reference**: http://localhost:4000/graphql
- **Issues**: https://github.com/CatsMeow492/Sepulki/issues

---

Made with ⚒️ by the Sepulki team
