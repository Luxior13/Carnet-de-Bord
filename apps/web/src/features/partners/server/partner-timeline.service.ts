import 'server-only';

import { randomUUID } from 'node:crypto';

import {
  type PartnerTimelineEvent,
  type PartnerTimelineEventType,
  Prisma,
} from '@prisma/client';

import {
  buildCursorPaginationMeta,
  decodeKeysetCursor,
  hashCursorFilters,
} from '$server/cursor-pagination';
import { prisma } from '$server/prisma';
import type { UserType } from '$types/auth.types';

import type {
  PartnerTimelineEventItem,
  PartnerTimelineEventPayloadMap,
  PartnerTimelineItem,
  PartnerTimelineResponse,
} from '../types/partner-timeline.types';
import {
  mapPartnerFollowUp,
  PARTNER_FOLLOW_UP_INCLUDE,
  resolvePartnerId,
} from './partner-detail.repository';

type TimelineSource = 'event' | 'note';

const TIMELINE_RESOURCE = 'partner-timeline';

export const getPartnerActorSnapshot = (
  actor: UserType,
): {
  actorDisplayNameSnapshot: string;
  actorId: string;
  actorLoginNameSnapshot: string;
} => ({
  actorDisplayNameSnapshot: (
    `${actor.firstName.trim()} ${actor.lastName.trim()}`.trim() ||
    actor.loginName
  ).slice(0, 200),
  actorId: actor.id,
  actorLoginNameSnapshot: actor.loginName.slice(0, 64),
});

export const createPartnerTimelineEvent = async <
  TType extends PartnerTimelineEventType,
>(
  transaction: Prisma.TransactionClient,
  input: {
    actionId?: string | null;
    actor: UserType;
    followUpEntryId?: string | null;
    occurredAt?: Date;
    operationId?: string;
    organizationId: string;
    payload: PartnerTimelineEventPayloadMap[TType];
    periodId?: string | null;
    type: TType;
  },
): Promise<void> => {
  await transaction.partnerTimelineEvent.create({
    data: {
      ...getPartnerActorSnapshot(input.actor),
      actionId: input.actionId ?? null,
      followUpEntryId: input.followUpEntryId ?? null,
      occurredAt: input.occurredAt ?? new Date(),
      operationId: input.operationId ?? randomUUID(),
      organizationId: input.organizationId,
      payload: input.payload as unknown as Prisma.InputJsonValue,
      periodId: input.periodId ?? null,
      type: input.type,
    },
    select: { id: true },
  });
};

const parseCursorItemId = (
  value: string,
): { id: string; source: TimelineSource } | null => {
  const separator = value.indexOf(':');
  if (separator <= 0 || separator === value.length - 1) return null;
  const source = value.slice(0, separator);
  if (source !== 'event' && source !== 'note') return null;

  return { id: value.slice(separator + 1), source };
};

const cursorWhere = (
  source: TimelineSource,
  cursor: {
    id: string;
    occurredAt: Date;
    source: TimelineSource;
  } | null,
): {
  OR?: Array<
    | { id: { lt: string }; occurredAt: Date }
    | { occurredAt: Date }
    | { occurredAt: { lt: Date } }
  >;
} => {
  if (!cursor) return {};
  const sameTimestamp: Array<
    { id: { lt: string }; occurredAt: Date } | { occurredAt: Date }
  > = [];

  if (source < cursor.source) {
    sameTimestamp.push({ occurredAt: cursor.occurredAt });
  } else if (source === cursor.source) {
    sameTimestamp.push({
      id: { lt: cursor.id },
      occurredAt: cursor.occurredAt,
    });
  }

  return {
    OR: [{ occurredAt: { lt: cursor.occurredAt } }, ...sameTimestamp],
  };
};

export const comparePartnerTimelineItems = (
  left: Pick<PartnerTimelineItem, 'id' | 'occurredAt'>,
  right: Pick<PartnerTimelineItem, 'id' | 'occurredAt'>,
): number =>
  right.occurredAt.localeCompare(left.occurredAt) ||
  right.id.localeCompare(left.id);

const mapTimelineEvent = (
  event: PartnerTimelineEvent,
): PartnerTimelineEventItem =>
  ({
    actor: {
      displayName:
        event.actorDisplayNameSnapshot ??
        event.actorLoginNameSnapshot ??
        'Compte indisponible',
      loginName: event.actorLoginNameSnapshot,
    },
    createdAt: event.createdAt.toISOString(),
    eventType: event.type,
    formatVersion: event.formatVersion,
    id: `event:${event.id}`,
    kind: 'EVENT',
    occurredAt: event.occurredAt.toISOString(),
    payload: event.payload,
    refs: {
      actionId: event.actionId,
      followUpEntryId: event.followUpEntryId,
      periodId: event.periodId,
    },
  }) as PartnerTimelineEventItem;

export const listPartnerTimeline = async (
  partnerId: string,
  input: { cursor?: string; limit: number },
  canViewPersons: boolean,
): Promise<PartnerTimelineResponse> => {
  const organizationId = await resolvePartnerId(prisma, partnerId);
  const filterHash = hashCursorFilters({ organizationId });
  const decodedCursor = input.cursor
    ? decodeKeysetCursor(input.cursor, {
        filterHash,
        resource: TIMELINE_RESOURCE,
      })
    : null;
  if (input.cursor && !decodedCursor) throw new RangeError('INVALID_CURSOR');

  const parsedCursorId = decodedCursor
    ? parseCursorItemId(decodedCursor.id)
    : null;
  const cursorDate = decodedCursor ? new Date(decodedCursor.sortValue) : null;
  if (
    decodedCursor &&
    (!parsedCursorId ||
      !cursorDate ||
      Number.isNaN(cursorDate.getTime()) ||
      cursorDate.toISOString() !== decodedCursor.sortValue)
  ) {
    throw new RangeError('INVALID_CURSOR');
  }
  const cursor =
    parsedCursorId && cursorDate
      ? {
          id: parsedCursorId.id,
          occurredAt: cursorDate,
          source: parsedCursorId.source,
        }
      : null;
  const snapshotAt = decodedCursor
    ? new Date(decodedCursor.snapshotAt)
    : new Date();

  const [followUps, events, openActionEntries] = await Promise.all([
    prisma.partnerFollowUpEntry.findMany({
      include: PARTNER_FOLLOW_UP_INCLUDE,
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: input.limit + 1,
      where: {
        AND: [
          cursorWhere('note', cursor) as Prisma.PartnerFollowUpEntryWhereInput,
        ],
        createdAt: { lte: snapshotAt },
        organizationId,
        updatedAt: { lte: snapshotAt },
      },
    }),
    prisma.partnerTimelineEvent.findMany({
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: input.limit + 1,
      where: {
        AND: [
          cursorWhere('event', cursor) as Prisma.PartnerTimelineEventWhereInput,
        ],
        createdAt: { lte: snapshotAt },
        organizationId,
      },
    }),
    input.cursor
      ? Promise.resolve([])
      : prisma.partnerFollowUpEntry.findMany({
          include: PARTNER_FOLLOW_UP_INCLUDE,
          orderBy: [{ action: { dueOn: 'asc' } }, { occurredAt: 'desc' }],
          where: {
            action: { is: { completedAt: null } },
            organizationId,
          },
        }),
  ]);

  const items: PartnerTimelineItem[] = [
    ...followUps.map((entry) => {
      const followUp = mapPartnerFollowUp(entry, canViewPersons);

      return {
        createdAt: followUp.createdAt,
        followUp,
        id: `note:${entry.id}` as const,
        kind: 'NOTE' as const,
        occurredAt: followUp.occurredAt,
      };
    }),
    ...events.map(mapTimelineEvent),
  ].sort(comparePartnerTimelineItems);

  const page = buildCursorPaginationMeta(
    items,
    input.limit,
    snapshotAt,
    (item) => ({
      filterHash,
      id: item.id,
      resource: TIMELINE_RESOURCE,
      snapshotAt: snapshotAt.toISOString(),
      sortValue: item.occurredAt,
    }),
  );

  return {
    items: page.items,
    openActions: openActionEntries.map((entry) =>
      mapPartnerFollowUp(entry, canViewPersons),
    ),
    pagination: page.pagination,
  };
};
