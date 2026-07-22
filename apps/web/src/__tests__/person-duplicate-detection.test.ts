import { describe, expect, it, vi } from 'vitest';

import {
  getCreationDuplicateWarnings,
  getDuplicateWarning,
} from '$features/persons/server/person-duplicate-detection';

vi.mock('server-only', () => ({}));

const HASH = 'a'.repeat(64);

describe('grouped person duplicate detection', () => {
  it('checks all initial contacts with one query per collection', async () => {
    const client = {
      personEmail: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ normalizedEmail: 'duplicate@example.com' }]),
      },
      personPhone: {
        findMany: vi
          .fn()
          .mockResolvedValue([{ normalizedPhone: '+33611111111' }]),
      },
      personSocialProfile: {
        findMany: vi.fn().mockResolvedValue([
          {
            networkKey: 'discord',
            normalizedIdentifier: 'duplicate',
            normalizedProfileUrl: null,
            normalizedProfileUrlHash: null,
          },
          {
            networkKey: 'instagram',
            normalizedIdentifier: null,
            normalizedProfileUrl: 'https://instagram.com/duplicate',
            normalizedProfileUrlHash: HASH,
          },
        ]),
      },
    };

    const warnings = await getCreationDuplicateWarnings(client as never, {
      emails: [
        { email: 'DUPLICATE@example.com' },
        { email: 'unique@example.com' },
      ],
      phones: [
        { normalizedPhone: '+33611111111' },
        { normalizedPhone: '+33622222222' },
      ],
      socialProfiles: [
        {
          networkKey: 'discord',
          normalizedIdentifier: 'duplicate',
          normalizedProfileUrl: null,
          normalizedProfileUrlHash: null,
        },
        {
          networkKey: 'instagram',
          normalizedIdentifier: null,
          normalizedProfileUrl: 'https://instagram.com/duplicate',
          normalizedProfileUrlHash: HASH,
        },
      ],
    });

    expect(client.personEmail.findMany).toHaveBeenCalledOnce();
    expect(client.personPhone.findMany).toHaveBeenCalledOnce();
    expect(client.personSocialProfile.findMany).toHaveBeenCalledOnce();
    expect(client.personEmail.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { normalizedEmail: true } }),
    );
    expect(client.personPhone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ select: { normalizedPhone: true } }),
    );
    expect(warnings.emailWarnings).toEqual([
      { duplicateFound: true, fields: ['email'] },
      { duplicateFound: false },
    ]);
    expect(warnings.phoneWarnings).toEqual([
      { duplicateFound: true, fields: ['phone'] },
      { duplicateFound: false },
    ]);
    expect(warnings.socialWarnings).toEqual([
      { duplicateFound: true, fields: ['identifier'] },
      { duplicateFound: true, fields: ['profileUrl'] },
    ]);
  });

  it('requires both the indexed hash and full normalized social URL', async () => {
    const findMany = vi.fn().mockResolvedValue([
      {
        networkKey: 'instagram',
        normalizedIdentifier: null,
        normalizedProfileUrl: 'https://instagram.com/hash-collision',
        normalizedProfileUrlHash: HASH,
      },
    ]);
    const findFirst = vi.fn().mockResolvedValue(null);
    const client = {
      personEmail: { findMany: vi.fn() },
      personPhone: { findMany: vi.fn() },
      personSocialProfile: { findFirst, findMany },
    };
    const normalizedProfileUrl = 'https://instagram.com/member';

    const grouped = await getCreationDuplicateWarnings(client as never, {
      emails: [],
      phones: [],
      socialProfiles: [
        {
          networkKey: 'instagram',
          normalizedIdentifier: null,
          normalizedProfileUrl,
          normalizedProfileUrlHash: HASH,
        },
      ],
    });
    const single = await getDuplicateWarning(client as never, {
      networkKey: 'instagram',
      normalizedProfileUrl,
      normalizedProfileUrlHash: HASH,
    });

    expect(grouped.socialWarnings).toEqual([{ duplicateFound: false }]);
    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          OR: [
            {
              networkKey: 'instagram',
              normalizedProfileUrl,
              normalizedProfileUrlHash: HASH,
            },
          ],
        },
      }),
    );
    expect(findFirst).toHaveBeenCalledWith({
      select: { id: true },
      where: {
        networkKey: 'instagram',
        normalizedProfileUrl,
        normalizedProfileUrlHash: HASH,
      },
    });
    expect(single).toEqual({ duplicateFound: false });
  });

  it('returns only boolean field warnings and never another person identifier or value', async () => {
    const client = {
      personEmail: {
        findFirst: vi.fn().mockResolvedValue({
          email: 'private-owner@example.com',
          id: 'other-person-email-id',
          personId: 'other-person-id',
        }),
      },
      personPhone: { findFirst: vi.fn() },
      personSocialProfile: { findFirst: vi.fn() },
    };

    const warning = await getDuplicateWarning(client as never, {
      email: 'candidate@example.com',
      excludePersonId: 'person-1',
    });

    expect(client.personEmail.findFirst).toHaveBeenCalledWith({
      select: { id: true },
      where: {
        normalizedEmail: 'candidate@example.com',
        personId: { not: 'person-1' },
      },
    });
    expect(warning).toEqual({ duplicateFound: true, fields: ['email'] });
    expect(JSON.stringify(warning)).not.toMatch(
      /other-person|private-owner|candidate@example\.com/u,
    );
  });
});
