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
const work = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'noctambule-composition-audit-'));
console.log('Résultats : ' + work);

async function main() {
  const mock = JSON.stringify(path.join(root, 'docs/audits/navigation-sections-2026-10-11/banc/mocks.tsx'));
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
  await esbuild.build({ entryPoints: [path.join(__dirname, 'fixture.tsx')], outfile: path.join(work, 'bundle.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', tsconfig: path.join(root, 'apps/web/tsconfig.json'), define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{name: 'isolated-context', setup(build) {
    build.onResolve({filter: /.*/}, args => Object.hasOwn(aliases, args.path) ? {path: args.path, namespace: 'audit'} : null);
    build.onLoad({filter: /.*/, namespace: 'audit'}, args => ({contents: aliases[args.path], loader: 'tsx', resolveDir: root}));
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
  const browser = await chromium.launch();
  const results = [];
  const origin = `http://127.0.0.1:${server.address().port}`;
  async function run(name, width, route, fn) {
    if (process.env.AUDIT_ONLY && !name.includes(process.env.AUDIT_ONLY)) return;
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.setDefaultTimeout(5000);
    try {
      await page.goto(origin + route);
      await expect(page.locator('main')).toBeVisible();
      await fn(page);
      assert.deepEqual(errors, []);
      results.push({ name, width, status: 'passed' });
      console.log(`${width} ${name} : réussi`);
    } catch (error) {
      results.push({name, width, status: 'failed', message: error.message});
      await page.screenshot({path: path.join(work, `${name}-${width}-failed.png`), fullPage: true});
      console.log(`${width} ${name} : ${error.message}`);
    } finally { await context.close(); }
  }
  const noOverflow = async page => assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Débordement horizontal global');
  const person = { id: 'person-one', version: 1, nickname: 'Pseudo initial', firstName: 'Camille', lastName: 'Exemple', birthDate: null, age: null, isAdult: null, lastChange: null, structureStatus: 'IN_STRUCTURE', createdAt: '2026-10-11T00:00:00.000Z', updatedAt: '2026-10-11T00:00:00.000Z', emails: [], phones: [], socialProfiles: [] };
  const success = (route, data) => route.fulfill({contentType: 'application/json', body: JSON.stringify({success: true, data})});
  const failure = (route, status, message) => route.fulfill({status, contentType: 'application/json', body: JSON.stringify({success: false, error: {code: status === 409 ? 'CONFLICT' : 'INTERNAL_ERROR', message}})});
  const nickname = page => page.getByLabel('Pseudo principal', {exact: true});
  const actionBar = page => page.locator('[data-slot="section-action-bar"]');
  const save = page => actionBar(page).getByRole('button', {name: 'Enregistrer', exact: true});
  const reload = page => actionBar(page).getByRole('button', {name: 'Actualiser la version', exact: true});
  const settle = page => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  try {
    for (const width of [320, 390, 768, 1440]) {
      await run('long-identities', width, '/layout', async page => {
        await noOverflow(page);
        assert.equal(await page.locator('h1').count(), 2);
        const headings = page.locator('[data-slot="page-heading"]');
        for (let i = 0; i < await headings.count(); i++) {
          const heading = headings.nth(i);
          assert(await heading.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Contenu du bandeau débordant');
          await expect(heading.getByRole('button')).toBeVisible();
        }
        if ([320, 1440].includes(width)) await page.screenshot({path: path.join(work, `identities-${width}.png`), fullPage: true});
      });
      await run('long-content-states', width, '/states', async page => {
        await noOverflow(page);
        await expect(page.getByRole('alert')).toHaveCount(1);
        await expect(page.getByRole('status')).toHaveCount(2);
        for (const selector of ['[data-slot="alert"]', '[data-slot="empty"]']) assert(await page.locator(selector).first().evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Contenu de l’état débordant');
        if (width === 320) await page.screenshot({path: path.join(work, 'states-320.png'), fullPage: true});
      });
    }
    for (const width of [320, 1440]) {
      await run('overlay-keyboard-focus', width, '/overlays', async page => {
        for (const [trigger, role] of [['Ouvrir sans Trigger', 'dialog'], ['Ouvrir la fenêtre', 'dialog'], ['Ouvrir la confirmation', 'alertdialog'], ['Ouvrir le volet', 'dialog']]) {
          const opener = page.getByRole('button', {name: trigger, exact: true});
          await opener.focus(); await page.keyboard.press('Enter');
          const modal = page.getByRole(role);
          await expect(modal).toBeVisible();
          assert(await modal.evaluate(el => el.contains(document.activeElement)), 'Focus initial hors modale');
          await page.keyboard.press('Shift+Tab');
          assert(await modal.evaluate(el => el.contains(document.activeElement)), 'Focus échappé de la modale');
          assert(await modal.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Débordement dans la modale');
          await noOverflow(page);
          await page.keyboard.press('Escape');
          await expect(modal).toHaveCount(0);
          await expect(opener).toBeFocused();
        }
      });
      await run('popover-menu-disclosure', width, '/overlays', async page => {
        const popover = page.getByRole('button', {name: 'Ouvrir le panneau'});
        await popover.click();
        const panel = page.locator('[data-slot="popover-content"]');
        await expect(panel).toBeVisible();
        assert(await panel.evaluate(el => el.scrollWidth <= el.clientWidth + 1), 'Texte débordant du panneau');
        await noOverflow(page);
        await page.keyboard.press('Escape'); await expect(popover).toBeFocused();
        const menu = page.getByRole('button', {name: 'Ouvrir le menu'});
        await menu.focus(); await page.keyboard.press('Enter');
        await expect(page.getByRole('menuitem', {name: 'Première action'})).toBeFocused();
        await page.keyboard.press('End');
        await expect(page.getByRole('menuitem', {name: 'Dernière action'})).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(page.locator('#selection')).toHaveText('Dernière');
        await expect(menu).toBeFocused();
        await page.getByRole('button', {name: 'Ouvrir la fenêtre', exact: true}).click();
        const disclosure = page.getByRole('button', {name: 'Afficher les détails'});
        await disclosure.focus(); await page.keyboard.press('Enter');
        await expect(disclosure).toHaveAttribute('aria-expanded', 'true');
        await expect(page.getByText('Détails supplémentaires')).toBeVisible();
        await page.keyboard.press('Space'); await expect(disclosure).toHaveAttribute('aria-expanded', 'false');
      });
    }
    await run('danger-reload-confirmation', 390, '/danger', async page => {
      const opener = page.getByRole('button', {name: 'Supprimer la fiche', exact: true});
      await opener.click();
      const modal = page.getByRole('alertdialog');
      await expect(modal.getByRole('button', {name: 'Annuler', exact: true})).toBeFocused();
      await modal.getByRole('button', {name: 'Supprimer définitivement', exact: true}).click();
      await expect(page.getByText('Version périmée')).toBeVisible();
      await modal.getByRole('button', {name: 'Actualiser', exact: true}).click();
      await expect(modal.getByRole('button', {name: 'Actualisation…', exact: true})).toBeVisible();
      await expect(modal.getByRole('button', {name: 'Supprimer définitivement', exact: true})).toBeDisabled();
      await page.keyboard.press('Escape'); await expect(modal).toBeVisible();
      await page.evaluate(() => window.finishReload(2));
      await expect(page.getByText('Version périmée')).toHaveCount(0);
      const remove = modal.getByRole('button', {name: 'Supprimer définitivement', exact: true});
      await expect(remove).toBeEnabled();
      assert.equal(await page.evaluate(() => window.deletionCalls.length), 1);
      assert.equal(await page.evaluate(() => window.reloadCalls), 1);
      await remove.click(); await expect(page.getByText('Fiche supprimée', {exact: true})).toBeVisible();
      const calls = await page.evaluate(() => window.deletionCalls);
      assert.deepEqual(calls.map(call => call.version), [1,2]);
      assert.equal(calls[0].key, calls[1].key);
    });
    for (const width of [320, 1440]) {
      await run('person-conflict-retry-draft', width, '/person-identity', async page => {
        const updates = [];
        let reads = 0;
        let finishRead;
        await page.route('**/api/personnes/person-one', route => {
          if (route.request().method() === 'PATCH') {
            const body = route.request().postDataJSON(); updates.push(body);
            return updates.length === 1 ? failure(route, 409, 'Version périmée') : success(route, {...person, ...body, version: 3});
          }
          reads += 1;
          if (reads === 1) return new Promise(resolve => {finishRead = async () => {await failure(route, 500, 'Lecture impossible'); resolve();};});
          return success(route, {...person, version: 2, nickname: 'Pseudo du serveur', firstName: 'Prénom actualisé'});
        });
        await nickname(page).fill('Mon brouillon');
        await page.evaluate(() => {const form = document.getElementById('person-identity-form'); form.requestSubmit(); form.requestSubmit();});
        await expect(reload(page)).toBeVisible();
        assert.equal(updates.length, 1);
        await expect(save(page)).toBeDisabled();
        await nickname(page).press('Enter');
        assert.equal(updates.length, 1);
        await reload(page).click();
        await expect(actionBar(page).getByRole('button', {name: 'Actualisation…', exact: true})).toBeVisible();
        await expect(nickname(page)).toBeDisabled();
        await expect.poll(() => typeof finishRead).toBe('function');
        await finishRead();
        await expect(page.getByRole('alert')).toHaveText('Actualisation impossible. Votre saisie est conservée ; réessayez avant d’enregistrer.');
        await expect(page.getByRole('alert')).toBeFocused();
        await expect(nickname(page)).toHaveValue('Mon brouillon');
        await expect(save(page)).toBeDisabled();
        await reload(page).click();
        await expect(reload(page)).toHaveCount(0);
        await expect(nickname(page)).toHaveValue('Mon brouillon');
        await expect(page.getByLabel('Prénom', {exact: true})).toHaveValue('Prénom actualisé');
        await expect(nickname(page)).toBeFocused();
        assert.equal(updates.length, 1);
        await expect(save(page)).toBeEnabled();
        await noOverflow(page);
        if (width === 320) await page.screenshot({path: path.join(work, 'person-refresh-320.png'), fullPage: true});
        await nickname(page).press('Enter');
        await expect(actionBar(page)).toHaveCount(0);
        assert.equal(updates.length, 2);
        assert.equal(updates[1].version, 2);
        assert.equal(updates[1].nickname, 'Mon brouillon');
        assert.equal(updates[1].firstName, 'Prénom actualisé');
        await expect(nickname(page)).toBeFocused();
      });
    }
    await run('person-cancel-latest-version', 390, '/person-identity', async page => {
      await page.route('**/api/personnes/person-one', route => route.request().method() === 'PATCH'
        ? failure(route, 409, 'Version périmée')
        : success(route, {...person, version: 2, nickname: 'Pseudo du serveur'}));
      await nickname(page).fill('Mon brouillon'); await save(page).click();
      await reload(page).click(); await expect(reload(page)).toHaveCount(0);
      await actionBar(page).getByRole('button', {name: 'Annuler', exact: true}).click();
      await page.getByRole('button', {name: 'Continuer la modification', exact: true}).click();
      await expect(nickname(page)).toHaveValue('Mon brouillon');
      await expect(actionBar(page).getByRole('button', {name: 'Annuler', exact: true})).toBeFocused();
      await actionBar(page).getByRole('button', {name: 'Annuler', exact: true}).click();
      await page.getByRole('button', {name: 'Abandonner les modifications', exact: true}).click();
      await expect(nickname(page)).toHaveValue('Pseudo du serveur');
      await expect(actionBar(page)).toHaveCount(0);
      await expect(nickname(page)).toBeFocused();
    });
    await run('person-validation-and-save-error', 390, '/person-identity', async page => {
      let updates = 0;
      await page.route('**/api/personnes/person-one', route => {updates += 1; return failure(route, 500, 'Enregistrement indisponible');});
      await nickname(page).fill('');
      await page.getByLabel('Prénom', {exact: true}).fill(''); await page.getByLabel('Nom', {exact: true}).fill('');
      await save(page).click();
      await expect(nickname(page)).toHaveAttribute('aria-invalid', 'true');
      await expect(nickname(page)).toBeFocused(); assert.equal(updates, 0);
      await nickname(page).fill('Brouillon conservé'); await save(page).click();
      await expect(page.getByRole('alert')).toHaveText('Enregistrement indisponible');
      await expect(page.getByRole('alert')).toBeFocused();
      await expect(nickname(page)).toHaveValue('Brouillon conservé');
      await expect(save(page)).toBeEnabled(); assert.equal(updates, 1);
    });
    await run('person-late-save-target-switch', 390, '/person-identity', async page => {
      let finish;
      await page.route('**/api/personnes/person-one', route => new Promise(resolve => {finish = async () => {await success(route, {...person, version: 2, nickname: 'Ancien résultat'}); resolve();};}));
      await nickname(page).fill('Ancien brouillon'); await save(page).click();
      await expect(nickname(page)).toBeDisabled();
      await page.getByRole('button', {name: 'Changer de fiche'}).click();
      await expect(nickname(page)).toHaveValue('Autre fiche');
      const response = page.waitForResponse('**/api/personnes/person-one');
      await finish(); await (await response).finished(); await settle(page);
      await expect(nickname(page)).toHaveValue('Autre fiche');
      assert.equal(await page.evaluate(() => window.identityUpdates), 0);
      await expect(actionBar(page)).toHaveCount(0);
    });
    await run('person-parent-late-refresh', 390, '/person-page', async page => {
      let finish;
      await page.route('**/api/personnes/person-one', route => {
        if (route.request().method() === 'PATCH') return failure(route, 409, 'Version périmée');
        return new Promise(resolve => {finish = async () => {await success(route, {...person, version: 2, nickname: 'Ancienne fiche actualisée'}); resolve();};});
      });
      await nickname(page).fill('Mon brouillon'); await save(page).click();
      await reload(page).click();
      await expect.poll(() => typeof finish).toBe('function');
      await page.getByRole('button', {name: 'Changer de fiche'}).click();
      await expect(nickname(page)).toHaveValue('Autre fiche');
      const response = page.waitForResponse('**/api/personnes/person-one');
      await finish(); await (await response).finished(); await settle(page);
      await expect(nickname(page)).toHaveValue('Autre fiche');
      await expect(page.getByRole('heading', {name: 'Autre fiche · Camille Exemple', exact: true})).toBeVisible();
    });
    await run('person-external-update-and-revocation', 390, '/person-identity', async page => {
      let updates = 0;
      await page.route('**/api/personnes/person-one', route => {updates += 1; return success(route, person);});
      await nickname(page).fill('Mon brouillon');
      await page.evaluate(() => window.replaceIdentity({version: 2, nickname: 'Nouvelle version externe'}));
      await expect(reload(page)).toBeVisible();
      await expect(nickname(page)).toHaveValue('Mon brouillon');
      await expect(save(page)).toBeDisabled();
      await page.evaluate(() => window.revokeIdentity());
      await expect(nickname(page)).toBeDisabled();
      await page.evaluate(() => document.getElementById('person-identity-form').requestSubmit());
      assert.equal(updates, 0);
      await actionBar(page).getByRole('button', {name: 'Annuler', exact: true}).click();
      await page.getByRole('button', {name: 'Abandonner les modifications', exact: true}).click();
      await expect(nickname(page)).toHaveValue('Nouvelle version externe');
      await expect(actionBar(page)).toHaveCount(0);
      await expect(page.getByRole('heading', {name: 'Informations personnelles'})).toBeFocused();
    });
  } finally {
    fs.writeFileSync(path.join(work, 'observations.json'), JSON.stringify({date: '2026-10-11', browser: browser.version(), results}, null, 2));
    await browser.close(); await new Promise(resolve => server.close(resolve));
  }
  if (results.some(result => result.status !== 'passed')) process.exitCode = 1;
}
main().catch(error => {console.error(error); process.exitCode = 1;});
