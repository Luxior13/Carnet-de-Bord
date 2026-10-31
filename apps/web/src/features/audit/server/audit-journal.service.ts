import 'server-only';

import type { Prisma } from '@prisma/client';

import { getPersonDisplayName } from '$features/persons/person.ui';
import { createAuditLogWithHeaders } from '$server/audit-log';
import { prisma } from '$server/prisma';

import {
  isJournalSearchApplicable,
  JOURNAL_PAGE_SIZE,
  type JournalPeriod,
  type JournalQuery,
  type JournalResponse,
} from '../audit-journal.types';
import {
  getReaderRights,
  JOURNAL_AUDIT_LOCATION,
  type JournalReader,
  projectJournalEvent,
} from './audit-journal.projection';

const HOUR_MS = 3_600_000;
const PERIOD_MS: Record<JournalPeriod, number> = {
  '1y': 365 * 24 * HOUR_MS,
  '24h': 24 * HOUR_MS,
  '30d': 30 * 24 * HOUR_MS,
  '7d': 7 * 24 * HOUR_MS,
};
/** At most one « Journal consulté » per reader in this window. */
const VIEW_TRACE_WINDOW_MS = 15 * 60_000;
/** Deep pages are refused: past this, narrow the filters instead. */
const MAX_PAGE = 200;

const TYPE_FILTERS: Record<
  Exclude<JournalQuery['type'], 'all'>,
  Prisma.AuditLogWhereInput
> = {
  accounts: {
    category: { in: ['USER', 'PERMISSION'] },
    stream: { in: ['IDENTITY', 'AUTHORIZATION'] },
  },
  persons: { category: 'PERSON' },
  security: { stream: { in: ['AUTHENTICATION', 'SECURITY'] } },
  settings: { action: 'SYSTEM_SETTING_UPDATE' },
};

const getProtectedAccountIds = async (): Promise<string[]> =>
  (
    await prisma.user.findMany({
      select: { id: true },
      where: { isProtected: true },
    })
  ).map((user) => user.id);

const buildWhere = (
  query: JournalQuery,
  asOf: Date,
  hiddenAccountIds: readonly string[],
): Prisma.AuditLogWhereInput => {
  const and: Prisma.AuditLogWhereInput[] = [
    {
      createdAt: {
        gte: new Date(asOf.getTime() - PERIOD_MS[query.period]),
        lte: asOf,
      },
    },
  ];
  if (query.type !== 'all') and.push(TYPE_FILTERS[query.type]);
  if (query.show === 'important')
    and.push({ severity: { in: ['WARNING', 'CRITICAL'] } });
  if (query.show === 'failures') and.push({ outcome: 'FAILURE' });
  if (query.user)
    and.push({ OR: [{ userId: query.user }, { targetUserId: query.user }] });
  if (query.person) and.push({ entityId: query.person, entityType: 'PERSON' });
  if (isJournalSearchApplicable(query.search)) {
    // `%` would act as a wildcard; `_` only widens the match.
    const contains = query.search.replaceAll('%', '');
    and.push({
      OR: [
        'actorDisplayNameSnapshot',
        'actorLoginNameSnapshot',
        'targetDisplayNameSnapshot',
        'targetLoginNameSnapshot',
      ].map((field) => ({
        [field]: { contains, mode: 'insensitive' as const },
      })),
    });
  }
  // The protected account's events stay hidden from every other reader.
  if (hiddenAccountIds.length > 0)
    and.push(
      { OR: [{ userId: null }, { userId: { notIn: [...hiddenAccountIds] } }] },
      {
        OR: [
          { targetUserId: null },
          { targetUserId: { notIn: [...hiddenAccountIds] } },
        ],
      },
    );

  return { AND: and };
};

const getFocusLabel = async (
  query: JournalQuery,
  hiddenAccountIds: readonly string[],
  canViewPersons: boolean,
): Promise<string | null> => {
  if (query.user) {
    if (hiddenAccountIds.includes(query.user)) return null;
    const user = await prisma.user.findUnique({
      select: { firstName: true, lastName: true, loginName: true },
      where: { id: query.user },
    });

    return user
      ? `${user.firstName} ${user.lastName}`.trim() || user.loginName
      : null;
  }
  if (query.person && canViewPersons) {
    const person = await prisma.person.findUnique({
      select: { firstName: true, lastName: true, nickname: true },
      where: { id: query.person },
    });

    return person ? getPersonDisplayName(person) : null;
  }

  return null;
};

/**
 * One page of the journal, read at a fixed instant (`asOf`) so that events
 * arriving meanwhile never shift the pages. Masking follows the reader.
 */
export const listJournalEvents = async (
  reader: JournalReader,
  query: JournalQuery,
  asOfParam: string | null,
): Promise<JournalResponse> => {
  const now = new Date();
  const requested = asOfParam ? new Date(asOfParam) : null;
  const asOf =
    requested &&
    !Number.isNaN(requested.getTime()) &&
    requested.getTime() <= now.getTime() &&
    now.getTime() - requested.getTime() < PERIOD_MS['1y']
      ? requested
      : now;
  const rights = getReaderRights(reader);
  const hiddenAccountIds = reader.isProtected
    ? []
    : await getProtectedAccountIds();
  const where = buildWhere(query, asOf, hiddenAccountIds);
  const page = Math.min(query.page, MAX_PAGE);
  const [total, rows, focusLabel] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      include: {
        fieldChanges: {
          orderBy: [
            { sectionKey: 'asc' },
            { recordId: 'asc' },
            { fieldKey: 'asc' },
          ],
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * JOURNAL_PAGE_SIZE,
      take: JOURNAL_PAGE_SIZE,
      where,
    }),
    getFocusLabel(query, hiddenAccountIds, rights.canViewPersons),
  ]);
  const personIds = [
    ...new Set(
      rows.flatMap((row) =>
        row.entityType === 'PERSON' && row.entityId ? [row.entityId] : [],
      ),
    ),
  ];
  const persons =
    personIds.length > 0 && rights.canViewPersons
      ? await prisma.person.findMany({
          select: { firstName: true, id: true, lastName: true, nickname: true },
          where: { id: { in: personIds } },
        })
      : [];
  const personNames = new Map(
    persons.map((person) => [person.id, getPersonDisplayName(person)]),
  );

  return {
    asOf: asOf.toISOString(),
    events: rows.map((row) => projectJournalEvent(row, rights, personNames)),
    focusLabel,
    pagination: {
      limit: JOURNAL_PAGE_SIZE,
      page,
      total,
      totalPages: Math.min(
        MAX_PAGE,
        Math.max(1, Math.ceil(total / JOURNAL_PAGE_SIZE)),
      ),
    },
  };
};

/**
 * « Celui qui surveille est surveillé » (30 October 2026): reading the
 * journal leaves a trace, once per reader every fifteen minutes so that
 * filtering does not flood the timeline. Written by the server, so a
 * client cannot skip it.
 */
export const traceJournalView = async (
  reader: JournalReader,
): Promise<void> => {
  const recent = await prisma.auditLog.findFirst({
    select: { id: true },
    where: {
      action: 'AUDIT_VIEW',
      createdAt: { gte: new Date(Date.now() - VIEW_TRACE_WINDOW_MS) },
      userId: reader.id,
    },
  });
  if (recent) return;
  await createAuditLogWithHeaders(
    {
      action: 'AUDIT_VIEW',
      category: 'SYSTEM',
      description: 'Journal d’activité consulté',
      metadata: { ...JOURNAL_AUDIT_LOCATION },
      userId: reader.id,
    },
    { required: true },
  );
};
