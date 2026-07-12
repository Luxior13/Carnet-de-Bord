import { expect, test, type Page } from '@playwright/test';

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is required for end-to-end tests.`);
  }

  return value;
}

const TEST_EMAIL = requireEnvironmentVariable('E2E_SUPERADMIN_EMAIL');
const TEST_PASSWORD = requireEnvironmentVariable('E2E_SUPERADMIN_PASSWORD');

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.locator('#password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
}

test('authenticates and reaches the admin surfaces', async ({ page }) => {
  await login(page);

  await expect(
    page.getByRole('heading', { name: /Bonjour|Tableau de bord/ }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('main')
      .getByRole('link', { name: 'Mon compte', exact: true }),
  ).toBeVisible();

  await page.goto('/administration/utilisateurs');
  await expect(
    page.getByRole('heading', { name: 'Utilisateurs' }),
  ).toBeVisible();
  await expect(page.getByText('Annuaire utilisateurs')).toBeVisible();

  await page.goto('/administration/utilisateurs/nouveau');
  await expect(
    page.getByRole('heading', { name: /Nouvel utilisateur|Compte créé/ }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Créer' })).toBeVisible();

  await page.goto('/mon-compte');
  await expect(page.getByRole('heading', { name: 'Mon compte' })).toBeVisible();
});
