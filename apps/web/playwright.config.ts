import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: 1,
  reporter: 'html',

  use: {
    baseURL: process.env['WEB_BASE_URL'] ?? 'http://localhost:3001',
    trace: 'on-first-retry',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  // Start both API and web servers before tests run.
  // In CI, set WEB_SKIP_WEBSERVER=1 and start them yourself.
  webServer: process.env['WEB_SKIP_WEBSERVER']
    ? undefined
    : [
        {
          command: 'pnpm --filter @wa-kijo/api dev',
          url: process.env['NEXT_PUBLIC_API_BASE_URL'] ?? 'http://localhost:3000',
          reuseExistingServer: true,
          timeout: 60_000,
        },
        {
          command: 'pnpm --filter @wa-kijo/web dev',
          url: process.env['WEB_BASE_URL'] ?? 'http://localhost:3001',
          reuseExistingServer: true,
          timeout: 60_000,
        },
      ],
});
