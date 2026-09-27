import { expect, type Locator, type Page } from '@playwright/test';

/** Adjusting a duration edits only the draft, preserving direct entry and bounds. */
export async function expectSystemSettingDurationControls(
  row: Locator,
  initial: number,
  min: number,
  max: number,
): Promise<void> {
  const input = row.getByRole('spinbutton');
  const decrease = row.getByRole('button', { name: /^Diminuer d’un jour/ });
  const increase = row.getByRole('button', { name: /^Augmenter d’un jour/ });
  const save = row.getByRole('button', { name: /^Enregistrer/ });
  await expect(input).toHaveValue(String(initial));
  await increase.click();
  await expect(input).toHaveValue(String(initial + 1));
  await expect(input).toBeFocused();
  await decrease.focus();
  await decrease.press('Enter');
  await expect(input).toHaveValue(String(initial));
  await expect(input).toBeFocused();
  await expect(save).toBeDisabled();
  await input.press('ArrowUp');
  await expect(input).toHaveValue(String(initial + 1));
  await input.press('ArrowDown');
  await expect(input).toHaveValue(String(initial));
  await input.fill(String(min + 1));
  await decrease.click();
  await expect(input).toHaveValue(String(min));
  await expect(decrease).toBeDisabled();
  await expect(increase).toBeEnabled();
  await input.press('ArrowDown');
  await expect(input).toHaveValue(String(min));
  await input.fill(String(max - 1));
  await increase.click();
  await expect(input).toHaveValue(String(max));
  await expect(increase).toBeDisabled();
  await expect(decrease).toBeEnabled();
  await input.press('ArrowUp');
  await expect(input).toHaveValue(String(max));
  for (const value of ['', String(min - 1), String(max + 1), `${initial}.5`]) {
    await input.fill(value);
    await expect(input).toHaveValue(value);
    await expect(input).toHaveAttribute('aria-invalid', 'true');
    await expect(decrease).toBeDisabled();
    await expect(increase).toBeDisabled();
    await expect(save).toBeDisabled();
  }
  await input.fill(String(initial));
  await expect(input).not.toHaveAttribute('aria-invalid', 'true');
  await expect(decrease).toBeEnabled();
  await expect(increase).toBeEnabled();
  // A wheel over the focused number must not silently edit a retention policy.
  expect(
    await input.evaluate((element) =>
      element.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: 100,
        }),
      ),
    ),
  ).toBe(false);
  await expect(input).toHaveValue(String(initial));
  await expect(input).toBeFocused();
  expect(
    await input.evaluate((element) =>
      element.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          ctrlKey: true,
          deltaY: 100,
        }),
      ),
    ),
  ).toBe(true);
}

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
  let writeGate: Promise<void> | undefined;
  let finishWrite = (): void => {};
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
    await writeGate;
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
    const edit = notificationsRow.getByRole('button', { name: /^Modifier/ });
    const save = notificationsRow.getByRole('button', { name: /^Enregistrer/ });
    await expect(edit).toBeVisible();
    await expect(page.getByRole('spinbutton')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: /^Enregistrer/ }),
    ).toHaveCount(0);
    await expect(
      notificationsRow.getByText('180 jours', { exact: true }),
    ).toBeVisible();
    await expect(auditRow.getByText(/1\s095 jours/)).toBeVisible();
    await edit.focus();
    await edit.press('Enter');
    await expect(input).toHaveValue('180');
    await expect(input).toBeFocused();
    await expect(save).toBeDisabled();
    await expectSystemSettingDurationControls(notificationsRow, 180, 30, 730);
    expect(writes).toHaveLength(0);
    await notificationsRow
      .getByRole('button', { exact: true, name: 'Annuler' })
      .click();
    await expect(edit).toBeFocused();
    await expect(input).toHaveCount(0);
    expect(writes).toHaveLength(0);
    await edit.click();
    await expect(
      page.getByText('Interface générale', { exact: true }),
    ).toHaveCount(0);
    await expect(
      page.getByText('Lignes par page', { exact: true }),
    ).toHaveCount(0);
    await input.fill('365');
    await auditRow.getByRole('button', { name: /^Modifier/ }).click();
    await expect(audit).toBeFocused();
    await expectSystemSettingDurationControls(auditRow, 1095, 365, 3650);
    expect(writes).toHaveLength(0);
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
    await expect(edit).toBeVisible();
    await expect(edit).toBeFocused();
    await expect(input).toHaveCount(0);
    expect(writes.at(-1)).toEqual({ expectedVersion: 3, value: 365 });
    await expect(audit).toHaveValue('1200');
    await auditRow
      .getByRole('button', { exact: true, name: 'Annuler' })
      .click();
    await expect(audit).toHaveCount(0);
    await auditRow.getByRole('button', { name: /^Modifier/ }).click();
    await expect(audit).toHaveValue('1095');
    await auditRow
      .getByRole('button', { exact: true, name: 'Annuler' })
      .click();

    await edit.click();
    await input.fill('0365');
    await expect(save).toBeDisabled();
    await page.getByRole('button', { exact: true, name: 'Actualiser' }).click();
    await expect(input).toHaveCount(0);
    await expect(
      page.getByRole('button', { exact: true, name: 'Actualiser' }),
    ).toBeFocused();
    await expect(page.getByRole('alertdialog')).toHaveCount(0);

    mode = 'error';
    await edit.click();
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
    await notificationsRow
      .getByRole('button', { exact: true, name: 'Annuler' })
      .click();
    await expect(edit).toBeFocused();

    // Reducing retention requires an explicit confirmation before any PUT.
    await edit.click();
    await input.fill('90');
    await save.click();
    const confirmation = page.getByRole('alertdialog');
    await expect(confirmation).toBeVisible();
    expect(writes).toHaveLength(writeCount);
    await confirmation
      .getByRole('button', { name: 'Conserver la durée actuelle' })
      .click();
    await expect(input).toHaveValue('90');
    expect(writes).toHaveLength(writeCount);
    await notificationsRow
      .getByRole('button', { exact: true, name: 'Annuler' })
      .click();
    await expect(edit).toBeFocused();
    // A confirmed reduction closes the editor only after server acknowledgement.
    mode = 'success';
    writeGate = new Promise<void>((resolve) => {
      finishWrite = resolve;
    });
    await edit.click();
    await input.fill('90');
    await save.click();
    await confirmation
      .getByRole('button', { exact: true, name: 'Réduire la durée' })
      .click();
    await expect(input).toBeDisabled();
    await expect(save).toBeDisabled();
    await expect(
      notificationsRow.getByRole('button', { name: /^Diminuer d’un jour/ }),
    ).toBeDisabled();
    await expect(
      notificationsRow.getByRole('button', { name: /^Augmenter d’un jour/ }),
    ).toBeDisabled();
    await expect(edit).toHaveCount(0);
    await expect.poll(() => writes.length).toBe(writeCount + 1);
    finishWrite();
    writeGate = undefined;
    await expect(edit).toBeFocused();
    await expect(input).toHaveCount(0);
    await expect(
      notificationsRow.getByText('90 jours', { exact: true }),
    ).toBeVisible();
  } finally {
    finishWrite();
    await page.unroute(endpoint);
  }
}
