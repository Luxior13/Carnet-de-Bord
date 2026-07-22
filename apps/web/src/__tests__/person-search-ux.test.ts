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
const historyPopoverSource = readFileSync(
  new URL(
    '../features/persons/components/PersonFieldHistoryPopover.tsx',
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
const collectionFieldsSource = readFileSync(
  new URL(
    '../features/persons/components/PersonCollectionFields.tsx',
    import.meta.url,
  ),
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
const detailPageSource = readFileSync(
  new URL(
    '../features/persons/components/PersonDetailPage.tsx',
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
  it('expires decrypted field history within thirty seconds and reloads on every opening', () => {
    expect(historyPopoverSource).toContain(
      'const DECRYPTED_HISTORY_TTL_MS = 30_000',
    );
    expect(historyPopoverSource).toContain('setOpen(false)');
    expect(historyPopoverSource).toContain('if (nextOpen)');
    expect(historyPopoverSource).toContain('void load()');
    expect(historyPopoverSource).toContain('authorizationRevision');
    expect(historyPopoverSource).toContain('canViewAudit,');
    for (const key of [
      'fieldKey,',
      'personId,',
      'recordId,',
      'revision,',
      'sectionKey,',
    ]) {
      expect(historyPopoverSource).toContain(key);
    }
    expect(historyPopoverSource).toContain('setItems([])');
    expect(historyPopoverSource).not.toContain('localStorage');
    expect(historyPopoverSource).not.toContain('sessionStorage');
    expect(historyPopoverSource).toContain('{canViewAudit && (');
    expect(historyPopoverSource).toContain('<Link href={journalHref}>');
  });

  it('restores focus in the deleted collection and disables deprecated networks', () => {
    expect(collectionsSource).toContain('addPhoneRef.current');
    expect(collectionsSource).toContain('addSocialRef.current');
    expect(collectionFieldsSource).toContain(
      "disabled={network.status === 'deprecated'}",
    );
    expect(collectionsSource).toContain('<DuplicateFieldWarning>');
    expect(collectionsSource).toContain('match.recordId === item.id');
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
    expect(newPersonPageSource).toContain("{ label: 'Ajouter une personne' }");
  });
});
