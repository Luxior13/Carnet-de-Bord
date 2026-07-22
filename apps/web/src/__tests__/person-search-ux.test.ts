import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  queryRaw: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('$env', () => ({
  env: {
    MFA_ENCRYPTION_KEY_V1: 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=',
  },
}));

vi.mock('$server/prisma', () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
  },
}));

vi.mock('$features/persons/server/person-audit', () => ({
  createPersonAudit: vi.fn(),
}));

import { listPersons } from '$features/persons/server/person-core.service';

type SqlQuery = {
  strings: readonly string[];
  values: readonly unknown[];
};

const getLastSql = (): { text: string; values: readonly unknown[] } => {
  const query = mocks.queryRaw.mock.calls.at(-1)?.[0] as SqlQuery;

  return { text: query.strings.join('?'), values: query.values };
};

// Test-owned paths only; neither URL receives external input.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const historyPanelSource = readFileSync(
  new URL(
    '../features/persons/components/PersonFieldHistoryPanel.tsx',
    import.meta.url,
  ),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const collectionsSource = readFileSync(
  new URL(
    '../features/persons/components/PersonCollectionsSection.tsx',
    import.meta.url,
  ),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const childDialogSource = readFileSync(
  new URL(
    '../features/persons/components/PersonChildDialog.tsx',
    import.meta.url,
  ),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const collectionFieldsSource = readFileSync(
  new URL(
    '../features/persons/components/PersonCollectionFields.tsx',
    import.meta.url,
  ),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const socialNetworkIconSource = readFileSync(
  new URL(
    '../features/persons/components/PersonSocialNetworkIcon.tsx',
    import.meta.url,
  ),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const dataTableSectionSource = readFileSync(
  new URL('../components/ui/data-table-section.tsx', import.meta.url),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const createFormSource = readFileSync(
  new URL(
    '../features/persons/components/PersonCreateForm.tsx',
    import.meta.url,
  ),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const identitySectionSource = readFileSync(
  new URL(
    '../features/persons/components/PersonIdentitySection.tsx',
    import.meta.url,
  ),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const identityFieldsSource = readFileSync(
  new URL(
    '../features/persons/components/PersonIdentityFields.tsx',
    import.meta.url,
  ),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const detailPageSource = readFileSync(
  new URL(
    '../features/persons/components/PersonDetailPage.tsx',
    import.meta.url,
  ),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const dangerZoneSource = readFileSync(
  new URL(
    '../features/persons/components/PersonDangerZone.tsx',
    import.meta.url,
  ),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const personsPageSource = readFileSync(
  new URL('../app/vie-interne/repertoire/page.tsx', import.meta.url),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const personsListSource = readFileSync(
  new URL('../features/persons/components/PersonsList.tsx', import.meta.url),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const newPersonPageSource = readFileSync(
  new URL('../app/vie-interne/repertoire/nouveau/page.tsx', import.meta.url),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const personLoadingSource = readFileSync(
  new URL('../app/vie-interne/repertoire/[id]/loading.tsx', import.meta.url),
  'utf8',
);

describe('person indexed search', () => {
  beforeEach(() => {
    mocks.queryRaw.mockReset();
    mocks.queryRaw.mockResolvedValue([]);
  });

  it('uses exact, prefix, and trigram-compatible LIKE branches on normalized identity columns', async () => {
    await listPersons({ limit: 25, q: 'Élo' });
    const sql = getLastSql();

    expect(sql.text).toContain('p."normalizedNickname" =');
    expect(sql.text).toContain('p."normalizedNickname" LIKE');
    expect(sql.text).not.toContain('ILIKE');
    expect(sql.values).toContain('elo');
    expect(sql.values).toContain('elo%');
    expect(sql.values).toContain('%elo%');
  });

  it('uses prefix-friendly contact predicates and an exact hash for a social URL', async () => {
    await listPersons({ limit: 25, q: 'MEMBER@EXAMPLE.COM' });
    const emailSql = getLastSql();
    expect(emailSql.text).toContain('email."normalizedEmail" =');
    expect(emailSql.text).toContain('email."normalizedEmail" LIKE');
    expect(emailSql.values).toContain('member@example.com');
    expect(emailSql.values).toContain('member@example.com%');

    await listPersons({
      limit: 25,
      q: 'HTTPS://Example.COM:443/member/#private',
    });
    const urlSql = getLastSql();
    const expectedHash = createHash('sha256')
      .update('https://example.com/member', 'utf8')
      .digest('hex');
    expect(urlSql.text).toContain('social_url."normalizedProfileUrlHash" =');
    expect(urlSql.text).toContain('social_url."normalizedProfileUrl" =');
    expect(urlSql.values).toContain(expectedHash);
    expect(urlSql.values).toContain('https://example.com/member');
  });

  it('filters status in SQL and keeps multi-child search in correlated EXISTS clauses', async () => {
    await listPersons({
      limit: 25,
      q: '+336',
      structureStatus: 'IN_STRUCTURE',
    });
    const sql = getLastSql();

    expect(sql.text).toContain(
      'p."structureStatus" = ?::"PersonStructureStatus"',
    );
    expect(sql.values).toContain('IN_STRUCTURE');
    expect(sql.text).toContain('FROM "PersonEmail" email');
    expect(sql.text).toContain('FROM "PersonPhone" phone');
    expect(sql.text).toContain('FROM "PersonSocialProfile" social');
    expect(sql.text).not.toMatch(
      /JOIN\s+"Person(?:Email|Phone|SocialProfile)"/u,
    );
  });

  it('does not depend on an asynchronous deletion table', async () => {
    await listPersons({ limit: 25, q: '' });
    const listSql = getLastSql();
    expect(listSql.text).not.toContain('PersonDeletionRequest');

    await listPersons({ limit: 25, q: 'private@example.com' });
    const searchedSql = getLastSql();
    expect(searchedSql.text).not.toContain('PersonDeletionRequest');
  });

  it('rejects invalid or filter-mismatched cursors before issuing a database query', async () => {
    await expect(
      listPersons({ cursor: 'not-a-signed-cursor', limit: 25, q: '' }),
    ).rejects.toThrow('INVALID_CURSOR');
    expect(mocks.queryRaw).not.toHaveBeenCalled();

    mocks.queryRaw.mockResolvedValueOnce([
      {
        createdAt: new Date('2026-07-20T10:00:00.000Z'),
        firstName: 'Ada',
        id: 'person-1',
        lastName: 'Lovelace',
        matchedByContact: false,
        nickname: null,
        structureStatus: 'OUTSIDE_STRUCTURE',
        updatedAt: new Date('2026-07-20T10:00:00.000Z'),
        version: 1,
      },
      {
        createdAt: new Date('2026-07-19T10:00:00.000Z'),
        firstName: 'Grace',
        id: 'person-2',
        lastName: 'Hopper',
        matchedByContact: false,
        nickname: null,
        structureStatus: 'IN_STRUCTURE',
        updatedAt: new Date('2026-07-19T10:00:00.000Z'),
        version: 1,
      },
    ]);
    const firstPage = await listPersons({ limit: 1, q: '' });
    expect(firstPage.pagination.nextCursor).toBeTruthy();
    mocks.queryRaw.mockClear();

    await expect(
      listPersons({
        cursor: firstPage.pagination.nextCursor ?? undefined,
        limit: 1,
        q: 'different-filter',
      }),
    ).rejects.toThrow('INVALID_CURSOR');
    expect(mocks.queryRaw).not.toHaveBeenCalled();
  });

  it('pins following pages to the first snapshot and returns public summaries only', async () => {
    mocks.queryRaw.mockResolvedValueOnce([
      {
        createdAt: new Date('2026-07-20T10:00:00.000Z'),
        email: 'private@example.com',
        firstName: 'Ada',
        id: 'person-1',
        lastName: 'Lovelace',
        matchedByContact: true,
        nickname: null,
        phone: '+33600000000',
        socialProfiles: [{ identifier: 'private' }],
        structureStatus: 'OUTSIDE_STRUCTURE',
        updatedAt: new Date('2026-07-20T10:00:00.000Z'),
        version: 1,
      },
      {
        createdAt: new Date('2026-07-19T10:00:00.000Z'),
        firstName: 'Grace',
        id: 'person-2',
        lastName: 'Hopper',
        matchedByContact: false,
        nickname: null,
        structureStatus: 'IN_STRUCTURE',
        updatedAt: new Date('2026-07-19T10:00:00.000Z'),
        version: 1,
      },
    ]);

    const firstPage = await listPersons({ limit: 1, q: 'private' });
    expect(firstPage.items).toEqual([
      {
        createdAt: '2026-07-20T10:00:00.000Z',
        firstName: 'Ada',
        id: 'person-1',
        lastName: 'Lovelace',
        matchedByContact: true,
        nickname: null,
        structureStatus: 'OUTSIDE_STRUCTURE',
        updatedAt: '2026-07-20T10:00:00.000Z',
        version: 1,
      },
    ]);
    expect(firstPage.pagination.hasMore).toBe(true);

    mocks.queryRaw.mockResolvedValueOnce([]);
    await listPersons({
      cursor: firstPage.pagination.nextCursor ?? undefined,
      limit: 1,
      q: 'private',
    });
    const nextSql = getLastSql();
    expect(nextSql.text).toContain('p."createdAt" <=');
    expect(nextSql.text).toContain('p."createdAt" <');
    expect(nextSql.text).toContain('p."id" <');
    expect(
      nextSql.values.some(
        (value) =>
          value instanceof Date &&
          value.toISOString() === firstPage.pagination.snapshotAt,
      ),
    ).toBe(true);
  });
});

describe('person short-lived sensitive UX contracts', () => {
  it('expires decrypted field history within thirty seconds and reloads on every panel opening', () => {
    expect(historyPanelSource).toContain(
      'const DECRYPTED_HISTORY_TTL_MS = 30_000',
    );
    expect(historyPanelSource).toContain('void load()');
    expect(historyPanelSource).toContain('authorizationRevision');
    expect(historyPanelSource).toContain('canViewAudit,');
    for (const key of [
      'fieldKey,',
      'personId,',
      'recordId,',
      'revision,',
      'sectionKey,',
    ]) {
      expect(historyPanelSource).toContain(key);
    }
    expect(historyPanelSource).toContain('setItems([])');
    expect(historyPanelSource).toContain('setExpired(true)');
    expect(historyPanelSource).toContain('Historique masqué');
    expect(historyPanelSource).toContain('Recharger');
    expect(historyPanelSource).not.toContain('localStorage');
    expect(historyPanelSource).not.toContain('sessionStorage');
    expect(historyPanelSource).toContain('{canViewAudit && !loading && (');
    expect(historyPanelSource).toContain('<Link href={journalHref}>');
    expect(historyPanelSource).toContain('divide-border-divider divide-y');
    expect(collectionsSource).not.toContain('fieldKey="email"');
    expect(collectionsSource).not.toContain('fieldKey="phone"');
    expect(collectionsSource).not.toContain('<PersonFieldHistoryPopover');
    expect(collectionFieldsSource).toContain('aria-pressed={activeFieldKey');
    expect(collectionFieldsSource).toContain('target={histories?.email}');
    expect(collectionFieldsSource).toContain('target={histories?.phone}');
    expect(identitySectionSource).not.toContain('<PersonFieldHistoryPopover');
    expect(identitySectionSource).toContain('<PersonFieldHistoryPanel');
    expect(identityFieldsSource).toContain('history={histories?.nickname}');
    expect(identityFieldsSource).toContain(
      'history={histories?.structureStatus}',
    );
    expect(childDialogSource).toContain("'label',");
    expect(childDialogSource).toContain("'isPrimary',");
    expect(collectionsSource).toContain('canEdit={canUpdate}');
    expect(childDialogSource).toContain('layout="stacked"');
    expect(collectionFieldsSource).toContain(
      "type FieldsLayout = 'grid' | 'stacked'",
    );
    expect(historyPanelSource).toContain('...(recordId ? { recordId } : {})');
    expect(historyPanelSource).toContain('lg:border-l lg:pl-5');
    expect(historyPanelSource).toContain('<ArrowLeft className="size-4" />');
    expect(historyPanelSource).toContain('<Plus />');
    expect(historyPanelSource).toContain('variant="success"');
    expect(historyPanelSource).toContain('variant="info"');
    expect(historyPanelSource).toContain('variant="destructive"');
    expect(childDialogSource).toContain(
      'lg:grid-cols-[minmax(0,1fr)_minmax(17rem,0.72fr)]',
    );
    expect(childDialogSource).toContain(
      "'sm:h-[min(42rem,85svh)] sm:max-w-4xl'",
    );
    expect(childDialogSource).toContain('Historique des champs');
    expect(childDialogSource).toContain("'hidden space-y-4 lg:block'");
  });

  it('restores focus in the deleted collection and disables deprecated networks', () => {
    expect(collectionsSource).toContain('addPhoneRef.current');
    expect(collectionsSource).toContain('addSocialRef.current');
    expect(collectionFieldsSource).toContain(
      "disabled={network.status === 'deprecated'}",
    );
    expect(collectionsSource).toContain('<DuplicateFieldWarning>');
    expect(collectionsSource).toContain('match.recordId === item.id');
    expect(collectionsSource).toContain('navigator.clipboard.writeText(value)');
    expect(collectionsSource).toContain('<CopyAction label="Email"');
    expect(collectionsSource).toContain('<CopyAction label="Numéro"');
    expect(collectionsSource).not.toContain('<Trash2');
    expect(childDialogSource).toContain('{canEdit && item && !saved && (');
    expect(childDialogSource).toContain('onClick={onDelete}');
    expect(childDialogSource).toContain('variant="destructive"');
  });

  it('shows durable social network icons without depending on remote assets', () => {
    for (const networkKey of [
      'discord',
      'instagram',
      'x',
      'twitter',
      'tiktok',
      'twitch',
      'youtube',
      'facebook',
      'linkedin',
    ]) {
      expect(socialNetworkIconSource).toContain(`['${networkKey}',`);
    }
    expect(socialNetworkIconSource).toContain('if (!definition)');
    expect(socialNetworkIconSource).toContain('<Globe2');
    expect(socialNetworkIconSource).toContain('aria-hidden="true"');
    expect(socialNetworkIconSource).not.toContain('fetch(');
    expect(socialNetworkIconSource).not.toContain('<img');
    expect(collectionFieldsSource).toContain('networkKey={network.key}');
    expect(collectionsSource).toContain('networkKey={item.networkKey}');
  });

  it('separates each contact collection into an independent responsive card', () => {
    expect(collectionsSource).toContain(
      'xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)]',
    );
    expect(collectionsSource).toContain('<div className="space-y-4">');
    expect(collectionsSource).toContain('const CopyAction');
    expect(collectionsSource).toContain('person.emails.map');
    expect(collectionsSource).toContain('person.phones.map');
    expect(collectionsSource).toContain('person.socialProfiles.map');
    expect(collectionsSource).not.toContain('SecondaryItemsToggle');
    expect(collectionsSource).not.toContain('showOther');
    expect(collectionsSource).not.toContain('Masquer les autres');
    expect(detailPageSource).toContain('<div className="px-1">');
    expect(detailPageSource).not.toContain(
      'bg-surface-inset rounded-lg border px-4 py-3',
    );
  });

  it('keeps directory editors usable at every viewport size', () => {
    expect(childDialogSource).toContain('fullscreenOnMobile');
    expect(identitySectionSource).toContain('fullscreenOnMobile');
    expect(childDialogSource).toContain('sm:max-w-2xl');
    expect(childDialogSource).toContain('grid-rows-[auto_minmax(0,1fr)_auto]');
    expect(childDialogSource).toContain('min-h-0 overflow-y-auto');
    expect(identitySectionSource).toContain(
      'grid-rows-[auto_minmax(0,1fr)_auto]',
    );
    expect(identitySectionSource).toContain('min-h-0 overflow-y-auto');
    expect(collectionsSource).toContain(
      "requiresReplacement ? 'sm:max-w-lg' : 'sm:max-w-md'",
    );
    expect(dangerZoneSource).toContain(
      '<AlertDialogContent className="sm:max-w-lg">',
    );
    for (const source of [
      childDialogSource,
      createFormSource,
      identitySectionSource,
    ]) {
      expect(source).toContain('contentClassName="sm:max-w-md"');
    }
  });

  it('uses the directory width and a compact list hierarchy', () => {
    expect(detailPageSource).not.toContain('width="narrow"');
    expect(personLoadingSource).not.toContain('width="narrow"');
    expect(personsListSource).toContain('headerLayout="inline"');
    expect(personsListSource).toContain('className="[&_th]:h-9"');
    expect(personsListSource).toContain('className="py-2"');
    expect(personsListSource).toContain('border-t px-4 py-2');
    expect(dataTableSectionSource).toContain(
      "headerLayout?: 'inline' | 'stacked'",
    );
    expect(identitySectionSource).toContain(
      'xl:grid-cols-[minmax(0,1fr)_18rem]',
    );
    expect(identitySectionSource).toContain('Informations personnelles');
    expect(identitySectionSource).toContain(
      '<CardHeader className="p-3.5 sm:p-4">',
    );
    expect(identitySectionSource).toContain(
      '<CardContent className="p-4 sm:p-5">',
    );
    expect(identitySectionSource).toContain('flex size-8 shrink-0');
    expect(identitySectionSource).toContain("Modifier l'identité");
    expect(identitySectionSource).toContain("'sm:max-w-4xl' : 'sm:max-w-2xl'");
    expect(identityFieldsSource).toContain('sm:grid-cols-2');
    expect(identityFieldsSource).not.toContain('xl:grid-cols-3');
    expect(identityFieldsSource).not.toContain('autoComplete="given-name"');
    expect(identityFieldsSource).not.toContain('autoComplete="family-name"');
    expect(identityFieldsSource).not.toContain('autoComplete="nickname"');
    expect(detailPageSource).toContain('<PageHero');
    expect(detailPageSource).toContain('compact');
    expect(detailPageSource).not.toContain('Fiche du répertoire');
    expect(detailPageSource).not.toContain(
      "sans lien avec un compte d'accès au site",
    );
    expect(detailPageSource).toContain('data-[state=active]:border-primary/40');
    expect(detailPageSource).toContain(
      '<Tabs className="gap-3" value={activeSection}>',
    );
    expect(detailPageSource).toContain('<PageBackNavigation');
    expect(detailPageSource).toContain('label="Retour au répertoire"');
    expect(detailPageSource).not.toContain('<PageHero\n          actions=');
    expect(newPersonPageSource).toContain('<PageBackNavigation');
    expect(newPersonPageSource).toContain('contentClassName="relative');
    expect(personLoadingSource).toContain('h-28 rounded-xl');
  });

  it('guards sidebar and breadcrumb links for both dirty person forms', () => {
    for (const source of [createFormSource, identitySectionSource]) {
      expect(source).toContain('useUnsavedNavigationGuard(isDirty)');
      expect(source).toContain('pendingNavigationHref !== null');
      expect(source).toContain('<UnsavedNavigationDialog');
    }
    expect(createFormSource).not.toContain(
      'Abandonner les changements non enregistrés ?',
    );
    expect(identitySectionSource).not.toContain('window.confirm');
    expect(identitySectionSource).toContain('pendingLocalDiscard');
    expect(identitySectionSource).toContain(
      'title="Annuler les modifications ?"',
    );
    expect(identitySectionSource).toContain(
      'cancelLabel="Continuer la modification"',
    );
  });

  it('waits for operational readiness before fetching a person detail', () => {
    expect(detailPageSource).toContain('featureAvailabilityLoaded');
    expect(detailPageSource).toContain(
      'operationalFeatureIds.has(FEATURES.persons.id)',
    );
    expect(detailPageSource).toContain(
      '!featureAvailabilityLoaded || !featureOperational',
    );
    expect(detailPageSource).toContain(
      'title="Répertoire temporairement indisponible"',
    );
  });

  it('shows the Vie interne hierarchy without inventing a pole hub link', () => {
    for (const source of [
      personsPageSource,
      newPersonPageSource,
      detailPageSource,
      personLoadingSource,
    ]) {
      expect(source).toContain('FEATURES.persons.audit.poleLabel');
    }
    expect(newPersonPageSource).toContain(
      '{ href: FEATURES.persons.href, label: FEATURES.persons.label }',
    );
    expect(newPersonPageSource).toContain("{ label: 'Nouvelle fiche' }");
  });
});
