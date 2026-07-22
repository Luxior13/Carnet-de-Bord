import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERSON_LIMITS } from '$features/persons/person.constants';

const mocks = vi.hoisted(() => ({
  decodePlainPersonAuditValues: vi.fn(),
  decryptPersonAuditValues: vi.fn(),
  findMany: vi.fn(),
  requirePersonDetailRecord: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('$server/prisma', () => ({
  prisma: { auditFieldChange: { findMany: mocks.findMany } },
}));

vi.mock('$features/persons/server/person-audit', () => ({
  decodePlainPersonAuditValues: mocks.decodePlainPersonAuditValues,
  decryptPersonAuditValues: mocks.decryptPersonAuditValues,
}));

vi.mock('$features/persons/server/person-core.service', () => ({
  requirePersonDetailRecord: mocks.requirePersonDetailRecord,
}));

import { getPersonFieldHistory } from '$features/persons/server/person-history.service';

const DATE = new Date('2026-07-21T10:00:00.000Z');

describe('person contextual field history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requirePersonDetailRecord.mockResolvedValue({ id: 'person-1' });
  });

  it('verifies person visibility and reads at most three exact field events', async () => {
    mocks.findMany.mockResolvedValueOnce([
      {
        afterValue: '"new@example.com"',
        auditLog: {
          action: 'PERSON_UPDATE',
          actorDisplayNameSnapshot: 'Ada Admin',
          actorLoginNameSnapshot: 'ada.admin',
        },
        auditLogId: 'audit-1',
        beforeValue: '"old@example.com"',
        changeType: 'UPDATE',
        createdAt: DATE,
        entityId: 'person-1',
        fieldKey: 'email',
        id: 'change-1',
        recordId: 'cmqr17jek0006uwfcqetuq78v',
        sectionKey: 'contacts',
        valueKeyVersion: null,
        valueMode: 'PLAIN',
        valuesAuthTag: null,
        valuesCiphertext: null,
        valuesIv: null,
      },
    ]);
    mocks.decodePlainPersonAuditValues.mockReturnValueOnce({
      after: 'new@example.com',
      before: 'old@example.com',
    });

    const result = await getPersonFieldHistory('person-1', {
      fieldKey: 'email',
      recordId: 'cmqr17jek0006uwfcqetuq78v',
      sectionKey: 'contacts',
    });

    expect(mocks.requirePersonDetailRecord).toHaveBeenCalledWith(
      expect.anything(),
      'person-1',
    );
    expect(mocks.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: PERSON_LIMITS.fieldHistory,
        where: {
          entityId: 'person-1',
          entityType: 'PERSON',
          fieldKey: 'email',
          recordId: 'cmqr17jek0006uwfcqetuq78v',
          sectionKey: 'contacts',
        },
      }),
    );
    expect(result).toEqual({
      items: [
        {
          action: 'UPDATE',
          actor: { displayName: 'Ada Admin', loginName: 'ada.admin' },
          after: 'new@example.com',
          at: '2026-07-21T10:00:00.000Z',
          before: 'old@example.com',
          id: 'change-1',
        },
      ],
    });
  });

  it('rejects an unreviewed field before reading a person or audit data', async () => {
    await expect(
      getPersonFieldHistory('person-1', {
        fieldKey: 'passwordHash',
        sectionKey: 'identity',
      }),
    ).rejects.toThrow('INVALID_PERSON_HISTORY_FIELD');
    expect(mocks.requirePersonDetailRecord).not.toHaveBeenCalled();
    expect(mocks.findMany).not.toHaveBeenCalled();
  });

  it('falls back to the immutable login snapshot when the display name is absent', async () => {
    mocks.findMany.mockResolvedValueOnce([
      {
        afterValue: '"IN_STRUCTURE"',
        auditLog: {
          action: 'PERSON_UPDATE',
          actorDisplayNameSnapshot: null,
          actorLoginNameSnapshot: 'deleted.admin',
        },
        auditLogId: 'audit-2',
        beforeValue: '"OUTSIDE_STRUCTURE"',
        changeType: 'UPDATE',
        createdAt: DATE,
        entityId: 'person-1',
        fieldKey: 'structureStatus',
        id: 'change-2',
        recordId: null,
        sectionKey: 'structure',
        valueKeyVersion: null,
        valueMode: 'PLAIN',
        valuesAuthTag: null,
        valuesCiphertext: null,
        valuesIv: null,
      },
    ]);
    mocks.decodePlainPersonAuditValues.mockReturnValueOnce({
      after: 'IN_STRUCTURE',
      before: 'OUTSIDE_STRUCTURE',
    });

    const result = await getPersonFieldHistory('person-1', {
      fieldKey: 'structureStatus',
      sectionKey: 'structure',
    });

    expect(result.items[0]?.actor).toEqual({
      displayName: 'deleted.admin',
      loginName: 'deleted.admin',
    });
  });
});
