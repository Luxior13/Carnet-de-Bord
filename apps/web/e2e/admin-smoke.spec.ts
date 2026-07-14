import { expect, type Page, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { generate } from 'otplib';

function requireEnvironmentVariable(
  name: string,
  value: string | undefined,
): string {
  if (!value) {
    throw new Error(`${name} is required for end-to-end tests.`);
  }

  return value;
}

const TEST_LOGIN_NAME = requireEnvironmentVariable(
  'E2E_SUPERADMIN_LOGIN_NAME',
  process.env.E2E_SUPERADMIN_LOGIN_NAME,
);
const TEST_PASSWORD = requireEnvironmentVariable(
  'E2E_SUPERADMIN_PASSWORD',
  process.env.E2E_SUPERADMIN_PASSWORD,
);
const TEST_DATABASE_URL = requireEnvironmentVariable(
  'E2E_DATABASE_URL',
  process.env.E2E_DATABASE_URL,
);
const TOTP_PERIOD_SECONDS = 30;
const MINIMUM_TOTP_VALIDITY_SECONDS = 5;
const prisma = new PrismaClient({
  datasources: { db: { url: TEST_DATABASE_URL } },
});

// The setup mutates the isolated root identity, so a Playwright retry would no
// longer exercise the same first-login precondition. The database harness is
// deliberately reset once before this stateful smoke test instead.
test.describe.configure({ retries: 0 });
test.afterAll(async () => {
  await prisma.$disconnect();
});

async function generateStableTotp(page: Page, secret: string): Promise<string> {
  const epochSeconds = Math.floor(Date.now() / 1000);
  const secondsRemaining =
    TOTP_PERIOD_SECONDS - (epochSeconds % TOTP_PERIOD_SECONDS);

  if (secondsRemaining <= MINIMUM_TOTP_VALIDITY_SECONDS) {
    await page.waitForTimeout((secondsRemaining + 1) * 1000);
  }

  return generate({ secret });
}

async function completeRequiredMfaSetup(page: Page): Promise<void> {
  await expect(
    page.getByRole('heading', {
      name: 'Protéger le compte superadmin',
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Configurer maintenant' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Configurer maintenant' }).click();

  await expect(
    page.getByText('Clé de configuration manuelle', { exact: true }),
  ).toBeVisible();

  const manualKeyOutput = page.getByLabel('Clé de configuration', {
    exact: true,
  });
  await expect(manualKeyOutput).toBeVisible();

  const manualKey = (await manualKeyOutput.innerText())
    .replace(/[\s-]/g, '')
    .toUpperCase();
  expect(manualKey).toMatch(/^[A-Z2-7]{16,}$/);

  const code = await generateStableTotp(page, manualKey);
  expect(code).toMatch(/^\d{6}$/);
  await page.getByLabel('Code à 6 chiffres', { exact: true }).fill(code);
  await page
    .getByRole('button', { name: 'Activer la double authentification' })
    .click();

  const recoveryCodesList = page.getByRole('list', {
    name: 'Codes de secours',
  });
  await expect(recoveryCodesList).toBeVisible();

  // Exercise the one-time recovery-code handoff without persisting secrets in
  // Playwright artifacts or logs.
  const recoveryCodes = (
    await recoveryCodesList.getByRole('listitem').allTextContents()
  )
    .map((value) => value.trim())
    .filter(Boolean);
  expect(recoveryCodes.length).toBeGreaterThan(0);
  expect(new Set(recoveryCodes).size).toBe(recoveryCodes.length);

  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Télécharger' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(
    /^codes-secours-team-control-\d{4}-\d{2}-\d{2}\.txt$/,
  );
  await download.delete();

  const finishButton = page.getByRole('button', { name: 'Terminer' });
  await expect(finishButton).toBeDisabled();

  const recoveryAcknowledgement = page.getByRole('checkbox', {
    name: /J.ai enregistré ces codes dans un endroit sûr/,
  });
  await recoveryAcknowledgement.click();
  await expect(recoveryAcknowledgement).toBeChecked();
  await expect(finishButton).toBeEnabled();
  await finishButton.click();
}

async function login(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel('Identifiant de connexion').fill(TEST_LOGIN_NAME);
  await page.locator('#password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await completeRequiredMfaSetup(page);
  await expect(page).toHaveURL(/\/$/, { timeout: 15_000 });
}

async function expectPersistedMfaState(): Promise<void> {
  const rootAccount = await prisma.user.findUnique({
    select: {
      mfaEnabledAt: true,
      sessions: {
        orderBy: { createdAt: 'desc' },
        select: { mfaMethod: true, mfaVerifiedAt: true },
        take: 1,
      },
    },
    where: { loginName: TEST_LOGIN_NAME },
  });

  expect(rootAccount?.mfaEnabledAt).toBeInstanceOf(Date);
  expect(rootAccount?.sessions).toHaveLength(1);
  expect(rootAccount?.sessions[0]?.mfaMethod).toBe('TOTP');
  expect(rootAccount?.sessions[0]?.mfaVerifiedAt).toBeInstanceOf(Date);
}

test('authenticates and reaches the admin surfaces', async ({ page }) => {
  await login(page);
  await expectPersistedMfaState();

  await expect(
    page.getByRole('heading', { name: /Bonjour|Tableau de bord/ }),
  ).toBeVisible();
  await expect(
    page
      .getByRole('main')
      .getByRole('link', { exact: true, name: 'Mon compte' }),
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
