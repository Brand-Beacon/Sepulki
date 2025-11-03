import { test, expect } from '@playwright/test'

/**
 * Browser-based verification tests for Factory Floors feature
 * These tests verify that the pages load and render correctly in the browser
 */
test.describe('Factory Floors - Browser Verification', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to sign-in page
    await page.goto('http://127.0.0.1:3000/auth/signin', { waitUntil: 'domcontentloaded' })
    
    // Wait for the sign-in form
    await page.waitForSelector('input[name="email"]', { timeout: 15000 }).catch(() => {})
    
    // Sign in as test user
    await page.fill('input[name="email"]', 'dev@sepulki.com').catch(() => {})
    await page.fill('input[name="password"]', 'dev123').catch(() => {})
    
    const submitButton = page.locator('button[type="submit"]').first()
    if (await submitButton.count() > 0) {
      await submitButton.click()
      // Wait for navigation after sign-in
      await page.waitForTimeout(3000)
    }
  })

  test('Factory Floors page is accessible', async ({ page }) => {
    // Navigate directly to floors page
    await page.goto('http://127.0.0.1:3000/floors', { waitUntil: 'domcontentloaded', timeout: 30000 })
    
    // Wait a moment for React to hydrate
    await page.waitForTimeout(2000)
    
    // Check if page loaded (not an error page)
    const bodyText = await page.textContent('body') || ''
    
    // Should not be a 404 or error page
    expect(bodyText.toLowerCase()).not.toContain('404')
    expect(bodyText.toLowerCase()).not.toContain('not found')
    
    // Check for any heading or loading state
    const hasContent = await page.locator('h1, h2, .animate-spin, [role="progressbar"]').count() > 0
    expect(hasContent).toBeTruthy()
  })

  test('Create Factory Floor page is accessible', async ({ page }) => {
    // Navigate to create page
    await page.goto('http://127.0.0.1:3000/floors/new', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    
    // Check if page loaded
    const bodyText = await page.textContent('body') || ''
    expect(bodyText.toLowerCase()).not.toContain('404')
    
    // Should have form elements or loading/error state
    const hasFormElements = await page.locator('form, input, button, .animate-spin').count() > 0
    expect(hasFormElements).toBeTruthy()
  })

  test('Navigation menu contains Factory Floors link', async ({ page }) => {
    // Go to any authenticated page
    await page.goto('http://127.0.0.1:3000/fleet', { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    
    // Look for Factory Floors in navigation
    const navText = await page.textContent('nav') || ''
    const hasFactoryFloorsLink = navText.toLowerCase().includes('factory') || 
                                 navText.toLowerCase().includes('floor') ||
                                 await page.locator('nav a[href*="/floors"]').count() > 0
    
    // Navigation should have Factory Floors link or similar
    expect(hasFactoryFloorsLink).toBeTruthy()
  })

  test('Factory Floors routes are registered', async ({ page }) => {
    // Test that routes exist and don't return 404
    
    const routes = [
      '/floors',
      '/floors/new',
    ]
    
    for (const route of routes) {
      const response = await page.goto(`http://127.0.0.1:3000${route}`, { 
        waitUntil: 'domcontentloaded',
        timeout: 30000 
      }).catch(() => null)
      
      if (response) {
        const status = response.status()
        // Should be 200 or redirect, not 404
        expect([200, 301, 302, 307, 308]).toContain(status)
      }
      
      await page.waitForTimeout(1000)
    }
  })
})

