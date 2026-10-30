import { type APIResponse, expect, type Page, test } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { generate } from 'otplib';

import type {
  PersonDetail,
  PersonMutationResponse,
  PersonsListResponse,
} from '../src/features/persons/types/person.types';
import { browserApi } from './browser-api';
import {
  expectNoContentSecurityPolicyRefusal,
  watchContentSecurityPolicy,
} from './csp.checks';
import { expectMobileLayouts } from './mobile-layout.checks';
import { expectSystemSettingsDraftSafety } from './system-settings.checks';
import { expectUserCreationRecovery } from './user-creation.checks';
import {
  expectUserDetailConflictRecovery,
  expectUserDetailDraftSafety,
} from './user-detail.checks';

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
    // The E2E suite runs the production build, whose cookies are prefixed.
    (cookie) => cookie.name === '__Host-csrf-token',
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
  const response = await browserApi(
    page,
    `/api/personnes/${encodeURIComponent(personId)}`,
  );
  expect(response.status()).toBe(200);

  return readApiData<PersonDetail>(response);
}

// The setup mutates the isolated root identity, so a Playwright retry would no
// longer exercise the same first-login precondition. The database harness is
// deliberately reset once before this stateful smoke test instead.
test.describe.configure({ retries: 0 });
test.use({ actionTimeout: 15_000 });
test.afterEach(async ({ page }) => {
  // The setup can display one-time secrets. Do not leave its DOM available to
  // Playwright's automatic error-context snapshot, even when an assertion fails.
  if (!page.isClosed()) {
    await page.goto('about:blank');
    await page.close();
  }
});
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
  expect(/^[A-Z2-7]{16,}$/.test(manualKey)).toBe(true);

  const code = await generateStableTotp(page, manualKey);
  expect(/^\d{6}$/.test(code)).toBe(true);
  await page.getByRole('textbox', { name: /^Code à 6 chiffres/ }).fill(code);
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
  try {
    expect(download.suggestedFilename()).toMatch(
      /^codes-secours-noctambule-\d{4}-\d{2}-\d{2}\.txt$/,
    );
  } finally {
    await download.delete();
  }

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
  await expect(page.locator('#edit-firstName')).toBeEnabled();
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
      sortName: `${listPrefix} ${String(index).padStart(2, '0')}`
        .toLocaleLowerCase('fr-FR')
        .normalize('NFKC'),
      structureStatus:
        index % 2 === 0
          ? ('IN_STRUCTURE' as const)
          : ('OUTSIDE_STRUCTURE' as const),
      updatedAt: new Date(createdAt + index * 1_000),
    })),
  });

  // The list accepts SSR data on navigation and may abort a redundant client GET.
  // Assert the rendered list, and exercise its real API separately.
  await page.goto(`/membres/repertoire?q=${encodeURIComponent(listPrefix)}`);
  const firstPageResponse = await browserApi(
    page,
    `/api/personnes?q=${encodeURIComponent(listPrefix)}`,
  );
  expect(firstPageResponse.status()).toBe(200);
  const firstPage = await readApiData<PersonsListResponse>(firstPageResponse);
  expect(firstPage.items).toHaveLength(25);
  expect(firstPage.pagination.hasMore).toBe(true);
  const pagination = page.getByRole('navigation', {
    name: 'Pagination des membres',
  });
  await expect(pagination.locator('p')).toHaveText('Page 1 sur 2');
  await expect(page.locator('table tbody tr')).toHaveCount(25);

  const nextPageButton = page.getByRole('button', { name: /Page suivante/ });
  await expect(nextPageButton).toBeEnabled();
  await nextPageButton.click();
  await expect(pagination.locator('p')).toHaveText('Page 2 sur 2');
  await expect(page.locator('table tbody tr')).toHaveCount(1);
  const nextCursor = firstPage.pagination.nextCursor;
  if (!nextCursor)
    throw new Error('The first page must expose its next cursor.');
  const secondPageResponse = await browserApi(
    page,
    `/api/personnes?q=${encodeURIComponent(listPrefix)}&cursor=${encodeURIComponent(nextCursor)}`,
  );
  expect(secondPageResponse.status()).toBe(200);
  const secondPage = await readApiData<PersonsListResponse>(secondPageResponse);
  expect(secondPage.items).toHaveLength(1);
  expect(secondPage.pagination.hasMore).toBe(false);

  const previousPageButton = page.getByRole('button', {
    name: /Page pr.c.dente/,
  });
  await expect(previousPageButton).toBeEnabled();
  await previousPageButton.click();
  await expect(pagination.locator('p')).toHaveText('Page 1 sur 2');

  // Quick filters replace the status menu since 20 October 2026.
  const statusFilters = page.getByRole('group', {
    name: 'Filtrer par statut',
  });
  await statusFilters
    .getByRole('button', { name: /^Dans la structure/ })
    .click();
  await expect(page.locator('table tbody tr')).toHaveCount(13);
  const filteredResponse = await browserApi(
    page,
    `/api/personnes?q=${encodeURIComponent(listPrefix)}&structureStatus=IN_STRUCTURE`,
  );
  expect(filteredResponse.status()).toBe(200);
  const filtered = await readApiData<PersonsListResponse>(filteredResponse);
  expect(filtered.items).toHaveLength(13);
  expect(
    filtered.items.every((person) => person.structureStatus === 'IN_STRUCTURE'),
  ).toBe(true);
  await expect(page).toHaveURL((url) => {
    return (
      url.pathname === '/membres/repertoire' &&
      url.searchParams.get('q') === listPrefix &&
      url.searchParams.get('structureStatus') === 'IN_STRUCTURE'
    );
  });
  await expect(pagination.locator('p')).toHaveText('Page 1');
  await expect(nextPageButton).toBeDisabled();

  await statusFilters.getByRole('button', { name: /^Tous/ }).click();
  await expect(pagination.locator('p')).toHaveText('Page 1 sur 2');
  await expect(page.locator('table tbody tr')).toHaveCount(25);
  const resetResponse = await browserApi(
    page,
    `/api/personnes?q=${encodeURIComponent(listPrefix)}`,
  );
  expect(resetResponse.status()).toBe(200);
  expect(
    (await readApiData<PersonsListResponse>(resetResponse)).items,
  ).toHaveLength(25);
  await expect(page).toHaveURL((url) => {
    return (
      url.pathname === '/membres/repertoire' &&
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
        const response = await browserApi(page, '/api/health/ready');
        const payload = (await response.json()) as {
          checks?: { persons?: string };
        };

        return payload.checks?.persons;
      },
      { timeout: 15_000 },
    )
    .toBe('ready');

  const mutationHeaders = await getMutationHeaders(page);
  const duplicateSourceResponse = await browserApi(page, '/api/personnes', {
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
    method: 'POST',
  });
  expect(duplicateSourceResponse.status()).toBe(201);
  const duplicateSource = await readApiData<PersonMutationResponse>(
    duplicateSourceResponse,
  );

  await page.goto('/membres/repertoire/nouveau');
  await expect(
    page.getByRole('heading', { exact: true, name: 'Nouvelle fiche' }),
  ).toBeVisible();
  await page.getByRole('textbox', { name: /^Pseudo principal/ }).fill(nickname);

  const [creationResponse] = await Promise.all([
    page.waitForResponse(
      (response) =>
        response.request().method() === 'POST' &&
        response.url().endsWith('/api/personnes'),
    ),
    page
      .getByRole('button', { exact: true, name: 'Créer et ouvrir la fiche' })
      .click(),
  ]);
  expect(creationResponse.status()).toBe(201);
  const creationResult =
    await readApiData<PersonMutationResponse>(creationResponse);
  expect(creationResult.person.emails).toHaveLength(0);
  expect(creationResult.person.phones).toHaveLength(0);
  expect(creationResult.person.socialProfiles).toHaveLength(0);
  const personId = creationResult.person.id;
  await expect(page).toHaveURL(
    (url) => url.pathname === `/membres/repertoire/${personId}`,
  );
  await expect(
    page.getByRole('heading', { exact: true, name: nickname }),
  ).toBeVisible();
  await page.getByRole('link', { exact: true, name: 'Coordonnées' }).click();

  // Coordinates are now added on the detail page through actual child dialogs.
  async function addCoordinate(
    kind: 'email' | 'phone' | 'social',
    value: string,
    label: string,
    primary: boolean,
    profileUrl?: string,
  ): Promise<PersonMutationResponse> {
    const names = {
      email: 'Ajouter un email',
      phone: 'Ajouter un téléphone',
      social: 'Ajouter un profil social',
    };
    const paths = {
      email: 'emails',
      phone: 'telephones',
      social: 'reseaux-sociaux',
    };
    const primaryNames = {
      email: 'Email principal',
      phone: 'Téléphone principal',
      social: 'Profil principal pour ce réseau',
    };
    // These keys are the closed fixture union above, never external input.
    // eslint-disable-next-line security/detect-object-injection
    await page.getByRole('button', { exact: true, name: names[kind] }).click();
    const dialog = page.getByRole('dialog');
    await dialog
      .getByRole('textbox', {
        name:
          kind === 'email'
            ? /^Email/
            : kind === 'phone'
              ? /^Numéro/
              : /^Identifiant visible/,
      })
      .fill(value);
    await dialog.getByRole('combobox', { name: /^Libellé/ }).fill(label);
    if (profileUrl)
      await dialog
        .getByLabel('URL du profil', { exact: true })
        .fill(profileUrl);
    const primarySwitch = dialog.getByRole('switch', {
      // eslint-disable-next-line security/detect-object-injection
      name: primaryNames[kind],
    });
    if ((await primarySwitch.getAttribute('aria-checked')) !== String(primary))
      await primarySwitch.click();
    const [response] = await Promise.all([
      page.waitForResponse(
        (response) =>
          response.request().method() === 'POST' &&
          new URL(response.url()).pathname ===
            // eslint-disable-next-line security/detect-object-injection
            `/api/personnes/${personId}/${paths[kind]}`,
      ),
      dialog.getByRole('button', { exact: true, name: 'Enregistrer' }).click(),
    ]);
    expect(response.status()).toBe(201);
    expect(response.request().postDataJSON()).not.toHaveProperty(
      'normalizedPhone',
    );
    const result = await readApiData<PersonMutationResponse>(response);
    if (result.duplicateWarning?.duplicateFound) {
      await expect(
        dialog.getByText(
          'Cette valeur existe aussi sur une autre fiche. Elle a bien été enregistrée ici.',
          { exact: true },
        ),
      ).toBeVisible();
      await dialog
        .getByRole('button', { exact: true, name: 'Terminer' })
        .click();
    }
    await expect(dialog).toBeHidden();

    return result;
  }

  const emailResult = await addCoordinate(
    'email',
    sharedEmail,
    'Association',
    true,
  );
  expect(emailResult.duplicateWarning?.duplicateFound).toBe(true);
  expect(emailResult.duplicateWarning?.fields).toContain('email');
  const duplicateWarningWire = JSON.stringify(emailResult.duplicateWarning);
  expect(duplicateWarningWire).not.toContain(duplicateSource.person.id);
  expect(duplicateWarningWire).not.toContain(duplicateSourceNickname);
  await addCoordinate('email', primaryEmail, 'Personnel', false);
  await addCoordinate('phone', sharedPhone, 'Association', true);
  await addCoordinate('phone', primaryPhone, 'Personnel', true);
  await addCoordinate(
    'social',
    sharedDiscord,
    'Secondaire',
    true,
    sharedDiscordUrl,
  );
  await addCoordinate(
    'social',
    primaryDiscord,
    'Personnel',
    true,
    primaryDiscordUrl,
  );
  const populatedPerson = await getPersonViaApi(page, personId);
  expect(populatedPerson.emails).toHaveLength(2);
  expect(populatedPerson.phones).toHaveLength(2);
  expect(populatedPerson.socialProfiles).toHaveLength(2);
  expect(populatedPerson.emails.filter((item) => item.isPrimary)).toEqual([
    expect.objectContaining({ email: sharedEmail }),
  ]);
  expect(populatedPerson.phones.filter((item) => item.isPrimary)).toEqual([
    expect.objectContaining({ phone: primaryPhone }),
  ]);
  expect(
    populatedPerson.socialProfiles.filter((item) => item.isPrimary),
  ).toEqual([expect.objectContaining({ identifier: primaryDiscord })]);
  const primaryEmailItem = populatedPerson.emails.find(
    (item) => item.email === primaryEmail,
  );
  const sharedPhoneItem = populatedPerson.phones.find(
    (item) => item.phone === sharedPhone,
  );
  const sharedSocialItem = populatedPerson.socialProfiles.find(
    (item) => item.identifier === sharedDiscord,
  );
  if (!primaryEmailItem || !sharedPhoneItem || !sharedSocialItem)
    throw new Error('Created secondary Person data is missing.');

  await page
    .getByRole('listitem')
    .filter({ hasText: primaryEmail })
    .getByRole('button', { name: 'Modifier cet email' })
    .click();
  let childDialog = page.getByRole('dialog');
  await expect(
    childDialog.getByRole('switch', { name: 'Email principal' }),
  ).toBeVisible();
  const childEmailInput = childDialog.getByRole('textbox', { name: /^Email/ });
  await childEmailInput.fill('adresse-invalide');
  await childDialog
    .getByRole('button', { exact: true, name: 'Enregistrer' })
    .click();
  await expect(childEmailInput).toHaveAttribute('aria-invalid', 'true');
  await expect(childEmailInput).toBeFocused();
  await childEmailInput.fill(primaryEmail);

  const childEmailLabel = childDialog.getByRole('combobox', {
    name: /^Libellé/,
  });
  await childEmailLabel.fill('E2E temporaire');
  await page.keyboard.press('Escape');
  const unsavedChildDialog = page.getByRole('alertdialog', {
    name: /Quitter sans enregistrer/,
  });
  await expect(unsavedChildDialog).toBeVisible();
  await expect(
    unsavedChildDialog.getByRole('button', { name: 'Rester' }),
  ).toBeFocused();
  // Autofocus precedes the modal layer's effects. Complete its real entrance
  // animation before injecting a distinct second Escape into the nested dialog.
  await unsavedChildDialog.evaluate(async (element) => {
    await Promise.all(
      element
        .getAnimations()
        .map((animation) => animation.finished.catch(() => undefined)),
    );
  });
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

  await page.getByRole('link', { exact: true, name: 'Identité' }).click();
  await page
    .getByRole('textbox', { name: /^Pseudo principal/ })
    .fill(updatedNickname);

  const currentPerson = await getPersonViaApi(page, personId);
  const concurrentResponse = await browserApi(
    page,
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
      method: 'PATCH',
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
    page.getByText(
      'La fiche a changé. Actualisez la version avant de confirmer votre saisie.',
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('textbox', { name: /^Pseudo principal/ }),
  ).toHaveValue(updatedNickname);

  const reloadResponsePromise = page.waitForResponse(
    (response) =>
      response.request().method() === 'GET' &&
      response.url().endsWith(`/api/personnes/${personId}`),
  );
  await page
    .getByRole('button', { exact: true, name: 'Actualiser la version' })
    .click();
  expect((await reloadResponsePromise).status()).toBe(200);
  await expect(
    page.getByRole('textbox', { name: /^Pseudo principal/ }),
  ).toHaveValue(updatedNickname);
  await expect(
    page.getByText(
      'La fiche a changé. Actualisez la version avant de confirmer votre saisie.',
      { exact: true },
    ),
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
  await expect(
    page.getByRole('textbox', { name: /^Pseudo principal/ }),
  ).toHaveValue(updatedNickname);
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

  // No field history icon on any page since 27 October 2026: the record
  // never asks for a field history.
  await expect(
    page.getByRole('button', { name: /^Historique|origine/ }),
  ).toHaveCount(0);
  expect(contextualHistoryRequests).toBe(0);
  page.off('request', onHistoryRequest);

  await expectPersonsListFilteringAndPagination(page, uniqueSuffix);
  const readinessResponsePromise = page.waitForResponse(
    (response) => new URL(response.url()).pathname === '/api/health/ready',
  );
  await page.goto(`/membres/repertoire/${personId}`);
  let readinessResponse = await readinessResponsePromise;
  if (readinessResponse.status() === 429) {
    // Repeated full navigations in this smoke can consume the real readiness
    // quota. Respect its response instead of changing the limiter or forcing UI.
    const seconds = Number(readinessResponse.headers()['retry-after']);
    expect(Number.isFinite(seconds) && seconds > 0 && seconds <= 60).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, seconds * 1_000));
    [readinessResponse] = await Promise.all([
      page.waitForResponse(
        (response) => new URL(response.url()).pathname === '/api/health/ready',
      ),
      page.getByRole('button', { exact: true, name: 'Revérifier' }).click(),
    ]);
  }
  expect(readinessResponse.status()).toBe(200);
  expect((await readinessResponse.json()).checks.persons).toBe('ready');
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
  await expect(page).toHaveURL('/membres/repertoire', {
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
  test.setTimeout(300_000);
  const cspRefusals: string[] = [];
  watchContentSecurityPolicy(page.context(), cspRefusals);
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

  await page.goto('/systeme/utilisateurs');
  await expect(
    page.getByRole('heading', { name: 'Utilisateurs' }),
  ).toBeVisible();
  await expect(
    page.locator('table[aria-label="Comptes utilisateurs"]'),
  ).toBeAttached();
  await expectAccessiblePageStructure(page);

  // Enter on a palette button must not also open the selected destination.
  const searchTrigger = page.getByRole('button', {
    exact: true,
    name: 'Rechercher une page',
  });
  const searchDialog = page.getByRole('dialog', { name: 'Navigation rapide' });
  const searchInput = searchDialog.getByRole('combobox', {
    name: 'Rechercher une page',
  });
  await searchTrigger.click();
  await searchInput.fill('compte');
  await searchInput.press('Tab');
  const clearSearch = searchDialog.getByRole('button', {
    name: 'Effacer la recherche',
  });
  await expect(clearSearch).toBeFocused();
  await clearSearch.press('Enter');
  await expect(searchInput).toBeFocused();
  await expect(searchInput).toHaveValue('');
  await expect(page).toHaveURL(/\/systeme\/utilisateurs$/);

  await searchDialog
    .getByRole('button', { name: 'Fermer la navigation rapide' })
    .press('Enter');
  await expect(searchDialog).toHaveCount(0);
  await expect(searchTrigger).toBeFocused();
  await expect(page).toHaveURL(/\/systeme\/utilisateurs$/);

  await expectSystemSettingsDraftSafety(page);
  await expectUserCreationRecovery(page);
  const createdUserId = new URL(page.url()).pathname.split('/').at(-1);
  if (!createdUserId)
    throw new Error('Created user detail URL is missing its ID.');
  await expectUserDetailDraftSafety(page, createdUserId);
  await expectUserDetailConflictRecovery(page, createdUserId);

  await expectSelfProfileSyncWithoutReload(page);
  await expectPersonIdentityLifecycle(page);
  await expectMobileLayouts(page, createdUserId, cspRefusals);
  expectNoContentSecurityPolicyRefusal(cspRefusals);
});
