import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for E2E tests
 * Tests the full frontend + backend integration
 */
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false, // Run tests sequentially to avoid DB conflicts
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: 'html',
  timeout: 30000,

  use: {
    baseURL: 'http://localhost:3001', // Next.js frontend
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run both backend and frontend before starting tests */
  webServer: [
    {
      command: 'npm run dev',
      port: 3000,
      reuseExistingServer: !process.env.CI,
      cwd: '.', // Backend
      env: {
        DATABASE_URL: process.env.TEST_DATABASE_URL || 'postgresql://reservo:reservo@localhost:5433/reservo_test',
      },
    },
    {
      command: 'npm run dev',
      port: 3001,
      reuseExistingServer: !process.env.CI,
      cwd: './web', // Frontend
      env: {
        NEXT_PUBLIC_API_URL: 'http://localhost:3000/api/v1',
      },
    },
  ],
});
