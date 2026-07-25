import { readFileSync } from 'node:fs';

import { describe, expect, it, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  partnerFollowUpEntry: { findMany: vi.fn() },
  partnerOrganization: { findUnique: vi.fn() },
  partnerOrganizationMergeRedirect: { findUnique: vi.fn() },
  partnerTimelineEvent: { findMany: vi.fn() },
}));

vi.mock('server-only', () => ({}));
vi.mock('$env', () => ({
  env: {
    MFA_ENCRYPTION_KEY_V1: 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=',
  },
}));
vi.mock('$server/prisma', () => ({ prisma: prismaMock }));

import {
  partnerTimelineQuerySchema,
  updatePartnerActionSchema,
  updatePartnerFollowUpSchema,
} from '$features/partners/schemas/partner.schemas';
import { partnerErrors } from '$features/partners/server/partner-errors';
import { buildPartnerFollowUpEditPolicy } from '$features/partners/server/partner-follow-up-policy';
import type { PartnerTimelineItem } from '$features/partners/types/partner-timeline.types';
import type { UserType } from '$types/auth.types';

// Test-owned static path.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const timelineRouteSource = readFileSync(
  new URL('../app/api/partenaires/[id]/fil/route.ts', import.meta.url),
  'utf8',
);
// Test-owned static path.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const partnerServiceSource = readFileSync(
  new URL('../features/partners/server/partner.service.ts', import.meta.url),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const partnerApiSource = readFileSync(
  new URL('../features/partners/server/partner-api.ts', import.meta.url),
  'utf8',
);
// Test-owned static path.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const partnerDetailRepositorySource = readFileSync(
  new URL(
    '../features/partners/server/partner-detail.repository.ts',
    import.meta.url,
  ),
  'utf8',
);
// Test-owned static paths.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const partnerCreateRouteSource = readFileSync(
  new URL('../app/api/partenaires/route.ts', import.meta.url),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const partnerContactUpdateRouteSource = readFileSync(
  new URL(
    '../app/api/partenaires/[id]/contacts/[contactId]/route.ts',
    import.meta.url,
  ),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const partnerFollowUpCreateRouteSource = readFileSync(
  new URL('../app/api/partenaires/[id]/suivis/route.ts', import.meta.url),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const partnerFollowUpUpdateRouteSource = readFileSync(
  new URL(
    '../app/api/partenaires/[id]/suivis/[entryId]/route.ts',
    import.meta.url,
  ),
  'utf8',
);

describe('partner business timeline server', () => {
  it('bounds timeline pages and gives action concurrency an explicit version', () => {
    expect(partnerTimelineQuerySchema.parse({})).toEqual({ limit: 25 });
    expect(partnerTimelineQuerySchema.safeParse({ limit: 50 }).success).toBe(
      true,
    );
    expect(partnerTimelineQuerySchema.safeParse({ limit: 51 }).success).toBe(
      false,
    );
    expect(
      updatePartnerActionSchema.safeParse({
        actionVersion: 3,
        completed: true,
      }).success,
    ).toBe(true);
    expect(
      updatePartnerActionSchema.safeParse({
        completed: true,
        version: 3,
      }).success,
    ).toBe(false);
    expect(
      updatePartnerFollowUpSchema.safeParse({
        entryVersion: 2,
        partnerContactId: null,
        text: 'Correction.',
      }).success,
    ).toBe(true);
    expect(
      updatePartnerFollowUpSchema.safeParse({
        occurredAt: new Date().toISOString(),
        text: 'Correction.',
        version: 2,
      }).success,
    ).toBe(false);
  });

  it('computes the edit window from the server creation time', () => {
    const createdAt = new Date('2026-07-24T12:00:00.000Z');

    expect(
      buildPartnerFollowUpEditPolicy({
        authorId: 'user-1',
        canManage: true,
        createdAt,
        currentUserId: 'user-1',
        hasCompletedActionEvent: false,
        now: new Date('2026-07-24T12:12:30.000Z'),
      }),
    ).toEqual({
      canEdit: true,
      editableUntil: '2026-07-24T12:30:00.000Z',
      remainingMs: 1_050_000,
    });
    expect(
      buildPartnerFollowUpEditPolicy({
        authorId: 'user-1',
        canManage: true,
        createdAt,
        currentUserId: 'user-1',
        hasCompletedActionEvent: true,
        now: new Date('2026-07-24T12:01:00.000Z'),
      }),
    ).toEqual({ canEdit: false, editableUntil: null, remainingMs: 0 });
    expect(
      buildPartnerFollowUpEditPolicy({
        authorId: 'user-1',
        canManage: true,
        createdAt,
        currentUserId: 'user-1',
        hasCompletedActionEvent: false,
        now: new Date('2026-07-24T12:30:00.000Z'),
      }),
    ).toEqual({
      canEdit: false,
      editableUntil: '2026-07-24T12:30:00.000Z',
      remainingMs: 0,
    });
    expect(
      buildPartnerFollowUpEditPolicy({
        authorId: 'user-2',
        canManage: true,
        createdAt,
        currentUserId: 'user-1',
        hasCompletedActionEvent: false,
        now: new Date('2026-07-24T12:01:00.000Z'),
      }),
    ).toEqual({ canEdit: false, editableUntil: null, remainingMs: 0 });
    expect(
      buildPartnerFollowUpEditPolicy({
        authorId: 'user-1',
        canManage: false,
        createdAt,
        currentUserId: 'user-1',
        hasCompletedActionEvent: false,
        now: new Date('2026-07-24T12:01:00.000Z'),
      }).canEdit,
    ).toBe(false);
  });

  it('returns dedicated edit authorization, lock and concurrency errors', () => {
    expect(partnerErrors.followUpForbidden()).toMatchObject({
      code: 'PARTNER_FOLLOW_UP_FORBIDDEN',
      message: 'Seul l’auteur de cette note peut la modifier.',
    });
    expect(partnerErrors.followUpActionLocked()).toMatchObject({
      code: 'PARTNER_FOLLOW_UP_LOCKED',
      message: expect.stringContaining('action a déjà été terminée'),
    });
    expect(partnerErrors.followUpEditExpired()).toMatchObject({
      code: 'PARTNER_FOLLOW_UP_LOCKED',
      message: expect.stringContaining('délai de 30 minutes est expiré'),
    });
    expect(partnerErrors.followUpVersionConflict()).toMatchObject({
      code: 'PARTNER_FOLLOW_UP_VERSION_CONFLICT',
      message: expect.stringContaining('Cette note a été modifiée'),
    });
    expect(partnerApiSource).toContain("case 'PARTNER_FOLLOW_UP_FORBIDDEN':");
    expect(partnerApiSource).toContain('apiErrors.forbidden(error.message)');
  });

  it('protects the feed and person references independently', () => {
    expect(timelineRouteSource).toContain('PERMISSIONS.PARTNERS.VIEW');
    expect(timelineRouteSource).toContain('PERMISSIONS.PARTNERS.MANAGE');
    expect(timelineRouteSource).toContain('PERMISSIONS.PERSONS.VIEW');
    expect(timelineRouteSource).toContain('currentUserId: auth.user.id');
    expect(timelineRouteSource).toContain('withPartnerNoStore(');
    expect(timelineRouteSource).toContain('listPartnerTimeline(');
  });

  it('orders a merged page deterministically by time then source and id', async () => {
    const { comparePartnerTimelineItems } =
      await import('$features/partners/server/partner-timeline.service');
    const occurredAt = '2026-07-24T12:00:00.000Z';
    const items: Array<Pick<PartnerTimelineItem, 'id' | 'occurredAt'>> = [
      { id: 'event:z', occurredAt },
      { id: 'note:a', occurredAt },
      { id: 'note:b', occurredAt },
      { id: 'event:a', occurredAt: '2026-07-24T11:59:59.999Z' },
    ];

    expect(items.sort(comparePartnerTimelineItems).map(({ id }) => id)).toEqual(
      ['note:b', 'note:a', 'event:z', 'event:a'],
    );
  });

  it('writes one immutable event with bounded actor snapshots', async () => {
    const { createPartnerTimelineEvent } =
      await import('$features/partners/server/partner-timeline.service');
    const create = vi.fn().mockResolvedValue({ id: 'event-1' });
    const actor = {
      firstName: 'A'.repeat(180),
      id: 'user-1',
      lastName: 'B'.repeat(180),
      loginName: 'login-name',
    } as UserType;

    await createPartnerTimelineEvent(
      {
        partnerTimelineEvent: { create },
      } as never,
      {
        actor,
        organizationId: 'partner-1',
        payload: {
          closingNote: null,
          endedOn: null,
          startedOn: null,
          status: 'PROSPECT',
        },
        type: 'RELATIONSHIP_CREATED',
      },
    );

    expect(create).toHaveBeenCalledTimes(1);
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorDisplayNameSnapshot: expect.stringMatching(/^A+ B+$/),
        actorId: actor.id,
        actorLoginNameSnapshot: actor.loginName,
        operationId: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
        ),
        organizationId: 'partner-1',
        type: 'RELATIONSHIP_CREATED',
      }),
      select: { id: true },
    });
    const call = create.mock.calls[0]?.[0] as {
      data: { actorDisplayNameSnapshot: string };
    };
    expect(call.data.actorDisplayNameSnapshot).toHaveLength(200);
  });

  it('merges notes and events while masking directory contacts', async () => {
    const occurredAt = new Date();
    prismaMock.partnerOrganizationMergeRedirect.findUnique.mockResolvedValue(
      null,
    );
    prismaMock.partnerOrganization.findUnique.mockResolvedValue({
      id: 'partner-1',
    });
    prismaMock.partnerFollowUpEntry.findMany
      .mockResolvedValueOnce([
        {
          action: null,
          author: {
            firstName: 'Jean',
            lastName: 'Dupont',
            loginName: 'jdupont',
          },
          authorId: 'user-1',
          createdAt: occurredAt,
          id: 'note-1',
          occurredAt,
          organizationId: 'partner-1',
          partnerContact: {
            person: {
              firstName: 'Marie',
              id: 'person-1',
              lastName: 'Martin',
              nickname: null,
            },
          },
          partnerContactId: 'contact-1',
          text: 'Proposition envoyée.',
          timelineEvents: [],
          updatedAt: occurredAt,
          version: 1,
        },
      ])
      .mockResolvedValueOnce([]);
    prismaMock.partnerTimelineEvent.findMany.mockResolvedValue([
      {
        actionId: null,
        actorDisplayNameSnapshot: 'Luxior Treize',
        actorId: 'user-2',
        actorLoginNameSnapshot: 'luxior',
        createdAt: new Date('2026-07-24T11:00:00.000Z'),
        followUpEntryId: null,
        formatVersion: 1,
        id: 'event-1',
        occurredAt: new Date('2026-07-24T11:00:00.000Z'),
        operationId: 'operation-1',
        organizationId: 'partner-1',
        payload: {
          closingNote: null,
          endedOn: null,
          startedOn: null,
          status: 'PROSPECT',
        },
        periodId: null,
        type: 'RELATIONSHIP_CREATED',
      },
    ]);

    const { listPartnerTimeline } =
      await import('$features/partners/server/partner-timeline.service');
    const response = await listPartnerTimeline(
      'partner-1',
      { limit: 1 },
      {
        canManage: true,
        canViewPersons: false,
        currentUserId: 'user-1',
      },
    );

    expect(response.items.map(({ id }) => id)).toEqual(['note:note-1']);
    expect(response.items[0]).toMatchObject({
      followUp: {
        author: { displayName: 'Jean Dupont', loginName: 'jdupont' },
        contact: null,
        editPolicy: { canEdit: true },
        text: 'Proposition envoyée.',
      },
      kind: 'NOTE',
    });
    expect(response.pagination).toMatchObject({
      hasMore: true,
      limit: 1,
      nextCursor: expect.any(String),
    });
    if (response.items[0]?.kind === 'NOTE') {
      expect(response.items[0].followUp).not.toHaveProperty('partnerContactId');
      expect(response.items[0].followUp.entryVersion).toBe(1);
    }

    prismaMock.partnerFollowUpEntry.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    const nextPage = await listPartnerTimeline(
      'partner-1',
      {
        cursor: response.pagination.nextCursor ?? undefined,
        limit: 1,
      },
      {
        canManage: true,
        canViewPersons: false,
        currentUserId: 'user-1',
      },
    );

    expect(nextPage.items.map(({ id }) => id)).toEqual(['event:event-1']);
    expect(nextPage.pagination.snapshotAt).toBe(response.pagination.snapshotAt);
  });

  it('keeps one event per status intent and makes repeated action state a no-op', () => {
    const independentTouchSource = partnerServiceSource.slice(
      partnerServiceSource.indexOf('const touchPartnerForIndependentMutation'),
      partnerServiceSource.indexOf('export const listPartners'),
    );

    expect(partnerServiceSource).toContain("type: 'RELATIONSHIP_CREATED'");
    expect(partnerServiceSource).toContain("type: 'STATUS_CHANGED'");
    expect(partnerServiceSource).toContain("type: 'PERIOD_CORRECTED'");
    expect(partnerServiceSource).toContain(
      'Boolean(entry.action.completedAt) === input.completed',
    );
    expect(partnerServiceSource).toContain(
      "input.completed ? 'ACTION_COMPLETED' : 'ACTION_REOPENED'",
    );
    expect(independentTouchSource).toContain(
      'data: { updatedById: input.actorId }',
    );
    expect(independentTouchSource).not.toContain('version:');
  });

  it('keeps attribution durable and validates edited contact scope', () => {
    expect(partnerServiceSource).toContain('authorDisplayNameSnapshot:');
    expect(partnerServiceSource).toContain('completedByDisplayNameSnapshot:');
    expect(partnerServiceSource).toContain(
      "if (!contact) throw partnerErrors.dependencyConflict('Contact invalide')",
    );
    expect(partnerDetailRepositorySource).toContain(
      'entry.authorDisplayNameSnapshot',
    );
    expect(partnerDetailRepositorySource).toContain(
      'Boolean(entry.action?.completedAt) || entry.timelineEvents.length > 0',
    );
    expect(partnerDetailRepositorySource).not.toContain('take: 50');
  });

  it('serializes note edits and action completion parent-first', () => {
    const updateSource = partnerServiceSource.slice(
      partnerServiceSource.indexOf('export const updatePartnerFollowUp'),
      partnerServiceSource.indexOf('export const deletePartnerFollowUp'),
    );
    const completionSource = partnerServiceSource.slice(
      partnerServiceSource.indexOf('export const setPartnerActionCompleted'),
      partnerServiceSource.indexOf('export const getPartnerActivity'),
    );
    const updateAuditSource = updateSource.slice(
      updateSource.indexOf('createPartnerAudit'),
      updateSource.indexOf('return loadPartnerDetail'),
    );

    expect(updateSource).toContain('input.entryVersion');
    expect(updateSource).toContain('entry.authorId !== actor.id');
    expect(updateSource).toContain("where: { type: 'ACTION_COMPLETED' }");
    expect(updateSource).toContain('entry.action?.completedAt');
    expect(
      updateSource.indexOf('lockPartnerForIndependentMutation'),
    ).toBeLessThan(updateSource.indexOf('partnerFollowUpEntry.findFirst'));
    expect(updateSource.indexOf('partnerFollowUpEntry.findFirst')).toBeLessThan(
      updateSource.indexOf('partnerFollowUpEntry.updateMany'),
    );
    expect(
      completionSource.indexOf('lockPartnerForIndependentMutation'),
    ).toBeLessThan(completionSource.indexOf('partnerFollowUpEntry.findFirst'));
    expect(
      completionSource.indexOf('partnerFollowUpAction.updateMany'),
    ).toBeLessThan(
      completionSource.indexOf('touchPartnerForIndependentMutation'),
    );
    expect(updateAuditSource).not.toContain('input.text');
  });

  it('locks a fiche before deciding whether its history permits deletion', () => {
    const deleteSource = partnerServiceSource.slice(
      partnerServiceSource.indexOf('export const deletePartner'),
    );

    expect(deleteSource).toContain('resolvePartnerId(');
    expect(deleteSource).toContain('FOR UPDATE');
    expect(deleteSource.indexOf('FOR UPDATE')).toBeLessThan(
      deleteSource.indexOf('partner._count.followUps'),
    );
    expect(deleteSource.indexOf('partner._count.followUps')).toBeLessThan(
      deleteSource.indexOf('partnerOrganization.delete('),
    );
  });

  it('never exposes or mutates directory contacts without persons:view', () => {
    expect(partnerDetailRepositorySource).toContain('contacts: canViewPersons');
    expect(partnerCreateRouteSource).toContain('if (parsed.data.contact)');
    expect(partnerContactUpdateRouteSource).toContain(
      'PERMISSIONS.PERSONS.VIEW',
    );
    expect(partnerFollowUpCreateRouteSource).toContain(
      'if (parsed.data.partnerContactId)',
    );
    expect(partnerFollowUpUpdateRouteSource).toContain(
      'if (parsed.data.partnerContactId !== undefined)',
    );
  });
});
