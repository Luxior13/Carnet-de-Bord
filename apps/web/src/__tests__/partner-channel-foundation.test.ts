import { readFileSync } from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createPartnerChannelSchema } from '$features/partners/schemas/partner.schemas';
import {
  addPartnerChannel,
  deletePartnerChannel,
  updatePartnerChannel,
} from '$features/partners/server/partner-channel.service';

const mocks = vi.hoisted(() => {
  const transaction = {
    partnerOrganization: { update: vi.fn() },
    partnerOrganizationContactChannel: {
      create: vi.fn(),
      deleteMany: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  return {
    createPartnerAudit: vi.fn(),
    loadPartnerDetail: vi.fn(),
    lockPartnerForIndependentMutation: vi.fn(),
    prisma: {
      $transaction: vi.fn(
        (callback: (client: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
    },
    resolvePartnerId: vi.fn(),
    transaction,
  };
});

vi.mock('server-only', () => ({}));
vi.mock('$server/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('$features/partners/server/partner-audit', () => ({
  createPartnerAudit: mocks.createPartnerAudit,
}));
vi.mock('$features/partners/server/partner-concurrency', () => ({
  lockPartnerForIndependentMutation: mocks.lockPartnerForIndependentMutation,
}));
vi.mock('$features/partners/server/partner-detail.repository', () => ({
  loadPartnerDetail: mocks.loadPartnerDetail,
  resolvePartnerId: mocks.resolvePartnerId,
}));

const actor = {
  firstName: 'Ada',
  id: 'user-1',
  lastName: 'Admin',
  loginName: 'ada',
  role: 'ADMIN' as const,
};

// Test-owned static path.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const migrationSql = readFileSync(
  new URL(
    '../../../../packages/database/prisma/migrations/20260725120000_partner_contact_coordinates/migration.sql',
    import.meta.url,
  ),
  'utf8',
);
// Test-owned static path.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const collectionRoute = readFileSync(
  new URL('../app/api/partenaires/[id]/coordonnees/route.ts', import.meta.url),
  'utf8',
);
// Test-owned static path.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const itemRoute = readFileSync(
  new URL(
    '../app/api/partenaires/[id]/coordonnees/[channelId]/route.ts',
    import.meta.url,
  ),
  'utf8',
);

describe('partner organization channels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolvePartnerId.mockResolvedValue('partner-1');
    mocks.transaction.partnerOrganization.update.mockResolvedValue({
      id: 'partner-1',
    });
    mocks.transaction.partnerOrganizationContactChannel.create.mockResolvedValue(
      { id: 'channel-new' },
    );
    mocks.transaction.partnerOrganizationContactChannel.deleteMany.mockResolvedValue(
      { count: 1 },
    );
    mocks.transaction.partnerOrganizationContactChannel.updateMany.mockResolvedValue(
      { count: 1 },
    );
    mocks.loadPartnerDetail.mockResolvedValue({ id: 'partner-1' });
  });

  it('serializes an independent add and makes the first channel primary', async () => {
    mocks.transaction.partnerOrganizationContactChannel.findMany.mockResolvedValue(
      [],
    );

    await addPartnerChannel(
      'partner-1',
      {
        countryCode: 'FR',
        isPrimary: false,
        label: 'Partenariats',
        type: 'EMAIL',
        value: 'contact@example.test',
      },
      actor as never,
      false,
    );

    expect(mocks.lockPartnerForIndependentMutation).toHaveBeenCalledWith(
      mocks.transaction,
      'partner-1',
    );
    expect(mocks.transaction.partnerOrganization.update).toHaveBeenCalledWith({
      data: {
        updatedById: actor.id,
        version: { increment: 1 },
      },
      where: { id: 'partner-1' },
    });
    expect(
      mocks.transaction.partnerOrganizationContactChannel.create,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isPrimary: true,
        normalizedValue: 'contact@example.test',
        organizationId: 'partner-1',
        type: 'EMAIL',
      }),
      select: { id: true },
    });
  });

  it('accepts the parsed route payload when adding a phone', async () => {
    mocks.transaction.partnerOrganizationContactChannel.findMany.mockResolvedValue(
      [],
    );
    const parsed = createPartnerChannelSchema.parse({
      countryCode: 'FR',
      isPrimary: false,
      label: 'Standard',
      type: 'PHONE',
      value: '06 12 34 56 78',
    });

    await addPartnerChannel('partner-1', parsed, actor as never, false);

    expect(
      mocks.transaction.partnerOrganizationContactChannel.create,
    ).toHaveBeenCalledWith({
      data: expect.objectContaining({
        normalizedValue: '+33612345678',
        organizationId: 'partner-1',
        type: 'PHONE',
      }),
      select: { id: true },
    });
  });

  it('rejects a stale child version before changing or auditing it', async () => {
    mocks.transaction.partnerOrganizationContactChannel.findFirst.mockResolvedValue(
      {
        id: 'channel-1',
        isPrimary: true,
        organizationId: 'partner-1',
        type: 'EMAIL',
        version: 3,
      },
    );

    await expect(
      updatePartnerChannel(
        'partner-1',
        'channel-1',
        {
          channelVersion: 2,
          countryCode: 'FR',
          isPrimary: true,
          label: 'Général',
          value: 'hello@example.test',
        },
        actor as never,
        true,
      ),
    ).rejects.toMatchObject({ code: 'PARTNER_CHANNEL_VERSION_CONFLICT' });
    expect(
      mocks.transaction.partnerOrganizationContactChannel.updateMany,
    ).not.toHaveBeenCalled();
    expect(mocks.createPartnerAudit).not.toHaveBeenCalled();
  });

  it('promotes the oldest remaining channel after deleting a primary', async () => {
    mocks.transaction.partnerOrganizationContactChannel.findFirst
      .mockResolvedValueOnce({
        id: 'channel-1',
        isPrimary: true,
        organizationId: 'partner-1',
        type: 'PHONE',
        version: 4,
      })
      .mockResolvedValueOnce({ id: 'channel-2' });

    await deletePartnerChannel(
      'partner-1',
      'channel-1',
      { channelVersion: 4 },
      actor as never,
      true,
    );

    expect(
      mocks.transaction.partnerOrganizationContactChannel.findFirst,
    ).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        where: expect.objectContaining({ type: 'PHONE' }),
      }),
    );
    expect(
      mocks.transaction.partnerOrganizationContactChannel.updateMany,
    ).toHaveBeenCalledWith({
      data: { isPrimary: true, version: { increment: 1 } },
      where: {
        id: 'channel-2',
        isPrimary: false,
        organizationId: 'partner-1',
      },
    });
  });

  it('keeps database ownership, cleanup and optimistic-version backstops', () => {
    expect(migrationSql).toContain(
      'FOREIGN KEY ("selectedEmailId") REFERENCES "public"."PersonEmail"("id")',
    );
    expect(migrationSql).toContain(
      'FOREIGN KEY ("selectedPhoneId") REFERENCES "public"."PersonPhone"("id")',
    );
    expect(migrationSql).toContain('ON DELETE SET NULL ON UPDATE CASCADE');
    expect(migrationSql).toContain(
      'validate_partner_contact_selected_coordinates',
    );
    expect(migrationSql).toContain('NEW."version" := OLD."version" + 1');
    expect(migrationSql).toContain('NEW."selectedEmailId" := NULL');
    expect(migrationSql).toContain('NEW."label" := \'Interlocuteur supprimé\'');
    expect(migrationSql).toContain('WHERE "personId" IS NULL');
    expect(migrationSql).toContain('email."personId" = NEW."personId"');
    expect(migrationSql).toContain('phone."personId" = NEW."personId"');
    expect(migrationSql).toContain(
      'CREATE TRIGGER "PersonEmail_prevent_person_reassignment"',
    );
    expect(migrationSql).toContain(
      'CREATE TRIGGER "PersonPhone_prevent_person_reassignment"',
    );
  });

  it('requires only partners:manage on every organization-channel mutation', () => {
    for (const source of [collectionRoute, itemRoute]) {
      expect(source).toContain('PERMISSIONS.PARTNERS.MANAGE');
      expect(source).not.toContain(
        'requirePermission(auth.user, PERMISSIONS.PERSONS.VIEW)',
      );
    }
    expect(collectionRoute).toContain('export async function POST');
    expect(itemRoute).toContain('export async function PATCH');
    expect(itemRoute).toContain('export async function DELETE');
  });
});
