# 🎬 Sepulki Demo Script Guide

Automated demo script for presenting the Sepulki platform. Uses Playwright to automate the complete user journey.

## 🚀 Quick Start

### Run Complete Demo
```bash
# Fast mode (no delays)
./scripts/run-demo.sh

# Demo mode (with delays for presentations)
./scripts/run-demo.sh --demo

# Record video for presentation
./scripts/run-demo.sh --demo --record
```

### Run Specific Demos
```bash
# Quick Kennel Demo (Twitch media stunt)
./scripts/run-demo.sh --kennel

# RAG to Deployment Flow
./scripts/run-demo.sh --rag

# Complete Platform Demo
./scripts/run-demo.sh --full
```

## 📋 What the Demo Covers

### 1. **Complete Platform Journey** (`--full`)
- ✅ Landing page & authentication
- ✅ Design flow (use case → analyze → configure)
- ✅ RAG recommendations & Isaac Sim integration
- ✅ Fleet management dashboard
- ✅ Kennel demo (multi-robot streams)
- ✅ Individual robot streams
- ✅ File upload (programs/routes)
- ✅ Map visualization

### 2. **Quick Kennel Demo** (`--kennel`)
- ✅ Navigate to fleet
- ✅ Open kennel view
- ✅ Verify multiple robot streams
- ⚡ **Perfect for Twitch media stunt!**

### 3. **RAG to Deployment** (`--rag`)
- ✅ Enter use case
- ✅ RAG analysis & recommendations
- ✅ Configure robot selection
- ✅ "Deploy to Fleet" button
- ✅ Review page with deployment UI

## 🎯 Demo Modes

### Fast Mode (Default)
- No delays between actions
- Perfect for testing
- Runs quickly

### Demo Mode (`--demo`)
- 3-second delays between actions
- Perfect for live presentations
- Gives audience time to see each step

## 📹 Recording Videos

Record your demo for later playback:

```bash
# Record full demo with delays
./scripts/run-demo.sh --demo --record

# Record quick kennel demo
./scripts/run-demo.sh --kennel --record
```

Videos are saved to: `apps/forge-ui/test-results/`

## 🎬 Presentation Tips

### For Live Demos
1. **Use demo mode**: `./scripts/run-demo.sh --demo`
2. **Run in headed mode**: Script automatically runs with `--headed`
3. **Full screen**: Browser opens at 1920x1080
4. **Narrate**: Explain each step as the demo runs

### For Recorded Demos
1. **Record video**: `./scripts/run-demo.sh --demo --record`
2. **Edit video**: Use the recorded video in your presentation
3. **Add narration**: Overlay voice-over in post-production

## 🛠️ Customization

### Change Base URL
```bash
BASE_URL=http://localhost:3001 ./scripts/run-demo.sh
```

### Adjust Delays
Edit `tests/demo-script.spec.ts`:
```typescript
const DEMO_DELAY = 5000 // 5 seconds (instead of 3)
```

### Run Specific Test
```bash
cd apps/forge-ui
npx playwright test ../../tests/demo-script.spec.ts --grep "Quick Kennel Demo"
```

## 📊 Demo Flow Diagram

```
1. Landing → Auth
   ↓
2. Design: Use Case Input
   ↓
3. Analyze: RAG Recommendations
   ↓
4. Configure: Robot Selection + Isaac Sim
   ↓
5. Review: Deployment UI
   ↓
6. Fleet Dashboard
   ↓
7. Kennel View (Multi-Stream)
   ↓
8. Individual Stream
   ↓
9. File Upload
   ↓
10. Map Visualization
```

## ✅ Prerequisites

### Required Services
- ✅ Frontend running: `http://localhost:3000`
- ✅ GraphQL API running: `http://localhost:4000`
- ✅ Video proxy running (for streams): `http://localhost:8889`
- ✅ Database with test data

### Test Users
The demo uses: `demo@sepulki.com` / `demo123`

Other available test users:
- `dev@sepulki.com` / `dev123` (Over-Smith)
- `test@sepulki.com` / `test123` (Over-Smith)
- `admin@sepulki.com` / `admin123` (Admin)

## 🐛 Troubleshooting

### Services Not Running
```bash
# Check if frontend is running
curl http://localhost:3000

# If not, start services
cd apps/forge-ui && npm run dev
```

### Playwright Not Found
```bash
cd apps/forge-ui
npm install
```

### Demo Too Fast/Slow
- **Too fast**: Use `--demo` flag
- **Too slow**: Edit `DEMO_DELAY` in `tests/demo-script.spec.ts`

### Streams Not Loading
- Check video proxy is running: `http://localhost:8889/health`
- Check Isaac Sim is accessible (if using real streams)
- Demo will still run - streams may show loading state

## 📝 Example Usage

### Before a Presentation
```bash
# 1. Start all services
npm run dev

# 2. Verify services are running
curl http://localhost:3000
curl http://localhost:4000/health

# 3. Run demo once to test
./scripts/run-demo.sh --demo

# 4. Run with recording for backup
./scripts/run-demo.sh --demo --record
```

### During Presentation
```bash
# Run the full demo with delays
./scripts/run-demo.sh --demo --full
```

### Quick Showcase
```bash
# Just show the kennel demo
./scripts/run-demo.sh --kennel --demo
```

## 🎉 Success Indicators

When the demo runs successfully, you should see:
- ✅ Console logs showing progress
- ✅ Browser opens and navigates through pages
- ✅ No errors in console
- ✅ Screenshot saved at the end
- ✅ Video recorded (if `--record` used)

## 📚 Additional Resources

- **E2E Tests**: See `tests/e2e-kennel-demo.spec.ts` for more test scenarios
- **Playwright Docs**: https://playwright.dev/
- **Demo Setup Guide**: See `DEMO_SETUP_GUIDE.md`

