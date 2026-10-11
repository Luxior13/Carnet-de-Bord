const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const postcss = require('postcss');
const tailwind = require('@tailwindcss/postcss');
const { chromium, expect } = require('@playwright/test');
const root = path.resolve(__dirname, '../../../..');
const src = path.join(root, 'apps/web/src');
const work = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'noctambule-savebars-'));
const now = '2026-10-11T00:00:00.000Z';
const actor = { id: 'audit-root', loginName: 'audit.root', firstName: 'Camille', lastName: 'Exemple', role: 'SUPERADMIN', isProtected: true, permissions: {}, isActive: true, mustChangePassword: false, mfaEnabled: true, contactEmail: null, createdAt: now, updatedAt: now };
const target = { ...actor, id: 'audit-target', loginName: 'compte.exemple', firstName: 'Alex', role: 'USER', isProtected: false, isActive: false, contactEmail: 'exemple@example.test', criticalAccessReady: true };
const json = (route, data, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(status >= 400 ? { success: false, error: data } : { success: true, data }) });
console.log('Résultats : ' + work);

async function main() {
  const mock = JSON.stringify(path.join(__dirname, 'mocks.tsx'));
  const aliases = {
    '$context/UserContext': `export {useUser} from ${mock};`,
    '$context/FeatureAvailabilityContext': `export {useFeatureAvailability} from ${mock};`,
    '$components/AuthenticatedLayout': `export {AuthenticatedLayout as default} from ${mock};`,
    'next/navigation': `export {useRouter,useSearchParams,usePathname} from ${mock};`,
    'next/link': `export {Link as default} from ${mock};`,
    'next/image': `import React from 'react';export default function Image({priority,unoptimized,fill,...props}){return <img {...props}/>}`,
    'next/dynamic': `import React from 'react';export default function dynamic(loader){const C=React.lazy(()=>loader().then(m=>({default:m.default??m})));return props=><React.Suspense fallback={null}><C {...props}/></React.Suspense>}`,
    '$env': `export const env={NEXT_PUBLIC_WEB_URL:'http://127.0.0.1',WEB_URL:'http://127.0.0.1'};`,
  };
  await esbuild.build({ entryPoints: [path.join(__dirname, 'fixture.tsx')], outfile: path.join(work, 'bundle.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', tsconfig: path.join(root, 'apps/web/tsconfig.json'), define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'isolated-context', setup(build) {
    build.onResolve({ filter: /.*/ }, args => Object.hasOwn(aliases, args.path) ? { path: args.path, namespace: 'audit' } : null);
    build.onLoad({ filter: /.*/, namespace: 'audit' }, args => ({ contents: aliases[args.path], loader: 'tsx', resolveDir: root }));
  }}] });
  const css = await postcss([tailwind({ base: path.join(root, 'apps/web') })]).process(fs.readFileSync(path.join(src, 'app/globals.css'), 'utf8'), { from: path.join(src, 'app/globals.css') });
  fs.writeFileSync(path.join(work, 'style.css'), css.css);
  const server = http.createServer((req, res) => {
    const file = req.url.split('?')[0];
    if (['/bundle.js', '/bundle.css', '/style.css'].includes(file)) {
      res.setHeader('Content-Type', file.endsWith('.js') ? 'application/javascript' : 'text/css');
      return res.end(fs.readFileSync(path.join(work, file.slice(1))));
    }
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><html lang="fr" class="dark"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/bundle.css"><style>:root{--font-geist-sans:Arial,sans-serif;--font-geist-mono:monospace}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const observations = [];
  async function run(name, width, route, fn, height = 900) {
    if (process.env.AUDIT_ONLY && !name.includes(process.env.AUDIT_ONLY)) return;
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', request => {
      const pathname = new URL(request.request().url()).pathname;
      if (pathname === '/api/auth/me') return json(request, { user: actor });
      if (pathname.endsWith('/mfa')) return json(request, { enabled: true, enabledAt: now, recoveryCodesRemaining: 8 });
      if (pathname.endsWith('/sessions')) return json(request, { sessions: [] });
      if (pathname.endsWith('/audit')) return json(request, { logs: [], hasMore: false });
      return json(request, { user: target });
    });
    try {
      await page.goto(origin + route);
      await fn(page);
      assert.deepEqual(errors, []);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'page overflow');
      observations.push({ name, width, height, result: 'passed' });
      console.log(`${width} ${name}: passed`);
    } catch (error) {
      observations.push({ name, width, height, result: 'failed', error: error.message });
      console.log(`${width} ${name}: FAILED ${error.message}`);
      await page.screenshot({ path: path.join(work, `${name}-${width}-failed.png`), fullPage: true });
    } finally { await context.close(); }
  }
  const bar = page => page.locator('[data-slot="section-action-bar"]').filter({ visible: true });
  const save = page => bar(page).getByRole('button').last();
  const cancel = page => bar(page).getByRole('button', { name: 'Annuler', exact: true });
  async function noOverflow(page) { assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'page overflow'); }
  async function retainedFocus(page) { await expect.poll(() => page.evaluate(() => document.activeElement !== document.body), { message: 'cancel discarded keyboard focus to body' }).toBe(true); }
  try {
    for (const width of [320, 390, 768, 1440]) {
      await run('account-profile-cancel', width, '/mon-compte', async page => {
        const field = page.locator('#edit-firstName');
        await field.fill('Brouillon');
        await expect(bar(page)).toContainText('Modifications non enregistrées');
        await expect(save(page)).toBeEnabled();
        await cancel(page).focus();
        await cancel(page).press('Enter');
        await expect(field).toHaveValue('Camille');
        await expect(bar(page)).toHaveCount(0);
        await retainedFocus(page);
      });
      await run('user-profile-cancel', width, '/systeme/utilisateurs/audit-target', async page => {
        const field = page.locator('#user-first-name');
        await field.fill('Brouillon');
        await expect(save(page)).toBeEnabled();
        await cancel(page).focus();
        await cancel(page).press('Enter');
        await expect(field).toHaveValue('Alex');
        await expect(bar(page)).toHaveCount(0);
        await retainedFocus(page);
      });
      await run('user-role-summary', width, '/systeme/utilisateurs/audit-target?section=access', async page => {
        await page.locator('#user-role').click();
        await page.getByRole('option', { name: 'Administrateur', exact: true }).click();
        await expect(bar(page)).toContainText('déconnectera');
        await expect(bar(page)).toContainText('attributions');
        await expect(save(page)).toBeEnabled();
        await expect(page.locator('#user-role')).toBeFocused();
        const roleBox = await page.locator('#user-role').boundingBox(), actionsBox = await bar(page).boundingBox();
        assert(roleBox.y + roleBox.height <= actionsBox.y || roleBox.y >= actionsBox.y + actionsBox.height, 'bar overlaps focused role selector');
        await noOverflow(page);
        if (width === 390 || width === 1440) await page.screenshot({ path: path.join(work, `access-${width}.png`), fullPage: true });
        await cancel(page).click();
        await expect(page.locator('#user-role')).toContainText('Utilisateur');
        await expect(save(page)).toBeDisabled();
        await retainedFocus(page);
      });
      await run('user-personal-permissions', width, '/systeme/utilisateurs/audit-target?section=account', async page => {
        const permission = page.getByRole('switch').first();
        const before = await permission.getAttribute('aria-checked');
        await permission.click();
        await expect(bar(page)).toHaveAttribute('aria-label', 'Enregistrement des accès personnels');
        await expect(save(page)).toBeEnabled();
        await expect(bar(page).getByRole('button', { name: 'Réinitialiser au rôle', exact: true })).toBeVisible();
        await cancel(page).focus();
        await cancel(page).press('Enter');
        await expect(permission).toHaveAttribute('aria-checked', before);
        await expect(bar(page)).toHaveCount(0);
        await retainedFocus(page);
      });
      for (const kind of ['person', 'user']) {
        const route = kind === 'person' ? '/membres/repertoire/nouveau' : '/systeme/utilisateurs/nouveau';
        await run(`${kind}-create-inflight`, width, route, async page => {
          if (kind === 'person') await page.locator('#create-person-nickname').fill('Exemple');
          else {
            await page.locator('#newFirstName').fill('Camille');
            await page.locator('#newLoginName').fill('exemple.fictif');
          }
          let fulfill, calls = 0;
          await page.route(kind === 'person' ? '**/api/personnes' : '**/api/users', async request => {
            if (request.request().method() !== 'POST') return request.fallback();
            calls++;
            await new Promise(resolve => { fulfill = resolve; });
            return json(request, { code: 'VALIDATION_ERROR', message: 'Erreur de test, saisie conservée' }, 400);
          });
          const submit = bar(page).getByRole('button').last();
          await submit.click();
          await expect.poll(() => calls).toBe(1);
          await expect(bar(page)).toContainText('Création…');
          await expect(submit).toBeDisabled();
          const link = bar(page).getByRole('link', { name: 'Annuler', exact: true });
          await expect(link).toHaveAttribute('aria-disabled', 'true');
          await link.focus();
          await link.press('Enter');
          await expect(page).toHaveURL(origin + route);
          await expect(page.getByRole('alertdialog')).toHaveCount(0);
          await page.locator('form').first().evaluate(element => { element.requestSubmit(); element.requestSubmit(); });
          assert.equal(calls, 1);
          fulfill();
          await expect(bar(page)).not.toContainText('Création…');
          await expect(page.locator(kind === 'person' ? '#create-person-nickname' : '#newLoginName')).toHaveValue(kind === 'person' ? 'Exemple' : 'exemple.fictif');
          await expect(link).not.toHaveAttribute('aria-disabled', 'true');
          await noOverflow(page);
        });
      }
      await run('setting-inline-state', width, '/setting', async page => {
        const editFallback = page.locator('[data-setting-edit]');
        await editFallback.click();
        const input = page.getByRole('spinbutton');
        await expect(input).toBeFocused();
        await expect(bar(page)).toHaveAttribute('data-placement', 'inline');
        const saveSetting = bar(page).getByRole('button', { name: 'Enregistrer —' });
        await expect(saveSetting).toBeDisabled();
        await expect(cancel(page)).toBeEnabled();
        await cancel(page).click();
        await expect(editFallback).toBeFocused();
        await editFallback.click();
        await input.fill('1100');
        await expect(saveSetting).toBeEnabled();
        await input.press('Enter');
        await expect(bar(page)).toContainText('Enregistrement…');
        await expect(cancel(page)).toBeDisabled();
        await expect(input).toBeDisabled();
        await page.locator('form').evaluate(element => { element.requestSubmit(); element.requestSubmit(); });
        assert.equal(await page.evaluate(() => window.settingSaves), 1);
        await page.evaluate(() => window.finishSetting());
        await input.fill('1');
        await expect(saveSetting).toBeDisabled();
        await page.locator('#set-conflict').click();
        await expect(saveSetting).toBeDisabled();
        await expect(bar(page)).toContainText('Résolvez le conflit');
        await noOverflow(page);
      });
    }
    await run('account-conflict-reload', 390, '/mon-compte', async page => {
      const field = page.locator('#edit-firstName');
      await field.fill('Brouillon conservé');
      let patchResponse, getResponse, patches = 0;
      await page.route('**/api/auth/me', async request => {
        if (request.request().method() === 'PATCH') {
          patches++;
          await new Promise(resolve => { patchResponse = resolve; });
          return json(request, { message: 'Une version concurrente existe' }, 409);
        }
        await new Promise(resolve => { getResponse = resolve; });
        return json(request, { user: { ...actor, firstName: 'Serveur', updatedAt: '2026-10-11T01:00:00.000Z' } });
      });
      await field.press('Enter');
      await expect.poll(() => patches).toBe(1);
      await expect(save(page)).toBeDisabled();
      await page.locator('#account-profile-form').evaluate(element => { element.requestSubmit(); element.requestSubmit(); });
      assert.equal(patches, 1);
      patchResponse();
      await expect(bar(page).getByRole('button', { name: 'Actualiser la version', exact: true })).toBeVisible();
      await expect(field).toHaveValue('Brouillon conservé');
      await bar(page).getByRole('button', { name: 'Actualiser la version', exact: true }).click();
      await expect.poll(() => typeof getResponse).toBe('function');
      await expect(bar(page)).toContainText('Actualisation de la version…');
      await expect(bar(page)).not.toContainText('Enregistrement…');
      await expect(save(page)).toBeDisabled();
      getResponse();
      await expect(field).toBeEnabled();
      await expect(field).toHaveValue('Brouillon conservé');
      await expect(save(page)).toBeEnabled();
      await page.screenshot({ path: path.join(work, 'account-conflict-390.png'), fullPage: true });
    });
    await run('user-profile-enter-once', 390, '/systeme/utilisateurs/audit-target', async page => {
      const field = page.locator('#user-first-name');
      await field.fill('Camille');
      let response, patches = 0;
      await page.route('**/api/users/audit-target', async request => {
        if (request.request().method() !== 'PATCH') return request.fallback();
        patches++;
        await new Promise(resolve => { response = resolve; });
        return json(request, { message: 'Conflit simulé' }, 409);
      });
      await field.press('Enter');
      await expect.poll(() => patches).toBe(1);
      await expect(save(page)).toBeDisabled();
      await page.locator('[data-user-profile-form]').evaluate(element => { element.requestSubmit(); element.requestSubmit(); });
      assert.equal(patches, 1);
      response();
      await expect(page.getByText('Conflit simulé', { exact: true })).toBeVisible();
      await expect(field).toHaveValue('Camille');
      await expect(save(page)).toBeDisabled();
    });
    await run('long-conflict-sticky', 320, '/stress', async page => {
      const field = page.getByRole('textbox', { name: 'Dernier champ' });
      await field.scrollIntoViewIfNeeded();
      await field.focus();
      const fieldBox = await field.boundingBox(), barBox = await bar(page).boundingBox();
      assert(fieldBox.y + fieldBox.height <= barBox.y || fieldBox.y >= barBox.y + barBox.height, 'bar overlaps focused field');
      await noOverflow(page);
      await bar(page).getByRole('button', { name: 'Actualiser la version', exact: true }).click();
      await expect(bar(page)).toContainText('Actualisation de la version…');
      await expect(bar(page)).not.toContainText('Enregistrement…');
      await noOverflow(page);
      await page.screenshot({ path: path.join(work, 'long-conflict-320.png'), fullPage: true });
    });
    await run('landscape-role-focus', 900, '/systeme/utilisateurs/audit-target?section=access', async page => {
      await page.locator('#user-role').click();
      await page.getByRole('option', { name: 'Administrateur', exact: true }).click();
      await expect(page.locator('#user-role')).toBeFocused();
      const roleBox = await page.locator('#user-role').boundingBox(), actionsBox = await bar(page).boundingBox();
      assert(roleBox.y + roleBox.height <= actionsBox.y || roleBox.y >= actionsBox.y + actionsBox.height, 'bar overlaps focused role selector in landscape');
      await save(page).scrollIntoViewIfNeeded();
      await expect(save(page)).toBeInViewport();
      await expect(cancel(page)).toBeInViewport();
      await noOverflow(page);
    }, 480);
  } finally {
    fs.writeFileSync(path.join(work, 'observations.json'), JSON.stringify({ date: '2026-10-11', browser: browser.version(), environment: 'Chromium isolated; real components; navigation/context/API simulated; no database; fallback font', observations }, null, 2));
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  if (observations.some(item => item.result !== 'passed')) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
