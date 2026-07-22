import { randomBytes } from 'node:crypto';

import { defineConfig, devices } from '@playwright/test';

const baseURL = 'http://127.0.0.1:3001';
const e2eDatabaseUrl = process.env.E2E_DATABASE_URL;

if (!e2eDatabaseUrl) {
  throw new Error(
    'E2E_DATABASE_URL is required and must target a dedicated test database.',
  );
}

const e2eEnvironment = {
  AUDIT_ENCRYPTION_CURRENT_VERSION: '1',
  AUDIT_ENCRYPTION_KEY_V1: randomBytes(32).toString('base64'),
  DATABASE_URL: e2eDatabaseUrl,
  MFA_ENCRYPTION_KEY_V1: randomBytes(32).toString('base64'),
  NEXT_PUBLIC_WEB_URL: baseURL,
  WEB_URL: baseURL,
} as const;

export default defineConfig({
  fullyParallel: true,
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  reporter: 'list',
  retries: process.env.CI ? 2 : 0,
  testDir: './e2e',
  timeout: 30_000,
  use: {
    baseURL,
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'bun run build && bun run start',
    env: e2eEnvironment,
    reuseExistingServer: false,
    timeout: 180_000,
    url: baseURL,
  },
});
