import { test, expect } from '@playwright/test'

/**
 * Manual verification tests for Factory Floors feature
 * Tests actual functionality in the browser
 */
test.describe('Factory Floors - Manual Verification', () => {
  
  test('Verify factory floors pages load correctly', async ({ page }) => {
    console.log('=== Testing Factory Floors Pages ===\n')
    
    // Navigate to sign-in
    await page.goto('http://127.0.0.1:3000/auth/signin', { waitUntil: 'networkidle', timeout: 30000 })
    
    // Wait for page to fully load
    await page.waitForTimeout(2000)
    
    // Check if sign-in form exists (it might be in Next.js client component)
    const emailInput = page.locator('input[type="email"], input[name="email"], input[id="email"]').first()
    const hasEmailInput = await emailInput.count()
    
    console.log('Sign-in page loaded, email input found:', hasEmailInput > 0)
    
    if (hasEmailInput > 0) {
      // Sign in as dev user
      await emailInput.fill('dev@sepulki.com')
      await page.fill('input[type="password"], input[name="password"], input[id="password"]', 'dev123')
      
      const submitButton = page.locator('button[type="submit"], button:has-text("Sign In")').first()
      await submitButton.click()
      
      // Wait for redirect after sign-in
      await page.waitForTimeout(5000)
      
      console.log('After sign-in, URL:', page.url())
    } else {
      console.log('Already signed in or sign-in form not found, proceeding...')
    }
    
    // Test Factory Floors List Page
    console.log('\n--- Testing /floors page ---')
    await page.goto('http://127.0.0.1:3000/floors', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)
    
    const bodyText = await page.textContent('body') || ''
    console.log('Page body preview:', bodyText.substring(0, 300))
    
    // Check for errors
    const errorElements = page.locator('.bg-red-50, .text-red-800, [class*="error"]')
    const errorCount = await errorElements.count()
    
    if (errorCount > 0) {
      const errorText = await errorElements.first().textContent()
      console.log('❌ ERROR FOUND:', errorText)
    } else {
      console.log('✅ No errors found on floors page')
    }
    
    // Check for heading
    const h1Elements = await page.locator('h1').count()
    console.log('H1 elements found:', h1Elements)
    
    if (h1Elements > 0) {
      const h1Text = await page.locator('h1').first().textContent()
      console.log('H1 text:', h1Text)
    }
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/floors-list-verify.png', fullPage: true })
    console.log('✅ Screenshot saved: test-results/floors-list-verify.png')
    
    // Test Create Factory Floor Page
    console.log('\n--- Testing /floors/new page ---')
    await page.goto('http://127.0.0.1:3000/floors/new', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)
    
    const createPageErrors = await page.locator('.bg-red-50, .text-red-800').count()
    if (createPageErrors > 0) {
      const createErrorText = await page.locator('.bg-red-50, .text-red-800').first().textContent()
      console.log('❌ ERROR on create page:', createErrorText)
    } else {
      console.log('✅ No errors found on create page')
    }
    
    // Check for form elements
    const formExists = await page.locator('form').count() > 0
    const nameInputExists = await page.locator('input[name="name"], input[type="text"]').first().count() > 0
    const fileInputExists = await page.locator('input[type="file"]').count() > 0
    
    console.log('Form elements found:')
    console.log('  - Form:', formExists)
    console.log('  - Name input:', nameInputExists)
    console.log('  - File input:', fileInputExists)
    
    await page.screenshot({ path: 'test-results/floors-create-verify.png', fullPage: true })
    console.log('✅ Screenshot saved: test-results/floors-create-verify.png')
  })

  test('Verify admin user can access fleets', async ({ page }) => {
    console.log('\n=== Testing Admin User Fleet Access ===\n')
    
    // Navigate to sign-in
    await page.goto('http://127.0.0.1:3000/auth/signin', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)
    
    // Sign in as admin
    const emailInput = page.locator('input[type="email"], input[name="email"]').first()
    const hasEmailInput = await emailInput.count()
    
    if (hasEmailInput > 0) {
      await emailInput.fill('admin@sepulki.com')
      await page.fill('input[type="password"], input[name="password"]', 'admin123')
      
      const submitButton = page.locator('button[type="submit"]').first()
      await submitButton.click()
      
      await page.waitForTimeout(5000)
      console.log('Admin sign-in completed, URL:', page.url())
    }
    
    // Test Fleet Page (where the issue was)
    console.log('\n--- Testing /fleet page with admin ---')
    await page.goto('http://127.0.0.1:3000/fleet', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)
    
    // Check for errors
    const errorElements = page.locator('.bg-red-50, .text-red-800, [class*="error"]')
    const errorCount = await errorElements.count()
    
    if (errorCount > 0) {
      const errorText = await errorElements.first().textContent()
      console.log('❌ ADMIN FLEET ERROR:', errorText)
      
      // Check console logs
      const logs: string[] = []
      page.on('console', msg => {
        if (msg.type() === 'error') {
          logs.push(`ERROR: ${msg.text()}`)
        }
      })
      await page.waitForTimeout(2000)
      console.log('Console errors:', logs)
    } else {
      console.log('✅ No errors found on fleet page with admin user')
    }
    
    await page.screenshot({ path: 'test-results/fleet-admin-verify.png', fullPage: true })
    console.log('✅ Screenshot saved: test-results/fleet-admin-verify.png')
    
    // Test Factory Floors with admin
    console.log('\n--- Testing /floors page with admin ---')
    await page.goto('http://127.0.0.1:3000/floors', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(3000)
    
    const floorsErrorCount = await page.locator('.bg-red-50, .text-red-800').count()
    if (floorsErrorCount > 0) {
      const floorsErrorText = await page.locator('.bg-red-50, .text-red-800').first().textContent()
      console.log('❌ ADMIN FLOORS ERROR:', floorsErrorText)
    } else {
      console.log('✅ No errors found on floors page with admin user')
    }
    
    await page.screenshot({ path: 'test-results/floors-admin-verify.png', fullPage: true })
    console.log('✅ Screenshot saved: test-results/floors-admin-verify.png')
  })

  test('Verify navigation menu includes Factory Floors', async ({ page }) => {
    console.log('\n=== Testing Navigation Menu ===\n')
    
    // Sign in
    await page.goto('http://127.0.0.1:3000/auth/signin', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)
    
    const emailInput = page.locator('input[type="email"], input[name="email"]').first()
    if (await emailInput.count() > 0) {
      await emailInput.fill('dev@sepulki.com')
      await page.fill('input[type="password"], input[name="password"]', 'dev123')
      await page.locator('button[type="submit"]').first().click()
      await page.waitForTimeout(5000)
    }
    
    // Navigate to any page
    await page.goto('http://127.0.0.1:3000/fleet', { waitUntil: 'networkidle', timeout: 30000 })
    await page.waitForTimeout(2000)
    
    // Look for navigation menu
    const navText = await page.textContent('nav') || ''
    console.log('Navigation menu text:', navText.substring(0, 300))
    
    // Look for Factory Floors link
    const factoryFloorsLink = page.locator('nav a:has-text("Factory Floors"), nav a[href*="/floors"]')
    const linkCount = await factoryFloorsLink.count()
    console.log('Factory Floors links in navigation:', linkCount)
    
    if (linkCount > 0) {
      const linkText = await factoryFloorsLink.first().textContent()
      console.log('✅ Found Factory Floors link:', linkText)
      
      // Click the link
      await factoryFloorsLink.first().click()
      await page.waitForTimeout(3000)
      
      const url = page.url()
      console.log('Navigated to:', url)
      expect(url).toContain('/floors')
    } else {
      console.log('⚠️ Factory Floors link not found in navigation (may be permission-based)')
    }
  })
})

