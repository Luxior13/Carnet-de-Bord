const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, expect } = require('@playwright/test');

const envFile = process.env.AUDIT_ENV_FILE;
assert(envFile);
const work = path.dirname(envFile);
const config = JSON.parse(fs.readFileSync(envFile, 'utf8').replace(/^\uFEFF/, ''));
assert.equal(config.WEB_URL, 'http://127.0.0.1:3126');
const database = new URL(config.E2E_DATABASE_URL);
assert.equal(database.hostname, '127.0.0.1');
assert.equal(database.port, '54630');
assert.equal(database.pathname, '/technical_states_test');
const phase = process.argv[2] || 'final';
assert(['baseline', 'final'].includes(phase));
const faultFile = path.join(work, 'probe-control.json');
const storageFile = path.join(work, 'authenticated-state.json');
assert(fs.existsSync(storageFile), 'Run the main real-auth harness first');
const observations = [];
const control = (state) => fs.writeFileSync(faultFile, JSON.stringify({ serverFault: false, delayMs: 0, ...state }));
let browser;
let page;
async function scenario(name, run) {
  const details = await run();
  observations.push({ name, result: 'passed', ...details });
  console.log('PASS ' + name);
}
(async () => {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ baseURL: config.WEB_URL, storageState: storageFile, viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  page = await context.newPage();
  page.setDefaultTimeout(12000);
  const expectedErrors = [];
  const requests = [];
  page.on('pageerror', (error) => expectedErrors.push(error.message.slice(0, 200)));
  page.on('request', (request) => { if (request.url().includes('/audit-technique-probe/')) requests.push({ method: request.method(), navigation: request.isNavigationRequest() }); });
  const errorHeading = page.getByRole('heading', { name: 'Une erreur est survenue' });
  const reload = () => page.getByRole('button', { name: phase === 'baseline' ? 'Réessayer' : 'Recharger la page', exact: true });
  await scenario('server-boundary-real-render-failure-and-recovery', async () => {
    control({ serverFault: true });
    const response = await page.goto('/audit-technique-probe/server');
    await expect(errorHeading).toBeVisible();
    assert(!(await page.locator('body').innerText()).includes('PRIVATE_TECHNICAL_SERVER_PROBE'));
    await page.screenshot({ path: path.join(__dirname, `${phase}-server-boundary-390.png`) });
    const before = requests.length;
    control({ serverFault: false });
    await reload().click();
    if (phase === 'baseline') {
      await expect(errorHeading).toBeVisible();
      assert.equal(requests.length, before, 'Baseline reset unexpectedly performed a server request');
      await page.reload();
    }
    await expect(page.getByRole('heading', { name: 'Sonde serveur rétablie' })).toBeVisible();
    assert(requests.every((request) => request.method === 'GET'));
    return { initialStatus: response.status(), baselineResetPerformedServerRequest: phase === 'baseline' ? false : undefined, recovery: phase === 'baseline' ? 'manual-browser-reload' : 'provided-reload-action', probeMethods: ['GET'] };
  });
  await scenario('persistent-server-failure-keeps-a-retry-and-home-exit', async () => {
    control({ serverFault: true });
    await page.goto('/audit-technique-probe/server');
    await expect(errorHeading).toBeVisible();
    await reload().click();
    await expect(errorHeading).toBeVisible();
    if (phase === 'final') {
      await expect(reload()).toBeEnabled();
      const home = page.getByRole('link', { name: /Retour à l.accueil/, exact: true });
      await expect(home).toBeVisible();
      await home.click();
      await expect(page.getByRole('heading', { name: /Bonjour|Bienvenue/ }).first()).toBeVisible();
    }
    return { persistentFault: true, homeExit: phase === 'final' };
  });
  await scenario('client-boundary-real-render-failure-and-recovery', async () => {
    control({ serverFault: false });
    await page.goto('/');
    await page.evaluate(() => sessionStorage.setItem('technical-probe-client-fault', '1'));
    await page.goto('/audit-technique-probe/client');
    await expect(errorHeading).toBeVisible();
    assert(!(await page.locator('body').innerText()).includes('PRIVATE_TECHNICAL_CLIENT_PROBE'));
    await page.evaluate(() => sessionStorage.removeItem('technical-probe-client-fault'));
    await reload().click();
    await expect(page.getByRole('heading', { name: 'Sonde client rétablie' })).toBeVisible();
    return { realClientRenderThrow: true, recovery: true };
  });
  await scenario('real-streamed-loading-before-server-response', async () => {
    control({ delayMs: 1800 });
    const navigation = page.goto('/audit-technique-probe/server', { waitUntil: 'commit' });
    await navigation;
    await expect(page.getByRole('status', { name: 'Chargement de la page' })).toBeVisible();
    await page.screenshot({ path: path.join(__dirname, `${phase}-streamed-loading-390.png`) });
    await expect(page.getByRole('heading', { name: 'Sonde serveur rétablie' })).toBeVisible();
    return { suspendedMilliseconds: 1800, recovered: true };
  });
  fs.writeFileSync(path.join(__dirname, `${phase}-sondes-resultats.json`), JSON.stringify({ date: new Date().toISOString(), phase, next: '15.5.23 production', sourceCopy: true, faultRoutesOnlyInTemporaryCopy: true, observations, expectedRenderErrors: expectedErrors }, null, 2) + '\n');
})().catch(async (error) => {
  fs.writeFileSync(path.join(work, `${phase}-probes-failure.txt`), String(error.stack || error));
  await page?.screenshot({ path: path.join(work, `${phase}-probes-failure.png`) }).catch(() => {});
  console.error(String(error.stack || error)); process.exitCode = 1;
}).finally(async () => { control({}); await browser?.close(); });
