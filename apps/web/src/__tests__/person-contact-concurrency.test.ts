/* eslint-disable @typescript-eslint/explicit-function-return-type -- Test record factories keep their precise inferred shapes. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addPersonEmail,
  addPersonPhone,
  deletePersonEmail,
  deletePersonPhone,
  updatePersonEmail,
  updatePersonPhone,
} from '$features/persons/server/person-contact.service';
import {
  mapPersonDetail,
  requirePersonDetailRecord,
  touchPerson,
  updatePerson,
} from '$features/persons/server/person-core.service';
import {
  addPersonSocialProfile,
  deletePersonSocialProfile,
  updatePersonSocialProfile,
} from '$features/persons/server/person-social.service';

const mocks = vi.hoisted(() => {
  const transaction = {
    auditFieldChange: { findMany: vi.fn() },
    auditLog: { findFirst: vi.fn() },
    notification: { create: vi.fn() },
    notificationRecipient: { createMany: vi.fn() },
    person: {
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    personEmail: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    personPhone: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    personSocialProfile: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  return {
    createPersonAudit: vi.fn(),
    prisma: {
      $transaction: vi.fn(
        (callback: (client: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    },
    transaction,
  };
});

vi.mock('server-only', () => ({}));

vi.mock('$server/prisma', () => ({ prisma: mocks.prisma }));

vi.mock('$server/cursor-pagination', () => ({
  buildCursorPaginationMeta: vi.fn(),
  decodeKeysetCursor: vi.fn(),
  hashCursorFilters: vi.fn(),
}));

vi.mock('$features/persons/server/person-audit', () => ({
  createPersonAudit: mocks.createPersonAudit,
}));

const DATE = new Date('2026-07-21T10:00:00.000Z');
const actor = {
  firstName: 'Ada',
  id: 'user-1',
  lastName: 'Admin',
  loginName: 'ada.admin',
  role: 'ADMIN' as const,
};

const emailRecord = (
  id: string,
  isPrimary: boolean,
  version = 1,
  email = `${id}@example.com`,
) => ({
  createdAt: DATE,
  email,
  id,
  isPrimary,
  label: 'Personnel',
  normalizedEmail: email,
  personId: 'person-1',
  updatedAt: DATE,
  version,
});

const phoneRecord = (
  id: string,
  isPrimary: boolean,
  version = 1,
  phone = '+33 6 12 34 56 78',
) => ({
  createdAt: DATE,
  id,
  isPrimary,
  label: 'Mobile',
  normalizedPhone: '+33612345678',
  personId: 'person-1',
  phone,
  updatedAt: DATE,
  version,
});

const socialRecord = (
  id: string,
  isPrimary: boolean,
  version = 1,
  networkKey = 'discord',
) => ({
  createdAt: DATE,
  id,
  identifier: `@${id}`,
  isPrimary,
  label: 'Personnel',
  networkKey,
  normalizedIdentifier: `@${id}`,
  normalizedProfileUrl: null,
  normalizedProfileUrlHash: null,
  personId: 'person-1',
  profileUrl: null,
  updatedAt: DATE,
  version,
});

const personRecord = (
  emails: ReturnType<typeof emailRecord>[],
  version = 5,
  options: {
    phones?: ReturnType<typeof phoneRecord>[];
    socialProfiles?: ReturnType<typeof socialRecord>[];
    structureStatus?: 'IN_STRUCTURE' | 'OUTSIDE_STRUCTURE';
  } = {},
) => ({
  birthDate: null,
  createdAt: DATE,
  emails,
  firstName: 'Ada',
  id: 'person-1',
  lastName: 'Lovelace',
  nickname: null,
  normalizedFirstName: 'ada',
  normalizedLastName: 'lovelace',
  normalizedNickname: null,
  phones: options.phones ?? [],
  socialProfiles: options.socialProfiles ?? [],
  structureStatus: options.structureStatus ?? ('IN_STRUCTURE' as const),
  updatedAt: DATE,
  version,
});

describe('person contact optimistic concurrency and primary invariants', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(
      (callback: (client: typeof mocks.transaction) => Promise<unknown>) =>
        callback(mocks.transaction),
    );
    mocks.transaction.personEmail.findFirst.mockResolvedValue(null);
    mocks.transaction.personPhone.findFirst.mockResolvedValue(null);
    mocks.transaction.personSocialProfile.findFirst.mockResolvedValue(null);
    mocks.transaction.auditLog.findFirst.mockResolvedValue(null);
    mocks.transaction.person.updateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.personEmail.deleteMany.mockResolvedValue({ count: 1 });
    mocks.transaction.personEmail.updateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.personPhone.deleteMany.mockResolvedValue({ count: 1 });
    mocks.transaction.personPhone.updateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.personSocialProfile.deleteMany.mockResolvedValue({
      count: 1,
    });
    mocks.transaction.personSocialProfile.updateMany.mockResolvedValue({
      count: 1,
    });
    mocks.createPersonAudit.mockResolvedValue({
      createdAt: DATE,
      id: 'audit-1',
    });
  });

  it('fails the parent compare-and-swap when another writer changed the version', async () => {
    mocks.transaction.person.updateMany.mockResolvedValueOnce({ count: 0 });

    await expect(
      touchPerson(mocks.transaction as never, 'person-1', 5),
    ).rejects.toMatchObject({ code: 'PERSON_VERSION_CONFLICT' });
    expect(mocks.transaction.person.updateMany).toHaveBeenCalledWith({
      data: { version: { increment: 1 } },
      where: { id: 'person-1', version: 5 },
    });
  });

  it('lets exactly one of two aggregate writers claim the same person version', async () => {
    let storedVersion = 5;
    mocks.transaction.person.updateMany.mockImplementation(
      async ({ where }: { where: { version: number } }) => {
        await Promise.resolve();
        if (where.version !== storedVersion) return { count: 0 };
        storedVersion += 1;

        return { count: 1 };
      },
    );

    const results = await Promise.allSettled([
      touchPerson(mocks.transaction as never, 'person-1', 5),
      touchPerson(mocks.transaction as never, 'person-1', 5),
    ]);

    expect(
      results.filter((result) => result.status === 'fulfilled'),
    ).toHaveLength(1);
    const rejected = results.find((result) => result.status === 'rejected');
    expect(rejected).toMatchObject({
      reason: { code: 'PERSON_VERSION_CONFLICT' },
      status: 'rejected',
    });
    expect(storedVersion).toBe(6);
  });

  it('returns not found after synchronous deletion removed the Person row', async () => {
    await expect(
      requirePersonDetailRecord(mocks.transaction as never, 'person-1'),
    ).rejects.toMatchObject({ code: 'PERSON_NOT_FOUND' });
    expect(mocks.transaction.person.findUnique).toHaveBeenCalled();
  });

  it('blocks every mutation after synchronous deletion removed the Person row', async () => {
    const mutations = [
      () =>
        updatePerson(
          'person-1',
          {
            birthDate: null,
            firstName: 'Ada',
            lastName: 'Lovelace',
            nickname: null,
            structureStatus: 'IN_STRUCTURE',
            version: 5,
          },
          actor as never,
        ),
      () =>
        addPersonEmail(
          'person-1',
          {
            email: 'ada@example.com',
            isPrimary: true,
            label: 'Personnel',
            personVersion: 5,
          },
          actor as never,
        ),
      () =>
        updatePersonEmail(
          'person-1',
          'email-1',
          {
            email: 'ada@example.com',
            isPrimary: true,
            label: 'Personnel',
            personVersion: 5,
            version: 1,
          },
          actor as never,
        ),
      () =>
        deletePersonEmail(
          'person-1',
          'email-1',
          { personVersion: 5, version: 1 },
          actor as never,
        ),
      () =>
        addPersonPhone(
          'person-1',
          {
            countryCode: 'FR',
            isPrimary: true,
            label: 'Mobile',
            normalizedPhone: '+33612345678',
            personVersion: 5,
            phone: '06 12 34 56 78',
          },
          actor as never,
        ),
      () =>
        updatePersonPhone(
          'person-1',
          'phone-1',
          {
            countryCode: 'FR',
            isPrimary: true,
            label: 'Mobile',
            normalizedPhone: '+33612345678',
            personVersion: 5,
            phone: '06 12 34 56 78',
            version: 1,
          },
          actor as never,
        ),
      () =>
        deletePersonPhone(
          'person-1',
          'phone-1',
          { personVersion: 5, version: 1 },
          actor as never,
        ),
      () =>
        addPersonSocialProfile(
          'person-1',
          {
            identifier: '@ada',
            isPrimary: true,
            label: 'Personnel',
            networkKey: 'discord',
            personVersion: 5,
            profileUrl: null,
          },
          actor as never,
        ),
      () =>
        updatePersonSocialProfile(
          'person-1',
          'social-1',
          {
            identifier: '@ada',
            isPrimary: true,
            label: 'Personnel',
            networkKey: 'discord',
            personVersion: 5,
            profileUrl: null,
            version: 1,
          },
          actor as never,
        ),
      () =>
        deletePersonSocialProfile(
          'person-1',
          'social-1',
          { personVersion: 5, version: 1 },
          actor as never,
        ),
    ];

    for (const mutate of mutations) {
      await expect(mutate()).rejects.toMatchObject({
        code: 'PERSON_NOT_FOUND',
      });
    }
    expect(mocks.transaction.person.updateMany).not.toHaveBeenCalled();
    expect(mocks.transaction.personEmail.create).not.toHaveBeenCalled();
    expect(mocks.transaction.personPhone.create).not.toHaveBeenCalled();
    expect(mocks.transaction.personSocialProfile.create).not.toHaveBeenCalled();
    expect(mocks.createPersonAudit).not.toHaveBeenCalled();
  });

  it('loads exactly one last-change snapshot without preloading field history', async () => {
    mocks.transaction.auditLog.findFirst.mockResolvedValueOnce({
      action: 'PERSON_UPDATE',
      actorDisplayNameSnapshot: 'Ada Admin',
      actorLoginNameSnapshot: 'ada.admin',
      createdAt: DATE,
    });

    const result = await mapPersonDetail(
      mocks.transaction as never,
      personRecord([]) as never,
    );

    expect(result.lastChange).toEqual({
      action: 'PERSON_UPDATE',
      actor: { displayName: 'Ada Admin', loginName: 'ada.admin' },
      at: '2026-07-21T10:00:00.000Z',
    });
    expect(mocks.transaction.auditLog.findFirst).toHaveBeenCalledWith({
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        action: true,
        actorDisplayNameSnapshot: true,
        actorLoginNameSnapshot: true,
        createdAt: true,
      },
      where: { entityId: 'person-1', entityType: 'PERSON' },
    });
    expect(mocks.transaction.auditFieldChange.findMany).not.toHaveBeenCalled();
  });

  it('returns an identical identity without touching its version or audit', async () => {
    mocks.transaction.person.findUnique.mockResolvedValue(personRecord([], 5));

    const result = await updatePerson(
      'person-1',
      {
        birthDate: null,
        firstName: 'Ada',
        lastName: 'Lovelace',
        nickname: null,
        structureStatus: 'IN_STRUCTURE',
        version: 5,
      },
      actor as never,
    );

    expect(result.version).toBe(5);
    expect(mocks.transaction.person.updateMany).not.toHaveBeenCalled();
    expect(mocks.transaction.person.update).not.toHaveBeenCalled();
    expect(mocks.createPersonAudit).not.toHaveBeenCalled();
  });

  it('audits an exact structure-status transition and creates no notification', async () => {
    const current = personRecord([], 5, {
      structureStatus: 'OUTSIDE_STRUCTURE',
    });
    const updated = personRecord([], 6, { structureStatus: 'IN_STRUCTURE' });
    mocks.transaction.person.findUnique
      .mockResolvedValueOnce(current)
      .mockResolvedValueOnce(updated);

    const result = await updatePerson(
      'person-1',
      {
        birthDate: null,
        firstName: 'Ada',
        lastName: 'Lovelace',
        nickname: null,
        structureStatus: 'IN_STRUCTURE',
        version: 5,
      },
      actor as never,
    );

    expect(result.structureStatus).toBe('IN_STRUCTURE');
    expect(mocks.createPersonAudit).toHaveBeenCalledWith(mocks.transaction, {
      action: 'PERSON_UPDATE',
      actor,
      changes: [
        {
          after: 'IN_STRUCTURE',
          before: 'OUTSIDE_STRUCTURE',
          changeType: 'UPDATE',
          fieldKey: 'structureStatus',
          sectionKey: 'structure',
          sensitive: false,
        },
      ],
      description: 'Identité de la fiche personne modifiée',
      entityId: 'person-1',
    });
    expect(mocks.transaction.notification.create).not.toHaveBeenCalled();
    expect(
      mocks.transaction.notificationRecipient.createMany,
    ).not.toHaveBeenCalled();
  });

  it('does not complete an ordinary mutation when its mandatory audit fails', async () => {
    let stored: {
      structureStatus: 'IN_STRUCTURE' | 'OUTSIDE_STRUCTURE';
      version: number;
    } = {
      structureStatus: 'OUTSIDE_STRUCTURE',
      version: 5,
    };
    const transactionUpdate = vi.fn(
      async (input: {
        data: { structureStatus: 'IN_STRUCTURE' | 'OUTSIDE_STRUCTURE' };
        where: { version: number };
      }) => {
        if (stored.version !== input.where.version) return { count: 0 };
        stored = {
          structureStatus: input.data.structureStatus,
          version: stored.version + 1,
        };

        return { count: 1 };
      },
    );
    mocks.prisma.$transaction.mockImplementationOnce(
      async (
        callback: (client: typeof mocks.transaction) => Promise<unknown>,
      ) => {
        const snapshot = { ...stored };
        const transactionalClient = {
          ...mocks.transaction,
          person: {
            ...mocks.transaction.person,
            findUnique: vi.fn(async () =>
              personRecord([], stored.version, {
                structureStatus: stored.structureStatus,
              }),
            ),
            updateMany: transactionUpdate,
          },
        };
        try {
          return await callback(transactionalClient);
        } catch (error) {
          stored = snapshot;
          throw error;
        }
      },
    );
    mocks.createPersonAudit.mockRejectedValueOnce(
      new Error('audit unavailable'),
    );

    await expect(
      updatePerson(
        'person-1',
        {
          birthDate: null,
          firstName: 'Ada',
          lastName: 'Lovelace',
          nickname: null,
          structureStatus: 'IN_STRUCTURE',
          version: 5,
        },
        actor as never,
      ),
    ).rejects.toThrow('audit unavailable');
    expect(transactionUpdate).toHaveBeenCalledOnce();
    expect(stored).toEqual({
      structureStatus: 'OUTSIDE_STRUCTURE',
      version: 5,
    });
    expect(mocks.transaction.notification.create).not.toHaveBeenCalled();
  });

  it('forces the first email to primary even when the client sends false', async () => {
    const created = emailRecord('email-new', true, 1, 'new@example.com');
    mocks.transaction.person.findUnique
      .mockResolvedValueOnce(personRecord([]))
      .mockResolvedValueOnce(personRecord([created], 6));
    mocks.transaction.personEmail.create.mockResolvedValueOnce(created);

    const result = await addPersonEmail(
      'person-1',
      {
        email: 'new@example.com',
        isPrimary: false,
        label: 'Personnel',
        personVersion: 5,
      },
      actor as never,
    );

    expect(mocks.transaction.personEmail.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'new@example.com',
        isPrimary: true,
        normalizedEmail: 'new@example.com',
        personId: 'person-1',
      }),
    });
    expect(mocks.transaction.personEmail.updateMany).not.toHaveBeenCalled();
    expect(result.person.emails[0]?.isPrimary).toBe(true);
  });

  it('demotes the previous primary atomically when a new primary is added', async () => {
    const oldPrimary = emailRecord('email-old', true);
    const demoted = { ...oldPrimary, isPrimary: false, version: 2 };
    const created = emailRecord('email-new', true, 1, 'new@example.com');
    mocks.transaction.person.findUnique
      .mockResolvedValueOnce(personRecord([oldPrimary]))
      .mockResolvedValueOnce(personRecord([created, demoted], 6));
    mocks.transaction.personEmail.create.mockResolvedValueOnce(created);

    await addPersonEmail(
      'person-1',
      {
        email: 'new@example.com',
        isPrimary: true,
        label: 'Professionnel',
        personVersion: 5,
      },
      actor as never,
    );

    expect(mocks.transaction.personEmail.updateMany).toHaveBeenCalledWith({
      data: { isPrimary: false, version: { increment: 1 } },
      where: { id: 'email-old', personId: 'person-1' },
    });
    const auditInput = mocks.createPersonAudit.mock.calls[0]?.[1] as {
      changes: Array<Record<string, unknown>>;
    };
    expect(auditInput.changes).toContainEqual(
      expect.objectContaining({
        after: false,
        before: true,
        fieldKey: 'isPrimary',
        recordId: 'email-old',
      }),
    );
  });

  it('rejects a stale child version before touching the parent row', async () => {
    mocks.transaction.person.findUnique.mockResolvedValueOnce(
      personRecord([emailRecord('email-1', true, 3)]),
    );

    await expect(
      updatePersonEmail(
        'person-1',
        'email-1',
        {
          email: 'updated@example.com',
          isPrimary: true,
          label: 'Personnel',
          personVersion: 5,
          version: 2,
        },
        actor as never,
      ),
    ).rejects.toMatchObject({ code: 'PERSON_VERSION_CONFLICT' });
    expect(mocks.transaction.person.updateMany).not.toHaveBeenCalled();
    expect(mocks.transaction.personEmail.updateMany).not.toHaveBeenCalled();
  });

  it('updates an email with child CAS and records only the changed fields', async () => {
    const current = emailRecord('email-1', true, 2, 'old@example.com');
    const updated = {
      ...current,
      email: 'new@example.com',
      label: 'Professionnel',
      normalizedEmail: 'new@example.com',
      version: 3,
    };
    mocks.transaction.person.findUnique
      .mockResolvedValueOnce(personRecord([current], 5))
      .mockResolvedValueOnce(personRecord([updated], 6));

    const result = await updatePersonEmail(
      'person-1',
      'email-1',
      {
        email: 'new@example.com',
        isPrimary: true,
        label: 'Professionnel',
        personVersion: 5,
        version: 2,
      },
      actor as never,
    );

    expect(mocks.transaction.personEmail.updateMany).toHaveBeenCalledWith({
      data: {
        email: 'new@example.com',
        isPrimary: true,
        label: 'Professionnel',
        normalizedEmail: 'new@example.com',
        version: { increment: 1 },
      },
      where: { id: 'email-1', personId: 'person-1', version: 2 },
    });
    expect(result.person.emails[0]).toMatchObject({
      email: 'new@example.com',
      label: 'Professionnel',
      version: 3,
    });
    const auditInput = mocks.createPersonAudit.mock.calls[0]?.[1] as {
      changes: Array<Record<string, unknown>>;
    };
    expect(auditInput.changes).toEqual([
      expect.objectContaining({
        after: 'new@example.com',
        before: 'old@example.com',
        fieldKey: 'email',
      }),
      expect.objectContaining({
        after: 'Professionnel',
        before: 'Personnel',
        fieldKey: 'label',
      }),
    ]);
  });

  it('returns an identical email without changing versions or audit', async () => {
    const current = emailRecord('email-1', true, 2, 'Visible@Example.COM');
    mocks.transaction.person.findUnique.mockResolvedValueOnce(
      personRecord([current]),
    );

    const result = await updatePersonEmail(
      'person-1',
      'email-1',
      {
        email: 'Visible@Example.COM',
        isPrimary: true,
        label: 'Personnel',
        personVersion: 5,
        version: 2,
      },
      actor as never,
    );

    expect(result.person.version).toBe(5);
    expect(mocks.transaction.person.updateMany).not.toHaveBeenCalled();
    expect(mocks.transaction.personEmail.updateMany).not.toHaveBeenCalled();
    expect(mocks.createPersonAudit).not.toHaveBeenCalled();
  });

  it('detects a child compare-and-swap race after the parent claim', async () => {
    mocks.transaction.person.findUnique.mockResolvedValueOnce(
      personRecord([emailRecord('email-1', true, 2)]),
    );
    mocks.transaction.personEmail.updateMany.mockResolvedValueOnce({
      count: 0,
    });

    await expect(
      updatePersonEmail(
        'person-1',
        'email-1',
        {
          email: 'updated@example.com',
          isPrimary: true,
          label: 'Personnel',
          personVersion: 5,
          version: 2,
        },
        actor as never,
      ),
    ).rejects.toMatchObject({ code: 'PERSON_VERSION_CONFLICT' });
    expect(mocks.transaction.person.updateMany).toHaveBeenCalledOnce();
    expect(mocks.createPersonAudit).not.toHaveBeenCalled();
  });

  it('requires an explicit replacement before deleting a primary email', async () => {
    mocks.transaction.person.findUnique.mockResolvedValueOnce(
      personRecord([
        emailRecord('email-primary', true),
        emailRecord('email-secondary', false),
      ]),
    );

    await expect(
      deletePersonEmail(
        'person-1',
        'email-primary',
        { personVersion: 5, version: 1 },
        actor as never,
      ),
    ).rejects.toMatchObject({ code: 'PRIMARY_CONFLICT' });
    expect(mocks.transaction.person.updateMany).not.toHaveBeenCalled();
    expect(mocks.transaction.personEmail.deleteMany).not.toHaveBeenCalled();
  });

  it('deletes with child CAS and promotes only the selected remaining email', async () => {
    const primary = emailRecord('email-primary', true);
    const secondary = emailRecord('email-secondary', false);
    const promoted = { ...secondary, isPrimary: true, version: 2 };
    mocks.transaction.person.findUnique
      .mockResolvedValueOnce(personRecord([primary, secondary]))
      .mockResolvedValueOnce(personRecord([promoted], 6));

    const result = await deletePersonEmail(
      'person-1',
      'email-primary',
      {
        personVersion: 5,
        replacementPrimaryId: 'email-secondary',
        version: 1,
      },
      actor as never,
    );

    expect(mocks.transaction.personEmail.deleteMany).toHaveBeenCalledWith({
      where: { id: 'email-primary', personId: 'person-1', version: 1 },
    });
    expect(mocks.transaction.personEmail.updateMany).toHaveBeenCalledWith({
      data: { isPrimary: true, version: { increment: 1 } },
      where: {
        id: 'email-secondary',
        isPrimary: false,
        personId: 'person-1',
      },
    });
    expect(result.emails).toHaveLength(1);
    expect(result.emails[0]).toMatchObject({
      id: 'email-secondary',
      isPrimary: true,
      version: 2,
    });
  });

  it('adds, updates, and deletes a phone while preserving automatic primary state and audit', async () => {
    const created = phoneRecord('phone-1', true);
    const updated = {
      ...created,
      label: 'Urgence',
      normalizedPhone: '+33687654321',
      phone: '06 87 65 43 21',
      version: 2,
    };
    mocks.transaction.person.findUnique
      .mockResolvedValueOnce(personRecord([], 5))
      .mockResolvedValueOnce(personRecord([], 6, { phones: [created] }));
    mocks.transaction.personPhone.create.mockResolvedValueOnce(created);

    const added = await addPersonPhone(
      'person-1',
      {
        countryCode: 'FR',
        isPrimary: false,
        label: 'Mobile',
        normalizedPhone: '+33612345678',
        personVersion: 5,
        phone: '06 12 34 56 78',
      },
      actor as never,
    );
    expect(added.person.phones[0]?.isPrimary).toBe(true);
    expect(mocks.transaction.personPhone.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ isPrimary: true, personId: 'person-1' }),
    });

    mocks.transaction.person.findUnique
      .mockResolvedValueOnce(personRecord([], 6, { phones: [created] }))
      .mockResolvedValueOnce(personRecord([], 7, { phones: [updated] }));
    const changed = await updatePersonPhone(
      'person-1',
      'phone-1',
      {
        countryCode: 'FR',
        isPrimary: true,
        label: 'Urgence',
        normalizedPhone: '+33687654321',
        personVersion: 6,
        phone: '06 87 65 43 21',
        version: 1,
      },
      actor as never,
    );
    expect(changed.person.phones[0]).toMatchObject({
      id: 'phone-1',
      label: 'Urgence',
      version: 2,
    });

    mocks.transaction.person.findUnique
      .mockResolvedValueOnce(personRecord([], 7, { phones: [updated] }))
      .mockResolvedValueOnce(personRecord([], 8));
    const deleted = await deletePersonPhone(
      'person-1',
      'phone-1',
      { personVersion: 7, version: 2 },
      actor as never,
    );
    expect(deleted.phones).toEqual([]);
    expect(mocks.transaction.personPhone.deleteMany).toHaveBeenCalledWith({
      where: { id: 'phone-1', personId: 'person-1', version: 2 },
    });
    expect(mocks.createPersonAudit).toHaveBeenCalledTimes(3);
  });

  it('adds, updates, and deletes a social profile with one primary per network', async () => {
    const created = socialRecord('profile-1', true);
    const updated = { ...created, label: 'Équipe', version: 2 };
    mocks.transaction.person.findUnique
      .mockResolvedValueOnce(personRecord([], 5))
      .mockResolvedValueOnce(
        personRecord([], 6, { socialProfiles: [created] }),
      );
    mocks.transaction.personSocialProfile.create.mockResolvedValueOnce(created);

    const added = await addPersonSocialProfile(
      'person-1',
      {
        identifier: '@profile-1',
        isPrimary: false,
        label: 'Personnel',
        networkKey: 'discord',
        personVersion: 5,
        profileUrl: null,
      },
      actor as never,
    );
    expect(added.person.socialProfiles[0]?.isPrimary).toBe(true);
    expect(mocks.transaction.personSocialProfile.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isPrimary: true,
        networkKey: 'discord',
        personId: 'person-1',
      }),
    });

    mocks.transaction.person.findUnique
      .mockResolvedValueOnce(personRecord([], 6, { socialProfiles: [created] }))
      .mockResolvedValueOnce(
        personRecord([], 7, { socialProfiles: [updated] }),
      );
    const changed = await updatePersonSocialProfile(
      'person-1',
      'profile-1',
      {
        identifier: '@profile-1',
        isPrimary: true,
        label: 'Équipe',
        networkKey: 'discord',
        personVersion: 6,
        profileUrl: null,
        version: 1,
      },
      actor as never,
    );
    expect(changed.person.socialProfiles[0]).toMatchObject({
      id: 'profile-1',
      label: 'Équipe',
      version: 2,
    });

    mocks.transaction.person.findUnique
      .mockResolvedValueOnce(personRecord([], 7, { socialProfiles: [updated] }))
      .mockResolvedValueOnce(personRecord([], 8));
    const deleted = await deletePersonSocialProfile(
      'person-1',
      'profile-1',
      { personVersion: 7, version: 2 },
      actor as never,
    );
    expect(deleted.socialProfiles).toEqual([]);
    expect(
      mocks.transaction.personSocialProfile.deleteMany,
    ).toHaveBeenCalledWith({
      where: { id: 'profile-1', personId: 'person-1', version: 2 },
    });
    expect(mocks.createPersonAudit).toHaveBeenCalledTimes(3);
  });

  it('requires a selected replacement before deleting phone or social primaries', async () => {
    const primaryPhone = phoneRecord('phone-primary', true);
    const secondaryPhone = phoneRecord('phone-secondary', false);
    const primarySocial = socialRecord('social-primary', true);
    const secondarySocial = socialRecord('social-secondary', false);
    mocks.transaction.person.findUnique
      .mockResolvedValueOnce(
        personRecord([], 5, { phones: [primaryPhone, secondaryPhone] }),
      )
      .mockResolvedValueOnce(
        personRecord([], 5, {
          socialProfiles: [primarySocial, secondarySocial],
        }),
      );

    await expect(
      deletePersonPhone(
        'person-1',
        'phone-primary',
        { personVersion: 5, version: 1 },
        actor as never,
      ),
    ).rejects.toMatchObject({ code: 'PRIMARY_CONFLICT' });
    await expect(
      deletePersonSocialProfile(
        'person-1',
        'social-primary',
        { personVersion: 5, version: 1 },
        actor as never,
      ),
    ).rejects.toMatchObject({ code: 'PRIMARY_CONFLICT' });
    expect(mocks.transaction.personPhone.deleteMany).not.toHaveBeenCalled();
    expect(
      mocks.transaction.personSocialProfile.deleteMany,
    ).not.toHaveBeenCalled();
  });

  it('enforces server-side limits before touching the aggregate', async () => {
    mocks.transaction.person.findUnique
      .mockResolvedValueOnce(
        personRecord(
          Array.from({ length: 10 }, (_, index) =>
            emailRecord(`email-${index}`, index === 0),
          ),
        ),
      )
      .mockResolvedValueOnce(
        personRecord([], 5, {
          phones: Array.from({ length: 10 }, (_, index) =>
            phoneRecord(`phone-${index}`, index === 0),
          ),
        }),
      )
      .mockResolvedValueOnce(
        personRecord([], 5, {
          socialProfiles: Array.from({ length: 20 }, (_, index) =>
            socialRecord(`social-${index}`, index === 0),
          ),
        }),
      );

    await expect(
      addPersonEmail(
        'person-1',
        {
          email: 'overflow@example.com',
          isPrimary: false,
          label: 'Autre',
          personVersion: 5,
        },
        actor as never,
      ),
    ).rejects.toThrow('PERSON_EMAIL_LIMIT');
    await expect(
      addPersonPhone(
        'person-1',
        {
          countryCode: 'FR',
          isPrimary: false,
          label: 'Autre',
          normalizedPhone: '+33701020304',
          personVersion: 5,
          phone: '07 01 02 03 04',
        },
        actor as never,
      ),
    ).rejects.toThrow('PERSON_PHONE_LIMIT');
    await expect(
      addPersonSocialProfile(
        'person-1',
        {
          identifier: '@overflow',
          isPrimary: false,
          label: 'Autre',
          networkKey: 'discord',
          personVersion: 5,
          profileUrl: null,
        },
        actor as never,
      ),
    ).rejects.toThrow('PERSON_SOCIAL_PROFILE_LIMIT');
    expect(mocks.transaction.person.updateMany).not.toHaveBeenCalled();
  });
});
