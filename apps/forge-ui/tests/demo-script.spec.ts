import { test, expect, Page } from '@playwright/test'

/**
 * 🎬 Automated Demo Script for Sepulki Platform
 * 
 * This script automates the complete user journey for presentations:
 * 1. Design Flow: Use case → Analysis → Configure → Review → Deploy
 * 2. Fleet Management: View fleets, robots, streams, maps
 * 3. File Upload: Upload programs/routes to robots
 * 4. Kennel Demo: Multi-robot streaming view
 * 
 * Usage:
 *   npm run test:e2e tests/demo-script.spec.ts
 *   
 * For presentations with delays:
 *   DEMO_MODE=true npm run test:e2e tests/demo-script.spec.ts
 * 
 * To record video:
 *   npx playwright test tests/demo-script.spec.ts --video=on
 */

const DEMO_MODE = process.env.DEMO_MODE === 'true' || process.env.DEMO === 'true'
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const DEMO_DELAY = 3000 // 3 seconds between actions in demo mode
const FAST_DELAY = 500 // 0.5 seconds for fast mode

// Helper to wait based on mode
const wait = (ms: number) => ({ page }: { page: Page }) => 
  page.waitForTimeout(DEMO_MODE ? ms : FAST_DELAY)

// Test user credentials
const TEST_USER = {
  email: 'demo@sepulki.com',
  password: 'demo123'
}

test.describe('🎬 Sepulki Platform Demo Script', () => {
  test.beforeEach(async ({ page }) => {
    // Set viewport for better demo viewing
    await page.setViewportSize({ width: 1920, height: 1080 })
  })

  test('Complete Platform Demo - Full Journey', async ({ page }) => {
    console.log('🎬 Starting Sepulki Platform Demo...')

    // === PART 1: LANDING & AUTHENTICATION ===
    console.log('📍 Part 1: Landing & Authentication')
    await page.goto(BASE_URL)
    await wait(DEMO_DELAY)({ page })
    
    // Should redirect to design/new or fleet based on auth
    const currentUrl = page.url()
    if (currentUrl.includes('/auth/signin') || currentUrl.includes('/design/new')) {
      // Try to authenticate if needed
      if (currentUrl.includes('/auth/signin')) {
        await page.fill('input[type="email"]', TEST_USER.email)
        await page.fill('input[type="password"]', TEST_USER.password)
        await page.click('button[type="submit"]')
        await page.waitForURL(/\/fleet|\/design/, { timeout: 10000 })
      }
    }

    await wait(DEMO_DELAY)({ page })

    // === PART 2: DESIGN FLOW ===
    console.log('📍 Part 2: Design Flow')
    
    // Navigate to design page
    if (!page.url().includes('/design/new')) {
      await page.goto(`${BASE_URL}/design/new`)
      await page.waitForLoadState('networkidle', { timeout: 15000 })
      await wait(DEMO_DELAY)({ page })
    }

    // Enter use case - wait for page to load and find textarea
    const useCase = 'I need robot dogs to act as security for a company. They should patrol the perimeter and monitor for intruders.'
    
    // Wait for the page to be ready
    await page.waitForLoadState('domcontentloaded')
    
    // Try to find textarea - wait a bit for it to render
    const textarea = page.locator('textarea').first()
    try {
      await textarea.waitFor({ state: 'visible', timeout: 5000 })
      await textarea.fill(useCase)
      console.log('✅ Use case entered')
    } catch (e) {
      console.log('⚠️  Could not find textarea, trying alternative selectors...')
      // Try alternative approach
      const anyInput = page.locator('textarea, input[type="text"]').first()
      if (await anyInput.isVisible({ timeout: 3000 })) {
        await anyInput.fill(useCase)
      } else {
        console.log('⚠️  Skipping use case entry - page may need authentication')
      }
    }
    
    await wait(DEMO_DELAY)({ page })
    
    // Click analyze or continue
    const analyzeButton = page.getByRole('button', { name: /Analyze|Continue|Submit/i }).first()
    if (await analyzeButton.isVisible({ timeout: 3000 })) {
      await analyzeButton.click()
      await wait(DEMO_DELAY * 2)({ page }) // Wait for analysis
    }

    // Check if we're on analyze page or configure page
    if (page.url().includes('/analyze')) {
      // Wait for analysis to complete
      await page.waitForSelector('text=/Analysis|Recommendations|Questions/i', { timeout: 30000 })
      await wait(DEMO_DELAY * 2)({ page })
      
      // Continue to configure
      const continueButton = page.getByRole('button', { name: /Continue|Configure/i }).first()
      if (await continueButton.isVisible({ timeout: 2000 })) {
        await continueButton.click()
        await page.waitForURL(/\/design\/configure/, { timeout: 10000 })
      }
    }

    // On configure page - show robot recommendations
    if (page.url().includes('/design/configure')) {
      await page.waitForSelector('text=/Isaac Sim|Robot|Recommendations/i', { timeout: 10000 })
      await wait(DEMO_DELAY * 2)({ page })
      
      // If "Deploy to Fleet" button is visible, show it
      const deployButton = page.getByRole('button', { name: /Deploy to Fleet/i })
      if (await deployButton.isVisible({ timeout: 2000 })) {
        console.log('✅ Deploy to Fleet button is visible')
        // Don't click in demo mode, just highlight
        if (!DEMO_MODE) {
          await deployButton.hover()
          await wait(DEMO_DELAY)({ page })
        }
      }
    }

    // === PART 3: FLEET MANAGEMENT ===
    console.log('📍 Part 3: Fleet Management')
    
    await page.goto(`${BASE_URL}/fleet`)
    await page.waitForLoadState('networkidle', { timeout: 15000 })
    await wait(DEMO_DELAY)({ page })
    
    // Check for fleet dashboard - be more flexible with selectors
    const dashboardText = page.locator('text=/Fleet|Dashboard|Fleets|Robots/i').first()
    if (await dashboardText.isVisible({ timeout: 5000 })) {
      console.log('✅ Fleet dashboard loaded')
    } else {
      console.log('⚠️  Fleet dashboard text not found, but continuing...')
      // Take a screenshot for debugging
      await page.screenshot({ path: 'test-results/fleet-dashboard-debug.png' })
    }
    await wait(DEMO_DELAY)({ page })

    // Try to find and click on a fleet
    const fleetLink = page.locator('a[href*="/fleet/"]').first()
    if (await fleetLink.isVisible({ timeout: 5000 })) {
      const fleetId = await fleetLink.getAttribute('href')
      console.log(`📦 Found fleet: ${fleetId}`)
      
      if (DEMO_MODE) {
        await fleetLink.hover()
        await wait(DEMO_DELAY)({ page })
      } else {
        await fleetLink.click()
        await page.waitForURL(/\/fleet\/[^\/]+$/, { timeout: 10000 })
        await wait(DEMO_DELAY * 2)({ page })
      }
    }

    // === PART 4: KENNEL DEMO (CRITICAL) ===
    console.log('📍 Part 4: Kennel Demo (Public Robot Streams)')
    
    // Navigate to kennel view
    const kennelButton = page.getByRole('link', { name: /Kennel|Live Stream|View Kennel/i }).first()
    if (await kennelButton.isVisible({ timeout: 5000 })) {
      await kennelButton.click()
      await page.waitForURL(/\/kennel/, { timeout: 10000 })
    } else {
      // Try direct navigation to kennel
      const currentUrl = page.url()
      const fleetId = currentUrl.match(/\/fleet\/([^\/]+)/)?.[1]
      if (fleetId) {
        await page.goto(`${BASE_URL}/fleet/${fleetId}/kennel`)
        await wait(DEMO_DELAY * 2)({ page })
      }
    }

    // Check for kennel streams
    const streamContainers = page.locator('iframe, video, [data-testid="stream"]')
    const streamCount = await streamContainers.count()
    console.log(`📺 Found ${streamCount} stream containers`)
    
    if (streamCount > 0) {
      console.log('✅ Kennel streams are loading')
    }
    
    await wait(DEMO_DELAY * 2)({ page })

    // === PART 5: INDIVIDUAL ROBOT STREAM ===
    console.log('📍 Part 5: Individual Robot Stream')
    
    // Go back to fleet detail
    await page.goto(`${BASE_URL}/fleet`)
    await wait(DEMO_DELAY)({ page })
    
    // Find a robot stream link
    const streamLink = page.locator('a[href*="/robot/"][href*="/stream"]').first()
    if (await streamLink.isVisible({ timeout: 5000 })) {
      await streamLink.click()
      await page.waitForURL(/\/robot\/.*\/stream/, { timeout: 10000 })
      await wait(DEMO_DELAY * 2)({ page })
      
      // Check for stream elements
      const streamElement = page.locator('iframe, video, [data-testid="stream"]').first()
      if (await streamElement.isVisible({ timeout: 10000 })) {
        console.log('✅ Individual robot stream is loading')
      }
    }

    // === PART 6: FILE UPLOAD ===
    console.log('📍 Part 6: File Upload (Programs/Routes)')
    
    try {
      await page.goto(`${BASE_URL}/tasks/upload`, { waitUntil: 'domcontentloaded', timeout: 10000 })
      await wait(DEMO_DELAY)({ page })
      
      // Check for upload interface - be flexible
      const uploadText = page.locator('text=/Upload|Program|Route/i').first()
      if (await uploadText.isVisible({ timeout: 5000 })) {
        console.log('✅ Upload page loaded')
      } else {
        console.log('⚠️  Upload page may require authentication')
      }
      await wait(DEMO_DELAY)({ page })
    } catch (error) {
      console.log('⚠️  Could not access upload page (may require auth):', error instanceof Error ? error.message : error)
      // Continue anyway
    }

    // Create a sample route file
    const sampleRoute = {
      waypoints: [
        { lat: 37.7749, lng: -122.4194, sequence: 1, name: 'Start' },
        { lat: 37.7849, lng: -122.4294, sequence: 2, name: 'Checkpoint 1' },
        { lat: 37.7949, lng: -122.4394, sequence: 3, name: 'End' }
      ]
    }

    // Try to upload file if file input exists
    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.count() > 0 && !DEMO_MODE) {
      const fileContent = JSON.stringify(sampleRoute)
      const fileBuffer = Buffer.from(fileContent)
      
      await fileInput.setInputFiles({
        name: 'demo-route.json',
        mimeType: 'application/json',
        buffer: fileBuffer
      })
      
      await wait(DEMO_DELAY)({ page })
      console.log('✅ File uploaded (demo mode: skipped)')
    } else {
      console.log('ℹ️  File upload UI is ready (demo mode: skipped actual upload)')
    }

    // === PART 7: MAP VISUALIZATION ===
    console.log('📍 Part 7: Map Visualization')
    
    await page.goto(`${BASE_URL}/fleet/map`)
    await wait(DEMO_DELAY * 2)({ page })
    
    // Check for map container
    const mapContainer = page.locator('.leaflet-container, [class*="map"]').first()
    if (await mapContainer.isVisible({ timeout: 5000 })) {
      console.log('✅ Map is loading')
      await wait(DEMO_DELAY * 2)({ page })
      
      // Try to find robot markers
      const markers = page.locator('.leaflet-marker-icon, [class*="marker"]')
      const markerCount = await markers.count()
      if (markerCount > 0) {
        console.log(`📍 Found ${markerCount} robot markers on map`)
      }
    }

    // === PART 8: SUMMARY ===
    console.log('📍 Part 8: Demo Complete - Summary')
    await page.goto(`${BASE_URL}/fleet`)
    await wait(DEMO_DELAY)({ page })
    
    // Take a screenshot at the end
    await page.screenshot({ path: 'test-results/demo-complete.png', fullPage: true })
    console.log('📸 Screenshot saved to test-results/demo-complete.png')
    
    console.log('✅ Demo script completed successfully!')
  })

  test('Quick Kennel Demo (Standalone)', async ({ page }) => {
    /**
     * Quick demo focused on the kennel streaming feature
     * Perfect for the Twitch media stunt
     */
    console.log('🎬 Starting Quick Kennel Demo...')

    await page.setViewportSize({ width: 1920, height: 1080 })
    
    // Set up authentication for demo (mock auth) - use addInitScript to set before page loads
    await page.addInitScript(() => {
      // Clear any existing auth state
      localStorage.clear();
      sessionStorage.clear();
      delete (window as any).__SEPULKI_AUTH__;
      
      // Set up mock authenticated user for demo
      (window as any).__SEPULKI_AUTH__ = {
        smith: {
          id: 'demo-smith-id',
          email: 'demo@sepulki.com',
          name: 'Demo Smith',
          role: 'SMITH'
        },
        authMode: 'mock',
        staySignedOut: false
      };
      
      // Set auth token for GraphQL
      localStorage.setItem('auth_token', 'demo-auth-token.mock-signature-for-development');
      
      // Enable demo mode for public kennel access
      (window as any).__SEPULKI_DEMO_MODE = true;
    });
    
    // Navigate directly to kennel page to avoid root page redirects
    const fleetId = 'd1d5183b-677f-4346-a327-e731bd1082cc'
    console.log(`📍 Navigating directly to kennel page: ${BASE_URL}/fleet/${fleetId}/kennel`)
    await page.goto(`${BASE_URL}/fleet/${fleetId}/kennel`, { waitUntil: 'domcontentloaded', timeout: 60000 })
    const currentUrl = page.url()
    console.log(`✅ Navigated to: ${currentUrl}`)
    if (!currentUrl.includes('/kennel')) {
      console.log(`⚠️  URL doesn't contain '/kennel', but continuing anyway`)
    }
      
      // Collect all console messages for debugging
      const consoleMessages: Array<{ type: string; text: string }> = []
      page.on('console', msg => {
        const type = msg.type()
        const text = msg.text()
        consoleMessages.push({ type, text })
        if (type === 'error') {
          console.log(`❌ Console Error: ${text}`)
        } else if (type === 'warning') {
          console.log(`⚠️  Console Warning: ${text}`)
        } else if (text.includes('Demo mode') || text.includes('🔍') || text.includes('🏠')) {
          console.log(`📝 Console: ${text}`)
        }
      })
      
      // Collect page errors
      page.on('pageerror', error => {
        console.log(`❌ Page Error: ${error.message}`)
        console.log(`Stack: ${error.stack}`)
      })
      
      // Collect failed requests
      page.on('requestfailed', request => {
        console.log(`❌ Request Failed: ${request.url()} - ${request.failure()?.errorText}`)
      })
      
      // Wait for kennel page to fully load and streams to mount (client-side components)
      console.log('⏳ Waiting for kennel page and stream components to load...')
      
      // First, check if the kennel page wrapper exists
      const hasKennelWrapper = await page.locator('[data-testid="kennel-page"]').count()
      console.log(`🔍 Kennel page wrapper found: ${hasKennelWrapper}`)
      
      // Wait for kennel page specific content
      try {
        await page.waitForSelector('text=/Kennel|Live Stream|DogBot/i', { timeout: 15000 })
        console.log('✅ Kennel page content loaded')
      } catch (error) {
        console.log('⚠️  Kennel page content may still be loading')
        // Debug: Get page content
        const pageContent = await page.content()
        const hasMain = pageContent.includes('<main')
        const hasKennelTestId = pageContent.includes('kennel-page')
        console.log(`📄 Page HTML debug - Has <main>: ${hasMain}, Has kennel-page testid: ${hasKennelTestId}`)
        console.log('📄 Page HTML snippet:', pageContent.substring(pageContent.indexOf('<main'), pageContent.indexOf('<main') + 800))
      }
      
      // Wait for any JavaScript errors to appear
      await page.waitForTimeout(2000)
      
      // Log all collected console messages
      const errorMessages = consoleMessages.filter(m => m.type === 'error')
      const warningMessages = consoleMessages.filter(m => m.type === 'warning')
      
      if (errorMessages.length > 0) {
        console.log(`❌ Found ${errorMessages.length} console errors:`)
        errorMessages.forEach(m => console.log(`   - ${m.text}`))
      }
      if (warningMessages.length > 0) {
        console.log(`⚠️  Found ${warningMessages.length} console warnings:`)
        warningMessages.slice(0, 5).forEach(m => console.log(`   - ${m.text}`))
      }
      
      // Check for React errors in the page
      const pageErrors = await page.evaluate(() => {
        return {
          reactErrors: (window as any).__REACT_ERROR__ || null,
          hydrationErrors: document.querySelector('[data-nextjs-hydration-error]') ? 'Found hydration error marker' : null,
          errorBoundary: document.querySelector('[class*="error-boundary"], [data-error-boundary]')?.textContent || null
        }
      })
      
      if (pageErrors.reactErrors || pageErrors.hydrationErrors || pageErrors.errorBoundary) {
        console.log('🔍 Page Error State:', pageErrors)
      }
      
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => console.log('Network not idle, continuing'))
      await page.waitForTimeout(5000) // Wait for client-side components to mount and hydrate
      
      // Verify streams are present AND visible - with retries
      console.log('🔍 Looking for stream containers...')
      let streams = page.locator('[data-testid="stream"], iframe[data-testid="stream-iframe"], iframe[src*="stream"], iframe[src*="embed"]')
      let count = await streams.count()
      let retries = 5
      
      while (count === 0 && retries > 0) {
        console.log(`⏳ No streams found yet, waiting... (${retries} retries left)`)
        await page.waitForTimeout(2000)
        streams = page.locator('[data-testid="stream"], iframe[data-testid="stream-iframe"], iframe[src*="stream"], iframe[src*="embed"]')
        count = await streams.count()
        retries--
      }
      
      console.log(`📺 Found ${count} stream containers`)
      
      if (count === 0) {
        // Debug: Check what's actually on the page
        const pageContent = await page.content()
        const hasStreamText = pageContent.includes('stream') || pageContent.includes('Stream') || pageContent.includes('kennel')
        console.log(`📄 Page contains stream-related text: ${hasStreamText}`)
        const bodyText = await page.locator('body').textContent() || ''
        console.log(`📄 Body text preview: ${bodyText.substring(0, 300)}`)
        
        // Check for KennelPageContent specific elements
        const hasKennelTitle = await page.locator('text=/Kennel Live Streams/i').count()
        const hasDogBot = await page.locator('text=/DogBot/i').count()
        const hasGrid = await page.locator('[class*="grid"]').count()
        console.log(`🔍 Debug - Has kennel title: ${hasKennelTitle}, Has DogBot: ${hasDogBot}, Has grid: ${hasGrid}`)
        
        // Check for loading states
        const loadingElements = await page.locator('text=/Loading/i').count()
        console.log(`🔍 Loading elements found: ${loadingElements}`)
        
        // Take a screenshot for debugging
        await page.screenshot({ path: 'test-results/kennel-debug-screenshot.png', fullPage: true })
        console.log('📸 Debug screenshot saved: test-results/kennel-debug-screenshot.png')
      }
      
      expect(count).toBeGreaterThan(0)
      console.log(`✅ Kennel demo: ${count} stream containers found`)

      // Wait for streams to actually load (not just be present)
      for (let i = 0; i < Math.min(count, 4); i++) {
        const stream = streams.nth(i)
        await stream.waitFor({ state: 'visible', timeout: 5000 })
        console.log(`✅ Stream ${i + 1} is visible`)
      }

      // Take screenshot to verify streams are displayed
      const screenshotPath = 'test-results/kennel-demo-streams.png'
      await page.screenshot({ 
        path: screenshotPath, 
        fullPage: true 
      })
      console.log(`📸 Screenshot saved: ${screenshotPath}`)

      // Verify at least one stream is loaded (iframe src exists)
      const iframes = page.locator('iframe[src]')
      const iframeCount = await iframes.count()
      console.log(`🎥 Found ${iframeCount} iframes with src attributes`)
      expect(iframeCount).toBeGreaterThan(0)
      console.log(`✅ ${iframeCount} streams with active sources`)
      
      // Check stream status indicators
      const liveIndicators = page.locator('text=/Live|Connected|Connecting/i')
      const indicatorCount = await liveIndicators.count()
      if (indicatorCount > 0) {
        console.log(`✅ Found ${indicatorCount} stream status indicators`)
      } else {
        console.log('⚠️  No stream status indicators found')
      }
  })

  test('RAG to Deployment Flow Demo', async ({ page }) => {
    /**
     * Demonstrates the complete RAG → Design → Deploy flow
     */
    console.log('🎬 Starting RAG to Deployment Flow Demo...')

    await page.setViewportSize({ width: 1920, height: 1080 })
    
    // Step 1: Enter use case
    await page.goto(`${BASE_URL}/design/new`)
    await wait(DEMO_DELAY)({ page })

    const useCase = 'I need a robot dog that can patrol warehouses at night and detect intruders using cameras and sensors.'
    await page.fill('textarea', useCase)
    await wait(DEMO_DELAY)({ page })

    // Submit
    const submitButton = page.getByRole('button', { name: /Analyze|Submit|Continue/i }).first()
    if (await submitButton.isVisible({ timeout: 2000 })) {
      await submitButton.click()
      await wait(DEMO_DELAY * 3)({ page }) // Wait for analysis
    }

    // Step 2: Configure page - select robot
    if (page.url().includes('/design/configure')) {
      await page.waitForSelector('text=/Isaac Sim|Robot|Recommendations/i', { timeout: 15000 })
      await wait(DEMO_DELAY * 2)({ page })

      // Select first recommended robot if available
      const robotCard = page.locator('[class*="robot"], [class*="recommendation"]').first()
      if (await robotCard.isVisible({ timeout: 3000 })) {
        await robotCard.click()
        await wait(DEMO_DELAY)({ page })
      }

      // Show deploy button (don't click in demo mode)
      const deployButton = page.getByRole('button', { name: /Deploy to Fleet/i })
      if (await deployButton.isVisible({ timeout: 2000 })) {
        console.log('✅ Deploy to Fleet button visible - RAG integration working!')
        if (!DEMO_MODE) {
          await deployButton.hover()
        }
      }
    }

    // Step 3: Review page
    const reviewButton = page.getByRole('button', { name: /Review|Continue to Review/i }).first()
    if (await reviewButton.isVisible({ timeout: 3000 })) {
      await reviewButton.click()
      await page.waitForURL(/\/design\/.*\/review/, { timeout: 10000 })
      await wait(DEMO_DELAY * 2)({ page })

      // Check for deployment UI
      const deploySection = page.getByText(/Deploy to Fleet|Select Fleet/i)
      if (await deploySection.isVisible({ timeout: 3000 })) {
        console.log('✅ Deployment UI visible on review page')
      }
    }
  })
})

