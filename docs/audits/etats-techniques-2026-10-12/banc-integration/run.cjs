const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium, expect } = require("@playwright/test");
const { PrismaClient } = require("@prisma/client");
const { generate } = require("otplib");

const envFile = process.env.AUDIT_ENV_FILE;
if (!envFile)
  throw new Error(
    "AUDIT_ENV_FILE must point to the temporary audit environment.",
  );
const config = JSON.parse(
  fs.readFileSync(envFile, "utf8").replace(/^\uFEFF/, ""),
);
const target = new URL(config.E2E_DATABASE_URL);
const origin = config.WEB_URL;
if (
  target.hostname !== "127.0.0.1" ||
  target.port !== "54630" ||
  target.pathname !== "/technical_states_test" ||
  new URL(origin).hostname !== "127.0.0.1" ||
  new URL(origin).port !== "3126"
) {
  throw new Error(
    "This harness requires the explicitly isolated local audit targets.",
  );
}
const work = path.dirname(envFile);
const prisma = new PrismaClient({ datasourceUrl: target.toString() });
const observations = [];

const json = async (response, status = 200) => {
  const payload = await response.json();
  assert.equal(
    response.status(),
    status,
    payload.error?.message || "Unexpected HTTP status",
  );
  assert.equal(payload.success, true);
  return payload.data;
};
// Chromium accepts Secure cookies on loopback HTTP; Playwright's separate
// request client does not. Exercise the browser's actual authenticated fetch.
const api = (page) =>
  Object.fromEntries(
    ["get", "post", "patch", "delete", "put"].map((method) => [
      method,
      async (url, options = {}) => {
        const result = await page.evaluate(
          async ({ method, url, options }) => {
            const response = await fetch(url, {
              method: method.toUpperCase(),
              cache: "no-store",
              credentials: "same-origin",
              headers: {
                ...options.headers,
                ...(options.data ? { "content-type": "application/json" } : {}),
              },
              ...(options.data ? { body: JSON.stringify(options.data) } : {}),
            });
            return {
              status: response.status,
              data: response.status === 204 ? null : await response.json(),
            };
          },
          { method, url, options },
        );
        return { status: () => result.status, json: async () => result.data };
      },
    ]),
  );
async function headers(page) {
  const cookie = (await page.context().cookies()).find(
    (item) => item.name === "csrf-token",
  );
  assert(cookie, "Missing real CSRF cookie");
  return { "x-csrf-token": cookie.value, origin };
}
async function authenticate(
  browser,
  loginName,
  password = config.E2E_SUPERADMIN_PASSWORD,
) {
  const secretPath = path.join(work, loginName + ".totp");
  const context = await browser.newContext({
    baseURL: origin,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  await page.goto("/login");
  const response = await api(page).get("/api/auth/me");
  if (response.status() !== 200) {
    await page.goto("/login");
    await page.getByLabel("Identifiant de connexion").fill(loginName);
    await page.locator("#password").fill(password);
    await page
      .getByRole("button", { name: "Se connecter", exact: true })
      .click();
    if (fs.existsSync(secretPath)) {
      const lastCredential = await prisma.totpCredential.findFirst({
        where: { user: { loginName } },
        select: { lastUsedTimeStep: true },
      });
      const currentStep = BigInt(Math.floor(Date.now() / 30000));
      if (
        lastCredential?.lastUsedTimeStep !== null &&
        lastCredential?.lastUsedTimeStep >= currentStep
      ) {
        const delay =
          Number(lastCredential.lastUsedTimeStep + 1n) * 30000 -
          Date.now() +
          250;
        assert(delay < 31000, "Unexpected future TOTP time step");
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      await page
        .locator("#login-mfa-code")
        .fill(await generate({ secret: fs.readFileSync(secretPath, "utf8") }));
      await page
        .getByRole("button", { name: "Vérifier et se connecter", exact: true })
        .click();
    } else {
      await page
        .getByRole("button", { name: "Configurer maintenant", exact: true })
        .click();
      const secret = (
        await page
          .getByLabel("Clé de configuration", { exact: true })
          .innerText()
      ).replace(/[\s-]/g, "");
      fs.writeFileSync(secretPath, secret);
      const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
      if (remaining < 6)
        await new Promise((resolve) =>
          setTimeout(resolve, (remaining + 1) * 1000),
        );
      await page
        .getByLabel("Code à 6 chiffres")
        .fill(await generate({ secret }));
      await page
        .getByRole("button", {
          name: "Activer la double authentification",
          exact: true,
        })
        .click();
      await page
        .getByRole("list", { name: "Codes de secours", exact: true })
        .waitFor();
      await page
        .getByRole("checkbox", {
          name: /J.ai enregistré ces codes dans un endroit sûr/,
        })
        .check();
      await page.getByRole("button", { name: "Terminer", exact: true }).click();
    }
    await expect(page).toHaveURL(/\/$/);
  }
  return { context, page };
}

const { spawnSync } = require('node:child_process');
const phase = process.argv[2] || 'baseline';
assert(['baseline', 'final'].includes(phase), 'Unknown verification phase');
const outputDir = __dirname;
const postgresControl = 'C:/Program Files/PostgreSQL/17/bin/pg_ctl.exe';
const pgdata = path.join(work, 'pgdata');
assert(path.basename(work).startsWith('noctambule-technical-states-'));
assert.equal(path.dirname(pgdata), work);
function pg(action) {
  const args = ['-D', pgdata];
  if (action === 'start') args.push('-l', path.join(work, 'postgres.log'), '-o', '-h 127.0.0.1 -p 54630', '-w', 'start');
  else args.push('-m', 'fast', '-w', 'stop');
  // PostgreSQL's detached child must not inherit a pipe owned by spawnSync.
  const result = spawnSync(postgresControl, args, { stdio: 'ignore', windowsHide: true, timeout: 30000 });
  assert.equal(result.status, 0, 'Local test PostgreSQL control failed');
}
async function scenario(name, action) {
  const details = await action();
  observations.push({ name, result: 'passed', ...details });
  console.log('PASS ' + name);
}
let browser;
let pgStopped = false;
let diagnosticPage;
const faults = [];
(async () => {
  browser = await chromium.launch({ headless: true });
  const anonymous = await browser.newContext({ baseURL: origin });
  const anon = await anonymous.newPage();
  await scenario('anonymous-missing-route-stays-private', async () => {
    const response = await anonymous.request.get('/audit-route-absente', { maxRedirects: 0 });
    assert.equal(response.status(), 307);
    assert(response.headers().location.includes('/login?next='));
    await anon.goto('/audit-route-absente');
    await expect(anon.getByLabel('Identifiant de connexion')).toBeVisible();
    return { initialStatus: 307, loginRedirect: true };
  });
  const { context, page } = await authenticate(browser, config.E2E_SUPERADMIN_LOGIN_NAME);
  await context.storageState({ path: path.join(work, 'authenticated-state.json') });
  diagnosticPage = page;
  page.on('pageerror', (error) => { faults.push({ name: error.name, message: error.message.slice(0, 300) }); });
  await scenario('authenticated-real-login-mfa', async () => {
    const me = await json(await api(page).get('/api/auth/me'));
    assert(me.user.isProtected);
    assert(me.user.mfaEnabledAt);
    return { passwordAndTotp: true, csrfCookie: Boolean(await headers(page)) };
  });
  await scenario('authenticated-unmatched-route-404', async () => {
    const response = await page.goto('/audit-route-absente');
    await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
    assert.equal(response.status(), 404);
    const robots = await page.locator('meta[name="robots"]').evaluateAll((nodes) => nodes.map((node) => node.content));
    assert(robots.some((content) => content.includes('noindex')));
    await page.screenshot({ path: path.join(outputDir, `${phase}-404-1440.png`) });
    await page.getByRole('link', { name: /Retour à l.accueil/ }).click();
    await expect(page).toHaveURL(origin + '/');
    await expect(page.getByRole('heading', { name: /Bonjour|Bienvenue/ }).first()).toBeVisible();
    return { status: response.status(), noindex: true, returnHome: true };
  });
  await scenario('authenticated-catchall-notfound-and-mobile', async () => {
    const response = await page.goto('/systeme/audit-route-absente');
    await expect(page.getByRole('heading', { name: 'Page introuvable' })).toBeVisible();
    // With streamed rendering Next can already have sent 200 before notFound.
    assert([200, 404].includes(response.status()));
    for (const width of [320, 390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Horizontal overflow at ' + width);
      await expect(page.getByRole('link', { name: /Retour à l.accueil/ })).toBeVisible();
    }
    await page.setViewportSize({ width: 320, height: 700 });
    await page.screenshot({ path: path.join(outputDir, `${phase}-404-320.png`) });
    return { status: response.status(), widths: [320, 390, 768, 1440] };
  });
  await scenario('root-layout-database-outage-and-recovery', async () => {
    const mobileContext = await browser.newContext({ baseURL: origin, storageState: await context.storageState(), viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await mobileContext.newPage();
    diagnosticPage = page;
    const mutations = [];
    mobileContext.on('request', (request) => {
      if (!['GET', 'HEAD'].includes(request.method()) && !request.url().includes('/api/observability/web-vitals')) mutations.push(request.method());
    });
    await page.goto('/?audit-return=preserve');
    await expect(page.getByRole('heading', { name: /Bonjour|Bienvenue/ }).first()).toBeVisible();
    await prisma.$disconnect();
    pg('stop'); pgStopped = true;
    let response;
    try {
      response = await page.reload({ timeout: 25000, waitUntil: 'networkidle' });
    } catch (error) {
      // Capture the rendered result if a background request prolonged networkidle.
      if (!String(error).includes('Timeout')) throw error;
    }
    await page.waitForFunction(() => /Application error|Une erreur|indisponible/i.test(document.body.innerText));
    const errorText = await page.locator('body').innerText();
    for (const secret of [config.E2E_SUPERADMIN_PASSWORD, config.MFA_ENCRYPTION_KEY_V1, config.AUDIT_ENCRYPTION_KEY_V1, target.toString(), 'PrismaClientInitializationError']) {
      assert(!errorText.includes(secret), 'Internal details leaked into error UI');
    }
    await page.screenshot({ path: path.join(outputDir, `${phase}-global-outage-390.png`) });
    const actions = await page.getByRole('button').allTextContents();
    const links = await page.getByRole('link').allTextContents();
    const presentation = await page.evaluate(async () => {
      await document.fonts.ready;
      return {
        lang: document.documentElement.lang,
        mainCount: document.querySelectorAll('main').length,
        overflow: document.documentElement.scrollWidth > innerWidth,
        viewportMeta: document.querySelector('meta[name="viewport"]')?.content ?? null,
        innerWidth,
        fontFamily: getComputedStyle(document.body).fontFamily,
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        loadedFonts: [...document.fonts].filter((font) => font.status === 'loaded').map((font) => font.family),
        focusedHeading: document.activeElement?.tagName === 'H1',
      };
    });
    if (phase === 'final' && !presentation.viewportMeta) {
      fs.writeFileSync(path.join(outputDir, 'global-viewport-avant.json'), JSON.stringify({ date: new Date().toISOString(), next: '15.5.23 production', isMobile: true, configuredViewport: 390, presentation }, null, 2) + '\n');
    }
    if (phase === 'final') {
      const coldContext = await browser.newContext({ baseURL: origin, storageState: await context.storageState(), viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
      const coldPage = await coldContext.newPage();
      const coldResponse = await coldPage.goto('/?audit-return=cold-mobile');
      await expect(coldPage.getByRole('heading', { name: 'Une erreur est survenue' })).toBeVisible();
      presentation.coldNavigation = await coldPage.evaluate(() => ({ viewportMeta: document.querySelector('meta[name="viewport"]')?.content ?? null, innerWidth, overflow: document.documentElement.scrollWidth > innerWidth, lang: document.documentElement.lang, mainCount: document.querySelectorAll('main').length }));
      presentation.coldNavigation.status = coldResponse.status();
      assert.equal(presentation.coldNavigation.innerWidth, 390);
      assert.equal(presentation.coldNavigation.overflow, false);
      assert(presentation.coldNavigation.viewportMeta?.includes('width=device-width'));
      await coldPage.screenshot({ path: path.join(outputDir, 'final-global-cold-mobile-390.png') });
      await coldContext.close();
    }
    let recoveryAttempts = 0;
    pg('start'); pgStopped = false;
    if (phase === 'baseline') {
      observations.push({ name: 'baseline-global-fallback', result: 'observed', genericEnglishError: errorText.includes('Application error'), actions, links });
      await page.reload();
    } else {
      assert.equal(presentation.lang, 'fr');
      assert.equal(presentation.mainCount, 1);
      assert.equal(presentation.overflow, false);
      assert.equal(presentation.innerWidth, 390);
      assert(presentation.viewportMeta?.includes('width=device-width'));
      assert(presentation.focusedHeading);
      assert(presentation.loadedFonts.some((font) => /Geist/i.test(font)));
      await expect(page.getByRole('button', { name: /Réessayer|Recharger/ })).toBeVisible();
      for (; recoveryAttempts < 3; ) {
        // A person can retry after the pool notices its closed connections.
        // Keep this bounded and record every manual attempt, without retrying writes.
        if (recoveryAttempts > 0) await page.waitForTimeout(1000);
        recoveryAttempts += 1;
        const documentResponse = page.waitForResponse((candidate) => candidate.request().isNavigationRequest() && new URL(candidate.url()).pathname === '/');
        await page.getByRole('button', { name: /Réessayer|Recharger/ }).click();
        await documentResponse;
        await page.waitForLoadState('domcontentloaded');
        if (await page.getByRole('heading', { name: /Bonjour|Bienvenue/ }).first().isVisible()) break;
        await expect(page.getByRole('button', { name: /Réessayer|Recharger/ })).toBeEnabled();
      }
    }
    await expect(page.getByRole('heading', { name: /Bonjour|Bienvenue/ }).first()).toBeVisible();
    assert.equal(new URL(page.url()).search, '?audit-return=preserve');
    assert.deepEqual(mutations, [], 'Recovery must not replay a business mutation');
    await mobileContext.close();
    return { status: response?.status() ?? null, noUiSecret: true, presentation, databaseRestarted: true, recoveryAttempts, recovery: phase === 'baseline' ? 'manual-browser-reload' : 'provided-retry-action', preservedQuery: true };
  });
  const result = { date: new Date().toISOString(), phase, baseCommit: '9731385', browser: browser.version(), next: '15.5.23 production', database: 'PostgreSQL17/54630/technical_states_test/52migrations', observations, expectedRenderErrors: faults };
  fs.writeFileSync(path.join(outputDir, `${phase}-resultats.json`), JSON.stringify(result, null, 2) + '\n');
  await context.close(); await anonymous.close();
})().catch(async (error) => {
  fs.writeFileSync(path.join(work, `${phase}-failure.txt`), String(error.stack || error));
  if (diagnosticPage) await diagnosticPage.screenshot({ path: path.join(work, `${phase}-failure.png`) }).catch(() => {});
  console.error(String(error.stack || error));
  process.exitCode = 1;
}).finally(async () => {
  if (pgStopped) pg('start');
  await prisma.$disconnect();
  await browser?.close();
});

