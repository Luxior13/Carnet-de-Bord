/**
 * Aperçu local pour l'agent Codex.
 *
 * Ouvre une ou plusieurs routes de l'app dev (port 3001), enregistre une
 * capture et les mesures de quelques boîtes (héros, tableau, cartes) pour
 * pouvoir comparer les pages au pixel. N'exige pas le mot de passe : une
 * session temporaire est créée pour l'occasion, puis supprimée.
 *
 * Usage :
 *   bun --env-file=packages/database/.env scripts/codex-preview.mjs \
 *     --width=1920 --height=1200 --out=.codex-preview \
 *     /membres/repertoire /systeme/utilisateurs
 */
import { createHash, randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import { PrismaClient } from '@prisma/client';
import { chromium } from '@playwright/test';

const BASE = process.env.CODEX_PREVIEW_BASE ?? 'http://localhost:3001';

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const match = args.find((value) => value.startsWith(`--${name}=`));

  return match ? match.slice(name.length + 3) : fallback;
};
const routes = args.filter((value) => !value.startsWith('--'));
const width = Number(option('width', '1920'));
const height = Number(option('height', '1200'));
const outDir = resolve(option('out', '.codex-preview'));
const captureMenu = option('menu', 'false') === 'true';

if (routes.length === 0) {
  routes.push('/membres/repertoire', '/systeme/utilisateurs');
}

const slug = (route) =>
  route.replace(/^\//, '').replace(/[^a-z0-9]+/gi, '-') || 'home';

const prisma = new PrismaClient();
const rawToken = randomBytes(32).toString('hex');
const hashedToken = createHash('sha256').update(rawToken).digest('hex');
const user = await prisma.user.findFirst({
  select: { id: true, securityVersion: true },
  where: { isProtected: true },
});
if (!user) throw new Error('Protected user missing');

const now = new Date();
const session = await prisma.session.create({
  data: {
    expiresAt: new Date(now.getTime() + 3_600_000),
    idleExpiresAt: new Date(now.getTime() + 3_600_000),
    lastSeenAt: now,
    mfaMethod: 'TOTP',
    mfaVerifiedAt: now,
    securityVersion: user.securityVersion,
    token: hashedToken,
    userId: user.id,
  },
  select: { id: true },
});

const readRects = () => {
  const round = (value) => Math.round(value * 10) / 10;
  const style = (selector) => {
    const element = document.querySelector(selector);
    if (!element) return null;
    const computed = getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    return {
      background: computed.backgroundColor,
      border: computed.borderColor,
      borderRadius: computed.borderRadius,
      color: computed.color,
      fontSize: computed.fontSize,
      fontWeight: computed.fontWeight,
      height: round(rect.height),
      padding: computed.padding,
      width: round(rect.width),
    };
  };
  const box = (element) => {
    if (!element) return null;
    const rect = element.getBoundingClientRect();

    return {
      bottom: round(rect.bottom),
      height: round(rect.height),
      left: round(rect.left),
      top: round(rect.top),
      width: round(rect.width),
    };
  };

  return {
    cards: [...document.querySelectorAll('[data-slot="card"]')].map(box),
    heading: box(document.querySelector('[data-slot="page-heading"]')),
    main: box(document.querySelector('main')),
    pageHeader: box(document.querySelector('main header')),
    searchInput: style('input[type="search"]'),
    table: box(document.querySelector('table')),
    trigger: style('[data-slot="select-trigger"]'),
    viewport: window.innerWidth,
  };
};

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const report = {};

try {
  const context = await browser.newContext({
    deviceScaleFactor: 1,
    viewport: { height, width },
  });
  await context.addCookies([
    {
      httpOnly: true,
      name: 'session',
      sameSite: 'Lax',
      secure: false,
      url: BASE,
      value: rawToken,
    },
  ]);
  const page = await context.newPage();

  for (const route of routes) {
    await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    report[route] = await page.evaluate(readRects);
    await page.screenshot({
      fullPage: true,
      path: join(outDir, `${slug(route)}.png`),
    });
    if (captureMenu) {
      await page.locator('[data-slot="select-trigger"]').first().click();
      await page.waitForTimeout(500);
      await page.screenshot({
        fullPage: true,
        path: join(outDir, `${slug(route)}-menu.png`),
      });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(200);
    }
    process.stdout.write(`captured ${route}\n`);
  }
} finally {
  await browser.close();
  await prisma.session.delete({ where: { id: session.id } });
  await prisma.$disconnect();
}

const reportPath = join(outDir, 'metrics.json');
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
