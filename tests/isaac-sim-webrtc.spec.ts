import { test, expect } from '@playwright/test';

test.describe('Isaac Sim WebRTC Integration', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the configure page
    await page.goto('http://localhost:3000/configure');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');
  });

  test('should display Isaac Sim WebRTC client when available', async ({ page }) => {
    // Check if Isaac Sim display component is present
    const isaacSimDisplay = page.locator('[data-testid="isaac-sim-display"]');
    await expect(isaacSimDisplay).toBeVisible({ timeout: 10000 });

    // Check for Isaac Sim branding
    const branding = page.locator('text=Powered by NVIDIA Isaac Sim');
    await expect(branding).toBeVisible();

    // Check for status HUD
    const statusHUD = page.locator('text=NVIDIA Isaac Sim');
    await expect(statusHUD).toBeVisible();
  });

  test('should show loading state when initializing Isaac Sim session', async ({ page }) => {
    // Check for loading spinner
    const loadingSpinner = page.locator('.animate-spin');
    await expect(loadingSpinner).toBeVisible();

    // Check for loading text
    const loadingText = page.locator('text=Initializing Isaac Sim');
    await expect(loadingText).toBeVisible();
  });

  test('should display error state when Isaac Sim service is unavailable', async ({ page }) => {
    // Mock the GraphQL endpoint to return an error
    await page.route('/api/graphql', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [{ message: 'Isaac Sim service unavailable' }]
        })
      });
    });

    // Reload the page to trigger the error
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check for error state
    const errorMessage = page.locator('text=Isaac Sim Service Offline');
    await expect(errorMessage).toBeVisible();

    const retryButton = page.locator('button:has-text("Retry Connection")');
    await expect(retryButton).toBeVisible();
  });

  test('should create Isaac Sim session successfully', async ({ page }) => {
    // Mock successful GraphQL response
    await page.route('/api/graphql', async route => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || '{}');
      
      if (postData.query?.includes('createIsaacSimSession')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              createIsaacSimSession: {
                sessionId: 'test-session-123',
                webrtcUrl: 'http://localhost:8211/streaming/webrtc-client?server=localhost',
                status: 'ready',
                robotName: 'Test Robot',
                awsPublicIp: 'localhost',
                robotLoaded: true
              }
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    // Reload to trigger session creation
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check for iframe with WebRTC client
    const iframe = page.locator('iframe[title="Isaac Sim WebRTC Stream"]');
    await expect(iframe).toBeVisible();

    // Check iframe src
    const iframeSrc = await iframe.getAttribute('src');
    expect(iframeSrc).toContain('streaming/webrtc-client');
  });

  test('should display session information in HUD', async ({ page }) => {
    // Mock successful session creation
    await page.route('/api/graphql', async route => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || '{}');
      
      if (postData.query?.includes('createIsaacSimSession')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              createIsaacSimSession: {
                sessionId: 'test-session-456',
                webrtcUrl: 'http://localhost:8211/streaming/webrtc-client?server=localhost',
                status: 'ready',
                robotName: 'Demo Robot',
                awsPublicIp: 'localhost',
                robotLoaded: true
              }
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check session information in HUD
    const robotName = page.locator('text=Demo Robot');
    await expect(robotName).toBeVisible();

    const sessionId = page.locator('text=test-session-456').first();
    await expect(sessionId).toBeVisible();

    const status = page.locator('text=✅ Connected');
    await expect(status).toBeVisible();
  });

  test('should handle fullscreen toggle', async ({ page }) => {
    // Wait for Isaac Sim display to be ready
    const isaacSimDisplay = page.locator('[data-testid="isaac-sim-display"]');
    await expect(isaacSimDisplay).toBeVisible();

    // Click fullscreen button
    const fullscreenButton = page.locator('button[title*="fullscreen"]');
    await fullscreenButton.click();

    // Check if fullscreen class is applied
    await expect(isaacSimDisplay).toHaveClass(/fixed inset-0 z-50/);
  });

  test('should open WebRTC client in new window', async ({ page }) => {
    // Mock successful session creation
    await page.route('/api/graphql', async route => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || '{}');
      
      if (postData.query?.includes('createIsaacSimSession')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              createIsaacSimSession: {
                sessionId: 'test-session-789',
                webrtcUrl: 'http://localhost:8211/streaming/webrtc-client?server=localhost',
                status: 'ready',
                robotName: 'Test Robot',
                awsPublicIp: 'localhost',
                robotLoaded: true
              }
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Set up new page promise for popup
    const [popup] = await Promise.all([
      page.waitForEvent('popup'),
      page.click('button[title="Open in new window"]')
    ]);

    // Check popup URL
    await popup.waitForLoadState();
    const popupUrl = popup.url();
    expect(popupUrl).toContain('streaming/webrtc-client');
  });

  test('should toggle controls visibility', async ({ page }) => {
    // Wait for Isaac Sim display to be ready
    const isaacSimDisplay = page.locator('[data-testid="isaac-sim-display"]');
    await expect(isaacSimDisplay).toBeVisible();

    // Check that controls are visible by default
    const statusHUD = page.locator('text=NVIDIA Isaac Sim');
    await expect(statusHUD).toBeVisible();

    // Click toggle controls button
    const toggleButton = page.locator('button[title="Toggle controls"]');
    await toggleButton.click();

    // Check that controls are hidden
    await expect(statusHUD).not.toBeVisible();

    // Click again to show controls
    await toggleButton.click();
    await expect(statusHUD).toBeVisible();
  });

  test('should handle joint control updates', async ({ page }) => {
    // Mock successful session creation and joint update
    await page.route('/api/graphql', async route => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || '{}');
      
      if (postData.query?.includes('createIsaacSimSession')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              createIsaacSimSession: {
                sessionId: 'test-session-joints',
                webrtcUrl: 'http://localhost:8211/streaming/webrtc-client?server=localhost',
                status: 'ready',
                robotName: 'Joint Test Robot',
                awsPublicIp: 'localhost',
                robotLoaded: true
              }
            }
          })
        });
      } else if (postData.query?.includes('updateIsaacSimJoints')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              updateIsaacSimJoints: true
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check that joint control function exists (this would be called programmatically)
    const jointControlFunction = await page.evaluate(() => {
      return typeof window.handleJointChange === 'function';
    });
    expect(jointControlFunction).toBe(true);
  });

  test('should cleanup session on component unmount', async ({ page }) => {
    // Mock session creation and destruction
    let sessionCreated = false;
    let sessionDestroyed = false;

    await page.route('/api/graphql', async route => {
      const request = route.request();
      const postData = JSON.parse(request.postData() || '{}');
      
      if (postData.query?.includes('createIsaacSimSession')) {
        sessionCreated = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              createIsaacSimSession: {
                sessionId: 'cleanup-test-session',
                webrtcUrl: 'http://localhost:8211/streaming/webrtc-client?server=localhost',
                status: 'ready',
                robotName: 'Cleanup Test Robot',
                awsPublicIp: 'localhost',
                robotLoaded: true
              }
            }
          })
        });
      } else if (postData.query?.includes('destroyIsaacSimSession')) {
        sessionDestroyed = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              destroyIsaacSimSession: true
            }
          })
        });
      } else {
        await route.continue();
      }
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify session was created
    expect(sessionCreated).toBe(true);

    // Navigate away to trigger cleanup
    await page.goto('/');

    // Wait a bit for cleanup to happen
    await page.waitForTimeout(1000);

    // Verify session was destroyed
    expect(sessionDestroyed).toBe(true);
  });

  test('should display proper error messages for different failure scenarios', async ({ page }) => {
    // Test network error
    await page.route('/api/graphql', async route => {
      await route.abort('failed');
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check for error state
    const errorMessage = page.locator('text=Isaac Sim Service Offline');
    await expect(errorMessage).toBeVisible();

    // Test GraphQL error
    await page.route('/api/graphql', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          errors: [{ message: 'AWS Isaac Sim instance not available' }]
        })
      });
    });

    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check for specific error message
    const specificError = page.locator('text=AWS Isaac Sim instance not available');
    await expect(specificError).toBeVisible();
  });
});
