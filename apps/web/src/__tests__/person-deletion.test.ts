import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { UserType } from '$types/auth.types';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => {
  const transaction = {
    $queryRaw: vi.fn(),
    person: { deleteMany: vi.fn() },
    personDeletionTombstone: {
      create: vi.fn(),
      findUnique: vi.fn(),
    },
  };

  return {
    assertPersonAuditConfigured: vi.fn(),
    createPersonAudit: vi.fn(),
    prisma: {
      $transaction: vi.fn(
        async (callback: (client: typeof transaction) => unknown) =>
          callback(transaction),
      ),
      auditEncryptionKeyVersion: { findMany: vi.fn() },
    },
    transaction,
  };
});

vi.mock('$server/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('$features/persons/server/person-audit', () => ({
  assertPersonAuditConfigured: mocks.assertPersonAuditConfigured,
  createPersonAudit: mocks.createPersonAudit,
}));

import { deletePerson } from '$features/persons/server/person-deletion';
import { PersonDomainError } from '$features/persons/server/person-errors';

const actor = {
  firstName: 'Ada',
  id: 'user-1',
  isProtected: false,
  lastName: 'Lovelace',
  loginName: 'ada',
  permissions: [],
  role: 'ADMIN' as const,
} as unknown as UserType;

describe('synchronous person deletion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.AUDIT_ENCRYPTION_CURRENT_VERSION = '1';
    process.env.AUDIT_ENCRYPTION_KEY_V1 = Buffer.alloc(32, 1).toString(
      'base64',
    );
    mocks.prisma.auditEncryptionKeyVersion.findMany.mockResolvedValue([
      { version: 1 },
    ]);
    mocks.transaction.personDeletionTombstone.findUnique.mockResolvedValue(
      null,
    );
    mocks.transaction.$queryRaw
      .mockResolvedValueOnce([{ id: 'person-1', version: 3 }])
      .mockResolvedValueOnce([{ deletedCount: 4n }]);
    mocks.transaction.person.deleteMany.mockResolvedValue({ count: 1 });
    mocks.transaction.personDeletionTombstone.create.mockResolvedValue({
      personId: 'person-1',
    });
    mocks.createPersonAudit.mockResolvedValue({
      createdAt: new Date(),
      id: 'audit-1',
    });
  });

  it('purges field values, deletes, tombstones and audits in one transaction', async () => {
    await expect(
      deletePerson({
        actor,
        idempotencyKey: 'operation-123',
        personId: 'person-1',
        version: 3,
      }),
    ).resolves.toBeUndefined();

    expect(mocks.transaction.person.deleteMany).toHaveBeenCalledWith({
      where: { id: 'person-1', version: 3 },
    });
    expect(
      mocks.transaction.personDeletionTombstone.create,
    ).toHaveBeenCalledWith({
      data: {
        deletionOperationId: 'operation-123',
        personId: 'person-1',
      },
    });
    expect(mocks.createPersonAudit).toHaveBeenCalledWith(
      mocks.transaction,
      expect.objectContaining({
        action: 'PERSON_DELETE',
        entityId: 'person-1',
        outcome: 'SUCCESS',
      }),
    );
  });

  it('treats an existing tombstone as an idempotent retry', async () => {
    mocks.transaction.personDeletionTombstone.findUnique.mockResolvedValueOnce({
      personId: 'person-1',
    });

    await deletePerson({
      actor,
      idempotencyKey: 'operation-123',
      personId: 'person-1',
      version: 3,
    });

    expect(mocks.transaction.$queryRaw).not.toHaveBeenCalled();
    expect(mocks.transaction.person.deleteMany).not.toHaveBeenCalled();
  });

  it('refuses a stale version before purging personal field history', async () => {
    mocks.transaction.$queryRaw
      .mockReset()
      .mockResolvedValueOnce([{ id: 'person-1', version: 4 }]);

    await expect(
      deletePerson({
        actor,
        idempotencyKey: 'operation-123',
        personId: 'person-1',
        version: 3,
      }),
    ).rejects.toMatchObject({
      code: 'PERSON_VERSION_CONFLICT',
    } satisfies Partial<PersonDomainError>);
    expect(mocks.transaction.$queryRaw).toHaveBeenCalledTimes(1);
    expect(mocks.transaction.person.deleteMany).not.toHaveBeenCalled();
  });
});
