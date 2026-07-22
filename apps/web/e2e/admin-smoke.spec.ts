import { type APIResponse, expect, type Page, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { generate } from 'otplib';

import type {
  PersonDetail,
  PersonFieldHistoryResponse,
  PersonMutationResponse,
  PersonsListResponse,
} from '../src/features/persons/types/person.types';

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

type ApiEnvelope<T> = {
  data?: T;
  error?: { code?: string; message?: string };
  success?: boolean;
};

async function readApiData<T>(
  response: Pick<APIResponse, 'json' | 'status'>,
): Promise<T> {
  const payload = (await response.json()) as ApiEnvelope<T>;
  if (payload.success !== true || payload.data === undefined) {
    throw new Error(
      `Unexpected API response (${response.status()}): ${payload.error?.code ?? 'UNKNOWN'} ${payload.error?.message ?? ''}`.trim(),
    );
  }

  return payload.data;
}

async function getMutationHeaders(page: Page): Promise<Record<string, string>> {
  const csrfCookie = (await page.context().cookies()).find(
    (cookie) => cookie.name === 'csrf-token',
  );
  if (!csrfCookie?.value) {
    throw new Error('The authenticated E2E context has no CSRF token.');
  }

  return { 'x-csrf-token': csrfCookie.value };
}

async function getPersonViaApi(
  page: Page,
  personId: string,
): Promise<PersonDetail> {
  const response = await page.request.get(
    `/api/personnes/${encodeURIComponent(personId)}`,
  );
  expect(response.status()).toBe(200);

  return readApiData<PersonDetail>(response);
}

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
      name: 'Protéger votre compte',
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

async function expectAccessiblePageStructure(page: Page): Promise<void> {
  await expect(page.locator('main')).toHaveCount(1);
  await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);
  const unnamedInteractiveElements = await page
    .locator('button, a[href], input, select, textarea')
    .evaluateAll(
      (elements) =>
        elements.filter((element) => {
          const label =
            element.getAttribute('aria-label') ||
            element.getAttribute('title') ||
            element.textContent?.trim();

          return !label;
        }).length,
    );
  expect(unnamedInteractiveElements).toBe(0);
  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth + 1,
  );
  expect(hasHorizontalOverflow).toBe(false);
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

async function expectSelfProfileSyncWithoutReload(page: Page): Promise<void> {
  const rootAccount = await prisma.user.findUnique({
    select: { firstName: true, lastName: true },
    where: { loginName: TEST_LOGIN_NAME },
  });
  if (!rootAccount) throw new Error('E2E root account not found');

  const nextFirstName =
    rootAccount.firstName === 'ProfilSynchroA'
      ? 'ProfilSynchroB'
      : 'ProfilSynchroA';
  const nextLastName = 'NavigationClient';
  const nextDisplayName = `${nextFirstName} ${nextLastName}`;

  await page.goto('/mon-compte?section=profile');
  await page.getByRole('button', { name: "Modifier l'identité" }).click();
  await page.locator('#edit-firstName').fill(nextFirstName);
  await page.locator('#edit-lastName').fill(nextLastName);

  const [profileResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response.url().endsWith('/api/auth/me'),
    ),
    page.getByRole('button', { exact: true, name: 'Enregistrer' }).click(),
  ]);
  expect(profileResponse.ok()).toBe(true);

  // The sidebar and /mon-compte share the persistent UserProvider, so both
  // labels must update without relying on a full page reload.
  const accountMenu = page.getByRole('button', {
    name: `Menu utilisateur de ${nextDisplayName}`,
  });
  await expect(accountMenu).toBeVisible();
  await expect(
    page.getByRole('heading', { exact: true, name: nextDisplayName }),
  ).toBeVisible();
}

async function expectPersonsListFilteringAndPagination(
  page: Page,
  uniqueSuffix: string,
): Promise<void> {
  const listPrefix = `E2E List ${uniqueSuffix}`;
  const createdAt = Date.now() - 60_000;
  await prisma.person.createMany({
    data: Array.from({ length: 26 }, (_, index) => ({
      createdAt: new Date(createdAt + index * 1_000),
      id: `e2e-list-${uniqueSuffix}-${String(index).padStart(2, '0')}`,
      nickname: `${listPrefix} ${String(index).padStart(2, '0')}`,
      normalizedNickname: `${listPrefix} ${String(index).padStart(2, '0')}`
        .toLocaleLowerCase('fr-FR')
        .normalize('NFKC'),
      structureStatus:
        index % 2 === 0
          ? ('IN_STRUCTURE' as const)
          : ('OUTSIDE_STRUCTURE' as const),
      updatedAt: new Date(createdAt + index * 1_000),
    })),
  });

  const firstPageResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      response.request().method() === 'GET' &&
      url.pathname === '/api/personnes' &&
      url.searchParams.get('q') === listPrefix &&
      !url.searchParams.has('cursor') &&
      !url.searchParams.has('structureStatus')
    );
  });
  await page.goto(
    `/vie-interne/repertoire?q=${encodeURIComponent(listPrefix)}`,
  );
  const firstPageResponse = await firstPageResponsePromise;
  expect(firstPageResponse.status()).toBe(200);
  const firstPage = await readApiData<PersonsListResponse>(firstPageResponse);
  expect(firstPage.items).toHaveLength(25);
  expect(firstPage.pagination.hasMore).toBe(true);
  await expect(
    page.getByText(/Page 1 .* 25 r.sultats/, { exact: true }),
  ).toBeVisible();

  const nextPageButton = page.getByRole('button', { name: /Page suivante/ });
  await expect(nextPageButton).toBeEnabled();
  const secondPageResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      response.request().method() === 'GET' &&
      url.pathname === '/api/personnes' &&
      url.searchParams.get('q') === listPrefix &&
      url.searchParams.has('cursor')
    );
  });
  await nextPageButton.click();
  const secondPageResponse = await secondPageResponsePromise;
  expect(secondPageResponse.status()).toBe(200);
  const secondPage = await readApiData<PersonsListResponse>(secondPageResponse);
  expect(secondPage.items).toHaveLength(1);
  expect(secondPage.pagination.hasMore).toBe(false);
  await expect(
    page.getByText(/Page 2 .* 1 r.sultat/, { exact: true }),
  ).toBeVisible();

  const previousPageButton = page.getByRole('button', {
    name: /Page pr.c.dente/,
  });
  await expect(previousPageButton).toBeEnabled();
  await previousPageButton.click();
  await expect(
    page.getByText(/Page 1 .* 25 r.sultats/, { exact: true }),
  ).toBeVisible();

  const statusFilter = page.getByRole('combobox', {
    name: /Filtrer par statut dans la structure/,
  });
  await statusFilter.click();
  const filteredResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      response.request().method() === 'GET' &&
      url.pathname === '/api/personnes' &&
      url.searchParams.get('q') === listPrefix &&
      url.searchParams.get('structureStatus') === 'IN_STRUCTURE'
    );
  });
  await page
    .getByRole('option', { exact: true, name: 'Dans la structure' })
    .click();
  const filteredResponse = await filteredResponsePromise;
  expect(filteredResponse.status()).toBe(200);
  const filtered = await readApiData<PersonsListResponse>(filteredResponse);
  expect(filtered.items).toHaveLength(13);
  expect(
    filtered.items.every((person) => person.structureStatus === 'IN_STRUCTURE'),
  ).toBe(true);
  await expect(page).toHaveURL((url) => {
    return (
      url.pathname === '/vie-interne/repertoire' &&
      url.searchParams.get('q') === listPrefix &&
      url.searchParams.get('structureStatus') === 'IN_STRUCTURE'
    );
  });
  await expect(
    page.getByText(/Page 1 .* 13 r.sultats/, { exact: true }),
  ).toBeVisible();
  await expect(nextPageButton).toBeDisabled();

  await statusFilter.click();
  const resetResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      response.request().method() === 'GET' &&
      url.pathname === '/api/personnes' &&
      url.searchParams.get('q') === listPrefix &&
      !url.searchParams.has('structureStatus')
    );
  });
  await page
    .getByRole('option', { exact: true, name: 'Tous les statuts' })
    .click();
  expect((await resetResponsePromise).status()).toBe(200);
  await expect(page).toHaveURL((url) => {
    return (
      url.pathname === '/vie-interne/repertoire' &&
      url.searchParams.get('q') === listPrefix &&
      !url.searchParams.has('structureStatus')
    );
  });
}

async function expectPersonIdentityLifecycle(page: Page): Promise<void> {
  let contextualHistoryRequests = 0;
  const onHistoryRequest = (request: { url: () => string }): void => {
    if (request.url().includes('/historique-champ')) {
      contextualHistoryRequests += 1;
    }
  };
  page.on('request', onHistoryRequest);

  const now = Date.now();
  const uniqueSuffix = now.toString(36);
  const duplicateSourceNickname = `E2E Duplicate Source ${uniqueSuffix}`;
  const nickname = `E2E Person ${uniqueSuffix}`;
  const updatedNickname = `${nickname} Updated`;
  const sharedEmail = `shared-${uniqueSuffix}@example.test`;
  const primaryEmail = `person-${uniqueSuffix}@example.test`;
  const phoneDigits = String(now % 100_000_000).padStart(8, '0');
  const sharedPhone = `06${phoneDigits}`;
  const primaryPhone = `07${phoneDigits}`;
  const sharedDiscord = `e2e-secondary-${uniqueSuffix}`;
  const primaryDiscord = `e2e-primary-${uniqueSuffix}`;
  const sharedDiscordUrl = `https://discord.com/users/secondary-${uniqueSuffix}`;
  const primaryDiscordUrl = `https://discord.com/users/primary-${uniqueSuffix}`;

  await expect
    .poll(
      async () => {
        const response = await page.request.get('/api/health/ready');
        const payload = (await response.json()) as {
          checks?: { persons?: string };
        };

        return payload.checks?.persons;
      },
      { timeout: 15_000 },
    )
    .toBe('ready');

  const mutationHeaders = await getMutationHeaders(page);
  const duplicateSourceResponse = await page.request.post('/api/personnes', {
    data: {
      birthDate: null,
      emails: [
        {
          email: sharedEmail,
          isPrimary: true,
          label: 'Personnel',
        },
      ],
      firstName: null,
      lastName: null,
      nickname: duplicateSourceNickname,
      phones: [],
      socialProfiles: [],
      structureStatus: 'OUTSIDE_STRUCTURE',
    },
    headers: mutationHeaders,
  });
  expect(duplicateSourceResponse.status()).toBe(201);
  const duplicateSource = await readApiData<PersonMutationResponse>(
    duplicateSourceResponse,
  );

  await page.goto('/vie-interne/repertoire/nouveau');
  await expect(
    page.getByRole('heading', { name: 'Ajouter une personne' }),
  ).toBeVisible();
  await page.getByLabel('Pseudo principal').fill(nickname);

  await page.getByRole('button', { exact: true, name: 'Email' }).click();
  await page.getByRole('button', { exact: true, name: 'Email' }).click();
  const emailInputs = page.locator('input[id^="create-email-"][id$="-email"]');
  const emailLabels = page.locator('input[id^="create-email-"][id$="-label"]');
  await expect(emailInputs).toHaveCount(2);
  await emailInputs.nth(0).fill(sharedEmail);
  await emailLabels.nth(0).fill('Association');
  await emailInputs.nth(1).fill(primaryEmail);
  await emailLabels.nth(1).fill('Personnel');
  const emailPrimaryChoices = page.locator(
    'input[name="create-email-primary"]',
  );
  await emailPrimaryChoices.nth(1).check();
  await expect(emailPrimaryChoices.nth(1)).toBeChecked();
  await emailPrimaryChoices.nth(0).check();
  await expect(emailPrimaryChoices.nth(0)).toBeChecked();

  await page.getByRole('button', { exact: true, name: 'Téléphone' }).click();
  await page.getByRole('button', { exact: true, name: 'Téléphone' }).click();
  const phoneInputs = page.locator('input[id^="create-phone-"][id$="-phone"]');
  const phoneLabels = page.locator('input[id^="create-phone-"][id$="-label"]');
  await expect(phoneInputs).toHaveCount(2);
  await phoneInputs.nth(0).fill(sharedPhone);
  await phoneLabels.nth(0).fill('Association');
  await phoneInputs.nth(1).fill(primaryPhone);
  await phoneLabels.nth(1).fill('Personnel');
  const phonePrimaryChoices = page.locator(
    'input[name="create-phone-primary"]',
  );
  await phonePrimaryChoices.nth(1).check();
  await expect(phonePrimaryChoices.nth(1)).toBeChecked();

  await page.getByRole('button', { exact: true, name: 'Ajouter' }).click();
  await page.getByRole('button', { exact: true, name: 'Ajouter' }).click();
  const socialIdentifiers = page.locator(
    'input[id^="create-social-"][id$="-identifier"]',
  );
  const socialLabels = page.locator(
    'input[id^="create-social-"][id$="-label"]',
  );
  const socialUrls = page.locator('input[id^="create-social-"][id$="-url"]');
  await expect(socialIdentifiers).toHaveCount(2);
  await socialIdentifiers.nth(0).fill(sharedDiscord);
  await socialLabels.nth(0).fill('Secondaire');
  await socialUrls.nth(0).fill(sharedDiscordUrl);
  await socialIdentifiers.nth(1).fill(primaryDiscord);
  await socialLabels.nth(1).fill('Personnel');
  await socialUrls.nth(1).fill(primaryDiscordUrl);
  const socialPrimaryChoices = page.locator(
    'input[name="create-social-primary-discord"]',
  );
  await socialPrimaryChoices.nth(1).check();
  await expect(socialPrimaryChoices.nth(1)).toBeChecked();

  const [creationResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith('/api/personnes'),
    ),
    page.getByRole('button', { name: 'Ajouter la personne' }).click(),
  ]);
  expect(creationResponse.status()).toBe(201);
  const creationResult =
    await readApiData<PersonMutationResponse>(creationResponse);
  expect(creationResult.person.emails).toHaveLength(2);
  expect(creationResult.person.phones).toHaveLength(2);
  expect(creationResult.person.socialProfiles).toHaveLength(2);
  expect(
    creationResult.person.emails.find((item) => item.email === sharedEmail)
      ?.isPrimary,
  ).toBe(true);
  expect(
    creationResult.person.phones.find((item) => item.phone === primaryPhone)
      ?.isPrimary,
  ).toBe(true);
  expect(
    creationResult.person.socialProfiles.find(
      (item) => item.identifier === primaryDiscord,
    )?.isPrimary,
  ).toBe(true);
  expect(creationResult.duplicateWarning?.duplicateFound).toBe(true);
  expect(creationResult.duplicateWarning?.fields).toContain('emails.0.email');
  const duplicateWarningWire = JSON.stringify(
    creationResult.duplicateWarning ?? {},
  );
  expect(duplicateWarningWire).not.toContain(duplicateSource.person.id);
  expect(duplicateWarningWire).not.toContain(duplicateSourceNickname);

  await expect(page).toHaveURL(/\/vie-interne\/repertoire\/[^/]+$/);
  const personId = creationResult.person.id;
  expect(page.url()).toContain(personId);
  await expect(
    page
      .locator('[data-sonner-toast]')
      .filter({ hasText: /Personne cr..e/ })
      .last(),
  ).toBeVisible();
  await expect(
    page.getByRole('heading', { exact: true, name: nickname }),
  ).toBeVisible();
  await expect(
    page.getByText('Correspondance détectée', { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(duplicateSourceNickname, { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByText(sharedEmail, { exact: true })).toBeVisible();
  await expect(page.getByText(primaryPhone, { exact: true })).toBeVisible();
  await expect(page.getByText(primaryDiscord, { exact: true })).toBeVisible();

  await page
    .getByRole('button', { exact: true, name: 'Voir les autres (2)' })
    .click();
  await page
    .getByRole('button', { exact: true, name: 'Voir les autres (1)' })
    .click();
  await expect(page.getByText(sharedEmail, { exact: true })).toBeVisible();
  await expect(page.getByText(sharedPhone, { exact: true })).toBeVisible();
  await expect(page.getByText(sharedDiscord, { exact: true })).toBeVisible();

  const duplicateEmailRow = page
    .getByRole('listitem')
    .filter({ hasText: sharedEmail });
  await expect(
    duplicateEmailRow.getByText('Cet email existe aussi sur une autre fiche.', {
      exact: true,
    }),
  ).toBeVisible();
  const primaryEmailItem = creationResult.person.emails.find(
    (item) => item.email === primaryEmail,
  );
  const sharedPhoneItem = creationResult.person.phones.find(
    (item) => item.phone === sharedPhone,
  );
  const sharedSocialItem = creationResult.person.socialProfiles.find(
    (item) => item.identifier === sharedDiscord,
  );
  if (!primaryEmailItem || !sharedPhoneItem || !sharedSocialItem) {
    throw new Error('Created secondary Person data is missing.');
  }

  await page
    .getByRole('listitem')
    .filter({ hasText: primaryEmail })
    .getByRole('button', { name: 'Modifier cet email' })
    .click();
  let childDialog = page.getByRole('dialog');
  await expect(
    childDialog.getByRole('switch', { name: 'Email principal' }),
  ).toBeVisible();
  const childEmailInput = childDialog.getByLabel('Email', { exact: true });
  await childEmailInput.fill('adresse-invalide');
  await childDialog
    .getByRole('button', { exact: true, name: 'Enregistrer' })
    .click();
  await expect(childEmailInput).toHaveAttribute('aria-invalid', 'true');
  await expect(childEmailInput).toBeFocused();
  await childEmailInput.fill(primaryEmail);

  const childEmailLabel = childDialog.getByLabel(/Libell./);
  await childEmailLabel.fill('E2E temporaire');
  await page.keyboard.press('Escape');
  const unsavedChildDialog = page.getByRole('alertdialog', {
    name: /Quitter sans enregistrer/,
  });
  await expect(unsavedChildDialog).toBeVisible();
  await expect(
    unsavedChildDialog.getByRole('button', { name: 'Rester' }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(unsavedChildDialog).toBeHidden();
  await expect(childDialog).toBeVisible();
  await expect(childEmailLabel).toHaveValue('E2E temporaire');
  await childEmailLabel.fill('Personnel');
  await childDialog.getByRole('switch', { name: 'Email principal' }).click();
  const [emailUpdateResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response
          .url()
          .endsWith(`/api/personnes/${personId}/emails/${primaryEmailItem.id}`),
    ),
    childDialog
      .getByRole('button', { exact: true, name: 'Enregistrer' })
      .click(),
  ]);
  expect(emailUpdateResponse.status()).toBe(200);
  await expect(childDialog).toBeHidden();
  await expect(
    page
      .locator('[data-sonner-toast]')
      .filter({ hasText: /Information mise . jour/ })
      .last(),
  ).toBeVisible();

  await page
    .getByRole('listitem')
    .filter({ hasText: sharedPhone })
    .getByRole('button', { name: 'Modifier ce téléphone' })
    .click();
  childDialog = page.getByRole('dialog');
  await childDialog
    .getByRole('switch', { name: 'Téléphone principal' })
    .click();
  const [phoneUpdateResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response
          .url()
          .endsWith(
            `/api/personnes/${personId}/telephones/${sharedPhoneItem.id}`,
          ),
    ),
    childDialog
      .getByRole('button', { exact: true, name: 'Enregistrer' })
      .click(),
  ]);
  expect(phoneUpdateResponse.status()).toBe(200);
  await expect(childDialog).toBeHidden();

  await page
    .getByRole('listitem')
    .filter({ hasText: sharedDiscord })
    .getByRole('button', { name: 'Modifier ce profil' })
    .click();
  childDialog = page.getByRole('dialog');
  await childDialog
    .getByRole('switch', { name: 'Profil principal pour ce réseau' })
    .click();
  const [socialUpdateResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response
          .url()
          .endsWith(
            `/api/personnes/${personId}/reseaux-sociaux/${sharedSocialItem.id}`,
          ),
    ),
    childDialog
      .getByRole('button', { exact: true, name: 'Enregistrer' })
      .click(),
  ]);
  expect(socialUpdateResponse.status()).toBe(200);
  await expect(childDialog).toBeHidden();

  const personAfterPrimaryChanges = await getPersonViaApi(page, personId);
  expect(
    personAfterPrimaryChanges.emails.filter((item) => item.isPrimary),
  ).toEqual([expect.objectContaining({ email: primaryEmail })]);
  expect(
    personAfterPrimaryChanges.phones.filter((item) => item.isPrimary),
  ).toEqual([expect.objectContaining({ phone: sharedPhone })]);
  expect(
    personAfterPrimaryChanges.socialProfiles.filter((item) => item.isPrimary),
  ).toEqual([expect.objectContaining({ identifier: sharedDiscord })]);

  await page
    .getByRole('button', { exact: true, name: 'Modifier' })
    .first()
    .click();
  await page.getByLabel('Pseudo principal').fill(updatedNickname);

  const currentPerson = await getPersonViaApi(page, personId);
  const concurrentResponse = await page.request.patch(
    `/api/personnes/${encodeURIComponent(personId)}`,
    {
      data: {
        birthDate: currentPerson.birthDate,
        firstName: currentPerson.firstName,
        lastName: currentPerson.lastName,
        nickname: currentPerson.nickname,
        structureStatus:
          currentPerson.structureStatus === 'IN_STRUCTURE'
            ? 'OUTSIDE_STRUCTURE'
            : 'IN_STRUCTURE',
        version: currentPerson.version,
      },
      headers: mutationHeaders,
    },
  );
  expect(concurrentResponse.status()).toBe(200);
  await readApiData<PersonMutationResponse>(concurrentResponse);

  const [conflictResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response.url().endsWith(`/api/personnes/${personId}`),
    ),
    page.getByRole('button', { exact: true, name: 'Enregistrer' }).click(),
  ]);
  expect(conflictResponse.status()).toBe(409);
  await expect(
    page.getByText('Modification concurrente', { exact: true }),
  ).toBeVisible();
  await expect(page.getByLabel('Pseudo principal')).toHaveValue(
    updatedNickname,
  );

  const reloadResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      response.url().endsWith(`/api/personnes/${personId}`),
  );
  await page
    .getByRole('button', { exact: true, name: 'Actualiser la version' })
    .click();
  expect((await reloadResponsePromise).status()).toBe(200);
  await expect(page.getByLabel('Pseudo principal')).toHaveValue(
    updatedNickname,
  );
  await expect(
    page.getByText('Modification concurrente', { exact: true }),
  ).toBeHidden();

  const cancelIdentityButton = page.getByRole('button', {
    exact: true,
    name: 'Annuler',
  });
  await cancelIdentityButton.click();
  const identityDiscardDialog = page.getByRole('alertdialog', {
    name: /Annuler les modifications/,
  });
  await expect(identityDiscardDialog).toBeVisible();
  await expect(
    identityDiscardDialog.getByRole('button', {
      name: /Continuer la modification/,
    }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(identityDiscardDialog).toBeHidden();
  await expect(page.getByLabel('Pseudo principal')).toHaveValue(
    updatedNickname,
  );
  await expect(cancelIdentityButton).toBeFocused();

  const [updateResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'PATCH' &&
        response.url().endsWith(`/api/personnes/${personId}`),
    ),
    page.getByRole('button', { exact: true, name: 'Enregistrer' }).click(),
  ]);
  expect(updateResponse.status()).toBe(200);
  await expect(
    page.getByRole('heading', { exact: true, name: updatedNickname }),
  ).toBeVisible();
  await expect(
    page
      .locator('[data-sonner-toast]')
      .filter({ hasText: /Identit. mise . jour/ })
      .last(),
  ).toBeVisible();

  expect(contextualHistoryRequests).toBe(0);
  const historyTrigger = page.getByRole('button', {
    name: "Afficher l'historique : Pseudo principal",
  });
  const historyResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      response.url().includes(`/api/personnes/${personId}/historique-champ?`),
  );
  await historyTrigger.click();
  const historyResponse = await historyResponsePromise;
  expect(historyResponse.status()).toBe(200);
  const history =
    await readApiData<PersonFieldHistoryResponse>(historyResponse);
  expect(history.items.length).toBeGreaterThan(0);
  expect(history.items.some((item) => item.after === updatedNickname)).toBe(
    true,
  );
  await expect.poll(() => contextualHistoryRequests).toBe(1);
  await expect(
    page
      .locator('[data-slot="popover-content"]')
      .getByText(updatedNickname, { exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('[data-slot="popover-content"]')).toBeHidden();
  await expect(historyTrigger).toBeFocused();
  page.off('request', onHistoryRequest);

  await expectPersonsListFilteringAndPagination(page, uniqueSuffix);
  await page.goto(`/vie-interne/repertoire/${personId}`);
  await expect(
    page.getByRole('heading', { exact: true, name: updatedNickname }),
  ).toBeVisible();

  await page.getByRole('button', { name: 'Supprimer la fiche' }).click();
  const [deletionResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'DELETE' &&
        response.url().endsWith(`/api/personnes/${personId}`),
    ),
    page.getByRole('button', { name: 'Supprimer définitivement' }).click(),
  ]);
  expect(deletionResponse.status()).toBe(204);
  await expect
    .poll(
      async () =>
        prisma.personDeletionTombstone.findUnique({
          select: { personId: true },
          where: { personId },
        }),
      { timeout: 30_000 },
    )
    .toEqual({ personId });
  await expect(page).toHaveURL('/vie-interne/repertoire', {
    timeout: 30_000,
  });
  await expect(
    page
      .locator('[data-sonner-toast]')
      .filter({ hasText: /Fiche supprim.e/ })
      .last(),
  ).toBeVisible();
  expect(
    await prisma.person.findUnique({
      select: { id: true },
      where: { id: personId },
    }),
  ).toBeNull();
}

test('authenticates and reaches the admin surfaces', async ({ page }) => {
  test.setTimeout(180_000);
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
  await expectAccessiblePageStructure(page);

  await page.goto('/administration/utilisateurs');
  await expect(
    page.getByRole('heading', { name: 'Utilisateurs' }),
  ).toBeVisible();
  await expect(page.getByText('Annuaire utilisateurs')).toBeVisible();
  await expectAccessiblePageStructure(page);

  await page.goto('/administration/utilisateurs/nouveau');
  await expect(
    page.getByRole('heading', { name: /Nouvel utilisateur|Compte créé/ }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Créer' })).toBeVisible();

  await expectSelfProfileSyncWithoutReload(page);
  await expectPersonIdentityLifecycle(page);
});
