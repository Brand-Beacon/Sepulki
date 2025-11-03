import { test, expect } from '@playwright/test'

/**
 * Manual browser testing for Factory Floors feature
 * Tests all pages and functionality in the browser
 */
test.describe('Factory Floors - Manual Browser Testing', () => {
  
  test('Test with dev user - Full factory floors workflow', async ({ page }) => {
    // Sign in as dev user
    await page.goto('http://127.0.0.1:3000/auth/signin', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('input[name="email"]', { timeout: 10000 })
    await page.fill('input[name="email"]', 'dev@sepulki.com')
    await page.fill('input[name="password"]', 'dev123')
    await page.click('button[type="submit"]')
    
    // Wait for navigation after sign-in
    await page.waitForTimeout(3000)
    
    // Navigate to factory floors
    await page.goto('http://127.0.0.1:3000/floors', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    
    // Take screenshot of floors page
    await page.screenshot({ path: 'test-results/floors-list-dev.png', fullPage: true })
    
    // Check page loaded
    const bodyText = await page.textContent('body') || ''
    console.log('Page body contains:', bodyText.substring(0, 200))
    
    // Look for Factory Floors heading or any content
    const h1Elements = await page.locator('h1').count()
    console.log('Found h1 elements:', h1Elements)
    
    if (h1Elements > 0) {
      const h1Text = await page.locator('h1').first().textContent()
      console.log('H1 text:', h1Text)
    }
    
    // Check for errors
    const errorElements = await page.locator('.bg-red-50, .text-red-800, [class*="error"]').count()
    if (errorElements > 0) {
      const errorText = await page.locator('.bg-red-50, .text-red-800').first().textContent()
      console.log('ERROR FOUND:', errorText)
    }
    
    // Navigate to create page
    const createButton = page.locator('text=+ Create Floor, a[href*="/floors/new"]').first()
    const hasCreateButton = await createButton.count() > 0
    
    if (hasCreateButton) {
      await createButton.click()
      await page.waitForTimeout(2000)
      await page.screenshot({ path: 'test-results/floors-create-dev.png', fullPage: true })
    } else {
      // Navigate directly
      await page.goto('http://127.0.0.1:3000/floors/new')
      await page.waitForTimeout(2000)
      await page.screenshot({ path: 'test-results/floors-create-dev.png', fullPage: true })
    }
    
    // Verify create form elements
    const formExists = await page.locator('form').count() > 0
    console.log('Create form exists:', formExists)
    
    if (formExists) {
      const nameInput = page.locator('input[name="name"], input[type="text"]').first()
      const nameInputCount = await nameInput.count()
      console.log('Name input exists:', nameInputCount > 0)
    }
  })

  test('Test with admin user - Check fleet loading issue', async ({ page }) => {
    // Sign in as admin user
    await page.goto('http://127.0.0.1:3000/auth/signin', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('input[name="email"]', { timeout: 10000 })
    await page.fill('input[name="email"]', 'admin@sepulki.com')
    await page.fill('input[name="password"]', 'admin123')
    await page.click('button[type="submit"]')
    
    // Wait for navigation after sign-in
    await page.waitForTimeout(3000)
    
    // Test fleet page (where the issue is)
    await page.goto('http://127.0.0.1:3000/fleet', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/fleet-admin.png', fullPage: true })
    
    // Check for errors
    const errorElements = page.locator('.bg-red-50, .text-red-800, [class*="error"]')
    const errorCount = await errorElements.count()
    
    if (errorCount > 0) {
      const errorText = await errorElements.first().textContent()
      console.log('ADMIN USER FLEET ERROR:', errorText)
      
      // Check console for errors
      const logs: string[] = []
      page.on('console', msg => logs.push(`${msg.type()}: ${msg.text()}`))
      await page.waitForTimeout(1000)
      
      console.log('Console logs:', logs)
    }
    
    // Check network requests
    const networkErrors = await page.evaluate(() => {
      return (window as any).__networkErrors || []
    })
    console.log('Network errors:', networkErrors)
    
    // Now test factory floors with admin
    await page.goto('http://127.0.0.1:3000/floors', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(3000)
    await page.screenshot({ path: 'test-results/floors-list-admin.png', fullPage: true })
    
    // Check for errors on floors page
    const floorsErrorCount = await page.locator('.bg-red-50, .text-red-800').count()
    if (floorsErrorCount > 0) {
      const floorsErrorText = await page.locator('.bg-red-50, .text-red-800').first().textContent()
      console.log('ADMIN USER FLOORS ERROR:', floorsErrorText)
    }
  })

  test('Test navigation menu - Factory Floors link', async ({ page }) => {
    // Sign in
    await page.goto('http://127.0.0.1:3000/auth/signin', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('input[name="email"]', { timeout: 10000 })
    await page.fill('input[name="email"]', 'dev@sepulki.com')
    await page.fill('input[name="password"]', 'dev123')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)
    
    // Go to any page
    await page.goto('http://127.0.0.1:3000/fleet', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    
    // Look for Factory Floors in navigation
    const navText = await page.textContent('nav') || ''
    console.log('Navigation text:', navText.substring(0, 200))
    
    const factoryFloorsLink = page.locator('nav a:has-text("Factory Floors"), nav a[href*="/floors"]')
    const linkCount = await factoryFloorsLink.count()
    console.log('Factory Floors links found:', linkCount)
    
    if (linkCount > 0) {
      await factoryFloorsLink.first().click()
      await page.waitForTimeout(2000)
      const url = page.url()
      console.log('Navigated to:', url)
      expect(url).toContain('/floors')
    } else {
      console.log('Factory Floors link not found in navigation')
    }
  })

  test('Test all factory floor routes are accessible', async ({ page }) => {
    // Sign in
    await page.goto('http://127.0.0.1:3000/auth/signin', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('input[name="email"]', { timeout: 10000 })
    await page.fill('input[name="email"]', 'dev@sepulki.com')
    await page.fill('input[name="password"]', 'dev123')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)
    
    const routes = [
      { path: '/floors', name: 'Floors List' },
      { path: '/floors/new', name: 'Create Floor' },
    ]
    
    for (const route of routes) {
      console.log(`Testing route: ${route.name} (${route.path})`)
      
      const response = await page.goto(`http://127.0.0.1:3000${route.path}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30000
      })
      
      if (response) {
        const status = response.status()
        console.log(`  Status: ${status}`)
        
        await page.waitForTimeout(2000)
        
        // Check for errors
        const errorCount = await page.locator('.bg-red-50, .text-red-800, [class*="error"]').count()
        if (errorCount > 0) {
          const errorText = await page.locator('.bg-red-50, .text-red-800').first().textContent()
          console.log(`  ERROR: ${errorText}`)
        }
        
        // Take screenshot
        await page.screenshot({ 
          path: `test-results/${route.path.replace(/\//g, '-')}-test.png`,
          fullPage: true 
        })
      }
    }
  })
})

