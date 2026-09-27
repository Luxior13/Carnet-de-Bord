import { expect, type Page } from '@playwright/test';

/** Browser regression with simulated settings only; never writes real configuration. */
export async function expectSystemSettingsDraftSafety(
  page: Page,
): Promise<void> {
  const endpoint = (url: URL): boolean =>
    url.pathname === '/api/systeme/parametres' ||
    url.pathname.startsWith('/api/systeme/parametres/');
  const settings = [
    {
      key: 'notifications.retentionDays',
      updatedAt: new Date(0).toISOString(),
      value: 180,
      version: 0,
    },
    {
      key: 'audit.retentionDays',
      updatedAt: new Date(0).toISOString(),
      value: 1095,
      version: 0,
    },
  ];
  let mode: 'success' | 'conflict' | 'error' = 'conflict';
  let failConflictRead = false;
  const writes: Array<{ expectedVersion: number; value: number }> = [];
  await page.route(endpoint, async (route) => {
    if (route.request().method() === 'GET') {
      if (failConflictRead)
        return route.fulfill({
          json: {
            error: { code: 'INTERNAL_ERROR', message: 'Lecture indisponible' },
            success: false,
          },
          status: 500,
        });

      return route.fulfill({ json: { data: settings, success: true } });
    }
    const body = route.request().postDataJSON();
    writes.push(body);
    const current = settings[0];
    if (!current) throw new Error('Missing fixture setting');
    if (mode === 'conflict') {
      settings[0] = {
        ...current,
        updatedAt: '2026-09-27T12:00:00Z',
        value: 200,
        version: 3,
      };

      return route.fulfill({
        json: {
          error: { code: 'CONFLICT', message: 'Conflit' },
          success: false,
        },
        status: 409,
      });
    }
    if (mode === 'error')
      return route.fulfill({
        json: {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Enregistrement indisponible',
          },
          success: false,
        },
        status: 500,
      });
    settings[0] = {
      ...current,
      updatedAt: '2026-09-27T12:00:00Z',
      value: body.value,
      version: current.version + 1,
    };

    return route.fulfill({ json: { data: settings[0], success: true } });
  });
  try {
    await page.goto('/systeme/parametres');
    const notificationsRow = page.locator(
      '[data-setting-key="notifications.retentionDays"]',
    );
    const auditRow = page.locator('[data-setting-key="audit.retentionDays"]');
    const input = notificationsRow.getByRole('spinbutton');
    const audit = auditRow.getByRole('spinbutton');
    const save = notificationsRow.getByRole('button', { name: /^Enregistrer/ });
    await expect(input).toHaveValue('180');
    await expect(page.getByRole('spinbutton')).toHaveCount(2);
    await expect(
      page.getByText('Interface générale', { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText('Lignes par page', { exact: true }),
    ).toHaveCount(0);
    await input.fill('365');
    await audit.fill('1200');
    await input.press('Enter');
    await expect(
      notificationsRow.getByRole('button', { name: 'Conserver ma saisie' }),
    ).toBeVisible();
    await expect(input).toHaveValue('365');
    await expect(audit).toHaveValue('1200');
    await expect(save).toBeDisabled();
    await notificationsRow
      .getByRole('button', { name: 'Conserver ma saisie' })
      .click();
    await expect(input).toBeFocused();
    mode = 'success';
    await save.click();
    await expect(save).toBeDisabled();
    expect(writes.at(-1)).toEqual({ expectedVersion: 3, value: 365 });
    await expect(audit).toHaveValue('1200');
    await auditRow
      .getByRole('button', { exact: true, name: 'Annuler' })
      .click();

    await input.fill('0365');
    await expect(save).toBeDisabled();
    await page.getByRole('button', { exact: true, name: 'Actualiser' }).click();
    await expect(input).toHaveValue('365');
    await expect(page.getByRole('alertdialog')).toHaveCount(0);

    mode = 'error';
    await input.fill('400');
    await save.click();
    await expect(notificationsRow.getByRole('alert')).toHaveText(
      'Enregistrement indisponible',
    );
    await expect(input).toHaveValue('400');
    mode = 'conflict';
    failConflictRead = true;
    await save.click();
    const retry = notificationsRow.getByRole('button', {
      name: 'Vérifier la valeur actuelle',
    });
    await expect(retry).toBeEnabled();
    await expect(input).toHaveValue('400');
    await expect(save).toBeDisabled();
    failConflictRead = false;
    const writeCount = writes.length;
    await retry.click();
    await notificationsRow
      .getByRole('button', { name: 'Utiliser la valeur actuelle' })
      .click();
    await expect(input).toHaveValue('200');
    await expect(input).toBeFocused();
    await expect(save).toBeDisabled();
    expect(writes).toHaveLength(writeCount);
  } finally {
    await page.unroute(endpoint);
  }
}
