import { defineConfig, devices } from '@playwright/test';

// Locally this starts the API and web app and reseeds the database (see global-setup.ts).
// Set BASE_URL to run against an already deployed app instead.
const local = !process.env.BASE_URL;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  globalSetup: local ? './global-setup.ts' : undefined,
  use: {
    baseURL: process.env.BASE_URL ?? 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: local
    ? [
        {
          command: 'pnpm --filter api dev',
          url: 'http://localhost:3000/api/v1/health',
          reuseExistingServer: !process.env.CI,
        },
        {
          command: 'pnpm --filter web dev',
          url: 'http://localhost:5173',
          reuseExistingServer: !process.env.CI,
        },
      ]
    : undefined,
});
