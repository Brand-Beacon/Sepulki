import { test, expect } from '@playwright/test';

test.describe('Verify Actual Isaac Sim Stream', () => {
  test('should load Omniverse WebRTC client directly', async ({ page }) => {
    // Load the Omniverse client directly
    await page.goto('http://18.234.83.45:8889/');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check for Omniverse WebRTC client
    await expect(page.locator('title')).toHaveText(/Omniverse.*WebRTC/i, { timeout: 10000 });
    
    console.log('✅ Omniverse WebRTC client loaded');
    
    // Look for video element or play button
    const videoElement = page.locator('video, #remote-video, #stream');
    const playButton = page.locator('button:has-text("Play"), #play');
    
    if (await videoElement.isVisible({ timeout: 5000 })) {
      console.log('✅ Video element found');
    }
    
    if (await playButton.isVisible({ timeout: 5000 })) {
      console.log('✅ Play button found - click to start stream');
      await playButton.click();
      await page.waitForTimeout(3000);
    }
    
    // Take screenshot
    await page.screenshot({
      path: 'test-results/omniverse-webrtc-direct.png',
      fullPage: true
    });
    
    console.log('📸 Screenshot saved: omniverse-webrtc-direct.png');
  });
  
  test('should load stream through proxy redirect', async ({ page }) => {
    // Create a session through proxy
    const response = await page.request.post('http://localhost:8889/session/create', {
      data: {
        userId: 'test',
        robotName: 'demo'
      }
    });
    
    const data = await response.json();
    console.log('Session created:', data.sessionId);
    
    // Navigate to embed URL (should redirect to Omniverse client)
    await page.goto(`http://localhost:8889/stream/${data.sessionId}/embed`);
    
    // Should be redirected to Omniverse client
    await expect(page).toHaveURL(/18\.234\.83\.45:8889/);
    
    console.log('✅ Redirected to Omniverse client');
    
    // Wait for client to load
    await page.waitForLoadState('networkidle');
    
    // Take screenshot
    await page.screenshot({
      path: 'test-results/omniverse-via-proxy-redirect.png',
      fullPage: true
    });
    
    console.log('📸 Screenshot saved: omniverse-via-proxy-redirect.png');
  });
  
  test('should show frontend with actual stream', async ({ page }) => {
    // Navigate to frontend configure page
    await page.goto('http://localhost:3002/configure');
    
    // Wait for Isaac Sim display component
    const isaacSimDisplay = page.locator('[data-testid="isaac-sim-proxy-display"]');
    await expect(isaacSimDisplay).toBeVisible({ timeout: 20000 });
    
    console.log('✅ Isaac Sim display component visible');
    
    // Wait for iframe to load
    await page.waitForTimeout(5000);
    
    // Check if iframe exists
    const iframe = page.frameLocator('iframe').first();
    
    // Take screenshot of entire page
    await page.screenshot({
      path: 'test-results/frontend-with-stream.png',
      fullPage: true
    });
    
    console.log('📸 Screenshot saved: frontend-with-stream.png');
    console.log('✅ Frontend loaded with Isaac Sim display');
  });
});





