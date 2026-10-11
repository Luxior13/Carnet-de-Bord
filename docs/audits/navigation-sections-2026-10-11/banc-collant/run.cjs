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
const work = fs.mkdtempSync(path.join(require('node:os').tmpdir(), 'noctambule-sticky-sections-'));
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
    res.end('<!doctype html><html lang="fr" class="dark"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/bundle.css"><style>:root{--font-geist-sans:Arial,sans-serif;--font-geist-mono:monospace}html,body,#root{height:100%;margin:0;overflow:hidden}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const observations = [];
  const nav = page => page.locator('[data-slot="page-section-navigation"]');
  const frame = page => page.locator('#main-content');
  const viewport = page => nav(page).locator('> div');
  async function stableFrame(page) { await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))); }
  async function metrics(page) { return page.evaluate(() => {
    const main = document.getElementById('main-content'), el = document.querySelector('[data-slot="page-section-navigation"]'), header = document.querySelector('header'), probe = document.getElementById('layout-probe');
    const bounds = el.getBoundingClientRect(), style = getComputedStyle(el);
    return { y: bounds.y, height: bounds.height, headerBottom: header.getBoundingClientRect().bottom, rootTop: main.getBoundingClientRect().top, scrollTop: main.scrollTop, scrollHeight: main.scrollHeight, probeOffset: probe.getBoundingClientRect().top + main.scrollTop, background: style.backgroundColor, shadow: style.boxShadow, stuck: el.getAttribute('data-stuck') };
  }); }
  async function run(name, width, route, fn, height = 900) {
    if (process.env.AUDIT_ONLY && !name.includes(process.env.AUDIT_ONLY)) return;
    const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'reduce' });
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
      if (!route.includes('empty')) await nav(page).waitFor();
      if (!route.startsWith('/stress')) await page.locator('#main-content input').first().waitFor({ state: 'visible' });
      await stableFrame(page);
      const details = await fn(page);
      assert.deepEqual(errors, []);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'page overflow');
      observations.push({ name, width, height, result: 'passed', ...details });
      console.log(`${width}×${height} ${name}: passed`);
    } catch (error) {
      observations.push({ name, width, height, result: 'failed', error: error.message, metrics: await metrics(page).catch(() => null) });
      console.log(`${width}×${height} ${name}: FAILED ${error.message}`);
      await page.screenshot({ path: path.join(work, `${name}-${width}-failed.png`) });
    } finally { await context.close(); }
  }
  async function stickAndReturn(page, capture) {
    const initial = await metrics(page);
    assert.equal(initial.shadow, 'none', 'shadow visible at rest');
    assert.equal(initial.stuck, 'false');
    assert.equal(initial.height, 49, 'bar no longer preserves 48px controls plus 1px border');
    for (const link of await nav(page).getByRole('link').all()) assert.equal((await link.boundingBox()).height, 48);
    assert(initial.y > initial.headerBottom + 10, 'fixture has no initial gap');
    const scroll = initial.y - initial.rootTop + 32;
    await frame(page).evaluate((el, value) => { el.scrollTop = value; }, scroll);
    await stableFrame(page);
    await expect.poll(async () => (await metrics(page)).shadow).not.toBe('none');
    await expect(nav(page)).toHaveAttribute('data-stuck', 'true');
    const stuck = await metrics(page);
    assert(Math.abs(stuck.y - stuck.headerBottom) <= 1, 'sticky junction with header has gap/overlap');
    assert.equal(stuck.height, initial.height, 'bar height changed');
    assert.equal(stuck.scrollHeight, initial.scrollHeight, 'scroll extent changed');
    assert(Math.abs(stuck.probeOffset - initial.probeOffset) <= 1, 'content shifted');
    assert.equal(stuck.background, initial.background, 'surface changed when stuck');
    assert(!/transparent|rgba\([^)]*,\s*0\)/.test(stuck.background), 'bar background is transparent');
    const link = nav(page).getByRole('link').first();
    const scrollBeforeFocus = stuck.scrollTop;
    await link.focus();
    await expect(link).toBeFocused();
    assert.equal((await metrics(page)).scrollTop, scrollBeforeFocus, 'focus moved main scroll');
    if (capture) await page.screenshot({ path: path.join(work, capture) });
    await frame(page).evaluate(el => { el.scrollTop = 0; });
    await stableFrame(page);
    await expect.poll(async () => (await metrics(page)).shadow).toBe('none');
    await expect(nav(page)).toHaveAttribute('data-stuck', 'false');
    const returned = await metrics(page);
    assert.equal(returned.height, initial.height);
    assert(Math.abs(returned.y - initial.y) <= 1, 'bar did not return to original position');
    return { initial, stuck, returned };
  }
  try {
    for (const width of [390, 1440]) {
      for (const [name, route] of [['account', '/mon-compte'], ['user', '/systeme/utilisateurs/audit-target'], ['person', '/membres/repertoire/audit-person']]) {
        await run(name, width, route, page => stickAndReturn(page, name === 'user' ? `user-sticky-${width}.png` : null));
      }
    }
    await run('stress-horizontal', 320, '/stress', async page => {
      const details = await stickAndReturn(page);
      await frame(page).evaluate(el => { el.scrollTop = 240; });
      await stableFrame(page);
      const scrollBefore = await frame(page).evaluate(el => el.scrollTop);
      const next = nav(page).getByRole('button', { name: 'Afficher les sections suivantes' });
      await expect(next).toBeEnabled();
      await next.click();
      await expect.poll(() => viewport(page).evaluate(el => el.scrollLeft)).toBeGreaterThan(0);
      const last = nav(page).getByRole('link').last();
      await last.focus();
      await expect(last).toBeFocused();
      const inner = await viewport(page).boundingBox(), link = await last.boundingBox();
      assert(link.x >= inner.x - 1 && link.x < inner.x + inner.width, 'focused section start hidden');
      assert.equal(await frame(page).evaluate(el => el.scrollTop), scrollBefore, 'horizontal scroll moved main');
      await expect.poll(async () => (await metrics(page)).shadow).not.toBe('none');
      return details;
    });
    await run('landscape', 900, '/systeme/utilisateurs/audit-target', page => stickAndReturn(page), 480);
    await run('jump-from-below-viewport', 390, '/stress?tall=1', async page => {
      const initial = await metrics(page);
      assert(initial.y > 480, 'navigation not initially below viewport');
      return stickAndReturn(page);
    }, 480);
    await run('empty-then-sections', 390, '/stress?empty=1', async page => {
      await expect(nav(page)).toHaveCount(0);
      await page.locator('#show-sections').click();
      await nav(page).waitFor();
      await stableFrame(page);
      return stickAndReturn(page);
    });
  } finally {
    fs.writeFileSync(path.join(work, 'observations.json'), JSON.stringify({ date: '2026-10-11', browser: browser.version(), environment: 'Real Header, SidebarProvider, section navigation and page components; isolated internal scrolling frame; simulated context/router/API; fallback font; no database', observations }, null, 2));
    await browser.close();
    await new Promise(resolve => server.close(resolve));
  }
  if (observations.some(item => item.result !== 'passed')) process.exitCode = 1;
}
main().catch(error => { console.error(error); process.exitCode = 1; });
