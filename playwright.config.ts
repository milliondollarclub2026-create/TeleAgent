import { defineConfig, devices } from '@playwright/test';

/**
 * LeadRelay E2E Test Configuration
 *
 * Tests cover:
 * - CRM sync verification
 * - Lead scoring and classification
 * - Contact collection flows
 * - Product integrity (anti-hallucination)
 * - UI filters and navigation
 */
export default defineConfig({
  testDir: './e2e/tests',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use */
  reporter: [
    ['html', { outputFolder: 'e2e/reports' }],
    ['list']
  ],

  /* Shared settings for all the projects below */
  use: {
    /* Base URL for the frontend */
    baseURL: process.env.FRONTEND_URL || 'http://localhost:3000',

    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on first retry */
    video: 'on-first-retry',
  },

  /* Configure projects for different browsers */
  projects: [
    /* Setup project for authentication */
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },

    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
      dependencies: ['setup'],
    },
  ],

  /* Run local dev server before starting the tests */
  webServer: [
    {
      command: 'cd frontend && npm start',
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
    {
      command: 'cd backend && python server.py',
      url: 'http://localhost:8000/health',
      reuseExistingServer: !process.env.CI,
      timeout: 120000,
    },
  ],
});
