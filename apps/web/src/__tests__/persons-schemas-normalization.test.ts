import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PersonStatusBadge } from '$features/persons/components/PersonStatusBadge';
import {
  PERSON_LIMITS,
  PERSON_STRUCTURE_STATUS_LABELS,
} from '$features/persons/person.constants';
import {
  getPersonFieldJournalHref,
  getStructureStatusTone,
} from '$features/persons/person.ui';
import {
  calculateCivilAge,
  normalizePersonEmail,
  normalizePersonSearchValue,
  normalizePersonSocialIdentifier,
  normalizePersonSocialUrl,
  parseCivilDate,
  serializeCivilDate,
} from '$features/persons/person.utils';
import {
  createPersonPhoneSchema,
  createPersonSchema,
  personFieldHistoryQuerySchema,
  personsListQuerySchema,
  personSocialProfileInputSchema,
  updatePersonSchema,
  updatePersonSocialProfileSchema,
} from '$features/persons/schemas/person.schemas';

describe('person schemas and stable normalisation', () => {
  it('normalises identity search without losing word boundaries', () => {
    expect(normalizePersonSearchValue('  Éléonore\tD’ARC  ')).toBe(
      'eleonore d’arc',
    );
    expect(normalizePersonSearchValue('Jean   DUPONT')).toBe('jean dupont');
  });

  it('normalises contact identifiers deterministically', () => {
    expect(normalizePersonEmail('  USER+Club@Example.COM ')).toBe(
      'user+club@example.com',
    );
    expect(normalizePersonSocialIdentifier('  LuxIOR#Main ')).toBe(
      'luxior#main',
    );
    expect(
      normalizePersonSocialUrl(
        'HTTPS://Example.COM:443/member///?z=2&a=3&a=1#private-fragment',
      ),
    ).toBe('https://example.com/member?a=1&a=3&z=2');

    const preservedEmail = createPersonSchema.parse({
      emails: [
        {
          email: '  USER+Club@Example.COM  ',
          isPrimary: true,
          label: 'Personnel',
        },
      ],
      nickname: 'Ada',
      structureStatus: 'IN_STRUCTURE',
    });
    expect(preservedEmail.emails[0]?.email).toBe('USER+Club@Example.COM');
  });

  it('requires a nickname or a complete legal name', () => {
    const missingIdentity = createPersonSchema.safeParse({
      birthDate: null,
      emails: [],
      firstName: 'Ada',
      lastName: null,
      nickname: null,
      phones: [],
      socialProfiles: [],
      structureStatus: 'OUTSIDE_STRUCTURE',
    });
    const nicknameOnly = createPersonSchema.safeParse({
      nickname: 'Ada',
      structureStatus: 'IN_STRUCTURE',
    });

    expect(missingIdentity.success).toBe(false);
    expect(nicknameOnly.success).toBe(true);
    if (nicknameOnly.success) {
      expect(nicknameOnly.data).toMatchObject({
        emails: [],
        firstName: null,
        lastName: null,
        nickname: 'Ada',
        phones: [],
        socialProfiles: [],
      });
    }
  });

  it('defaults a new person outside the structure and accepts both status transitions', () => {
    const created = createPersonSchema.parse({ nickname: 'Ada' });
    const baseUpdate = {
      birthDate: null,
      firstName: null,
      lastName: null,
      nickname: 'Ada',
      version: 1,
    };

    expect(created.structureStatus).toBe('OUTSIDE_STRUCTURE');
    expect(
      updatePersonSchema.parse({
        ...baseUpdate,
        structureStatus: 'IN_STRUCTURE',
      }).structureStatus,
    ).toBe('IN_STRUCTURE');
    expect(
      updatePersonSchema.parse({
        ...baseUpdate,
        structureStatus: 'OUTSIDE_STRUCTURE',
      }).structureStatus,
    ).toBe('OUTSIDE_STRUCTURE');
    expect(
      personsListQuerySchema.parse({ structureStatus: 'IN_STRUCTURE' }),
    ).toMatchObject({ limit: 25, q: '', structureStatus: 'IN_STRUCTURE' });
    expect(
      personsListQuerySchema.parse({ structureStatus: 'OUTSIDE_STRUCTURE' }),
    ).toMatchObject({
      limit: 25,
      q: '',
      structureStatus: 'OUTSIDE_STRUCTURE',
    });
  });

  it('renders the reviewed status labels and semantic badge tones', () => {
    const inside = renderToStaticMarkup(
      createElement(PersonStatusBadge, { status: 'IN_STRUCTURE' }),
    );
    const outside = renderToStaticMarkup(
      createElement(PersonStatusBadge, { status: 'OUTSIDE_STRUCTURE' }),
    );

    expect(inside).toContain(PERSON_STRUCTURE_STATUS_LABELS.IN_STRUCTURE);
    expect(outside).toContain(PERSON_STRUCTURE_STATUS_LABELS.OUTSIDE_STRUCTURE);
    expect(getStructureStatusTone('IN_STRUCTURE')).toBe('success');
    expect(getStructureStatusTone('OUTSIDE_STRUCTURE')).toBe('secondary');
  });

  it('builds a field-journal link with the complete contextual key', () => {
    const href = getPersonFieldJournalHref({
      fieldKey: 'email',
      personId: 'person/with spaces',
      recordId: 'email-1',
      sectionKey: 'contacts',
    });
    const parsed = new URL(href, 'https://example.test');

    expect(parsed.pathname).toBe('/systeme/journal-activite');
    expect(Object.fromEntries(parsed.searchParams)).toEqual({
      entityId: 'person/with spaces',
      entityType: 'PERSON',
      fieldKey: 'email',
      recordId: 'email-1',
      sectionKey: 'contacts',
    });
  });

  it('rejects duplicate initial contacts and multiple primaries', () => {
    const parsed = createPersonSchema.safeParse({
      emails: [
        {
          email: 'member@example.com',
          isPrimary: true,
          label: 'Personnel',
        },
        {
          email: 'MEMBER@example.com',
          isPrimary: true,
          label: 'Secondaire',
        },
      ],
      nickname: 'Member',
      phones: [],
      socialProfiles: [
        {
          identifier: '@member',
          isPrimary: true,
          label: 'Personnel',
          networkKey: 'discord',
        },
        {
          identifier: '@other',
          isPrimary: true,
          label: 'Secondaire',
          networkKey: 'discord',
        },
      ],
      structureStatus: 'OUTSIDE_STRUCTURE',
    });

    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.map((issue) => issue.path.join('.'))).toEqual(
        expect.arrayContaining([
          'emails.1.email',
          'emails.1.isPrimary',
          'socialProfiles.1.isPrimary',
        ]),
      );
    }
  });

  it('accepts every contact collection at its limit and rejects one item more', () => {
    const emails = Array.from({ length: PERSON_LIMITS.emails }, (_, index) => ({
      email: `member-${index}@example.com`,
      label: 'Personnel',
    }));
    const phones = Array.from({ length: PERSON_LIMITS.phones }, (_, index) => ({
      countryCode: 'FR',
      label: 'Mobile',
      phone: `06 12 34 ${String(index).padStart(2, '0')} ${String(index + 10).padStart(2, '0')}`,
    }));
    const socialProfiles = Array.from(
      { length: PERSON_LIMITS.socialProfiles },
      (_, index) => ({
        identifier: `member-${index}`,
        label: 'Personnel',
        networkKey: 'discord',
      }),
    );
    const base = { nickname: 'Member' };

    expect(createPersonSchema.safeParse({ ...base, emails }).success).toBe(
      true,
    );
    expect(
      createPersonSchema.safeParse({
        ...base,
        emails: [...emails, { email: 'overflow@example.com', label: 'Autre' }],
      }).success,
    ).toBe(false);
    expect(createPersonSchema.safeParse({ ...base, phones }).success).toBe(
      true,
    );
    expect(
      createPersonSchema.safeParse({
        ...base,
        phones: [
          ...phones,
          { countryCode: 'FR', label: 'Autre', phone: '07 01 02 03 04' },
        ],
      }).success,
    ).toBe(false);
    expect(
      createPersonSchema.safeParse({ ...base, socialProfiles }).success,
    ).toBe(true);
    expect(
      createPersonSchema.safeParse({
        ...base,
        socialProfiles: [
          ...socialProfiles,
          {
            identifier: 'overflow',
            label: 'Autre',
            networkKey: 'discord',
          },
        ],
      }).success,
    ).toBe(false);
  });

  it('rejects impossible, future, and implausibly old civil dates', () => {
    const currentYear = new Date().getUTCFullYear();
    const validIdentity = {
      firstName: 'Ada',
      lastName: 'Lovelace',
      nickname: null,
      structureStatus: 'OUTSIDE_STRUCTURE' as const,
      version: 1,
    };

    expect(
      updatePersonSchema.safeParse({
        ...validIdentity,
        birthDate: '2025-02-29',
      }).success,
    ).toBe(false);
    expect(
      updatePersonSchema.safeParse({
        ...validIdentity,
        birthDate: `${currentYear + 1}-01-01`,
      }).success,
    ).toBe(false);
    expect(
      updatePersonSchema.safeParse({
        ...validIdentity,
        birthDate: `${currentYear - 121}-01-01`,
      }).success,
    ).toBe(false);
    expect(
      updatePersonSchema.safeParse({
        ...validIdentity,
        birthDate: '2000-02-29',
      }).success,
    ).toBe(true);
  });

  it('converts national phone input to E.164 and rejects an invalid number', () => {
    const valid = createPersonPhoneSchema.safeParse({
      countryCode: 'fr',
      isPrimary: false,
      label: 'Mobile',
      personVersion: 3,
      phone: '06 12 34 56 78',
    });
    const invalid = createPersonPhoneSchema.safeParse({
      countryCode: 'FR',
      label: 'Mobile',
      personVersion: 3,
      phone: '123',
    });

    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.countryCode).toBe('FR');
      expect(valid.data.normalizedPhone).toBe('+33612345678');
    }
    expect(invalid.success).toBe(false);
  });

  it('accepts a social identifier or URL, but rejects unknown networks and unsafe URLs', () => {
    expect(
      personSocialProfileInputSchema.safeParse({
        identifier: '@member',
        label: 'Principal',
        networkKey: 'discord',
      }).success,
    ).toBe(true);
    expect(
      personSocialProfileInputSchema.safeParse({
        identifier: null,
        label: 'Principal',
        networkKey: 'discord',
        profileUrl: null,
      }).success,
    ).toBe(false);
    expect(
      personSocialProfileInputSchema.safeParse({
        identifier: '@member',
        label: 'Principal',
        networkKey: 'made-up-network',
      }).success,
    ).toBe(false);
    expect(
      personSocialProfileInputSchema.safeParse({
        identifier: null,
        label: 'Principal',
        networkKey: 'instagram',
        profileUrl: 'javascript:alert(1)',
      }).success,
    ).toBe(false);
    expect(
      personSocialProfileInputSchema.safeParse({
        identifier: null,
        label: 'Principal',
        networkKey: 'instagram',
        profileUrl: 'https://user:secret@example.com/member',
      }).success,
    ).toBe(false);
    expect(() =>
      normalizePersonSocialUrl('https://user:secret@example.com/member'),
    ).toThrow('Unsupported social profile URL');
  });

  it('keeps a deprecated social network readable but unavailable for new profiles', () => {
    const value = {
      identifier: '@legacy',
      label: 'Ancien',
      networkKey: 'twitter',
    };

    expect(personSocialProfileInputSchema.safeParse(value).success).toBe(false);
    expect(
      updatePersonSocialProfileSchema.safeParse({
        ...value,
        personVersion: 2,
        version: 1,
      }).success,
    ).toBe(true);
  });

  it('keeps list and field-history queries closed and bounded', () => {
    expect(personsListQuerySchema.safeParse({ limit: 101 }).success).toBe(
      false,
    );
    expect(
      personsListQuerySchema.safeParse({ limit: 25, unexpected: true }).success,
    ).toBe(false);
    expect(
      personFieldHistoryQuerySchema.safeParse({
        fieldKey: 'email',
        recordId: 'not-a-cuid',
        sectionKey: 'contacts',
      }).success,
    ).toBe(false);
  });

  it('serialises civil dates without timezone drift and calculates age at the boundary', () => {
    const birthDate = parseCivilDate('2000-07-21');

    expect(serializeCivilDate(birthDate)).toBe('2000-07-21');
    expect(
      calculateCivilAge('2000-07-21', new Date('2026-07-20T21:59:59Z')),
    ).toBe(25);
    expect(
      calculateCivilAge('2000-07-21', new Date('2026-07-21T00:00:00Z')),
    ).toBe(26);
    expect(
      calculateCivilAge('2000-07-21', new Date('2026-07-20T22:00:00Z')),
    ).toBe(26);
  });
});
