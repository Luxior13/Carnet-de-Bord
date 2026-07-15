import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import type { Prisma } from '@prisma/client';
import {
  AuditAction,
  AuditCategory,
  AuditEventKind,
  AuditOutcome,
  AuditSeverity,
  AuditStream,
  type UserRole,
} from '@repo/database';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { env } from '$env';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors } from '$server/api-response';
import { getAuditEventClassification } from '$server/audit-event';
import {
  getVisibleAuditDescription,
  sanitizeAuditMetadata,
} from '$server/audit-visibility';
import { createAuditLog, getAuditRequestContext } from '$server/auth';
import { prisma } from '$server/prisma';
import { requireRecentSensitiveActionProof } from '$server/sensitive-action';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
} from '$types/api.types';

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;
const EXPORT_BATCH_SIZE = 500;
const MAX_EXPORT_ROWS = 50_000;
const MAX_CUSTOM_RANGE_MS = 366 * 24 * 60 * 60 * 1000;
const CURSOR_VERSION = 1 as const;
const CURSOR_SIGNING_KEY = createHash('sha256')
  .update('team-control:audit-cursor:v1:', 'utf8')
  .update(Buffer.from(env.MFA_ENCRYPTION_KEY_V1, 'base64'))
  .digest();

const PERIOD_DURATIONS = {
  '24h': 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
} as const;

const isConnectionAction = (action: AuditAction): boolean =>
  getAuditEventClassification(action).eventKind === AuditEventKind.CONNECTION;

const ISO_DATE_TIME_SCHEMA = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .pipe(z.iso.datetime({ offset: true }));
const IDENTIFIER_SCHEMA = z.string().trim().min(1).max(191);
const LOCATION_KEY_SCHEMA = z.string().trim().min(1).max(100);

const JOURNAL_QUERY_SCHEMA = z
  .object({
    action: z.enum(AuditAction).optional(),
    actorId: IDENTIFIER_SCHEMA.optional(),
    category: z.enum(AuditCategory).optional(),
    connectionAction: z.enum(AuditAction).optional(),
    cursor: z.string().trim().min(1).max(2_048).optional(),
    format: z.enum(['csv', 'json']).optional(),
    from: ISO_DATE_TIME_SCHEMA.optional(),
    limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(DEFAULT_LIMIT),
    logType: z.enum(['activity', 'connections']).default('activity'),
    outcome: z.enum(AuditOutcome).optional(),
    pageKey: LOCATION_KEY_SCHEMA.optional(),
    period: z.enum(['24h', '7d', '30d', '90d', 'all', 'custom']).default('30d'),
    poleKey: LOCATION_KEY_SCHEMA.optional(),
    search: z.string().trim().min(1).max(120).optional(),
    severity: z.enum(AuditSeverity).optional(),
    stream: z.enum(AuditStream).optional(),
    targetUserId: IDENTIFIER_SCHEMA.optional(),
    to: ISO_DATE_TIME_SCHEMA.optional(),
  })
  .strict()
  .superRefine((query, context) => {
    const isCustomPeriod = query.period === 'custom';

    if (isCustomPeriod && !(query.from && query.to)) {
      context.addIssue({
        code: 'custom',
        message: 'Les paramètres from et to sont requis avec period=custom',
        path: ['period'],
      });
    }
    if (!isCustomPeriod && (query.from || query.to)) {
      context.addIssue({
        code: 'custom',
        message:
          'Les paramètres from et to sont autorisés uniquement avec period=custom',
        path: ['period'],
      });
    }

    if (query.from && query.to) {
      const fromTime = Date.parse(query.from);
      const toTime = Date.parse(query.to);

      if (fromTime >= toTime) {
        context.addIssue({
          code: 'custom',
          message: 'La date de début doit précéder la date de fin',
          path: ['from'],
        });
      } else if (toTime - fromTime > MAX_CUSTOM_RANGE_MS) {
        context.addIssue({
          code: 'custom',
          message: 'La plage personnalisée ne peut pas dépasser 366 jours',
          path: ['to'],
        });
      }
    }

    if (query.logType === 'connections') {
      for (const [key, value] of [
        ['action', query.action],
        ['category', query.category],
        ['pageKey', query.pageKey],
        ['poleKey', query.poleKey],
      ] as const) {
        if (value !== undefined) {
          context.addIssue({
            code: 'custom',
            message: `${key} n'est pas compatible avec le journal des connexions`,
            path: [key],
          });
        }
      }
      if (
        query.connectionAction &&
        !isConnectionAction(query.connectionAction)
      ) {
        context.addIssue({
          code: 'custom',
          message: "Cette action n'est pas un événement de connexion",
          path: ['connectionAction'],
        });
      }
    } else {
      if (query.connectionAction !== undefined) {
        context.addIssue({
          code: 'custom',
          message: 'connectionAction requiert logType=connections',
          path: ['connectionAction'],
        });
      }
      if (query.action && isConnectionAction(query.action)) {
        context.addIssue({
          code: 'custom',
          message: 'Une action de connexion requiert logType=connections',
          path: ['action'],
        });
      }
    }

    if (query.format && query.cursor) {
      context.addIssue({
        code: 'custom',
        message: "Un export ne peut pas reprendre un curseur d'affichage",
        path: ['cursor'],
      });
    }
  });

type JournalQuery = z.infer<typeof JOURNAL_QUERY_SCHEMA>;

const CURSOR_SCHEMA = z.object({
  createdAt: ISO_DATE_TIME_SCHEMA,
  filterHash: z.string().length(43),
  id: IDENTIFIER_SCHEMA,
  snapshotAt: ISO_DATE_TIME_SCHEMA,
  v: z.literal(CURSOR_VERSION),
});

type JournalCursor = z.infer<typeof CURSOR_SCHEMA>;

const AUDIT_LOG_SELECT = {
  action: true,
  actorDisplayNameSnapshot: true,
  actorLoginNameSnapshot: true,
  actorRoleSnapshot: true,
  category: true,
  createdAt: true,
  description: true,
  eventKind: true,
  eventVersion: true,
  id: true,
  ipAddress: true,
  metadata: true,
  outcome: true,
  pageKey: true,
  poleKey: true,
  requestId: true,
  severity: true,
  stream: true,
  tabKey: true,
  targetDisplayNameSnapshot: true,
  targetLoginNameSnapshot: true,
  targetRoleSnapshot: true,
  targetUserId: true,
  userAgent: true,
  userId: true,
} as const satisfies Prisma.AuditLogSelect;

type AuditLogRecord = Prisma.AuditLogGetPayload<{
  select: typeof AUDIT_LOG_SELECT;
}>;

type JournalLog = {
  action: AuditAction;
  actorLoginName: string | null;
  actorName: string | null;
  actorRole: UserRole | null;
  actorSnapshot: {
    displayName: string | null;
    loginName: string | null;
    role: UserRole | null;
  };
  category: AuditCategory;
  createdAt: string;
  description: string;
  eventKind: AuditEventKind;
  eventVersion: number;
  id: string;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  outcome: AuditOutcome;
  pageKey: string | null;
  poleKey: string | null;
  requestId: string | null;
  severity: AuditSeverity;
  stream: AuditStream;
  tabKey: string | null;
  targetLoginName: string | null;
  targetName: string | null;
  targetRole: UserRole | null;
  targetSnapshot: {
    displayName: string | null;
    loginName: string | null;
    role: UserRole | null;
  };
  targetUserId: string | null;
  userAgent: string | null;
  userId: string | null;
};

type JournalResponse = {
  logs: JournalLog[];
  nextCursor: string | null;
  pageSize: number;
  sensitiveDetailsVisible: boolean;
  snapshotAt: string;
};

const getValidationDetails = (error: z.ZodError): Record<string, string[]> => {
  const details = new Map<string, string[]>();

  for (const issue of error.issues) {
    const key = issue.path.join('.') || 'query';
    details.set(key, [...(details.get(key) ?? []), issue.message]);
  }

  return Object.fromEntries(details);
};

const parseJournalQuery = (
  searchParams: URLSearchParams,
):
  | { data: JournalQuery; success: true }
  | { response: NextResponse<ApiErrorResponse>; success: false } => {
  const entries = [...searchParams.entries()];
  const duplicatedKeys = new Set<string>();
  const seenKeys = new Set<string>();

  for (const [key] of entries) {
    if (seenKeys.has(key)) duplicatedKeys.add(key);
    seenKeys.add(key);
  }

  if (duplicatedKeys.size > 0) {
    return {
      response: apiErrors.badRequest('Paramètres de requête invalides', {
        query: [`Paramètre répété: ${[...duplicatedKeys].join(', ')}`],
      }),
      success: false,
    };
  }

  const query = Object.fromEntries(entries);
  const parsedQuery = JOURNAL_QUERY_SCHEMA.safeParse(query);
  if (!parsedQuery.success) {
    return {
      response: apiErrors.badRequest(
        'Paramètres de requête invalides',
        getValidationDetails(parsedQuery.error),
      ),
      success: false,
    };
  }

  return { data: parsedQuery.data, success: true };
};

const getFilterFingerprint = (query: JournalQuery): string => {
  const canonicalFilters = {
    action: query.action ?? null,
    actorId: query.actorId ?? null,
    category: query.category ?? null,
    connectionAction: query.connectionAction ?? null,
    from: query.from ?? null,
    logType: query.logType,
    outcome: query.outcome ?? null,
    pageKey: query.pageKey ?? null,
    period: query.period,
    poleKey: query.poleKey ?? null,
    search: query.search ?? null,
    severity: query.severity ?? null,
    stream: query.stream ?? null,
    targetUserId: query.targetUserId ?? null,
    to: query.to ?? null,
  };

  return createHash('sha256')
    .update(JSON.stringify(canonicalFilters), 'utf8')
    .digest('base64url');
};

const signCursorPayload = (payload: string): string =>
  createHmac('sha256', CURSOR_SIGNING_KEY)
    .update(payload, 'utf8')
    .digest('base64url');

const encodeCursor = (cursor: JournalCursor): string => {
  const payload = Buffer.from(JSON.stringify(cursor), 'utf8').toString(
    'base64url',
  );

  return `${payload}.${signCursorPayload(payload)}`;
};

const decodeCursor = (
  value: string,
  expectedFilterHash: string,
): JournalCursor | null => {
  try {
    const parts = value.split('.');
    if (parts.length !== 2) return null;
    const [payload, suppliedSignature] = parts;
    if (!payload || !suppliedSignature) return null;
    const expectedSignature = signCursorPayload(payload);
    const suppliedBytes = Buffer.from(suppliedSignature, 'base64url');
    const expectedBytes = Buffer.from(expectedSignature, 'base64url');
    if (
      suppliedBytes.length !== expectedBytes.length ||
      !timingSafeEqual(suppliedBytes, expectedBytes)
    ) {
      return null;
    }

    const decodedValue = Buffer.from(payload, 'base64url').toString('utf8');
    const cursor = CURSOR_SCHEMA.safeParse(JSON.parse(decodedValue));

    if (!cursor.success || cursor.data.filterHash !== expectedFilterHash) {
      return null;
    }
    const cursorCreatedAt = Date.parse(cursor.data.createdAt);
    const cursorSnapshotAt = Date.parse(cursor.data.snapshotAt);
    if (cursorCreatedAt > cursorSnapshotAt || cursorSnapshotAt > Date.now()) {
      return null;
    }

    return cursor.data;
  } catch {
    return null;
  }
};

const getSnapshotAt = (
  query: JournalQuery,
  cursor: JournalCursor | null,
): Date => {
  if (cursor) return new Date(cursor.snapshotAt);

  const now = new Date();
  if (query.period !== 'custom' || !query.to) return now;

  const customEnd = new Date(query.to);

  return customEnd < now ? customEnd : now;
};

const getCreatedAfter = (
  query: JournalQuery,
  snapshotAt: Date,
): Date | undefined => {
  if (query.period === 'all') return undefined;
  if (query.period === 'custom') return new Date(query.from as string);

  return new Date(snapshotAt.getTime() - PERIOD_DURATIONS[query.period]);
};

const buildSearchFilter = (search: string): Prisma.AuditLogWhereInput => ({
  OR: [
    { actorDisplayNameSnapshot: { contains: search, mode: 'insensitive' } },
    { actorLoginNameSnapshot: { contains: search, mode: 'insensitive' } },
    { targetDisplayNameSnapshot: { contains: search, mode: 'insensitive' } },
    { targetLoginNameSnapshot: { contains: search, mode: 'insensitive' } },
  ],
});

const buildJournalWhere = (
  query: JournalQuery,
  snapshotAt: Date,
  cursor: JournalCursor | null,
): Prisma.AuditLogWhereInput => {
  const createdAfter = getCreatedAfter(query, snapshotAt);
  const eventKind =
    query.logType === 'connections'
      ? AuditEventKind.CONNECTION
      : AuditEventKind.ACTIVITY;
  const andFilters: Prisma.AuditLogWhereInput[] = [
    { eventKind },
    {
      createdAt: {
        ...(createdAfter ? { gte: createdAfter } : {}),
        lte: snapshotAt,
      },
    },
  ];

  const action =
    query.logType === 'connections' ? query.connectionAction : query.action;
  if (action) andFilters.push({ action });
  if (query.actorId) andFilters.push({ userId: query.actorId });
  if (query.category) andFilters.push({ category: query.category });
  if (query.outcome) andFilters.push({ outcome: query.outcome });
  if (query.pageKey) andFilters.push({ pageKey: query.pageKey });
  if (query.poleKey) andFilters.push({ poleKey: query.poleKey });
  if (query.search) andFilters.push(buildSearchFilter(query.search));
  if (query.severity) andFilters.push({ severity: query.severity });
  if (query.stream) andFilters.push({ stream: query.stream });
  if (query.targetUserId) {
    andFilters.push({ targetUserId: query.targetUserId });
  }
  if (cursor) {
    const cursorCreatedAt = new Date(cursor.createdAt);
    andFilters.push({
      OR: [
        { createdAt: { lt: cursorCreatedAt } },
        { createdAt: cursorCreatedAt, id: { lt: cursor.id } },
      ],
    });
  }

  return { AND: andFilters };
};

const getVisibleLog = (
  log: AuditLogRecord,
  canViewSensitiveDetails: boolean,
): JournalLog => {
  const metadata = sanitizeAuditMetadata(log.metadata, canViewSensitiveDetails);
  const actorName = log.actorDisplayNameSnapshot ?? null;
  const actorLoginName = canViewSensitiveDetails
    ? (log.actorLoginNameSnapshot ?? null)
    : null;
  const actorRole = canViewSensitiveDetails
    ? (log.actorRoleSnapshot ?? null)
    : null;
  const targetName = log.targetDisplayNameSnapshot ?? null;
  const targetLoginName = canViewSensitiveDetails
    ? (log.targetLoginNameSnapshot ?? null)
    : null;
  const targetRole = canViewSensitiveDetails
    ? (log.targetRoleSnapshot ?? null)
    : null;

  return {
    action: log.action,
    actorLoginName,
    actorName,
    actorRole,
    actorSnapshot: {
      displayName: actorName,
      loginName: actorLoginName,
      role: actorRole,
    },
    category: log.category,
    createdAt: log.createdAt.toISOString(),
    description: getVisibleAuditDescription({
      action: log.action,
      canViewSensitiveDetails,
      category: log.category,
      description: log.description,
    }),
    eventKind: log.eventKind,
    eventVersion: log.eventVersion,
    id: log.id,
    ipAddress: canViewSensitiveDetails ? log.ipAddress : null,
    metadata,
    outcome: log.outcome,
    pageKey: log.pageKey,
    poleKey: log.poleKey,
    requestId: canViewSensitiveDetails ? log.requestId : null,
    severity: log.severity,
    stream: log.stream,
    tabKey: log.tabKey,
    targetLoginName,
    targetName,
    targetRole,
    targetSnapshot: {
      displayName: targetName,
      loginName: targetLoginName,
      role: targetRole,
    },
    targetUserId: log.targetUserId,
    userAgent: canViewSensitiveDetails ? log.userAgent : null,
    userId: log.userId,
  };
};

const loadVisibleBatch = async (
  where: Prisma.AuditLogWhereInput,
  take: number,
  canViewSensitiveDetails: boolean,
): Promise<{
  hasMore: boolean;
  logs: JournalLog[];
  records: AuditLogRecord[];
}> => {
  const records = await prisma.auditLog.findMany({
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    select: AUDIT_LOG_SELECT,
    take: take + 1,
    where,
  });
  const visibleRecords = records.slice(0, take);

  return {
    hasMore: records.length > take,
    logs: visibleRecords.map((log) =>
      getVisibleLog(log, canViewSensitiveDetails),
    ),
    records: visibleRecords,
  };
};

const escapeCsvCell = (value: unknown): string => {
  const rawValue = value === null || value === undefined ? '' : String(value);
  const safeValue = /^[=+@-]/.test(rawValue.trimStart())
    ? `'${rawValue}`
    : rawValue;

  return `"${safeValue.replaceAll('"', '""')}"`;
};

const getExportFilters = (query: JournalQuery): Record<string, unknown> => ({
  action: query.action ?? null,
  actorId: query.actorId ?? null,
  category: query.category ?? null,
  connectionAction: query.connectionAction ?? null,
  from: query.from ?? null,
  logType: query.logType,
  outcome: query.outcome ?? null,
  pageKey: query.pageKey ?? null,
  period: query.period,
  poleKey: query.poleKey ?? null,
  search: query.search ?? null,
  severity: query.severity ?? null,
  stream: query.stream ?? null,
  targetUserId: query.targetUserId ?? null,
  to: query.to ?? null,
});

const createExportResponse = (options: {
  canViewSensitiveDetails: boolean;
  format: 'csv' | 'json';
  knownTruncated: boolean;
  onComplete: (summary: {
    rowCount: number;
    truncated: boolean;
  }) => Promise<void>;
  query: JournalQuery;
  snapshotAt: Date;
}): Response => {
  const encoder = new TextEncoder();
  const generatedAt = new Date().toISOString();
  const snapshotAtValue = options.snapshotAt.toISOString();
  const filters = getExportFilters(options.query);
  const baseWhere = buildJournalWhere(options.query, options.snapshotAt, null);
  let exportedRows = 0;
  let position: JournalCursor | null = null;
  let isFirstJsonLog = true;
  let initialized = false;
  let shouldFinalize = false;
  let finished = false;
  let cancelled = false;
  let truncated = options.knownTruncated;

  const finalize = async (
    controller: ReadableStreamDefaultController<Uint8Array>,
  ): Promise<void> => {
    if (finished || cancelled) return;
    finished = true;
    await options.onComplete({ rowCount: exportedRows, truncated });

    if (options.format === 'json') {
      controller.enqueue(
        encoder.encode(
          `],"rowCount":${exportedRows},"truncated":${String(truncated)}}`,
        ),
      );
    }
    controller.close();
  };

  const stream = new ReadableStream<Uint8Array>({
    cancel(): void {
      cancelled = true;
      finished = true;
    },
    async pull(controller): Promise<void> {
      if (finished || cancelled) return;

      try {
        if (!initialized) {
          initialized = true;
          if (options.format === 'csv') {
            controller.enqueue(
              encoder.encode(
                '\ufeffDate;Action;Flux;Résultat;Gravité;Catégorie;Description;Acteur;Identifiant acteur;Compte concerné;Identifiant cible;Pôle;Page;Onglet;Adresse IP;Request ID;Métadonnées\r\n',
              ),
            );
          } else {
            controller.enqueue(
              encoder.encode(
                `${JSON.stringify({
                  filters,
                  generatedAt,
                  maxRows: MAX_EXPORT_ROWS,
                  snapshotAt: snapshotAtValue,
                }).slice(0, -1)},"logs":[`,
              ),
            );
          }

          return;
        }

        if (shouldFinalize) {
          await finalize(controller);

          return;
        }

        const remainingRows = MAX_EXPORT_ROWS - exportedRows;
        if (remainingRows <= 0) {
          truncated = true;
          await finalize(controller);

          return;
        }

        const batchSize = Math.min(EXPORT_BATCH_SIZE, remainingRows);
        const where = position
          ? {
              AND: [
                baseWhere,
                {
                  OR: [
                    { createdAt: { lt: new Date(position.createdAt) } },
                    {
                      createdAt: new Date(position.createdAt),
                      id: { lt: position.id },
                    },
                  ],
                },
              ],
            }
          : baseWhere;
        const batch = await loadVisibleBatch(
          where,
          batchSize,
          options.canViewSensitiveDetails,
        );
        if (cancelled) return;
        if (batch.records.length === 0) {
          await finalize(controller);

          return;
        }

        if (options.format === 'csv') {
          const rows = batch.logs.map((log) =>
            [
              log.createdAt,
              log.action,
              log.stream,
              log.outcome,
              log.severity,
              log.category,
              log.description,
              log.actorName,
              log.actorLoginName,
              log.targetName,
              log.targetLoginName,
              log.poleKey,
              log.pageKey,
              log.tabKey,
              log.ipAddress,
              log.requestId,
              log.metadata ? JSON.stringify(log.metadata) : null,
            ]
              .map(escapeCsvCell)
              .join(';'),
          );
          controller.enqueue(encoder.encode(`${rows.join('\r\n')}\r\n`));
        } else {
          const serializedLogs = batch.logs.map((log) => JSON.stringify(log));
          controller.enqueue(
            encoder.encode(
              `${isFirstJsonLog ? '' : ','}${serializedLogs.join(',')}`,
            ),
          );
          isFirstJsonLog = false;
        }

        exportedRows += batch.records.length;
        const lastRecord = batch.records.at(-1);
        const reachedLimit = exportedRows >= MAX_EXPORT_ROWS;
        truncated = truncated || (reachedLimit && batch.hasMore);
        shouldFinalize = !lastRecord || !batch.hasMore || reachedLimit;

        if (!shouldFinalize && lastRecord) {
          position = {
            createdAt: lastRecord.createdAt.toISOString(),
            filterHash: '',
            id: lastRecord.id,
            snapshotAt: snapshotAtValue,
            v: CURSOR_VERSION,
          };
        }
      } catch (error) {
        finished = true;
        controller.error(error);
      }
    },
  });
  const extension = options.format;
  const contentType =
    options.format === 'csv'
      ? 'text/csv; charset=utf-8'
      : 'application/json; charset=utf-8';
  const date = generatedAt.slice(0, 10);

  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="journal-activite-${date}.${extension}"`,
      'Content-Type': contentType,
      'X-Content-Type-Options': 'nosniff',
      'X-Export-Max-Rows': String(MAX_EXPORT_ROWS),
      'X-Export-Truncated': String(options.knownTruncated),
    },
  });
};

export async function GET(
  request: NextRequest,
): Promise<
  | NextResponse<ApiSuccessResponse<JournalResponse> | ApiErrorResponse>
  | Response
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    const permissionCheck = requirePermission(
      auth.user,
      PERMISSIONS.SYSTEM.AUDIT,
    );
    if (!permissionCheck.success) return permissionCheck.response;

    const parsedQuery = parseJournalQuery(new URL(request.url).searchParams);
    if (!parsedQuery.success) return parsedQuery.response;

    const query = parsedQuery.data;
    const filterHash = getFilterFingerprint(query);
    const cursor = query.cursor ? decodeCursor(query.cursor, filterHash) : null;
    if (query.cursor && !cursor) {
      return apiErrors.badRequest(
        'Curseur invalide ou incompatible avec les filtres actifs',
      );
    }

    const canViewSensitiveDetails =
      auth.user.isProtected ||
      hasPermission(
        auth.user.role,
        PERMISSIONS.SYSTEM.AUDIT_SENSITIVE,
        auth.user.permissions,
      );
    const snapshotAt = getSnapshotAt(query, cursor);

    if (query.format) {
      const exportFormat = query.format;
      const exportCheck = requirePermission(
        auth.user,
        PERMISSIONS.SYSTEM.EXPORTS,
      );
      if (!exportCheck.success) return exportCheck.response;

      const proofCheck = requireRecentSensitiveActionProof(auth.session);
      if (!proofCheck.success) return proofCheck.response;

      const baseWhere = buildJournalWhere(query, snapshotAt, null);
      const [matchingRows, auditRequestContext] = await Promise.all([
        prisma.auditLog.count({ where: baseWhere }),
        getAuditRequestContext(),
      ]);

      return createExportResponse({
        canViewSensitiveDetails,
        format: exportFormat,
        knownTruncated: matchingRows > MAX_EXPORT_ROWS,
        onComplete: async ({ rowCount, truncated }) => {
          await createAuditLog({
            action: AuditAction.AUDIT_EXPORT,
            category: AuditCategory.SYSTEM,
            description: `Export du journal d'activité (${exportFormat.toUpperCase()})`,
            ...auditRequestContext,
            metadata: {
              filters: getExportFilters(query),
              format: exportFormat,
              generatedAt: new Date().toISOString(),
              pageKey: 'activity-journal',
              pageLabel: "Journal d'activité",
              poleKey: 'system',
              poleLabel: 'Système',
              rowCount,
              snapshotAt: snapshotAt.toISOString(),
              tabKey: query.logType,
              tabLabel:
                query.logType === 'connections' ? 'Connexions' : 'Activité',
              truncated,
            },
            targetUserId: null,
            userId: auth.user.id,
          });
        },
        query,
        snapshotAt,
      });
    }

    const where = buildJournalWhere(query, snapshotAt, cursor);
    const batch = await loadVisibleBatch(
      where,
      query.limit,
      canViewSensitiveDetails,
    );
    const lastRecord = batch.records.at(-1);
    const nextCursor =
      batch.hasMore && lastRecord
        ? encodeCursor({
            createdAt: lastRecord.createdAt.toISOString(),
            filterHash,
            id: lastRecord.id,
            snapshotAt: snapshotAt.toISOString(),
            v: CURSOR_VERSION,
          })
        : null;

    return NextResponse.json(
      {
        data: {
          logs: batch.logs,
          nextCursor,
          pageSize: query.limit,
          sensitiveDetailsVisible: canViewSensitiveDetails,
          snapshotAt: snapshotAt.toISOString(),
        },
        success: true,
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return apiErrors.internal('SYSTEM_ACTIVITY_JOURNAL', error, request);
  }
}
