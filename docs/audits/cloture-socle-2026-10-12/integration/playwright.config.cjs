const fs = require('node:fs');
const path = require('node:path');
const { defineConfig, devices } = require('@playwright/test');

if (!process.env.AUDIT_ENV_FILE) throw new Error('Temporary audit environment required');
const config = JSON.parse(fs.readFileSync(process.env.AUDIT_ENV_FILE, 'utf8').replace(/^\uFEFF/, ''));
const database = new URL(config.E2E_DATABASE_URL);
if (config.WEB_URL !== 'http://127.0.0.1:3132' || database.hostname !== '127.0.0.1' ||
    database.port !== '54663' || database.pathname !== '/socle_e2e_test') {
  throw new Error('Only the isolated closure environment is allowed');
}
for (const [key, value] of Object.entries(config)) process.env[key] = value;

module.exports = defineConfig({
  testDir: path.resolve(__dirname, '../../../../apps/web/e2e'),
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'list',
  outputDir: path.join(path.dirname(process.env.AUDIT_ENV_FILE), 'playwright-private'),
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  use: { baseURL: config.WEB_URL, trace: 'off', screenshot: 'off', video: 'off' },
});
