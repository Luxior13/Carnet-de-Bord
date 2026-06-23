import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function loadEnvValue(filePath: string, key: string): string | null {
  const content = readFileSync(filePath, 'utf8');
  const line = content
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(`${key}=`));

  if (!line) return null;

  const [, rawValue = ''] = line.split('=', 2);
  const value = rawValue.trim();

  return value.startsWith('"') && value.endsWith('"')
    ? value.slice(1, -1)
    : value;
}

const envPath = resolve(process.cwd(), '.env');
const TEST_EMAIL =
  process.env.E2E_SUPERADMIN_EMAIL ??
  loadEnvValue(envPath, 'SEED_SUPERADMIN_EMAIL') ??
  'superadmin@carnet.local';
const TEST_PASSWORD =
  process.env.E2E_SUPERADMIN_PASSWORD ??
  loadEnvValue(envPath, 'SEED_SUPERADMIN_PASSWORD') ??
  'Playwright123!';

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
    page.getByRole('main').getByRole('link', { name: 'Mon compte', exact: true }),
  ).toBeVisible();

  await page.goto('/administration/utilisateurs');
  await expect(page.getByRole('heading', { name: 'Utilisateurs' })).toBeVisible();
  await expect(page.getByText('Annuaire utilisateurs')).toBeVisible();

  await page.goto('/administration/utilisateurs/nouveau');
  await expect(
    page.getByRole('heading', { name: /Nouvel utilisateur|Compte créé/ }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Créer' })).toBeVisible();

  await page.goto('/mon-compte');
  await expect(page.getByRole('heading', { name: 'Mon compte' })).toBeVisible();
});
