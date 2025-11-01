import { test, expect } from '@playwright/test'

/**
 * E2E Tests for Kennel Demo
 * 
 * Tests the critical user flows for the public robot dog kennel demo:
 * 1. Uploading instructions to robots
 * 2. Watching live streams in kennel view
 * 3. Multi-robot stream grid
 * 4. Public access (no authentication)
 */

test.describe('Kennel Demo - Critical Flows', () => {
  test.beforeEach(async ({ page }) => {
    // Start from a known state
    await page.goto('http://localhost:3000')
  })

  test('should display fleet dashboard', async ({ page }) => {
    await page.goto('http://localhost:3000/fleet')
    
    // Check for fleet dashboard elements
    await expect(page.getByText(/Fleet Dashboard/i)).toBeVisible()
    await expect(page.getByText(/Active Fleets/i)).toBeVisible()
    await expect(page.getByText(/Working Robots/i)).toBeVisible()
    
    // Check for fleet list
    const fleetCards = page.locator('[data-testid="fleet-card"]').or(page.locator('text=/Fleet|Dev|Demo/i').first())
    await expect(fleetCards.first()).toBeVisible({ timeout: 10000 })
  })

  test('should navigate to kennel view', async ({ page }) => {
    await page.goto('http://localhost:3000/fleet')
    
    // Wait for fleets to load
    await page.waitForTimeout(2000)
    
    // Try to find and click a fleet
    const fleetLink = page.getByText(/Fleet|Dev|Demo/i).first()
    if (await fleetLink.isVisible()) {
      await fleetLink.click()
      
      // Navigate to kennel
      const kennelButton = page.getByText(/Kennel|Stream|View Kennel/i).first()
      if (await kennelButton.isVisible()) {
        await kennelButton.click()
      } else {
        // Try direct navigation
        const currentUrl = page.url()
        const fleetId = currentUrl.match(/\/fleet\/([^\/]+)/)?.[1]
        if (fleetId) {
          await page.goto(`http://localhost:3000/fleet/${fleetId}/kennel`)
        }
      }
      
      // Verify kennel page loads
      await expect(page.getByText(/Kennel|Live Stream|Robot Streams/i).first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('should display multiple robot streams in kennel view', async ({ page }) => {
    // Navigate directly to kennel (replace with actual fleet ID)
    await page.goto('http://localhost:3000/fleet/test-fleet/kennel')
    
    // Check for stream containers
    const streamContainers = page.locator('iframe, [data-testid="stream"], video').or(
      page.locator('div').filter({ hasText: /LIVE|Stream|Connecting/i }).first()
    )
    
    // Should have at least one stream container
    const count = await streamContainers.count()
    expect(count).toBeGreaterThan(0)
    
    // Check for connection status
    const statusIndicators = page.locator('text=/Live|Connected|Connecting|Status/i')
    const statusCount = await statusIndicators.count()
    // At least one status indicator should be visible
    expect(statusCount).toBeGreaterThan(0)
  })

  test('should allow file upload', async ({ page }) => {
    await page.goto('http://localhost:3000/tasks/upload')
    
    // Check upload interface
    await expect(page.getByText(/Upload Program or Route/i)).toBeVisible()
    await expect(page.getByText(/Drag and drop|Select File/i)).toBeVisible()
    
    // Check for upload type selection
    const programButton = page.getByRole('button', { name: /Program/i }).or(page.locator('button:has-text("Program")')).first()
    const routeButton = page.getByRole('button', { name: /Route/i }).or(page.locator('button:has-text("Route")')).first()
    
    await expect(programButton.or(routeButton).first()).toBeVisible()
  })

  test('should validate file types on upload', async ({ page }) => {
    await page.goto('http://localhost:3000/tasks/upload')
    
    // Create an invalid file
    const invalidFile = {
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('invalid content')
    }
    
    // Try to upload (if file input is accessible)
    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.count() > 0) {
      await fileInput.first().setInputFiles({
        name: invalidFile.name,
        mimeType: invalidFile.mimeType,
        buffer: invalidFile.buffer
      })
      
      // Should show validation error
      await expect(page.getByText(/Invalid file type|Invalid file/i).first()).toBeVisible({ timeout: 5000 })
    }
  })

  test('should navigate from fleet to robot stream', async ({ page }) => {
    await page.goto('http://localhost:3000/fleet')
    
    // Wait for data to load
    await page.waitForTimeout(2000)
    
    // Find a robot link or stream link
    const streamLink = page.getByText(/Stream|View Stream/i).first()
    if (await streamLink.isVisible({ timeout: 5000 })) {
      await streamLink.click()
      
      // Should navigate to stream page
      await expect(page).toHaveURL(/\/robot\/.*\/stream/, { timeout: 5000 })
      await expect(page.getByText(/Live Stream|Stream|Robot/i).first()).toBeVisible({ timeout: 10000 })
    }
  })

  test('should display map with robot positions', async ({ page }) => {
    await page.goto('http://localhost:3000/fleet/map')
    
    // Wait for map to load
    await page.waitForTimeout(3000)
    
    // Check for map container
    const mapContainer = page.locator('.leaflet-container').or(
      page.locator('[class*="map"]').first()
    )
    
    // Map should be present (may be empty if no GPS data)
    const mapExists = await mapContainer.count() > 0 || 
                      await page.locator('div').filter({ has: page.locator('iframe') }).count() > 0
    
    expect(mapExists).toBeTruthy()
  })

  test('kennel view should be publicly accessible', async ({ page }) => {
    // Clear any authentication
    await page.context().clearCookies()
    await page.goto('http://localhost:3000/fleet/test-fleet/kennel')
    
    // Should be able to access without auth (for kennel demo)
    // May redirect or show limited content, but should not error
    const hasError = await page.locator('text=/Error|401|403|Unauthorized/i').count() > 0
    expect(hasError).toBeFalsy()
    
    // Should show kennel content or redirect appropriately
    const hasContent = await page.locator('text=/Kennel|Stream|Robot/i').count() > 0
    expect(hasContent).toBeTruthy()
  })
})

test.describe('Kennel Demo - File Upload Flow', () => {
  test('should upload route file to fleet', async ({ page }) => {
    await page.goto('http://localhost:3000/tasks/upload')
    
    // Select route type
    const routeButton = page.getByRole('button', { name: /Route/i }).first()
    if (await routeButton.isVisible()) {
      await routeButton.click()
    }
    
    // Create a valid route file
    const routeData = {
      waypoints: [
        { lat: 37.7749, lng: -122.4194, sequence: 1 },
        { lat: 37.7849, lng: -122.4294, sequence: 2 }
      ]
    }
    
    const routeFile = {
      name: 'test-route.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify(routeData))
    }
    
    // Upload file if input is available
    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.count() > 0) {
      await fileInput.first().setInputFiles({
        name: routeFile.name,
        mimeType: routeFile.mimeType,
        buffer: routeFile.buffer
      })
      
      // Should show file preview or route preview
      await expect(page.getByText(routeFile.name).or(page.getByText(/waypoint|route/i)).first()).toBeVisible({ timeout: 5000 })
    }
  })
})

test.describe('Kennel Demo - Streaming Flow', () => {
  test('should display individual robot stream', async ({ page }) => {
    await page.goto('http://localhost:3000/robot/test-robot/stream')
    
    // Check for stream elements
    const streamElements = page.locator('iframe, video, [data-testid="stream"]').or(
      page.locator('div').filter({ hasText: /LIVE|Connected|Stream/i }).first()
    )
    
    await expect(streamElements.first()).toBeVisible({ timeout: 15000 })
    
    // Check for connection status
    const statusText = page.getByText(/Live|Connected|Connecting|Status/i).first()
    await expect(statusText).toBeVisible({ timeout: 5000 })
  })

  test('should show battery and status in stream view', async ({ page }) => {
    await page.goto('http://localhost:3000/robot/test-robot/stream')
    
    // Wait for stream to load
    await page.waitForTimeout(3000)
    
    // Check for robot information
    const robotInfo = page.getByText(/Battery|Status|Robot/i)
    const infoCount = await robotInfo.count()
    
    // Should have some robot information displayed
    expect(infoCount).toBeGreaterThan(0)
  })
})

test.describe('Kennel Demo - Navigation Flow', () => {
  test('complete navigation flow: Fleet → Kennel → Stream → Upload', async ({ page }) => {
    // 1. Start at fleet dashboard
    await page.goto('http://localhost:3000/fleet')
    await expect(page.getByText(/Fleet Dashboard/i)).toBeVisible({ timeout: 10000 })
    
    // 2. Navigate to kennel view
    const kennelLink = page.getByText(/Kennel|View Kennel/i).first()
    if (await kennelLink.isVisible({ timeout: 5000 })) {
      await kennelLink.click()
    } else {
      // Try direct navigation
      await page.goto('http://localhost:3000/fleet/test-fleet/kennel')
    }
    
    await page.waitForTimeout(2000)
    
    // 3. Navigate to individual stream (if link exists)
    const streamLink = page.getByText(/View Stream|Stream/i).first()
    if (await streamLink.isVisible({ timeout: 5000 })) {
      await streamLink.click()
      await page.waitForTimeout(2000)
    }
    
    // 4. Navigate to upload
    const uploadLink = page.getByText(/Upload|Upload Program/i).first()
    if (await uploadLink.isVisible({ timeout: 3000 })) {
      await uploadLink.click()
    } else {
      await page.goto('http://localhost:3000/tasks/upload')
    }
    
    await expect(page.getByText(/Upload Program or Route/i)).toBeVisible({ timeout: 5000 })
  })
})

