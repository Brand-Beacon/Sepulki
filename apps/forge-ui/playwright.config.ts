import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: process.env.TEST_DIR || './tests',
  timeout: 60_000, // Increased for demo mode
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    video: process.env.RECORD_DEMO === 'true' ? 'on' : 'retain-on-failure',
    screenshot: 'only-on-failure',
    // Slow down actions for demo visibility
    ...(process.env.DEMO_MODE === 'true' && {
      actionTimeout: 10_000,
    }),
  },
  projects: [
    { 
      name: 'Chromium', 
      use: { 
        ...devices['Desktop Chrome'],
        // Full HD for demo recordings
        viewport: { width: 1920, height: 1080 },
      } 
    },
  ],
  // Reporter for demo mode
  reporter: process.env.DEMO_MODE === 'true' 
    ? [['list'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'on-failure' }]],
})


