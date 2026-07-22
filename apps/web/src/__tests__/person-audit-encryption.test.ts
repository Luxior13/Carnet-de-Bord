import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

/* eslint-disable @typescript-eslint/explicit-function-return-type -- Test factories keep their precise inferred mock types. */
/* eslint-disable security/detect-object-injection -- Versioned test-only environment keys are intentional and restored. */
import {
  assertPersonAuditConfigured,
  createPersonAudit,
  decodePlainPersonAuditValues,
  decryptPersonAuditValues,
  hashAuditValue,
} from '$features/persons/server/person-audit';
import { PersonDomainError } from '$features/persons/server/person-errors';

const mocks = vi.hoisted(() => ({
  getAuditRequestContext: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('$env', () => ({
  env: {
    AUDIT_ENCRYPTION_CURRENT_VERSION: 1,
  },
}));

vi.mock('$server/auth', () => ({
  getAuditRequestContext: mocks.getAuditRequestContext,
}));

const TEST_KEY_ENV = 'AUDIT_ENCRYPTION_KEY_V1';
const previousTestKey = process.env[TEST_KEY_ENV];
const actor = {
  firstName: 'Ada',
  id: 'user-1',
  lastName: 'Lovelace',
  loginName: 'ada.admin',
  role: 'ADMIN' as const,
};

const createTransaction = () => {
  const auditLogCreate = vi.fn().mockResolvedValue({
    createdAt: new Date('2026-07-21T10:00:00.000Z'),
    id: 'audit-log-1',
  });
  const fieldChangesCreateMany = vi.fn().mockResolvedValue({ count: 2 });
  const keyVersionUpsert = vi.fn().mockResolvedValue({ version: 1 });

  return {
    mocks: { auditLogCreate, fieldChangesCreateMany, keyVersionUpsert },
    transaction: {
      auditEncryptionKeyVersion: { upsert: keyVersionUpsert },
      auditFieldChange: { createMany: fieldChangesCreateMany },
      auditLog: { create: auditLogCreate },
    },
  };
};

describe('encrypted person field history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env[TEST_KEY_ENV] = Buffer.alloc(32, 0x5a).toString('base64');
    mocks.getAuditRequestContext.mockResolvedValue({
      ipAddress: '127.0.0.1',
      requestId: 'request-audit-1',
      userAgent: 'vitest',
    });
  });

  afterAll(() => {
    if (previousTestKey === undefined)
      Reflect.deleteProperty(process.env, TEST_KEY_ENV);
    else process.env[TEST_KEY_ENV] = previousTestKey;
  });

  it('stores sensitive values only in an AES-GCM envelope and round-trips them', async () => {
    const { mocks: transactionMocks, transaction } = createTransaction();

    await createPersonAudit(transaction as never, {
      action: 'PERSON_UPDATE',
      actor,
      changes: [
        {
          after: 'new.private@example.com',
          before: 'old.private@example.com',
          changeType: 'UPDATE',
          fieldKey: 'email',
          recordId: 'email-1',
          sectionKey: 'contacts',
          sensitive: true,
        },
        {
          after: true,
          before: false,
          changeType: 'UPDATE',
          fieldKey: 'isPrimary',
          recordId: 'email-1',
          sectionKey: 'contacts',
          sensitive: false,
        },
      ],
      description: 'Contact updated',
      entityId: 'person-1',
    });

    expect(transactionMocks.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorDisplayNameSnapshot: 'Ada Lovelace',
          actorLoginNameSnapshot: 'ada.admin',
          actorRoleSnapshot: 'ADMIN',
          createdAt: expect.any(Date),
          userId: 'user-1',
        }),
      }),
    );
    expect(transactionMocks.keyVersionUpsert).toHaveBeenCalledOnce();
    const rows = transactionMocks.fieldChangesCreateMany.mock.calls[0]?.[0]
      .data as Array<Record<string, unknown>>;
    const encrypted = rows[0];
    const plain = rows[1];
    if (!encrypted || !plain) {
      throw new Error('Expected one encrypted and one plain audit row');
    }

    expect(encrypted).toMatchObject({
      afterValue: null,
      beforeValue: null,
      valueKeyVersion: 1,
      valueMode: 'ENCRYPTED',
    });
    expect((encrypted.valuesIv as Uint8Array).byteLength).toBe(12);
    expect((encrypted.valuesAuthTag as Uint8Array).byteLength).toBe(16);
    expect(
      (encrypted.valuesCiphertext as Uint8Array).byteLength,
    ).toBeGreaterThan(0);
    expect(JSON.stringify(encrypted)).not.toContain('private@example.com');
    expect(plain).toMatchObject({
      afterValue: 'true',
      beforeValue: 'false',
      valueKeyVersion: null,
      valueMode: 'PLAIN',
      valuesAuthTag: null,
      valuesCiphertext: null,
      valuesIv: null,
    });

    expect(
      decryptPersonAuditValues({
        auditLogId: encrypted.auditLogId as string,
        changeType: encrypted.changeType as string,
        entityId: encrypted.entityId as string,
        fieldKey: encrypted.fieldKey as string,
        recordId: encrypted.recordId as string,
        sectionKey: encrypted.sectionKey as string,
        valueKeyVersion: encrypted.valueKeyVersion as number,
        valuesAuthTag: encrypted.valuesAuthTag as Uint8Array,
        valuesCiphertext: encrypted.valuesCiphertext as Uint8Array,
        valuesIv: encrypted.valuesIv as Uint8Array,
      }),
    ).toEqual({
      after: 'new.private@example.com',
      before: 'old.private@example.com',
    });
  });

  it('authenticates field metadata so an envelope cannot be moved to another field', async () => {
    const { mocks: transactionMocks, transaction } = createTransaction();
    await createPersonAudit(transaction as never, {
      action: 'PERSON_UPDATE',
      actor,
      changes: [
        {
          after: 'secret-value',
          before: null,
          changeType: 'CREATE',
          fieldKey: 'nickname',
          sectionKey: 'identity',
          sensitive: true,
        },
      ],
      description: 'Identity updated',
      entityId: 'person-1',
    });
    const encrypted = transactionMocks.fieldChangesCreateMany.mock.calls[0]?.[0]
      .data[0] as Record<string, unknown>;

    expect(() =>
      decryptPersonAuditValues({
        auditLogId: encrypted.auditLogId as string,
        changeType: encrypted.changeType as string,
        entityId: encrypted.entityId as string,
        fieldKey: 'lastName',
        recordId: null,
        sectionKey: encrypted.sectionKey as string,
        valueKeyVersion: encrypted.valueKeyVersion as number,
        valuesAuthTag: encrypted.valuesAuthTag as Uint8Array,
        valuesCiphertext: encrypted.valuesCiphertext as Uint8Array,
        valuesIv: encrypted.valuesIv as Uint8Array,
      }),
    ).toThrow();
  });

  it('fails closed when the current encryption key is absent or malformed', () => {
    Reflect.deleteProperty(process.env, TEST_KEY_ENV);
    expect(() => assertPersonAuditConfigured()).toThrowError(PersonDomainError);

    process.env[TEST_KEY_ENV] = Buffer.alloc(16).toString('base64');
    expect(() => assertPersonAuditConfigured()).toThrowError(PersonDomainError);
  });

  it('rejects oversized sensitive values before creating field rows', async () => {
    const { mocks: transactionMocks, transaction } = createTransaction();

    await expect(
      createPersonAudit(transaction as never, {
        action: 'PERSON_UPDATE',
        actor,
        changes: [
          {
            after: 'x'.repeat(9 * 1024),
            before: null,
            changeType: 'CREATE',
            fieldKey: 'nickname',
            sectionKey: 'identity',
            sensitive: true,
          },
        ],
        description: 'Oversized identity update',
        entityId: 'person-1',
      }),
    ).rejects.toThrow('8 KiB');
    expect(transactionMocks.fieldChangesCreateMany).not.toHaveBeenCalled();
  });

  it('uses canonical hashing and decodes technical plain values', () => {
    expect(hashAuditValue({ a: 1, b: { c: 2, d: 3 } })).toBe(
      hashAuditValue({ a: 1, b: { c: 2, d: 3 } }),
    );
    expect(
      decodePlainPersonAuditValues({
        afterValue: '{"enabled":true}',
        beforeValue: 'not-json',
      }),
    ).toEqual({ after: { enabled: true }, before: 'not-json' });
  });

  it('records request correlation and critical deletion classification', async () => {
    const { mocks: transactionMocks, transaction } = createTransaction();

    await createPersonAudit(transaction as never, {
      action: 'PERSON_DELETE',
      actor,
      description: 'Deletion requested',
      entityId: 'person-1',
      outcome: 'NEUTRAL',
    });

    expect(transactionMocks.auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          entityId: 'person-1',
          entityType: 'PERSON',
          ipAddress: '127.0.0.1',
          outcome: 'NEUTRAL',
          requestId: 'request-audit-1',
          severity: 'CRITICAL',
          stream: 'IDENTITY',
          userAgent: 'vitest',
        }),
      }),
    );
  });
});
