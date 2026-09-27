import { expect, type Page, type Route } from '@playwright/test';

import type { SystemActivityJournalLog } from '../src/features/audit/system-activity.types';

/** Fictional events; every API call in this journey is intercepted. */
export function journalFixture(index: number): SystemActivityJournalLog {
  const action =
    index === 1
      ? 'STEP_UP_FAILED'
      : index === 4
        ? 'AUDIT_EXPORT'
        : index % 3 === 0
          ? 'PERSON_UPDATE'
          : index % 3 === 1
            ? 'USER_UPDATE'
            : 'PASSWORD_RESET';

  return {
    action,
    actorLoginName: 'alice',
    actorName: 'Alice Exemple',
    actorRole: 'ADMIN',
    actorSnapshot: {
      displayName: 'Alice Exemple',
      loginName: 'alice',
      role: 'ADMIN',
    },
    category:
      action === 'STEP_UP_FAILED'
        ? 'AUTH'
        : action === 'AUDIT_EXPORT'
          ? 'SYSTEM'
          : index % 3 === 0
            ? 'PERSON'
            : 'USER',
    createdAt: new Date(
      Date.UTC(2026, 8, 27, 10, 0) - index * 60_000,
    ).toISOString(),
    description: 'Mise à jour du dossier de démonstration.',
    entityDisplayName: index % 3 === 0 ? 'Camille Démonstration' : null,
    entityId: index % 3 === 0 ? 'person-demo' : null,
    entityType: index % 3 === 0 ? 'PERSON' : null,
    eventKind: 'ACTIVITY',
    eventVersion: 1,
    fieldChanges:
      index % 3 === 0
        ? [
            {
              action: 'UPDATE',
              after: 'Camille',
              before: 'Cam',
              fieldKey: 'nickname',
              id: `change-${index}-1`,
              recordId: null,
              sectionKey: 'identity',
            },
            {
              action: 'UPDATE',
              after: 'Personnel',
              before: 'Ancien',
              fieldKey: 'label',
              id: `change-${index}-2`,
              recordId: 'contact-a',
              sectionKey: 'contacts',
            },
            {
              action: 'DELETE',
              after: null,
              before: 'Professionnel',
              fieldKey: 'label',
              id: `change-${index}-3`,
              recordId: 'contact-b',
              sectionKey: 'contacts',
            },
          ]
        : [],
    id: `demo-${index}`,
    ipAddress: '192.0.2.1',
    metadata: null,
    outcome: action === 'STEP_UP_FAILED' ? 'FAILURE' : 'SUCCESS',
    pageKey: index % 3 === 0 ? 'persons' : 'users',
    poleKey: index % 3 === 0 ? 'internal' : 'system',
    requestId: `request-${index}`,
    severity:
      action === 'AUDIT_EXPORT'
        ? 'CRITICAL'
        : index % 3 === 2
          ? 'WARNING'
          : 'INFO',
    stream: 'IDENTITY',
    tabKey: null,
    targetLoginName: 'camille',
    targetName: index % 3 === 0 ? null : 'Camille Exemple',
    targetRole: 'USER',
    targetSnapshot: { displayName: null, loginName: null, role: null },
    targetUserId: index % 3 === 0 ? null : 'user-demo',
    userAgent: 'Test browser',
    userId: 'author-demo',
  };
}

export async function expectJournalInvestigation(page: Page): Promise<{
  appendMilliseconds: number;
  geometry: unknown[];
  mountedEvents: number;
}> {
  const originalViewport = page.viewportSize();
  const requests: URLSearchParams[] = [];
  const exports: string[] = [];
  let mode: 'normal' | 'error' | 'empty' = 'normal';
  let pauseRead: Promise<void> | null = null;
  let pauseExport: Promise<void> | null = null;
  let requireProof = false;
  const matcher = '**/api/systeme/journal-activite*';
  const handler = async (route: Route): Promise<void> => {
    const query = new URL(route.request().url()).searchParams;
    if (query.has('format')) {
      exports.push(query.toString());
      if (pauseExport) await pauseExport;
      if (requireProof) {
        requireProof = false;
        await route.fulfill({
          json: {
            error: {
              code: 'REAUTHENTICATION_REQUIRED',
              message: 'Confirmation requise',
            },
            success: false,
          },
          status: 403,
        });
      } else
        await route.fulfill({
          body: 'id,action\ndemo-0,PERSON_UPDATE',
          contentType: 'text/csv',
          headers: {
            'content-disposition': 'attachment; filename="journal-demo.csv"',
          },
        });

      return;
    }
    requests.push(query);
    if (pauseRead) await pauseRead;
    if (mode === 'error') {
      await route.fulfill({
        json: {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Lecture temporairement indisponible',
          },
          success: false,
        },
        status: 503,
      });

      return;
    }
    const offset = Number(query.get('cursor') ?? 0);
    await route.fulfill({
      json: {
        data: {
          logs:
            mode === 'empty'
              ? []
              : Array.from({ length: 25 }, (_, i) =>
                  journalFixture(offset + i),
                ),
          nextCursor:
            mode === 'empty' || offset >= 175 ? null : String(offset + 25),
          pageSize: 25,
          sensitiveDetailsVisible: true,
          snapshotAt: '2026-09-27T12:00:00Z',
        },
        success: true,
      },
    });
  };
  await page.route(matcher, handler);
  const proofHandler = async (route: Route): Promise<void> => {
    await route.fulfill({
      json: {
        data: {
          criticalMfaExpiresAt: null,
          expiresAt: '2026-09-27T14:00:00Z',
          kind: 'full',
          passwordExpiresAt: null,
        },
        success: true,
      },
    });
  };
  await page.route('**/api/auth/step-up', proofHandler);
  const geometry: unknown[] = [];
  try {
    await page.goto('/systeme/journal-activite');
    await expect(page.locator('[data-log-id]')).toHaveCount(25);
    for (const width of [1920, 1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({ height: 950, width });
      const filters = page.getByRole('button', { name: /^Filtres/ });
      if ((await filters.getAttribute('aria-expanded')) === 'false')
        await filters.click();
      const measured = await page.evaluate(() => {
        const panel = document.querySelector(
          '[aria-label="Filtres du journal"]',
        ) as HTMLElement;
        const row = document.querySelector('[data-log-id]') as HTMLElement;
        const summary = document.querySelector(
          '[data-event-summary]',
        ) as HTMLElement;
        const overflow = Array.from(
          panel.querySelectorAll<HTMLElement>('input,button,[role="combobox"]'),
        ).some(
          (el) =>
            el.getBoundingClientRect().right >
            panel.getBoundingClientRect().right + 1,
        );

        return {
          internalOverflow: panel.scrollWidth > panel.clientWidth + 1,
          overflow,
          rowHeight: row.clientHeight,
          summaryWidth: summary.clientWidth,
          width: innerWidth,
        };
      });
      geometry.push(measured);
      expect(measured.summaryWidth).toBeGreaterThan(100);
      expect(measured.overflow).toBe(false);
      expect(measured.internalOverflow).toBe(false);
    }
    await page.setViewportSize({ height: 950, width: 1440 });
    const first = page.locator('[data-log-id="demo-0"]');
    await first.locator('button').first().focus();
    await first.locator('button').first().press('Enter');
    await expect(first.getByText('Pseudo', { exact: true })).toBeVisible();
    await expect(first.getByText('contact-a', { exact: true })).toBeVisible();
    await expect(first.getByText('contact-b', { exact: true })).toBeVisible();
    await expect(first.getByText('Coordonnées · Suppression')).toBeVisible();
    await first.locator('button').first().press('Enter');

    await page.goto(
      '/systeme/journal-activite?entityType=PERSON&entityId=person-demo&sectionKey=contacts&fieldKey=email&recordId=contact-a',
    );
    await expect(page.locator('[data-log-id]')).toHaveCount(25);
    await page.getByRole('button', { exact: true, name: 'Connexions' }).click();
    await expect
      .poll(() => requests.at(-1)?.get('logType'))
      .toBe('connections');
    for (const key of [
      'entityId',
      'entityType',
      'sectionKey',
      'fieldKey',
      'recordId',
      'category',
      'pageKey',
      'poleKey',
    ])
      expect(requests.at(-1)?.has(key)).toBe(false);
    await page.getByRole('button', { exact: true, name: 'Activité' }).click();
    await page.getByRole('combobox', { exact: true, name: 'Action' }).click();
    await expect(
      page.getByRole('option', { exact: true, name: 'Connexion réussie' }),
    ).toHaveCount(0);
    await page
      .getByRole('option', { exact: true, name: 'Fiche personne modifiée' })
      .click();
    await expect
      .poll(() => requests.at(-1)?.get('action'))
      .toBe('PERSON_UPDATE');
    const chip = page.getByRole('button', {
      exact: true,
      name: 'Retirer le filtre Fiche personne modifiée',
    });
    const box = await chip.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(40);
    await chip.click();
    await expect(page.getByRole('button', { name: /^Filtres/ })).toBeFocused();

    await page.getByRole('combobox', { exact: true, name: 'Période' }).click();
    await page
      .getByRole('option', { exact: true, name: 'Plage personnalisée' })
      .click();
    await expect(
      page.getByLabel('Date de début', { exact: true }),
    ).toBeFocused();
    await page.getByLabel('Date de début', { exact: true }).fill('2023-01-01');
    await page.getByLabel('Date de fin', { exact: true }).fill('2026-01-01');
    const count = requests.length;
    await page
      .getByRole('button', { exact: true, name: 'Appliquer la période' })
      .click();
    await expect(
      page.getByRole('alert').filter({ hasText: '366 jours' }),
    ).toBeVisible();
    expect(requests).toHaveLength(count);
    await expect(page.getByLabel('Date de fin', { exact: true })).toBeFocused();
    await page.setViewportSize({ height: 950, width: 768 });
    expect(
      await page
        .locator('[aria-label="Filtres du journal"]')
        .evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true);
    await page.getByLabel('Date de début', { exact: true }).fill('2026-09-27');
    await page.getByLabel('Date de fin', { exact: true }).fill('2026-09-27');
    await page
      .getByRole('button', { exact: true, name: 'Appliquer la période' })
      .click();
    await expect.poll(() => requests.at(-1)?.get('period')).toBe('custom');
    expect(
      new Date(requests.at(-1)?.get('to') ?? '').getTime() -
        new Date(requests.at(-1)?.get('from') ?? '').getTime(),
    ).toBe(86_399_999);
    await page
      .getByRole('button', { exact: true, name: 'Réinitialiser' })
      .click();
    await expect.poll(() => requests.at(-1)?.get('period')).toBe('30d');

    let releaseRead = (): void => {};
    pauseRead = new Promise<void>((resolve) => {
      releaseRead = resolve;
    });
    const refresh = page.getByRole('button', {
      exact: true,
      name: 'Actualiser',
    });
    await refresh.focus();
    await refresh.press('Enter');
    await expect(refresh).toHaveAttribute('aria-disabled', 'true');
    await expect(refresh).toBeFocused();
    await expect(page.locator('[data-log-id]')).toHaveCount(25);
    releaseRead();
    pauseRead = null;
    await expect(refresh).toHaveAttribute('aria-disabled', 'false');
    await expect(refresh).toBeFocused();

    mode = 'error';
    await refresh.click();
    await expect(
      page.getByText('Lecture temporairement indisponible'),
    ).toBeVisible();
    await expect(page.locator('[data-log-id]')).toHaveCount(25);
    mode = 'normal';
    await page.getByRole('button', { exact: true, name: 'Réessayer' }).click();
    await expect(
      page.getByText('Lecture temporairement indisponible'),
    ).toHaveCount(0);
    const start = Date.now();
    for (let batch = 1; batch <= 7; batch++) {
      await page
        .getByRole('button', { exact: true, name: 'Charger plus' })
        .click();
      await expect(page.locator('[data-log-id]')).toHaveCount((batch + 1) * 25);
      await expect(
        page.locator(`[data-log-id="demo-${batch * 25}"] > button`),
      ).toBeFocused();
    }
    const appendMilliseconds = Date.now() - start;

    await page.setViewportSize({ height: 950, width: 1440 });
    await page
      .getByLabel('Auteur ou compte concerné', { exact: true })
      .fill('Alice');
    await expect.poll(() => requests.at(-1)?.get('search')).toBe('Alice');
    let releaseExport = (): void => {};
    pauseExport = new Promise<void>((resolve) => {
      releaseExport = resolve;
    });
    requireProof = true;
    await page.getByRole('button', { exact: true, name: 'Exporter' }).click();
    await expect(page.getByText(/Jusqu’à 50 000 événements/)).toBeVisible();
    await page.getByRole('menuitem', { name: 'CSV — tableur' }).click();
    await expect.poll(() => exports.length).toBe(1);
    await page
      .getByLabel('Auteur ou compte concerné', { exact: true })
      .fill('Camille');
    await expect.poll(() => requests.at(-1)?.get('search')).toBe('Camille');
    releaseExport();
    pauseExport = null;
    const dialog = page.getByRole('dialog', {
      name: 'Confirmer l’export du journal',
    });
    await expect(dialog).toBeVisible();
    await dialog
      .locator('#admin-step-up-password')
      .fill('fictional-test-password');
    await dialog.locator('#admin-step-up-code').fill('123456');
    const download = page.waitForEvent('download');
    await dialog
      .getByRole('button', { name: 'Confirmer et continuer' })
      .click();
    await download;
    expect(exports[1]).toBe(exports[0]);
    expect(new URLSearchParams(exports[1]).get('search')).toBe('Alice');

    mode = 'empty';
    await refresh.click();
    await expect(
      page.getByText('Aucun événement pour ces filtres'),
    ).toBeVisible();
    mode = 'error';
    await page.goto('/systeme/journal-activite');
    await expect(
      page.getByText('Journal indisponible', { exact: true }),
    ).toBeVisible();
    mode = 'normal';
    await page.getByRole('button', { exact: true, name: 'Réessayer' }).click();
    await expect(page.locator('[data-log-id]')).toHaveCount(25);

    return { appendMilliseconds, geometry, mountedEvents: 200 };
  } finally {
    await page.unroute(matcher, handler);
    await page.unroute('**/api/auth/step-up', proofHandler);
    if (originalViewport) await page.setViewportSize(originalViewport);
  }
}
