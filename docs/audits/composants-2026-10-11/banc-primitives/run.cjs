const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const esbuild = require('esbuild');
const postcss = require('postcss');
const tailwind = require('@tailwindcss/postcss');
const { chromium, expect } = require('@playwright/test');
const root = path.resolve(__dirname, '../../../..');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'noctambule-primitives-audit-'));
console.log('Résultats : ' + work);

async function main() {
  await esbuild.build({ entryPoints: [path.join(__dirname, 'fixture.tsx')], outfile: path.join(work, 'bundle.js'), bundle: true, platform: 'browser', format: 'iife', jsx: 'automatic', tsconfig: path.join(root, 'apps/web/tsconfig.json'), define: { 'process.env.NODE_ENV': '"development"' } });
  const cssFile = path.join(root, 'apps/web/src/app/globals.css');
  const css = await postcss([tailwind({ base: path.join(root, 'apps/web') })]).process(fs.readFileSync(cssFile, 'utf8'), { from: cssFile });
  fs.writeFileSync(path.join(work, 'style.css'), css.css);
  const server = http.createServer((req, res) => {
    const name = req.url.split('?')[0];
    if (['/bundle.js', '/bundle.css', '/style.css'].includes(name)) {
      res.setHeader('Content-Type', name.endsWith('.js') ? 'application/javascript' : 'text/css');
      res.end(fs.readFileSync(path.join(work, name.slice(1))));
      return;
    }
    res.setHeader('Content-Type', 'text/html');
    res.end('<!doctype html><html lang="fr" class="dark"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/bundle.css"><style>:root{--font-geist-sans:Arial,sans-serif;--font-geist-mono:monospace}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const results = [];
  async function run(name, width, test, options = {}) {
    if (process.env.AUDIT_ONLY && !name.includes(process.env.AUDIT_ONLY)) return;
    const context = await browser.newContext({ viewport: { width, height: 1000 }, reducedMotion: 'reduce', ...options });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(origin);
      await page.locator('#text').waitFor();
      await test(page);
      assert.deepEqual(errors, []);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'horizontal page overflow');
      results.push({ name, width, result: 'passed' });
      console.log(`${width} ${name}: passed`);
    } catch (error) {
      results.push({ name, width, result: 'failed', error: error.message });
      await page.screenshot({ path: path.join(work, `${name}-${width}-failed.png`), fullPage: true });
      throw error;
    } finally { await context.close(); }
  }
  const style = locator => locator.evaluate(async el => {
    getComputedStyle(el).boxShadow;
    await new Promise(requestAnimationFrame);
    await new Promise(requestAnimationFrame);
    return { shadow: getComputedStyle(el).boxShadow, border: getComputedStyle(el).borderColor, radius: getComputedStyle(el).borderTopLeftRadius, outline: getComputedStyle(el).outlineStyle };
  });
  try {
    for (const width of [320, 390, 768, 1440]) {
      await run('focus-and-fields', width, async page => {
        await page.keyboard.press('Tab');
        await expect(page.locator('#text')).toBeFocused();
        await expect.poll(async () => (await style(page.locator('#text'))).shadow).toContain('rgb(146, 172, 208) 0px 0px 0px 3px');
        const input = await style(page.locator('#text'));
        await page.keyboard.press('Tab');
        await expect(page.locator('#notes')).toBeFocused();
        await expect.poll(async () => (await style(page.locator('#notes'))).shadow).toEqual(input.shadow);
        const textarea = await style(page.locator('#notes'));
        assert.equal(textarea.shadow, input.shadow);
        assert.equal(textarea.border, input.border);
        assert.equal(textarea.radius, input.radius);
        await page.keyboard.type('Note de contrôle');
        await expect(page.locator('#notes')).toHaveValue('Note de contrôle');
        for (const id of ['mixed', 'switch']) {
          await page.keyboard.press('Tab');
          await expect(page.locator('#' + id)).toBeFocused();
          await expect.poll(async () => (await style(page.locator('#' + id))).shadow).toEqual(input.shadow);
        }
        for (const field of await page.locator('input:not([aria-hidden]),textarea').all()) {
          await expect(field).toHaveAttribute('autocomplete', 'off');
          await expect(field).toHaveAttribute('data-bwignore', 'true');
        }
        await page.locator('#notes').evaluate(el => el.setAttribute('aria-invalid', 'true'));
        await page.locator('#notes').focus();
        await expect.poll(async () => (await style(page.locator('#notes'))).border).not.toEqual(input.border);
        await page.getByText('Nom fictif', { exact: true }).click();
        await expect(page.locator('#text')).toBeFocused();
        if ([390, 1440].includes(width)) await page.screenshot({ path: path.join(work, `primitives-${width}.png`), fullPage: true });
      });
      await run('actions-and-state', width, async page => {
        await page.locator('#action').click();
        await expect(page.locator('#summary')).toContainText('Actions 1 ; validations 0');
        await page.locator('#submit').click();
        await expect(page.locator('#summary')).toContainText('validations 1');
        const before = await page.locator('#save').boundingBox();
        await page.locator('#save').click();
        await expect(page.locator('#save')).toBeDisabled();
        await expect(page.locator('#save')).toHaveAttribute('aria-busy', 'true');
        const after = await page.locator('#save').boundingBox();
        assert.equal(before.width, after.width, 'spinner changes button width');
        await expect(page.locator('#save > svg:visible')).toHaveCount(1);
        await page.locator('#save').evaluate(el => el.click());
        await expect(page.locator('#summary')).toContainText('enregistrements 1');
        await page.locator('#finish').click();
        await expect(page.locator('#save')).toBeEnabled();
        await expect(page.locator('#save')).not.toHaveAttribute('aria-busy');
        const link = page.getByRole('link', { name: 'Voir le bilan' });
        await expect(link).not.toHaveAttribute('type');
        await link.click();
        assert.equal(new URL(page.url()).hash, '#summary');
        const mixed = page.locator('#mixed');
        await expect(mixed).toHaveAttribute('aria-checked', 'mixed');
        await expect(mixed.locator('svg.lucide-minus')).toBeVisible();
        await expect(mixed.locator('svg.lucide-check')).toBeHidden();
        await mixed.focus();
        await page.keyboard.press('Space');
        await expect(mixed).toHaveAttribute('aria-checked', 'true');
        await expect(mixed.locator('svg.lucide-check')).toBeVisible();
        await expect(mixed.locator('svg.lucide-minus')).toBeHidden();
        await page.keyboard.press('Space');
        await expect(mixed).toHaveAttribute('aria-checked', 'false');
        const toggle = page.locator('#switch');
        await toggle.focus();
        await page.keyboard.press('Space');
        await expect(toggle).toHaveAttribute('aria-checked', 'true');
        for (const id of ['disabled-checkbox', 'disabled-switch']) {
          await page.locator('#' + id).evaluate(el => el.click());
          await expect(page.locator('#' + id)).toHaveAttribute('aria-checked', 'false');
        }
      });
      await run('select-and-command', width, async page => {
        const trigger = page.locator('#choice');
        await trigger.focus();
        await page.keyboard.press('Space');
        const menu = page.locator('[data-slot="select-content"]');
        await expect(menu).toBeVisible();
        await expect(menu.getByRole('option', { name: 'Alpha', exact: true })).toBeFocused();
        await page.keyboard.press('ArrowDown');
        await expect(menu.getByRole('option', { name: 'Beta', exact: true })).toBeFocused();
        await page.keyboard.press('Enter');
        await expect(trigger).toContainText('Beta');
        await expect(trigger).toBeFocused();
        await page.keyboard.press('Space');
        await expect(menu.getByRole('option', { name: 'Beta', exact: true })).toBeFocused();
        await page.keyboard.press('Escape');
        await expect(menu).toHaveCount(0);
        await expect(trigger).toBeFocused();
        await page.locator('#disabled-select').evaluate(el => el.click());
        await expect(menu).toHaveCount(0);
        const search = page.getByRole('combobox', { name: 'Rechercher une commande' });
        await search.fill('Beta');
        await page.keyboard.press('Enter');
        await expect(page.locator('#command-result')).toHaveText('Commande : beta');
        await search.fill('introuvable');
        await expect(page.getByText('Aucun résultat')).toBeVisible();
      });
    }
    await run('forced-colors-and-reduced-motion', 390, async page => {
      await page.keyboard.press('Tab');
      await page.locator('#notes').focus();
      assert.equal((await style(page.locator('#notes'))).outline, 'solid');
      await page.locator('#save').click();
      const duration = await page.locator('[data-slot="button-spinner"]').evaluate(el => parseFloat(getComputedStyle(el).animationDuration));
      assert(duration < 0.001, 'spinner ignores reduced motion');
    }, { forcedColors: 'active' });
    await run('touch-controls', 390, async page => {
      await page.getByText('Sélection partielle', { exact: true }).tap();
      await expect(page.locator('#mixed')).toHaveAttribute('aria-checked', 'true');
      await page.getByText("Activer l'option", { exact: true }).tap();
      await expect(page.locator('#switch')).toHaveAttribute('aria-checked', 'true');
      await page.locator('#choice').tap();
      await page.locator('[data-slot="select-content"]').getByRole('option', { name: 'Beta' }).tap();
      await expect(page.locator('#choice')).toContainText('Beta');
    }, { isMobile: true, hasTouch: true });
  } finally {
    fs.writeFileSync(path.join(work, 'observations.json'), JSON.stringify({ date: '2026-10-11', environment: 'Chromium isolated real primitives and CSS, no API or authentication', scenarios: results }, null, 2));
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
