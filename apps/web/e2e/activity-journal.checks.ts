import { expect, type Page } from '@playwright/test';

/**
 * Activity journal on the real database (30 October 2026): the reading is
 * traced, the account created earlier in the journey is listed, the
 * superadmin sees the IP, a quick filter narrows the list and a record's
 * « Historique » opens the journal on that account.
 */
export async function expectActivityJournal(
  page: Page,
  createdUserId: string,
): Promise<void> {
  await page.goto('/systeme/journal-activite');
  await expect(
    page.getByRole('heading', { level: 1, name: "Journal d'activité" }),
  ).toBeVisible();
  const events = page.getByRole('list', { name: 'Événements' });
  const items = events.getByRole('listitem');
  await expect(items.filter({ hasText: 'Journal consulté' })).not.toHaveCount(
    0,
  );
  const created = items.filter({ hasText: 'Compte créé' }).first();
  await expect(created).toBeVisible();
  await created.getByRole('button').first().click();
  const ip = created
    .getByRole('term')
    .filter({ hasText: 'Adresse IP' })
    .locator('xpath=following-sibling::dd[1]');
  await expect(ip).toBeVisible();
  await expect(ip).not.toHaveText('Adresse masquée');

  await page.getByRole('button', { exact: true, name: 'Sécurité' }).click();
  await expect(page).toHaveURL(/type=security/);
  await expect(items.filter({ hasText: 'Compte créé' })).toHaveCount(0);
  await expect(items.filter({ hasText: /^Connexion/ }).first()).toBeVisible();

  await page.goto(`/systeme/utilisateurs/${createdUserId}`);
  await page.getByRole('link', { exact: true, name: 'Historique' }).click();
  await expect
    .poll(() => {
      const params = new URL(page.url()).searchParams;

      return `${params.get('period')} ${params.get('user')}`;
    })
    .toBe(`1y ${createdUserId}`);
  await expect(page.getByText('Compte :')).toBeVisible();
  await expect(items.filter({ hasText: 'Compte créé' })).not.toHaveCount(0);
}
