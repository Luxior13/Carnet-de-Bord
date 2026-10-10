import { expect, type Page } from '@playwright/test';

/** Runs only within the isolated database harness used by admin-smoke. */
export async function expectUserCreationRecovery(page: Page): Promise<void> {
  const suffix = Date.now().toString(36);
  const loginName = `e2e-created-${suffix}`;
  const lostLoginName = `e2e-lost-${suffix}`;
  await page.goto('/systeme/utilisateurs/nouveau');
  await page.waitForLoadState('networkidle');
  await expect(page.locator('#newFirstName')).toHaveCount(1);
  await expect(page.locator('#newLastName')).not.toHaveAttribute('required');
  await page.locator('#newFirstName').fill('Création E2E');
  await page.locator('#newLoginName').fill(loginName);
  await page.locator('#newContactAddress').focus();
  await page.locator('#newContactAddress').fill('a..b@example.test');
  await page
    .getByRole('button', { exact: true, name: 'Créer le compte' })
    .click();
  await expect(page.locator('#newContactAddress-error')).toHaveText(
    'Email invalide',
  );
  await expect(page.locator('#newContactAddress')).toBeFocused();
  await page.locator('#newContactAddress').fill('');
  await page
    .getByRole('button', { exact: true, name: 'Créer le compte' })
    .click();
  await expect(
    page.getByRole('heading', { exact: true, name: 'Compte créé' }),
  ).toBeFocused();

  await page
    .getByRole('button', { exact: true, name: 'Créer un autre' })
    .click();
  await expect(page.getByRole('alertdialog')).toContainText(
    'Effacer le mot de passe affiché ?',
  );
  await page.getByRole('button', { exact: true, name: 'Rester' }).click();
  await page
    .getByRole('checkbox', {
      name: 'J’ai conservé ce mot de passe pour le transmettre.',
    })
    .check();
  await page
    .getByRole('button', { exact: true, name: 'Créer un autre' })
    .click();
  await expect(page.locator('#newFirstName')).toBeFocused();

  // A known conflict stays attached to the editable login field.
  await page.locator('#newFirstName').fill('Création E2E');
  await page.locator('#newLoginName').fill(loginName);
  await page
    .getByRole('button', { exact: true, name: 'Créer le compte' })
    .click();
  await expect(page.locator('#newLoginName-error')).toHaveText(
    'Cet identifiant est déjà utilisé',
  );
  await expect(page.locator('#newLoginName')).toBeFocused();
  await page.locator('#newLoginName').fill(lostLoginName);

  // Execute the real POST, then discard its response after the commit.
  let committed = false;
  const pattern = '**/api/users';
  await page.route(pattern, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    expect(response.status()).toBe(200);
    committed = true;
    await route.abort('connectionreset');
  });
  try {
    await page
      .getByRole('button', { exact: true, name: 'Créer le compte' })
      .click();
    await expect(
      page.getByRole('button', { exact: true, name: 'Vérifier la création' }),
    ).toBeVisible();
    expect(committed).toBe(true);
    await expect(page.locator('#newFirstName')).toBeDisabled();
    const lookupResponse = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return (
        url.pathname === '/api/users' &&
        url.searchParams.get('loginName') === lostLoginName
      );
    });
    await page
      .getByRole('button', { exact: true, name: 'Vérifier la création' })
      .click();
    const response = await lookupResponse;
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.data.users).toHaveLength(1);
    expect(data.data.users[0].loginName).toBe(lostLoginName);
    expect(data.data.users[0]).not.toHaveProperty('passwordHash');
    expect(data.data).not.toHaveProperty('temporaryPassword');
    await expect(
      page.getByText('Un compte utilise cet identifiant', { exact: true }),
    ).toBeVisible();
    await page
      .getByRole('link', { exact: true, name: 'Ouvrir la fiche' })
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/systeme/utilisateurs/${data.data.users[0].id}\\?`),
    );
  } finally {
    await page.unroute(pattern);
  }
}
