const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const postcss = require('postcss');
const tailwind = require('@tailwindcss/postcss');
const { chromium, expect } = require('@playwright/test');
const { listPage } = require('./data.cjs');
const root = path.resolve(__dirname, '../../../..');
const src = path.join(root, 'apps/web/src');
const work = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'noctambule-list-controls-'));
console.log('Résultats : ' + work);

async function main() {
  const mock = JSON.stringify(path.join(__dirname, 'mocks.tsx'));
  const aliases = {
    'next/navigation': `export {useRouter,useSearchParams,usePathname} from ${mock};`,
    'next/link': `export {Link as default} from ${mock};`,
    '$env': `export const env={NEXT_PUBLIC_WEB_URL:'http://127.0.0.1',WEB_URL:'http://127.0.0.1'};`,
  };
  await esbuild.build({ entryPoints: [path.join(__dirname, 'fixture.tsx')], outfile: path.join(work, 'bundle.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', tsconfig: path.join(root, 'apps/web/tsconfig.json'), define: { 'process.env.NODE_ENV': '"development"' }, plugins: [{ name: 'isolated-navigation', setup(build) {
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
  async function run(name, width, mode, fn, extra = {}) {
    const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce', ...extra });
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/api/personnes?*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: listPage(new URL(route.request().url()).searchParams.has('cursor') ? 2 : 1) }) }));
    try {
      await page.goto(`${origin}/?mode=${mode}`);
      await page.getByRole('searchbox').waitFor();
      await fn(page);
      assert.deepEqual(errors, []);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'page overflow');
      observations.push({ name, width, mode, result: 'passed' });
      console.log(`${width} ${name} ${mode}: passed`);
    } catch (error) {
      observations.push({ name, width, mode, result: 'failed', error: error.message });
      await page.screenshot({ path: path.join(work, `${name}-${mode}-${width}-failed.png`), fullPage: true });
      throw error;
    } finally { await context.close(); }
  }
  const state = async page => JSON.parse(await page.locator('#state').textContent());
  const previous = page => page.getByRole('button', { name: 'Page précédente', exact: true });
  const next = page => page.getByRole('button', { name: 'Page suivante', exact: true });
  try {
    for (const width of [320, 390, 768, 1440]) {
      for (const mode of ['users', 'persons']) {
        await run('toolbar-search', width, mode, async page => {
          const field = page.getByRole('searchbox');
          await field.focus();
          await field.press('Tab');
          const clear = page.getByRole('button', { name: 'Effacer la recherche', exact: true });
          await expect(clear).toBeFocused();
          await clear.press('Enter');
          await expect(field).toHaveValue('');
          await expect(field).toBeFocused();
          assert.deepEqual([(await state(page)).applied, (await state(page)).page], ['', 1]);
          await expect(clear).toHaveCount(0);
          await field.fill('Camille Exemple');
          await field.press('Enter');
          assert.equal((await state(page)).applied, 'Camille Exemple');
          await expect(field).toBeFocused();
          await field.fill('A'.repeat(100));
          await field.press('End');
          await field.press('Z');
          assert.equal((await field.inputValue()).length, 100);
          assert.equal(await field.getAttribute('autocomplete'), 'off');
          if (width === 390 || width === 1440) await page.screenshot({ path: path.join(work, `${mode}-${width}.png`), fullPage: true });
        });
      }
      await run('pagination-state', width, 'persons', async page => {
        const nav = page.getByRole('navigation', { name: 'Pagination de la liste' });
        await expect(previous(page)).toBeEnabled();
        await expect(next(page)).toBeEnabled();
        if (width < 640) {
          const box = await next(page).boundingBox();
          assert(box.width >= 44 && box.height >= 44, 'small touch pagination target');
        }
        await next(page).focus();
        await next(page).press('Enter');
        await expect(nav).toContainText('Page 3 sur 3');
        await expect(next(page)).toBeDisabled();
        await previous(page).click();
        await expect(nav).toContainText('Page 2 sur 3');
        await page.locator('#pending').click();
        await expect(nav).toHaveAttribute('aria-busy', 'true');
        await expect(previous(page)).toBeDisabled();
        await expect(next(page)).toBeDisabled();
        await next(page).evaluate(element => element.click());
        assert.equal((await state(page)).page, 2);
        await page.locator('#pending').click();
        await page.locator('#error').click();
        await expect(previous(page)).toBeDisabled();
        await expect(next(page)).toBeDisabled();
        await page.locator('#error').click();
        await page.locator('#known').click();
        await expect(nav).not.toContainText('sur');
        await page.locator('#history').click();
        await expect(previous(page)).toBeDisabled();
        await nav.getByRole('button', { name: 'Première page', exact: true }).click();
        await expect(nav).toContainText('Page 1');
        await expect(previous(page)).toBeDisabled();
      });
      await run('directory-pagination-focus-and-error', width, 'directory', async page => {
        const nav = page.getByRole('navigation', { name: 'Pagination des membres' });
        const results = page.locator('[aria-label="Résultats du répertoire"]');
        await next(page).scrollIntoViewIfNeeded();
        await next(page).focus();
        let respond;
        await page.route('**/api/personnes?*', async route => {
          await new Promise(resolve => { respond = resolve; });
          await route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ success: false, error: { message: 'Erreur de test' } }) });
        });
        await next(page).press('Enter');
        await expect.poll(() => typeof respond).toBe('function');
        await expect(nav).toContainText('Page 1 sur 2');
        await expect(next(page)).toBeDisabled();
        respond();
        await expect(page.getByText('Actualisation impossible', { exact: true })).toBeVisible();
        await expect(nav).toContainText('Page 1 sur 2');
        await expect(next(page)).toBeDisabled();
        await page.unroute('**/api/personnes?*');
        await page.route('**/api/personnes?*', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ success: true, data: listPage(2) }) }));
        await page.getByRole('button', { name: 'Réessayer', exact: true }).click();
        await expect(nav).toContainText('Page 2 sur 2');
        await expect(results).toBeFocused();
        const box = await results.boundingBox();
        assert(box.y >= -1 && box.y < 250, 'results start remains off-screen');
        await expect(next(page)).toBeDisabled();
        await previous(page).click();
        await expect(nav).toContainText('Page 1 sur 2');
        await expect(results).toBeFocused();
      });
    }
    await run('touch-clear', 390, 'users', async page => {
      await page.getByRole('button', { name: 'Effacer la recherche', exact: true }).tap();
      await expect(page.getByRole('searchbox')).toHaveValue('');
      await expect(page.getByRole('searchbox')).toBeFocused();
      assert.equal((await state(page)).page, 1);
    }, { isMobile: true, hasTouch: true });
    await run('forced-colors', 390, 'persons', async page => {
      await page.emulateMedia({ forcedColors: 'active' });
      const field = page.getByRole('searchbox');
      await field.focus();
      assert.notEqual(await field.evaluate(element => getComputedStyle(element).outlineStyle), 'none');
      await field.press('Tab');
      const clear = page.getByRole('button', { name: 'Effacer la recherche', exact: true });
      await expect(clear).toBeFocused();
      assert.notEqual(await clear.evaluate(element => getComputedStyle(element).outlineStyle), 'none');
      await clear.press('Enter');
      await expect(field).toBeFocused();
    });
  } finally {
    fs.writeFileSync(path.join(work, 'observations.json'), JSON.stringify({ date: '2026-10-11', environment: 'Chromium isolated; real toolbar/search/pagination and directory components; controlled state; simulated router and API; no database; fallback font', observations }, null, 2));
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
