import { mkdirSync } from 'node:fs';
import path from 'node:path';

import {
  type BrowserContext,
  devices,
  expect,
  type Page,
  test,
} from '@playwright/test';

import { FEATURES } from '../src/shared/constants/feature-registry.constants';
import { browserApi } from './browser-api';

/**
 * Mobile layout of every page (mobile audit of 28 October 2026): on an
 * emulated phone, no element may leave the screen and no touch target may be
 * under 44 px below 640 px. Every live page of the feature registry must be
 * in the list below, so a new page is checked from its first day.
 * Set MOBILE_TOUR_DIR to also keep a capture of each screen.
 */
const WIDTHS = [320, 390, 768] as const;
const HEIGHT = 780;
const CAPTURE_DIR = process.env.MOBILE_TOUR_DIR;

type Violation = string;

/** Measured in the page: overflow and touch targets, pseudo hit areas included. */
async function measure(page: Page, width: number): Promise<Violation[]> {
  return page.evaluate((viewportWidth) => {
    const describe = (element: Element): string => {
      const html = element as HTMLElement;
      const label =
        html.getAttribute('aria-label') ||
        html.innerText?.trim().replace(/\s+/g, ' ').slice(0, 40) ||
        html.getAttribute('placeholder') ||
        '';

      return `${element.tagName.toLowerCase()} « ${label} »`;
    };
    const visible = (element: Element): boolean => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);

      return (
        rect.width > 2 &&
        rect.height > 2 &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0' &&
        !element.closest('[aria-hidden="true"], [inert]')
      );
    };
    const violations: string[] = [];
    // The page itself must never scroll sideways.
    const main = document.getElementById('main-content');
    for (const scroller of [document.scrollingElement, main]) {
      if (scroller && scroller.scrollWidth > scroller.clientWidth + 1)
        violations.push(
          `la page défile horizontalement de ${scroller.scrollWidth - scroller.clientWidth} px`,
        );
    }
    for (const element of Array.from(document.querySelectorAll('body *'))) {
      if (!visible(element)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.right <= viewportWidth + 1 && rect.left >= -1) continue;
      const parent = element.parentElement;
      const parentRect = parent?.getBoundingClientRect();
      if (
        parentRect &&
        (parentRect.right > viewportWidth + 1 || parentRect.left < -1)
      )
        continue;
      let clipped = false;
      // A deliberate sideways scroller or a clipping box contains it; the
      // shell scroller does not (it scrolls vertically, hence auto on x).
      for (
        let node = parent;
        node && node !== main && node !== document.body;
        node = node.parentElement
      ) {
        if (
          /^(?:hidden|auto|scroll|clip)$/.test(getComputedStyle(node).overflowX)
        ) {
          clipped = true;
          break;
        }
      }
      if (!clipped)
        violations.push(
          `déborde : ${describe(element)} jusqu’à ${Math.round(rect.right)} px`,
        );
    }
    if (viewportWidth >= 640) return violations;
    for (const element of Array.from(
      document.querySelectorAll(
        'a[href], button, input:not([type="hidden"]), select, textarea, [role="button"], [role="tab"], [role="switch"], [role="checkbox"], [role="combobox"], [role="menuitem"]',
      ),
    )) {
      if (!visible(element)) continue;
      // Links inside running text are exempt (WCAG 2.5.8).
      if (
        element.tagName === 'A' &&
        getComputedStyle(element).display === 'inline'
      )
        continue;
      const rect = element.getBoundingClientRect();
      // An invisible ::after may enlarge the hit area (switches, checkboxes).
      const after = getComputedStyle(element, '::after');
      const grow = (value: string): number =>
        after.position === 'absolute' && after.content !== 'none'
          ? Math.max(0, -parseFloat(value) || 0)
          : 0;
      const height = rect.height + grow(after.top) + grow(after.bottom);
      const targetWidth = rect.width + grow(after.left) + grow(after.right);
      if (height < 43.5 || targetWidth < 24)
        violations.push(
          `cible ${Math.round(targetWidth)}×${Math.round(height)} : ${describe(element)}`,
        );
      // No clipping box may cut a target (code reviews of 29 and 30 October
      // 2026): a button half hidden by its card cannot be reached. Each axis
      // on its own: it is checked while it clips (hidden, clip) and stops at
      // its first scroller (auto, scroll), which can bring the target into
      // view. A target wholly outside a box is hidden on purpose (closed
      // disclosure), so only a partial cut counts.
      const axes = [
        { end: 'right', property: 'overflowX', start: 'left' },
        { end: 'bottom', property: 'overflowY', start: 'top' },
      ] as const;
      const open = new Set<(typeof axes)[number]>(axes);
      let cut = false;
      for (
        let node = element.parentElement;
        node && node !== main && node !== document.body && open.size > 0;
        node = node.parentElement
      ) {
        const style = getComputedStyle(node);
        const box = node.getBoundingClientRect();
        for (const axis of [...open]) {
          const overflow = style[axis.property];
          if (overflow === 'auto' || overflow === 'scroll') {
            open.delete(axis);
            continue;
          }
          if (overflow !== 'hidden' && overflow !== 'clip') continue;
          const before = rect[axis.start] < box[axis.start] - 1;
          const after = rect[axis.end] > box[axis.end] + 1;
          const outside =
            rect[axis.end] <= box[axis.start] ||
            rect[axis.start] >= box[axis.end];
          if (outside) {
            open.clear();
            cut = false;
            break;
          }
          if (before || after) cut = true;
        }
      }
      if (cut) violations.push(`cible rognée : ${describe(element)}`);
    }

    return violations;
  }, width);
}

async function visit(
  page: Page,
  name: string,
  width: number,
  problems: string[],
): Promise<void> {
  await page.waitForLoadState('load');
  await page.waitForTimeout(500);
  if (CAPTURE_DIR)
    await page.screenshot({
      path: path.join(CAPTURE_DIR, `${name}-${width}.png`),
    });
  for (const violation of await measure(page, width))
    problems.push(`${name} à ${width} px — ${violation}`);
}

async function phone(page: Page, signedIn: boolean): Promise<BrowserContext> {
  const browser = page.context().browser();
  if (!browser) throw new Error('The mobile check needs a browser.');

  return browser.newContext({
    ...devices['Pixel 7'],
    storageState: signedIn ? await page.context().storageState() : undefined,
    viewport: { height: HEIGHT, width: WIDTHS[0] },
  });
}

export async function expectMobileLayouts(
  page: Page,
  otherUserId: string,
): Promise<void> {
  // About 50 screens: their own time on top of the smoke test.
  test.setTimeout(test.info().timeout + 300_000);
  if (CAPTURE_DIR) {
    // The runner chooses this directory, outside the repository.
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    mkdirSync(CAPTURE_DIR, { recursive: true });
  }
  const csrf = (await page.context().cookies()).find(
    (cookie) => cookie.name === '__Host-csrf-token',
  )?.value;
  // Long values, the hardest case for a narrow screen.
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

  const pages: ReadonlyArray<readonly [string, string]> = [
    ['accueil', '/'],
    ['mon-compte', '/mon-compte'],
    ['mon-compte-autorisations', '/mon-compte?section=access'],
    ['mon-compte-securite', '/mon-compte?section=security'],
    ['repertoire', '/membres/repertoire'],
    ['repertoire-nouveau', '/membres/repertoire/nouveau'],
    ['personne', `/membres/repertoire/${personId}`],
    [
      'personne-coordonnees',
      `/membres/repertoire/${personId}?section=coordonnees`,
    ],
    ['utilisateurs', '/systeme/utilisateurs'],
    ['utilisateurs-nouveau', '/systeme/utilisateurs/nouveau'],
    ['utilisateur', `/systeme/utilisateurs/${otherUserId}`],
    [
      'utilisateur-autorisations',
      `/systeme/utilisateurs/${otherUserId}?section=access`,
    ],
    [
      'utilisateur-securite',
      `/systeme/utilisateurs/${otherUserId}?section=security`,
    ],
    ['parametres', '/systeme/parametres'],
    ['feuille-de-route', '/systeme/feuille-de-route'],
    ['introuvable', '/page-qui-n-existe-pas'],
  ];
  const visited = new Set(pages.map(([, href]) => href.split('?')[0]));
  const missing = Object.values(FEATURES)
    .filter((feature) => feature.availability === 'live')
    .map((feature) => feature.href)
    .filter((href) => !visited.has(href));
  expect(
    missing,
    'Ajoutez chaque nouvelle page à la vérification mobile (e2e/mobile-layout.checks.ts).',
  ).toEqual([]);

  const problems: string[] = [];
  const signedOut = await phone(page, false);
  const signedIn = await phone(page, true);
  try {
    const loginPage = await signedOut.newPage();
    const mobile = await signedIn.newPage();
    for (const width of WIDTHS) {
      await loginPage.setViewportSize({ height: HEIGHT, width });
      await loginPage.goto('/login');
      await expect(
        loginPage.getByLabel('Identifiant de connexion'),
      ).toBeVisible();
      await visit(loginPage, 'connexion', width, problems);

      await mobile.setViewportSize({ height: HEIGHT, width });
      for (const [name, href] of pages) {
        await mobile.goto(href);
        await mobile.locator('#main-content, main').first().waitFor();
        await visit(mobile, name, width, problems);
      }
      if (width < 1024) {
        await mobile.goto('/');
        await mobile.locator('[data-sidebar="trigger"]').first().click();
        await visit(mobile, 'menu', width, problems);
        await mobile.keyboard.press('Escape');
      }
    }
  } finally {
    await signedOut.close();
    await signedIn.close();
  }
  expect(problems, 'Règles mobiles (docs/design/comportements.md)').toEqual([]);
}
