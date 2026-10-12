const { authenticate, api, assert, chromium, config, expect, fs, origin, path, prisma, work } = require('./auth.cjs');
const phase = process.argv[2] || 'baseline';
assert(['baseline', 'final'].includes(phase));
const observations = [];
let browser;
let context;
let page;
let mode = 'csrf';
let lastStatus;
let logoutCount = 0;
const logoutPath = '**/api/auth/logout';
async function clickLogout() {
  await page.getByRole('button', { name: /^Menu utilisateur de/ }).click();
  await page.getByRole('menuitem', { name: /^Déconnexion/ }).click();
}
async function unknownOrFalseSuccess() {
  if (phase === 'baseline') {
    await expect(page.getByText('Déconnexion réussie', { exact: true })).toBeVisible();
    return { baselineFalseSuccessToast: true };
  }
  await expect(page.getByRole('heading', { name: 'Déconnexion non confirmée', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Réessayer la déconnexion', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /^Menu utilisateur de/ })).toHaveCount(0);
  return { explicitUnknownState: true, oldIdentityRemoved: true };
}
(async () => {
  browser = await chromium.launch({ headless: true });
  ({ context, page } = await authenticate(browser, config.E2E_SUPERADMIN_LOGIN_NAME));
  await page.route(logoutPath, async (route) => {
    logoutCount += 1;
    if (mode === 'csrf') {
      const response = await route.fetch({ headers: { ...route.request().headers(), 'x-csrf-token': '0'.repeat(64) } });
      lastStatus = response.status();
      await route.fulfill({ response });
    } else if (mode === 'server500') {
      lastStatus = 500;
      await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Indisponibilité simulée avant déconnexion' } }) });
    } else {
      const response = await route.fetch();
      lastStatus = response.status();
      if (mode === 'commit-lost') {
        assert.equal(response.status(), 200);
        await route.abort('failed');
      } else {
        await route.fulfill({ response });
      }
    }
  });
  for (const kind of ['csrf', 'server500']) {
    mode = kind;
    if (kind !== 'csrf' && phase === 'baseline') await page.goto('/');
    const before = logoutCount;
    if (kind === 'csrf' || phase === 'baseline') await clickLogout();
    else await page.getByRole('button', { name: 'Réessayer la déconnexion', exact: true }).click();
    const state = await unknownOrFalseSuccess();
    assert.equal(lastStatus, kind === 'csrf' ? 403 : 500);
    assert.equal((await api(page).get('/api/auth/me')).status(), 200);
    assert.equal(logoutCount - before, 1);
    observations.push({ name: kind === 'csrf' ? 'real-csrf-refusal-does-not-end-session' : 'injected-500-before-handler-does-not-end-session', result: 'passed', status: lastStatus, actualSessionStatus: 200, automaticRetries: 0, ...state });
    console.log('PASS logout-' + kind);
    await page.screenshot({ path: path.join(__dirname, `${phase}-logout-${kind}.png`) });
  }
  if (phase === 'baseline') await page.goto('/');
  const sessionsBefore = await prisma.session.count({ where: { userId: 'e2e-only-superadmin' } });
  const auditsBefore = await prisma.auditLog.count({ where: { userId: 'e2e-only-superadmin', action: 'LOGOUT' } });
  mode = 'commit-lost';
  if (phase === 'baseline') await clickLogout();
  else await page.getByRole('button', { name: 'Réessayer la déconnexion', exact: true }).click();
  if (phase === 'final') {
    await expect(page.getByRole('heading', { name: 'Déconnexion non confirmée', exact: true })).toBeVisible();
  } else {
    await expect(page.getByText('Erreur lors de la déconnexion', { exact: true })).toBeVisible();
  }
  assert.equal(lastStatus, 200);
  assert.equal((await api(page).get('/api/auth/me')).status(), 401);
  assert.equal(await prisma.session.count({ where: { userId: 'e2e-only-superadmin' } }), sessionsBefore - 1);
  assert.equal(await prisma.auditLog.count({ where: { userId: 'e2e-only-superadmin', action: 'LOGOUT' } }), auditsBefore + 1);
  let retryStatus = null;
  if (phase === 'final') {
    mode = 'retry';
    const before = logoutCount;
    await page.getByRole('button', { name: 'Réessayer la déconnexion', exact: true }).click();
    await expect(page).toHaveURL(origin + '/login');
    await expect(page.getByLabel('Identifiant de connexion')).toBeVisible();
    assert.equal(lastStatus, 401);
    assert.equal(logoutCount - before, 1);
    retryStatus = lastStatus;
  }
  observations.push({ name: 'committed-logout-response-lost-and-explicit-retry', result: 'passed', commitStatus: 200, actualSessionStatus: 401, currentSessionDeleted: true, logoutAuditAddedOnce: true, explicitRetryStatus: retryStatus });
  console.log('PASS logout-commit-lost');
  fs.writeFileSync(path.join(__dirname, `${phase}-logout-resultats.json`), JSON.stringify({ date: new Date().toISOString(), phase, next: '15.5.23 production', browser: browser.version(), database: 'PostgreSQL17/54640/navigation_test', observations }, null, 2) + '\n');
})().catch(async (error) => {
  fs.writeFileSync(path.join(work, `${phase}-logout-failure.txt`), String(error.stack || error));
  await page?.screenshot({ path: path.join(work, `${phase}-logout-failure.png`) }).catch(() => {});
  console.error(String(error.stack || error)); process.exitCode = 1;
}).finally(async () => { await context?.close(); await browser?.close(); await prisma.$disconnect(); });
