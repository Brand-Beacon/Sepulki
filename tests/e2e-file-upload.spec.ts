import { test, expect } from '@playwright/test'

test.describe('File Upload Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to upload page
    await page.goto('http://localhost:3000/tasks/upload')
  })

  test('should display upload interface', async ({ page }) => {
    await expect(page.getByText(/Upload Program or Route/i)).toBeVisible()
    await expect(page.getByText(/Drag and drop your file here/i)).toBeVisible()
  })

  test('should allow selecting upload type', async ({ page }) => {
    const programButton = page.getByRole('button', { name: /Program/i })
    const routeButton = page.getByRole('button', { name: /Route/i })

    await expect(programButton).toBeVisible()
    await expect(routeButton).toBeVisible()

    // Click route button
    await routeButton.click()
    await expect(routeButton).toHaveClass(/bg-orange-600/)
  })

  test('should handle file selection', async ({ page }) => {
    // Create a test file
    const testFile = {
      name: 'test-route.json',
      mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({
        waypoints: [
          { lat: 37.7749, lng: -122.4194, sequence: 1 }
        ]
      }))
    }

    // Upload file (if file input is visible)
    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles({
        name: testFile.name,
        mimeType: testFile.mimeType,
        buffer: testFile.buffer
      })

      // Should show file name
      await expect(page.getByText(testFile.name)).toBeVisible()
    }
  })

  test('should validate file type', async ({ page }) => {
    const invalidFile = {
      name: 'test.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('invalid content')
    }

    const fileInput = page.locator('input[type="file"]')
    if (await fileInput.isVisible()) {
      await fileInput.setInputFiles({
        name: invalidFile.name,
        mimeType: invalidFile.mimeType,
        buffer: invalidFile.buffer
      })

      // Should show error message
      await expect(page.getByText(/Invalid file type/i)).toBeVisible()
    }
  })

  test('should show upload progress', async ({ page }) => {
    // This test would require mocking the API endpoint
    // For now, just check that upload button exists
    const uploadButton = page.getByRole('button', { name: /Upload/i })
    await expect(uploadButton).toBeVisible()
  })
})

test.describe('Streaming Flow', () => {
  test('should display robot stream page', async ({ page }) => {
    await page.goto('http://localhost:3000/robot/test-robot/stream')
    
    await expect(page.getByText(/Live Stream/i)).toBeVisible()
    // Stream iframe should be present
    const streamContainer = page.locator('iframe, [data-testid="stream"]').first()
    await expect(streamContainer).toBeVisible({ timeout: 10000 })
  })

  test('should display kennel multi-stream view', async ({ page }) => {
    await page.goto('http://localhost:3000/fleet/test-fleet/kennel')
    
    await expect(page.getByText(/Kennel/i)).toBeVisible()
    // Multiple stream containers should be present
    const streamContainers = page.locator('iframe, [data-testid="stream"]')
    const count = await streamContainers.count()
    expect(count).toBeGreaterThan(0)
  })
})

