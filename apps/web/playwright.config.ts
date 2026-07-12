import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:3001';
const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;

if (!e2eDatabaseUrl) {
  throw new Error(
    'E2E_DATABASE_URL is required and must target a dedicated test database.',
  );
}

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  reporter: 'list',
  retries: process.env.CI ? 2 : 0,
  timeout: 30_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'bun run build && bun run start',
    env: {
      DATABASE_URL: e2eDatabaseUrl,
      NEXT_PUBLIC_WEB_URL: baseURL,
      WEB_URL: baseURL,
    },
    reuseExistingServer: false,
    timeout: 180_000,
    url: baseURL,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
