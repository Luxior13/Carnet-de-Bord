import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { generate } from 'otplib';

import { browserApi } from './browser-api';

/**
 * Mobile tour of every page on the production build (28 October 2026).
 * Runs only when MOBILE_TOUR_DIR is set: it writes captures and a report of
 * horizontal overflow and small touch targets there, outside the repository.
 */
const OUTPUT_DIR = process.env.MOBILE_TOUR_DIR;
const LOGIN_NAME = process.env.E2E_SUPERADMIN_LOGIN_NAME ?? '';
const PASSWORD = process.env.E2E_SUPERADMIN_PASSWORD ?? '';
const WIDTHS = [320, 390, 768] as const;
const HEIGHT = 780;

test.skip(!OUTPUT_DIR, 'MOBILE_TOUR_DIR is not set.');
test.describe.configure({ retries: 0 });

type PageReport = {
  name: string;
  overflow: string[];
  smallTargets: string[];
  width: number;
};

const reports: PageReport[] = [];

async function stableTotp(page: Page, secret: string): Promise<string> {
  const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
  if (remaining <= 5) await page.waitForTimeout((remaining + 1) * 1000);

  return generate({ secret });
}

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Identifiant de connexion').fill(LOGIN_NAME);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await page.getByRole('button', { name: 'Configurer maintenant' }).click();
  const key = (
    await page.getByLabel('Clé de configuration', { exact: true }).innerText()
  )
    .replace(/[\s-]/g, '')
    .toUpperCase();
  await page
    .getByRole('textbox', { name: /^Code à 6 chiffres/ })
    .fill(await stableTotp(page, key));
  await page
    .getByRole('button', { name: 'Activer la double authentification' })
    .click();
  await page
    .getByRole('checkbox', { name: /J.ai enregistré ces codes/ })
    .click();
  await page.getByRole('button', { name: 'Terminer' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
}

/** Elements wider than the screen, and touch targets under 44 px. */
async function measure(
  page: Page,
  width: number,
): Promise<{
  overflow: string[];
  smallTargets: string[];
}> {
  return page.evaluate((viewportWidth) => {
    const describe = (element: Element): string => {
      const html = element as HTMLElement;
      const label =
        html.getAttribute('aria-label') ||
        html.innerText?.trim().replace(/\s+/g, ' ').slice(0, 40) ||
        html.getAttribute('placeholder') ||
        '';
      const slot = html.getAttribute('data-slot');

      return `${element.tagName.toLowerCase()}${slot ? `[${slot}]` : ''} « ${label} »`;
    };
    const visible = (element: Element): boolean => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);

      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none' &&
        !element.closest('[aria-hidden="true"], [inert]')
      );
    };
    const overflow = new Set<string>();
    for (const element of Array.from(document.querySelectorAll('body *'))) {
      if (!visible(element)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.right > viewportWidth + 1 || rect.left < -1) {
        // Report the outermost offender only.
        const parent = element.parentElement;
        const parentRect = parent?.getBoundingClientRect();
        if (
          parent &&
          parentRect &&
          (parentRect.right > viewportWidth + 1 || parentRect.left < -1)
        )
          continue;
        let clipped = false;
        for (let node = parent; node; node = node.parentElement) {
          const style = getComputedStyle(node);
          if (
            /^(?:hidden|auto|scroll|clip)$/.test(style.overflowX) &&
            node.getBoundingClientRect().right <= viewportWidth + 1
          ) {
            clipped = true;
            break;
          }
        }
        if (!clipped)
          overflow.add(`${describe(element)} → ${Math.round(rect.right)} px`);
      }
    }
    const smallTargets = new Set<string>();
    if (viewportWidth < 640) {
      for (const element of Array.from(
        document.querySelectorAll(
          'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="combobox"], [role="menuitem"]',
        ),
      )) {
        if (!visible(element)) continue;
        const rect = element.getBoundingClientRect();
        // Inline links in running text are exempt (WCAG 2.5.8).
        if (
          element.tagName === 'A' &&
          getComputedStyle(element).display === 'inline'
        )
          continue;
        if (rect.height < 43.5 || rect.width < 24)
          smallTargets.add(
            `${describe(element)} ${Math.round(rect.width)}×${Math.round(rect.height)}`,
          );
      }
    }

    return { overflow: [...overflow], smallTargets: [...smallTargets] };
  }, width);
}

async function capture(page: Page, name: string, width: number): Promise<void> {
  await page.waitForTimeout(400);
  const file = (suffix: string): string =>
    path.join(OUTPUT_DIR ?? '', `${name}-${width}${suffix}.png`);
  await page.screenshot({ path: file('') });
  reports.push({ name, width, ...(await measure(page, width)) });
  const scrolled = await page.evaluate(() => {
    const main = document.getElementById('main-content');
    const scroller =
      main && main.scrollHeight > main.clientHeight + 4
        ? main
        : document.scrollingElement;
    if (!scroller || scroller.scrollHeight <= scroller.clientHeight + 4)
      return false;
    scroller.scrollTop = scroller.scrollHeight;

    return true;
  });
  if (scrolled) {
    await page.waitForTimeout(300);
    await page.screenshot({ path: file('-bas') });
  }
}

test('mobile tour of every page', async ({ page }) => {
  test.setTimeout(600_000);
  // The tour writes only under the directory given by its runner.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  mkdirSync(OUTPUT_DIR ?? '', { recursive: true });

  for (const width of WIDTHS) {
    await page.setViewportSize({ height: HEIGHT, width });
    await page.goto('/login');
    await expect(page.getByLabel('Identifiant de connexion')).toBeVisible();
    await capture(page, 'connexion', width);
  }

  await page.setViewportSize({ height: HEIGHT, width: 390 });
  await login(page);

  // Realistic data: a person with long values, and another account.
  const csrf = (await page.context().cookies()).find(
    (cookie) => cookie.name === '__Host-csrf-token',
  )?.value;
  const created = await browserApi<{ data?: { person?: { id: string } } }>(
    page,
    '/api/personnes',
    {
      data: {
        birthDate: '2001-04-12',
        emails: [
          {
            email: 'maximilien.alexandre.de-la-fontaine@exemple-association.fr',
            isPrimary: true,
            label: 'Personnel',
          },
          { email: 'max@exemple.fr', isPrimary: false, label: 'Travail' },
        ],
        firstName: 'Maximilien-Alexandre',
        lastName: 'De La Fontaine',
        nickname: 'MaxLaFontaineOfficiel',
        phones: [],
        socialProfiles: [],
        structureStatus: 'IN_STRUCTURE',
      },
      headers: { 'x-csrf-token': csrf ?? '' },
      method: 'POST',
    },
  );
  expect(created.status()).toBe(201);
  const personId = (await created.json()).data?.person?.id ?? '';

  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.E2E_DATABASE_URL } },
  });
  const other = await prisma.user.create({
    data: {
      firstName: 'Stéphanie-Marie',
      lastName: 'Dupont-Delacroix',
      loginName: 'stephanie.dupont',
      mfaEnabledAt: new Date(),
      passwordChangedAt: new Date(),
      passwordHash: 'unused-mobile-tour-fixture',
      permissions: { 'persons:view': true, 'users:view': true },
    },
  });
  await prisma.$disconnect();

  const pages: Array<[string, string]> = [
    ['accueil', '/'],
    ['mon-compte-profil', '/mon-compte'],
    ['mon-compte-autorisations', '/mon-compte?section=access'],
    ['mon-compte-securite', '/mon-compte?section=security'],
    ['repertoire', '/membres/repertoire'],
    ['repertoire-nouveau', '/membres/repertoire/nouveau'],
    ['personne-identite', `/membres/repertoire/${personId}`],
    [
      'personne-coordonnees',
      `/membres/repertoire/${personId}?section=coordonnees`,
    ],
    ['utilisateurs', '/systeme/utilisateurs'],
    ['utilisateurs-nouveau', '/systeme/utilisateurs/nouveau'],
    ['utilisateur-profil', `/systeme/utilisateurs/${other.id}`],
    [
      'utilisateur-autorisations',
      `/systeme/utilisateurs/${other.id}?section=access`,
    ],
    [
      'utilisateur-securite',
      `/systeme/utilisateurs/${other.id}?section=security`,
    ],
    ['parametres', '/systeme/parametres'],
    ['feuille-de-route', '/systeme/feuille-de-route'],
    ['introuvable', '/page-qui-n-existe-pas'],
  ];

  for (const width of WIDTHS) {
    await page.setViewportSize({ height: HEIGHT, width });
    for (const [name, href] of pages) {
      await page.goto(href);
      await page
        .locator('#main-content, main')
        .first()
        .waitFor({ state: 'visible' });
      await page.waitForLoadState('networkidle');
      await capture(page, name, width);
    }
    // The navigation drawer on small screens.
    if (width < 1024) {
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      const trigger = page.locator('[data-sidebar="trigger"]').first();
      if (await trigger.isVisible()) {
        await trigger.click();
        await capture(page, 'menu', width);
        await page.keyboard.press('Escape');
      }
    }
  }

  // eslint-disable-next-line security/detect-non-literal-fs-filename
  writeFileSync(
    path.join(OUTPUT_DIR ?? '', 'rapport.json'),
    JSON.stringify(reports, null, 2),
  );
});
