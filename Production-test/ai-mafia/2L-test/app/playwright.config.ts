import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',

  // Timeouts
  timeout: 600000, // 10 minutes per test (for slow full-game tests)
  expect: {
    timeout: 30000, // 30s for assertions (wait for elements)
  },

  // Parallelization
  fullyParallel: true,
  workers: process.env.CI ? 2 : 3, // 2 workers in CI, 3 locally

  // Retries
  retries: process.env.CI ? 2 : 0, // Retry flaky tests in CI only

  // Reporter
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list'], // Console output
  ],

  // Web server (auto-start dev server)
  webServer: {
    command: 'npm run dev',
    port: 3000,
    timeout: 120000,
    reuseExistingServer: !process.env.CI, // Reuse local dev server
  },

  // Global settings
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure', // Capture trace on failure
    screenshot: 'only-on-failure', // Screenshot on failure
    video: 'retain-on-failure', // Video on failure
    viewport: { width: 1920, height: 1080 }, // Desktop viewport
  },

  // Browser projects
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // Add Firefox/Safari later if needed
  ],
});
