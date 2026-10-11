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
const work = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'noctambule-sections-audit-'));
console.log('Résultats : ' + work);
const now = '2026-10-11T00:00:00.000Z';
const user = { id: 'audit-target', loginName: 'compte.exemple', firstName: 'Alex', lastName: 'Exemple', role: 'USER', isActive: false, isProtected: false, permissions: {}, mfaEnabled: true, createdAt: now, updatedAt: now };
const person = { id: 'audit-person', version: 1, nickname: 'Joueur Exemple', firstName: 'Camille', lastName: 'Exemple', birthDate: null, age: null, isAdult: null, lastChange: null, structureStatus: 'IN_STRUCTURE', createdAt: now, updatedAt: now, emails: [], phones: [], socialProfiles: [] };
const json = (route, data) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data }) });
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
  const results = [];
  async function run(name, width, route, fn, extra = {}) {
    if (process.env.AUDIT_ONLY && !name.includes(process.env.AUDIT_ONLY)) return;
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', ...extra });
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/**', request => {
      const pathname = new URL(request.request().url()).pathname;
      if (pathname.includes('/personnes/')) return json(request, person);
      if (pathname.endsWith('/mfa')) return json(request, { enabled: true, enabledAt: now, recoveryCodesRemaining: 8 });
      if (pathname.endsWith('/sessions')) return json(request, { sessions: [] });
      if (pathname.endsWith('/audit')) return json(request, { logs: [], hasMore: false });
      return json(request, { user });
    });
    try {
      await page.goto(origin + route);
      await page.locator('[data-slot="page-section-navigation"]').waitFor();
      await fn(page);
      assert.deepEqual(errors, []);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'page overflow');
      results.push({ name, width, result: 'passed' });
      console.log(`${width} ${name}: passed`);
    } catch (error) {
      results.push({ name, width, result: 'failed', error: error.message });
      console.log(`${width} ${name}: FAILED ${error.message}`);
      await page.screenshot({ path: path.join(work, `${name}-${width}-failed.png`), fullPage: true });
      throw error;
    } finally { await context.close(); }
  }
  const nav = page => page.locator('[data-slot="page-section-navigation"]');
  const viewport = page => nav(page).locator('> div');
  const current = page => nav(page).locator('[aria-current="page"]');
  const left = page => nav(page).getByRole('button', { name: 'Afficher les sections précédentes' });
  const right = page => nav(page).getByRole('button', { name: 'Afficher les sections suivantes' });
  async function visibleLink(page, link) {
    const view = await viewport(page).boundingBox(), box = await link.boundingBox();
    assert(box.x >= view.x - 1 && box.x <= view.x + view.width - 1, 'link start hidden');
    if (box.width <= view.width) assert(box.x + box.width <= view.x + view.width + 1, 'link end hidden');
  }
  try {
    for (const width of [320, 390, 768, 1440]) {
      for (const [name, route] of [['account', '/mon-compte'], ['user', '/systeme/utilisateurs/audit-target'], ['person', '/membres/repertoire/audit-person']]) {
        await run(`page-${name}`, width, route, async page => {
          await page.locator('main input').first().waitFor({ state: 'visible' });
          await expect(current(page)).toHaveCount(1);
          const links = nav(page).getByRole('link');
          for (const link of await links.all()) assert((await link.boundingBox()).height >= 48);
          const computed = await current(page).evaluate(el => ({ background: getComputedStyle(el).backgroundColor, radius: getComputedStyle(el).borderTopLeftRadius, border: getComputedStyle(el).borderBottomWidth }));
          assert.notEqual(computed.background, 'rgba(0, 0, 0, 0)');
          assert.equal(computed.radius, '6px');
          assert.equal(computed.border, '2px');
          await visibleLink(page, current(page));
          if (width === 390 || width === 1440) await page.screenshot({ path: path.join(work, `${name}-${width}.png`), fullPage: true });
          const destination = links.last();
          const href = await destination.getAttribute('href');
          await destination.focus();
          await visibleLink(page, destination);
          await destination.press('Enter');
          await expect(page).toHaveURL(origin + href);
          await expect(destination).toHaveAttribute('aria-current', 'page');
        });
      }
      await run('overflow-and-resize', width, '/stress', async page => {
        const hasOverflow = await nav(page).evaluate(el => el.querySelector('div > div').scrollWidth > el.clientWidth + 1);
        await expect(nav(page).getByRole('button')).toHaveCount(hasOverflow ? 2 : 0);
        if (hasOverflow) {
          await expect(left(page)).toHaveAttribute('aria-disabled', 'true');
          for (let i = 0; i < 15 && await right(page).getAttribute('aria-disabled') === 'false'; i++) {
            const previous = await viewport(page).evaluate(el => el.scrollLeft);
            await right(page).click();
            await expect.poll(() => viewport(page).evaluate(el => el.scrollLeft)).toBeGreaterThan(previous);
            // Let the scroll event and React commit settle before the next click.
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          }
          await expect(right(page)).toHaveAttribute('aria-disabled', 'true');
          await expect(right(page)).toBeFocused();
          assert(await viewport(page).evaluate(el => el.scrollLeft > 0));
          assert.equal(await page.evaluate(() => location.search), '');
          for (let i = 0; i < 15 && await left(page).getAttribute('aria-disabled') === 'false'; i++) {
            const previous = await viewport(page).evaluate(el => el.scrollLeft);
            await left(page).click();
            await expect.poll(() => viewport(page).evaluate(el => el.scrollLeft)).toBeLessThan(previous);
            await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          }
          await expect(left(page)).toHaveAttribute('aria-disabled', 'true');
          await expect(left(page)).toBeFocused();
          await page.setViewportSize({ width: 1440, height: 900 });
          await expect(nav(page).getByRole('button')).toHaveCount(0);
          await expect(current(page)).toBeFocused();
        }
        await page.setViewportSize({ width: 320, height: 900 });
        await expect(nav(page).getByRole('button')).toHaveCount(2);
        await visibleLink(page, current(page));
        await nav(page).getByRole('link').last().focus();
        await visibleLink(page, nav(page).getByRole('link').last());
        await page.screenshot({ path: path.join(work, `overflow-${width}.png`) });
        await page.locator('#short').click();
        await expect(nav(page).getByRole('button')).toHaveCount(0);
        await expect(nav(page).getByRole('link')).toHaveCount(1);
      });
    }
    await run('tooltip-and-native-links', 390, '/stress', async page => {
      const profile = nav(page).getByRole('link').first();
      await profile.hover();
      await expect(page.getByRole('tooltip')).toHaveText('Modifications non enregistrées');
      await page.keyboard.press('Escape');
      await expect(page.getByRole('tooltip')).toHaveCount(0);
      await page.mouse.move(0, 0);
      await page.locator('#short').focus();
      await page.keyboard.press('Tab');
      await expect(left(page)).toBeFocused();
      await page.keyboard.press('Tab');
      await expect(profile).toBeFocused();
      await expect(page.getByRole('tooltip')).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(profile).toBeFocused();
      for (const key of ['ctrlKey', 'metaKey', 'shiftKey', 'altKey']) {
        const allowed = await profile.evaluate((el, key) => {
          let nativeAllowed = false;
          // Observe after React's handler, then suppress the real navigation in
          // the fixture so all modifier checks run against the same document.
          document.addEventListener('click', event => {
            nativeAllowed = !event.defaultPrevented;
            event.preventDefault();
          }, { once: true });
          el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, [key]: true }));
          return nativeAllowed;
        }, key);
        assert(allowed, 'modified click intercepted');
      }
      assert.equal(await page.evaluate(() => window.sectionChanges || 0), 0);
      await nav(page).getByRole('link').nth(1).focus();
      await page.keyboard.press('Enter');
      await expect(page.locator('#current')).toHaveText('Section : access');
      assert.equal(await page.evaluate(() => window.sectionChanges), 1);
      await expect(page.getByRole('tooltip')).toHaveCount(0);
    });
    await run('account-draft-guard', 390, '/mon-compte', async page => {
      await page.locator('#edit-firstName').fill('Brouillon');
      const profile = nav(page).getByRole('link').first();
      await expect(profile).toContainText('Modifications non enregistrées');
      await profile.focus();
      await expect(page.getByRole('tooltip')).toHaveText('Modifications non enregistrées');
      await page.screenshot({ path: path.join(work, 'account-dirty-tooltip-390.png') });
      await nav(page).getByRole('link', { name: 'Sécurité', exact: true }).click();
      await expect(page.getByRole('alertdialog')).toBeVisible();
      await page.getByRole('alertdialog').getByRole('button').first().click();
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
      await expect(page.locator('#edit-firstName')).toHaveValue('Brouillon');
      await expect(current(page)).toContainText('Profil');
    });
    await run('sticky-and-forced-colors', 390, '/stress?section=security', async page => {
      await visibleLink(page, current(page));
      await page.evaluate(() => window.scrollTo(0, 400));
      await expect.poll(async () => (await nav(page).boundingBox()).y).toBe(0);
      const y = await page.evaluate(() => scrollY);
      await right(page).click();
      assert.equal(await page.evaluate(() => scrollY), y);
      await page.emulateMedia({ forcedColors: 'active' });
      await page.keyboard.press('Shift+Tab');
      const last = nav(page).getByRole('link').last();
      await expect(last).toBeFocused();
      assert.equal(await last.evaluate(el => getComputedStyle(el).outlineStyle), 'solid');
    });
    await run('touch-scroll', 320, '/stress', async page => {
      await right(page).tap();
      await expect.poll(() => viewport(page).evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
      assert.equal(await page.evaluate(() => window.sectionChanges || 0), 0);
      await nav(page).getByRole('link').last().focus();
      await nav(page).getByRole('link').last().tap();
      await expect(page.locator('#current')).toHaveText('Section : history');
    }, { isMobile: true, hasTouch: true });
  } finally {
    fs.writeFileSync(path.join(work, 'observations.json'), JSON.stringify({ date: new Date().toISOString(), environment: 'Chromium isolé, composants et CSS réels, contexte et API fictifs, navigation Next simulée', results }, null, 2));
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
