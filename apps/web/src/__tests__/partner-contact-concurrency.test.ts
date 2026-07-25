/* eslint-disable @typescript-eslint/explicit-function-return-type -- Test record factories keep their precise inferred shapes. */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { updatePartnerContact } from '$features/partners/server/partner-contact.service';

const mocks = vi.hoisted(() => {
  const transaction = {
    partnerContact: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    personEmail: { findFirst: vi.fn() },
    personPhone: { findFirst: vi.fn() },
  };

  return {
    createPartnerAudit: vi.fn(),
    loadPartnerDetail: vi.fn(),
    prisma: {
      $transaction: vi.fn(
        (callback: (client: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    },
    resolvePartnerId: vi.fn(),
    touchPartner: vi.fn(),
    transaction,
  };
});

vi.mock('server-only', () => ({}));
vi.mock('$server/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('$features/partners/server/partner-audit', () => ({
  createPartnerAudit: mocks.createPartnerAudit,
}));
vi.mock('$features/partners/server/partner-concurrency', () => ({
  touchPartner: mocks.touchPartner,
}));
vi.mock('$features/partners/server/partner-detail.repository', () => ({
  loadPartnerDetail: mocks.loadPartnerDetail,
  resolvePartnerId: mocks.resolvePartnerId,
}));

const DATE = new Date('2026-07-25T10:00:00.000Z');
const actor = {
  firstName: 'Ada',
  id: 'user-1',
  lastName: 'Admin',
  loginName: 'ada.admin',
  role: 'ADMIN' as const,
};

const contactRecord = (version: number) => ({
  closedAt: null,
  createdAt: DATE,
  endedOn: null,
  id: 'contact-1',
  isPrimary: false,
  label: 'Commercial',
  organizationId: 'partner-1',
  personId: 'person-1',
  selectedEmailId: null,
  selectedPhoneId: null,
  startedOn: null,
  updatedAt: DATE,
  version,
});

const updateInput = {
  contactVersion: 3,
  endedOn: undefined,
  isPrimary: true,
  label: 'Direction',
  startedOn: undefined,
  version: 7,
};

describe('partner contact optimistic concurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.prisma.$transaction.mockImplementation(
      (callback: (client: typeof mocks.transaction) => Promise<unknown>) =>
        callback(mocks.transaction),
    );
    mocks.resolvePartnerId.mockResolvedValue('partner-1');
    mocks.transaction.partnerContact.findFirst.mockResolvedValue(
      contactRecord(3),
    );
    mocks.transaction.partnerContact.updateMany.mockResolvedValue({ count: 1 });
    mocks.loadPartnerDetail.mockResolvedValue({ id: 'partner-1' });
  });

  it('rejects a stale contact version before touching any row', async () => {
    mocks.transaction.partnerContact.findFirst.mockResolvedValueOnce(
      contactRecord(4),
    );

    await expect(
      updatePartnerContact(
        'partner-1',
        'contact-1',
        updateInput,
        actor as never,
        true,
      ),
    ).rejects.toMatchObject({ code: 'PARTNER_CONTACT_VERSION_CONFLICT' });
    expect(mocks.touchPartner).not.toHaveBeenCalled();
    expect(mocks.transaction.partnerContact.updateMany).not.toHaveBeenCalled();
    expect(mocks.createPartnerAudit).not.toHaveBeenCalled();
  });

  it('rejects an atomic child CAS race before audit and detail loading', async () => {
    mocks.transaction.partnerContact.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 0 });

    await expect(
      updatePartnerContact(
        'partner-1',
        'contact-1',
        updateInput,
        actor as never,
        true,
      ),
    ).rejects.toMatchObject({ code: 'PARTNER_CONTACT_VERSION_CONFLICT' });

    expect(mocks.touchPartner).toHaveBeenCalledWith(mocks.transaction, {
      actorId: actor.id,
      id: 'partner-1',
      version: 7,
    });
    expect(mocks.transaction.partnerContact.updateMany).toHaveBeenNthCalledWith(
      2,
      {
        data: {
          isPrimary: true,
          label: 'Direction',
          version: { increment: 1 },
        },
        where: {
          id: 'contact-1',
          organizationId: 'partner-1',
          version: 3,
        },
      },
    );
    expect(mocks.createPartnerAudit).not.toHaveBeenCalled();
    expect(mocks.loadPartnerDetail).not.toHaveBeenCalled();
  });

  it('rejects a selected coordinate owned by another person before touching the partner', async () => {
    mocks.transaction.personEmail.findFirst.mockResolvedValueOnce(null);

    await expect(
      updatePartnerContact(
        'partner-1',
        'contact-1',
        { ...updateInput, selectedEmailId: 'email-other-person' },
        actor as never,
        true,
      ),
    ).rejects.toMatchObject({ code: 'PARTNER_DEPENDENCY_CONFLICT' });

    expect(mocks.transaction.personEmail.findFirst).toHaveBeenCalledWith({
      select: { id: true },
      where: {
        id: 'email-other-person',
        personId: 'person-1',
      },
    });
    expect(mocks.touchPartner).not.toHaveBeenCalled();
    expect(mocks.createPartnerAudit).not.toHaveBeenCalled();
  });

  it('audits the previous primary link without copying person data', async () => {
    mocks.transaction.partnerContact.findFirst
      .mockResolvedValueOnce(contactRecord(3))
      .mockResolvedValueOnce({ id: 'contact-previous' });

    await updatePartnerContact(
      'partner-1',
      'contact-1',
      updateInput,
      actor as never,
      true,
    );

    expect(mocks.createPartnerAudit).toHaveBeenCalledWith(
      mocks.transaction,
      expect.objectContaining({
        metadata: expect.objectContaining({
          partnerContactId: 'contact-1',
          previousPrimaryContactId: 'contact-previous',
        }),
      }),
    );
    const auditInput = mocks.createPartnerAudit.mock.calls[0]?.[1] as {
      metadata: Record<string, unknown>;
    };
    expect(auditInput.metadata).not.toHaveProperty('personId');
  });
});
