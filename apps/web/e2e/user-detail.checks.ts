import { expect, type Page, type Response } from '@playwright/test';

import { browserApi } from './browser-api';

/** Run against an editable, ordinary fixture account with an authenticated admin. */
export async function expectUserDetailDraftSafety(
  page: Page,
  userId: string,
): Promise<void> {
  const href = `/systeme/utilisateurs/${userId}`;
  const api = `/api/users/${userId}`;
  const savedName = `Enregistrement ${Date.now()}`;
  await page.goto(href);
  const firstName = page.locator('#user-first-name');
  await expect(firstName).toBeEnabled();
  const email = page.locator('#user-contact-email');
  const originalEmail = await email.inputValue();
  await email.fill('a..b@example.test');
  await page.getByRole('button', { exact: true, name: 'Enregistrer' }).click();
  await expect(email).toBeFocused();
  await expect(email).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#user-contact-email-error')).toHaveText(
    'Email invalide',
  );
  await email.fill(originalEmail);

  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  let committed: () => void = () => undefined;
  const ready = new Promise<void>((resolve) => {
    committed = resolve;
  });
  let patchCount = 0;
  await page.route(`**${api}`, async (route) => {
    if (route.request().method() !== 'PATCH') {
      await route.continue();

      return;
    }
    patchCount++;
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    committed();
    await gate;
    await route.fulfill({ response });
  });
  try {
    await firstName.fill(savedName);
    await page
      .getByRole('button', { exact: true, name: 'Enregistrer' })
      .click();
    await ready;
    await expect(firstName).toBeDisabled();
    await expect(email).toBeDisabled();
    await page
      .locator('[data-user-profile-form]')
      .evaluate((form) => (form as HTMLFormElement).requestSubmit());
    expect(patchCount).toBe(1);
    release();
    await expect(firstName).toBeEnabled();
    await expect(
      page.getByRole('button', { exact: true, name: 'Enregistrer' }),
    ).toHaveCount(0);
  } finally {
    release();
    await page.unroute(`**${api}`);
  }

  const current = await (
    await browserApi<{ data: { user: { loginName: string } } }>(page, api)
  ).json();
  await page.goto(
    `/systeme/utilisateurs?search=${encodeURIComponent(current.data.user.loginName)}`,
  );
  await page
    .getByRole('link', {
      exact: true,
      name: `Ouvrir le compte de ${savedName}`,
    })
    .click();
  await expect(firstName).toBeEnabled();
  await firstName.fill('Brouillon conservé');
  const security = page.getByRole('link', { exact: true, name: 'Sécurité' });
  await security.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(security).toBeFocused();
  await expect(firstName).toHaveValue('Brouillon conservé');
  await page.evaluate(() => window.history.back());
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.getByRole('button', { exact: true, name: 'Rester' }).click();
  await expect(firstName).toHaveValue('Brouillon conservé');
  await page.evaluate(() => window.history.back());
  await page
    .getByRole('alertdialog')
    .getByRole('button', { exact: true, name: 'Quitter sans enregistrer' })
    .click();
  await expect(page).toHaveURL(/\/systeme\/utilisateurs\?search=/);
  await page.goto(href);
  await expect(firstName).toHaveValue(savedName);
}

export async function expectUserDetailConflictRecovery(
  page: Page,
  userId: string,
): Promise<void> {
  const href = `/systeme/utilisateurs/${userId}`;
  const other = await page.context().newPage();
  const versionA = `Version A ${Date.now()}`;
  const versionB = `Version B ${Date.now()}`;
  const waitPatch = (target: Page): Promise<Response> =>
    target.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response.url().endsWith(`/api/users/${userId}`),
    );
  try {
    await page.goto(href);
    await other.goto(href);
    await page.locator('#user-first-name').fill(versionA);
    await other.locator('#user-first-name').fill(versionB);
    let result = waitPatch(page);
    await page
      .getByRole('button', { exact: true, name: 'Enregistrer' })
      .click();
    expect((await result).status()).toBe(200);
    result = waitPatch(other);
    await other
      .getByRole('button', { exact: true, name: 'Enregistrer' })
      .click();
    expect((await result).status()).toBe(409);
    await expect(
      other.getByRole('button', { exact: true, name: 'Enregistrer' }),
    ).toBeDisabled();
    await other
      .getByRole('button', {
        exact: true,
        name: 'Actualiser et conserver ma saisie',
      })
      .click();
    await expect(other.locator('#user-first-name')).toHaveValue(versionB);
    await expect(
      other.getByRole('button', { exact: true, name: 'Enregistrer' }),
    ).toBeEnabled();
    result = waitPatch(other);
    await other
      .getByRole('button', { exact: true, name: 'Enregistrer' })
      .click();
    expect((await result).status()).toBe(200);
    const saved = await (
      await browserApi<{ data: { user: { firstName: string } } }>(
        other,
        `/api/users/${userId}`,
      )
    ).json();
    expect(saved.data.user.firstName).toBe(versionB);
  } finally {
    await other.close();
  }
}
