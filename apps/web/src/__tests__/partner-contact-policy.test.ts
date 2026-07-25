import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { PARTNER_LIMITS } from '$features/partners/partner.constants';
import { handlePartnerApiError } from '$features/partners/server/partner-api';
import {
  assertPartnerContactCanBeAdded,
  assertPartnerContactCanBeUpdated,
  assertPartnerContactDateOrder,
} from '$features/partners/server/partner-contact-policy';
import { partnerErrors } from '$features/partners/server/partner-errors';
import { ErrorCode } from '$types/api.types';

// Test-owned static path.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const contactServiceSource = readFileSync(
  new URL(
    '../features/partners/server/partner-contact.service.ts',
    import.meta.url,
  ),
  'utf8',
);
// Test-owned static path.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const partnerServiceSource = readFileSync(
  new URL('../features/partners/server/partner.service.ts', import.meta.url),
  'utf8',
);
// Test-owned static path.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const partnerApiSource = readFileSync(
  new URL('../features/partners/server/partner-api.ts', import.meta.url),
  'utf8',
);
// Test-owned static path.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const migrationSql = readFileSync(
  new URL(
    '../../../../packages/database/prisma/migrations/20260723190000_partner_relationships/migration.sql',
    import.meta.url,
  ),
  'utf8',
);

const activeContacts = (count: number): Array<{ personId: string }> =>
  Array.from({ length: count }, (_, index) => ({
    personId: `person-${index}`,
  }));

describe('partner contact policy', () => {
  it('limits active links without imposing a limit on history', () => {
    expect(PARTNER_LIMITS.contacts).toBe(30);
    expect(() =>
      assertPartnerContactCanBeAdded({
        activeContacts: activeContacts(PARTNER_LIMITS.contacts - 1),
        personId: 'new-person',
      }),
    ).not.toThrow();

    let error: unknown;
    try {
      assertPartnerContactCanBeAdded({
        activeContacts: activeContacts(PARTNER_LIMITS.contacts),
        personId: 'new-person',
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({
      code: 'PARTNER_CONTACT_LIMIT_REACHED',
      message: expect.stringContaining('30 interlocuteurs actifs'),
    });
  });

  it('returns the dedicated duplicate error before the quota error', () => {
    let error: unknown;
    try {
      assertPartnerContactCanBeAdded({
        activeContacts: activeContacts(PARTNER_LIMITS.contacts),
        personId: 'person-0',
      });
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({
      code: 'PARTNER_CONTACT_ALREADY_ACTIVE',
      message: expect.stringContaining('déjà lié activement'),
    });
  });

  it('allows historical metadata corrections without restoring active state', () => {
    expect(() =>
      assertPartnerContactCanBeUpdated({
        isClosed: true,
      }),
    ).not.toThrow();
    expect(() =>
      assertPartnerContactCanBeUpdated({
        isClosed: true,
        isPrimary: false,
      }),
    ).not.toThrow();
  });

  it('does not keep operational coordinates on a closed link', () => {
    expect(() =>
      assertPartnerContactCanBeUpdated({
        isClosed: true,
        updatesSelectedCoordinates: true,
      }),
    ).toThrow(
      'Les coordonnées d’une ancienne liaison ne peuvent plus être modifiées',
    );
    expect(() =>
      assertPartnerContactCanBeUpdated({
        close: true,
        isClosed: false,
        updatesSelectedCoordinates: true,
      }),
    ).toThrow(
      'Les coordonnées d’une ancienne liaison ne peuvent plus être modifiées',
    );
    expect(contactServiceSource).toContain('selectedEmailId: null');
    expect(contactServiceSource).toContain('selectedPhoneId: null');
  });

  it.each([
    [
      'a close:false no-op on an active link',
      { close: false, isClosed: false },
    ],
    ['reopening a closed link', { close: false, isClosed: true }],
    ['closing a closed link again', { close: true, isClosed: true }],
    ['making a closed link primary', { isClosed: true, isPrimary: true }],
  ])('rejects %s', (_, input) => {
    let error: unknown;
    try {
      assertPartnerContactCanBeUpdated(input);
    } catch (caught) {
      error = caught;
    }
    expect(error).toMatchObject({
      code: 'PARTNER_CONTACT_REOPEN_FORBIDDEN',
      message: expect.stringContaining('réactivée ni modifiée comme active'),
    });
  });

  it('never demotes the current primary while closing another link', () => {
    expect(() =>
      assertPartnerContactCanBeUpdated({
        close: true,
        isClosed: false,
        isPrimary: true,
      }),
    ).toThrow('ne peut pas être définie comme interlocuteur principal');
  });

  it('validates dates against the stored relationship dates', () => {
    expect(() =>
      assertPartnerContactDateOrder({
        endedOn: new Date('2026-07-25T00:00:00.000Z'),
        startedOn: new Date('2026-07-01T00:00:00.000Z'),
      }),
    ).not.toThrow();
    expect(() =>
      assertPartnerContactDateOrder({
        endedOn: new Date('2026-06-30T00:00:00.000Z'),
        startedOn: new Date('2026-07-01T00:00:00.000Z'),
      }),
    ).toThrow('ne peut pas précéder');
  });

  it('serializes the active-only quota check and preserves the DB backstop', () => {
    const addSource = contactServiceSource.slice(
      contactServiceSource.indexOf('export const addPartnerContact'),
      contactServiceSource.indexOf('export const updatePartnerContact'),
    );

    expect(addSource.indexOf('touchPartner(transaction')).toBeLessThan(
      addSource.indexOf('partnerContact.findMany'),
    );
    expect(addSource).toContain(
      'where: { closedAt: null, organizationId: partner.id }',
    );
    expect(contactServiceSource).toContain(
      'error instanceof Prisma.PrismaClientKnownRequestError',
    );
    expect(contactServiceSource).toContain("error.code === 'P2002'");
    expect(contactServiceSource).toContain("error.code === 'P2003'");
    expect(migrationSql).toContain(
      'CREATE UNIQUE INDEX "PartnerContact_active_person_key"',
    );
    expect(migrationSql).toContain(
      'WHERE "closedAt" IS NULL AND "personId" IS NOT NULL',
    );
  });

  it('keeps the public service contract and maps domain failures to conflicts', async () => {
    const updateSource = contactServiceSource.slice(
      contactServiceSource.indexOf('export const updatePartnerContact'),
    );

    expect(partnerServiceSource).toContain("from './partner-contact.service';");
    for (const code of [
      'PARTNER_CONTACT_ALREADY_ACTIVE',
      'PARTNER_CONTACT_LIMIT_REACHED',
      'PARTNER_CONTACT_REOPEN_FORBIDDEN',
      'PARTNER_CONTACT_VERSION_CONFLICT',
    ]) {
      expect(partnerApiSource).toContain(`case '${code}':`);
    }
    expect(
      updateSource.indexOf('contact.version !== input.contactVersion'),
    ).toBeLessThan(updateSource.indexOf('touchPartner(transaction'));
    expect(
      updateSource.indexOf('assertPartnerContactCanBeUpdated({'),
    ).toBeLessThan(updateSource.indexOf('touchPartner(transaction'));
    expect(
      updateSource.indexOf('assertPartnerContactDateOrder({'),
    ).toBeLessThan(updateSource.indexOf('touchPartner(transaction'));
    expect(
      updateSource.indexOf('assertPartnerContactCanBeUpdated({'),
    ).toBeLessThan(updateSource.indexOf('partnerContact.updateMany'));
    expect(updateSource).toContain('const updatedContact = await');
    expect(updateSource).toContain('version: input.contactVersion');
    expect(updateSource).toContain('if (updatedContact.count !== 1)');
    expect(
      updateSource.indexOf('if (updatedContact.count !== 1)'),
    ).toBeLessThan(updateSource.indexOf('createPartnerAudit(transaction'));
    expect(contactServiceSource).not.toContain(
      '{ closedAt: null, endedOn: null }',
    );
    expect(contactServiceSource).toContain('partnerContactId: contactId');
    expect(contactServiceSource).toContain('partnerContactId: contact.id');
    expect(contactServiceSource).toContain('previousPrimaryContactId:');
    expect(contactServiceSource).not.toContain('metadata: { personId:');
    expect(partnerErrors.contactAlreadyActive().code).toBe(
      'PARTNER_CONTACT_ALREADY_ACTIVE',
    );
    expect(partnerErrors.contactVersionConflict()).toMatchObject({
      code: 'PARTNER_CONTACT_VERSION_CONFLICT',
      message: expect.stringContaining(
        'liaison avec un interlocuteur a été modifiée',
      ),
    });
    const response = await handlePartnerApiError(
      'PARTNER_CONTACT_UPDATE',
      partnerErrors.contactVersionConflict(),
    );
    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      error: { code: ErrorCode.PARTNER_CONTACT_VERSION_CONFLICT },
    });
  });
});
