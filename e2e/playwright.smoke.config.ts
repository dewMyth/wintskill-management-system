import { defineConfig, devices } from '@playwright/test';

/** Smoke tests against a deployed URL: no servers started, no seeding. */
if (!process.env.BASE_URL)
  throw new Error(
    'Set BASE_URL to the deployed app, e.g. https://….up.railway.app',
  );

export default defineConfig({
  testDir: './smoke',
  reporter: 'list',
  use: { baseURL: process.env.BASE_URL, trace: 'retain-on-failure' },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
});
