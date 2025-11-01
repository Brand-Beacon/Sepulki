import { test, expect } from '@playwright/test';

test.describe('WebSocket Stream Verification', () => {
  const isaacSimIP = '54.82.56.4';
  
  test('verify custom WebSocket client loads and connects', async ({ page }) => {
    console.log('🧪 Testing custom WebSocket client...');
    console.log(`📡 Isaac Sim IP: ${isaacSimIP}`);
    
    // Load custom WebSocket client
    await page.goto(`http://localhost:8889/websocket-client?server=${isaacSimIP}`);
    
    // Wait for page to load
    await page.waitForLoadState('load');
    
    console.log('✅ WebSocket client page loaded');
    
    // Check for canvas element
    const canvas = page.locator('#canvas');
    await expect(canvas).toBeVisible({ timeout: 5000 });
    
    console.log('✅ Canvas element visible');
    
    // Check initial status
    const statusText = await page.locator('#statusText').textContent();
    console.log(`📊 Initial status: ${statusText}`);
    
    // Wait for connection
    await page.waitForTimeout(5000);
    
    // Check status after connection attempt
    const status2 = await page.locator('#statusText').textContent();
    console.log(`📊 Status after 5s: ${status2}`);
    
    // Take screenshot
    await page.screenshot({
      path: 'test-results/websocket-client-initial.png',
      fullPage: true
    });
    
    console.log('📸 Screenshot saved: websocket-client-initial.png');
    
    // Wait longer for stream to start
    await page.waitForTimeout(10000);
    
    // Check frame count
    const frameCount = await page.locator('#frameCount').textContent();
    const fps = await page.locator('#fps').textContent();
    
    console.log(`📊 Frame count: ${frameCount}`);
    console.log(`📊 FPS: ${fps}`);
    
    // Take final screenshot
    await page.screenshot({
      path: 'test-results/websocket-client-streaming.png',
      fullPage: true
    });
    
    console.log('📸 Screenshot saved: websocket-client-streaming.png');
    
    // Check if frames are being received
    const frames = parseInt(frameCount || '0');
    if (frames > 0) {
      console.log(`✅ SUCCESS! Receiving stream (${frames} frames)`);
    } else {
      console.log(`⚠️ No frames received yet - checking console for errors...`);
      
      // Get console logs
      const logs = await page.evaluate(() => {
        return (window as any).consoleLog || [];
      });
      console.log('Browser console:', logs);
    }
  });
  
  test('verify WebSocket connection to Isaac Sim', async ({ page }) => {
    console.log('🔌 Testing direct WebSocket connection...');
    
    await page.goto(`http://localhost:8889/websocket-client?server=${isaacSimIP}`);
    await page.waitForLoadState('load');
    
    // Monitor console logs
    const consoleLogs: string[] = [];
    page.on('console', msg => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    // Wait for connection
    await page.waitForTimeout(15000);
    
    // Print all console logs
    console.log('\n📋 Browser Console Logs:');
    consoleLogs.forEach(log => console.log(`  ${log}`));
    
    // Check status
    const statusText = await page.locator('#statusText').textContent();
    console.log(`\n📊 Final status: ${statusText}`);
    
    // Check if connected
    const isConnected = statusText?.includes('Connected');
    const hasError = statusText?.includes('error') || statusText?.includes('Error');
    
    if (isConnected) {
      console.log('✅ WebSocket connected successfully!');
    } else if (hasError) {
      console.log('❌ Connection error detected');
    } else {
      console.log('⚠️ Connection state unclear');
    }
    
    await page.screenshot({
      path: 'test-results/websocket-console-debug.png',
      fullPage: true
    });
  });
  
  test('stress test - wait for actual stream data', async ({ page }) => {
    console.log('⏱️ Extended wait test for stream data...');
    
    await page.goto(`http://localhost:8889/websocket-client?server=${isaacSimIP}`);
    await page.waitForLoadState('load');
    
    console.log('Waiting up to 30 seconds for stream...');
    
    // Check every 5 seconds
    for (let i = 0; i < 6; i++) {
      await page.waitForTimeout(5000);
      
      const frameCount = await page.locator('#frameCount').textContent();
      const statusText = await page.locator('#statusText').textContent();
      const fps = await page.locator('#fps').textContent();
      
      console.log(`[${(i+1)*5}s] Frames: ${frameCount}, FPS: ${fps}, Status: ${statusText}`);
      
      if (parseInt(frameCount || '0') > 0) {
        console.log(`✅ Stream working! ${frameCount} frames received`);
        await page.screenshot({
          path: 'test-results/websocket-stream-success.png',
          fullPage: true
        });
        return;
      }
    }
    
    console.log('⚠️ No frames received after 30 seconds');
    
    await page.screenshot({
      path: 'test-results/websocket-stream-timeout.png',
      fullPage: true
    });
  });
});





