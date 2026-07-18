import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import type { Prisma } from '@prisma/client';
import { AuditAction, AuditCategory } from '@repo/database';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { FEATURES } from '$constants/feature-registry.constants';
import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { env } from '$env';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, parsePagination } from '$server/api-response';
import {
  getVisibleAuditDescription,
  sanitizeAuditMetadata,
} from '$server/audit-visibility';
import { createAuditLog, getAuditRequestContext } from '$server/auth';
import { prisma } from '$server/prisma';
import { requireRecentSensitiveActionProof } from '$server/sensitive-action';
import { getSystemSettingValue } from '$server/system-settings';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { AuditLogEntry, UserAuditStats } from '$types/auth.types';

type RouteParams = {
  params: Promise<{ id: string }>;
};

type AuditScope = 'all' | 'by' | 'on';

type AuditFilters = {
  pageKey?: string;
  periodDays?: number;
  poleKey?: string;
  scope: AuditScope;
};

type AuditFacet = {
  count: number;
  poleValue?: string | null;
  value: string;
};

type AuditFacets = {
  pages: {
    options: AuditFacet[];
    total: number;
  };
  poles: {
    options: AuditFacet[];
    total: number;
  };
  scopes: Record<AuditScope, number>;
};

type AuditResponse = {
  facets: AuditFacets | null;
  hasMore: boolean;
  logs: AuditLogEntry[];
  nextCursor: string | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number | null;
    totalPages: number | null;
  };
  snapshotAt: string;
  stats: UserAuditStats | null;
};

const ALLOWED_PERIOD_DAYS = new Set([7, 30, 90]);
const AUDIT_EXPORT_BATCH_SIZE = 500;
const AUDIT_EXPORT_MAX_ROWS = 50_000;
const AUDIT_STATS_MAX_COUNT = 100_000;
const AUDIT_CURSOR_MAX_LENGTH = 2_048;
const AUDIT_CURSOR_CLOCK_SKEW_MS = 60_000;
const AUDIT_CURSOR_VERSION = 1 as const;
const AUDIT_CURSOR_SIGNING_KEY = createHash('sha256')
  .update('team-control:user-audit-cursor:v1:', 'utf8')
  .update(Buffer.from(env.MFA_ENCRYPTION_KEY_V1, 'base64'))
  .digest();

const AUDIT_CURSOR_SCHEMA = z
  .object({
    createdAt: z.iso.datetime({ offset: true }),
    filterHash: z.string().length(43),
    id: z.string().trim().min(1).max(191),
    snapshotAt: z.iso.datetime({ offset: true }),
    v: z.literal(AUDIT_CURSOR_VERSION),
  })
  .strict();

type AuditCursor = z.infer<typeof AUDIT_CURSOR_SCHEMA>;

const AUDIT_LOG_SELECT = {
  action: true,
  category: true,
  createdAt: true,
  description: true,
  id: true,
  ipAddress: true,
  metadata: true,
  pageKey: true,
  poleKey: true,
  tabKey: true,
  targetUserId: true,
  userAgent: true,
  userId: true,
} as const satisfies Prisma.AuditLogSelect;

type AuditLogRecord = Prisma.AuditLogGetPayload<{
  select: typeof AUDIT_LOG_SELECT;
}>;

const PROTECTED_ACCOUNT_AUDIT_EXCLUSION: Prisma.AuditLogWhereInput = {
  NOT: [
    { user: { is: { isProtected: true } } },
    { targetUser: { is: { isProtected: true } } },
  ],
};

const getTextFilter = (value: string | null): string | undefined => {
  if (!value || value === 'all') return undefined;

  const normalizedValue = value.trim().slice(0, 100);

  return normalizedValue.length > 0 ? normalizedValue : undefined;
};

const getAuditFilters = (searchParams: URLSearchParams): AuditFilters => {
  const rawPeriodDays = Number(searchParams.get('period'));
  const scopeValue = searchParams.get('scope');

  return {
    pageKey: getTextFilter(searchParams.get('pageKey')),
    periodDays: ALLOWED_PERIOD_DAYS.has(rawPeriodDays)
      ? rawPeriodDays
      : undefined,
    poleKey: getTextFilter(searchParams.get('poleKey')),
    scope:
      scopeValue === 'by' || scopeValue === 'on'
        ? scopeValue
        : ('all' as const),
  };
};

const getAuditFilterFingerprint = (
  viewedUserId: string,
  filters: AuditFilters,
  canViewProtectedAccountEvents: boolean,
): string =>
  createHash('sha256')
    .update(
      JSON.stringify({
        canViewProtectedAccountEvents,
        pageKey: filters.pageKey ?? null,
        periodDays: filters.periodDays ?? null,
        poleKey: filters.poleKey ?? null,
        scope: filters.scope,
        viewedUserId,
      }),
      'utf8',
    )
    .digest('base64url');

const signAuditCursorPayload = (payload: string): string =>
  createHmac('sha256', AUDIT_CURSOR_SIGNING_KEY)
    .update(payload, 'utf8')
    .digest('base64url');

const encodeAuditCursor = (cursor: AuditCursor): string => {
  const payload = Buffer.from(JSON.stringify(cursor), 'utf8').toString(
    'base64url',
  );

  return `${payload}.${signAuditCursorPayload(payload)}`;
};

const decodeAuditCursor = (
  value: string,
  expectedFilterHash: string,
): AuditCursor | null => {
  try {
    if (value.length > AUDIT_CURSOR_MAX_LENGTH) return null;

    const parts = value.split('.');
    if (parts.length !== 2) return null;

    const [payload, suppliedSignature] = parts;
    if (!payload || !suppliedSignature) return null;

    const expectedSignature = signAuditCursorPayload(payload);
    const suppliedBytes = Buffer.from(suppliedSignature, 'base64url');
    const expectedBytes = Buffer.from(expectedSignature, 'base64url');
    if (
      suppliedBytes.length !== expectedBytes.length ||
      !timingSafeEqual(suppliedBytes, expectedBytes)
    ) {
      return null;
    }

    const decoded = Buffer.from(payload, 'base64url').toString('utf8');
    const parsedCursor = AUDIT_CURSOR_SCHEMA.safeParse(JSON.parse(decoded));
    if (
      !parsedCursor.success ||
      parsedCursor.data.filterHash !== expectedFilterHash
    ) {
      return null;
    }

    const createdAt = Date.parse(parsedCursor.data.createdAt);
    const snapshotAt = Date.parse(parsedCursor.data.snapshotAt);
    if (
      createdAt > snapshotAt ||
      snapshotAt > Date.now() + AUDIT_CURSOR_CLOCK_SKEW_MS
    ) {
      return null;
    }

    return parsedCursor.data;
  } catch {
    return null;
  }
};

const buildAuditWhere = (
  userId: string,
  filters: AuditFilters,
  options: {
    canViewProtectedAccountEvents: boolean;
    includePage?: boolean;
    includePole?: boolean;
    includeScope?: boolean;
    snapshotAt?: Date;
  },
): Prisma.AuditLogWhereInput => {
  const {
    includePage = true,
    includePole = true,
    includeScope = true,
  } = options;
  const userFilter: Prisma.AuditLogWhereInput =
    includeScope && filters.scope === 'by'
      ? { userId }
      : includeScope && filters.scope === 'on'
        ? { targetUserId: userId }
        : { OR: [{ userId }, { targetUserId: userId }] };
  const additionalFilters: Prisma.AuditLogWhereInput[] = [];

  if (!options.canViewProtectedAccountEvents) {
    additionalFilters.push(PROTECTED_ACCOUNT_AUDIT_EXCLUSION);
  }

  if (filters.periodDays) {
    additionalFilters.push({
      createdAt: {
        gte: new Date(
          (options.snapshotAt?.getTime() ?? Date.now()) -
            filters.periodDays * 24 * 60 * 60 * 1000,
        ),
      },
    });
  }
  if (includePole && filters.poleKey) {
    additionalFilters.push({ poleKey: filters.poleKey });
  }
  if (includePage && filters.pageKey) {
    additionalFilters.push({ pageKey: filters.pageKey });
  }

  return additionalFilters.length > 0
    ? { AND: [userFilter, ...additionalFilters] }
    : userFilter;
};

const constrainAuditToSnapshot = (
  where: Prisma.AuditLogWhereInput,
  snapshotAt: Date,
): Prisma.AuditLogWhereInput => ({
  AND: [where, { createdAt: { lte: snapshotAt } }],
});

const constrainAuditToCursor = (
  where: Prisma.AuditLogWhereInput,
  cursor: AuditCursor | null,
): Prisma.AuditLogWhereInput => {
  if (!cursor) return where;

  const createdAt = new Date(cursor.createdAt);

  return {
    AND: [
      where,
      {
        OR: [
          { createdAt: { lt: createdAt } },
          { createdAt, id: { lt: cursor.id } },
        ],
      },
    ],
  };
};

const getVisibleAuditLog = (
  log: AuditLogRecord,
  options: {
    canViewSensitiveDetails: boolean;
    isOwnAudit: boolean;
    viewedUserId: string;
  },
): AuditLogEntry => {
  const isOwnPersonalEvent =
    options.isOwnAudit &&
    log.userId === options.viewedUserId &&
    (log.targetUserId === null || log.targetUserId === options.viewedUserId);
  const canViewFullDetails =
    options.canViewSensitiveDetails || isOwnPersonalEvent;
  const canViewPersonalSecuritySource =
    options.isOwnAudit &&
    log.targetUserId === options.viewedUserId &&
    (log.action === 'LOGIN_FAILED' || log.action === 'ACCOUNT_LOCKED');

  return {
    action: log.action,
    category: log.category,
    createdAt: log.createdAt,
    description: getVisibleAuditDescription({
      action: log.action,
      canViewSensitiveDetails: canViewFullDetails,
      category: log.category,
      description: log.description,
    }),
    id: log.id,
    ipAddress:
      canViewFullDetails || canViewPersonalSecuritySource
        ? log.ipAddress
        : null,
    metadata: sanitizeAuditMetadata(log.metadata, canViewFullDetails),
    targetUserId: log.targetUserId,
    userAgent:
      canViewFullDetails || canViewPersonalSecuritySource
        ? log.userAgent
        : null,
    userId: log.userId,
  };
};

const getMetadataText = (
  metadata: Record<string, unknown> | null,
  key: string,
): string | null => {
  const value = Object.entries(metadata ?? {}).find(
    ([entryKey]) => entryKey === key,
  )?.[1];

  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
};

const escapeCsvCell = (value: unknown): string => {
  const rawValue = value === null || value === undefined ? '' : String(value);
  const safeValue = /^[=+@-]/.test(rawValue.trimStart())
    ? `'${rawValue}`
    : rawValue;

  return `"${safeValue.replaceAll('"', '""')}"`;
};

const createAuditCsvResponse = (
  where: Prisma.AuditLogWhereInput,
  options: {
    canViewSensitiveDetails: boolean;
    isOwnAudit: boolean;
    onComplete: (summary: {
      rowCount: number;
      truncated: boolean;
    }) => Promise<void>;
    truncated: boolean;
    viewedUserId: string;
  },
): Response => {
  const encoder = new TextEncoder();
  let cancelled = false;
  let cursor: Pick<AuditLogRecord, 'createdAt' | 'id'> | null = null;
  let exportedRows = 0;
  let finished = false;
  let initialized = false;
  let shouldFinalize = false;
  const stream = new ReadableStream<Uint8Array>({
    cancel(): void {
      cancelled = true;
      finished = true;
    },
    async pull(controller): Promise<void> {
      if (cancelled || finished) return;

      try {
        if (!initialized) {
          initialized = true;
          controller.enqueue(
            encoder.encode(
              '\ufeffDate;Action;Catégorie;Description;Pôle;Page;Onglet;Adresse IP;Acteur;Compte concerné\r\n',
            ),
          );

          return;
        }

        if (shouldFinalize) {
          finished = true;
          await options.onComplete({
            rowCount: exportedRows,
            truncated: options.truncated,
          });
          if (!cancelled) controller.close();

          return;
        }

        const remainingRows = AUDIT_EXPORT_MAX_ROWS - exportedRows;
        if (remainingRows <= 0) {
          shouldFinalize = true;

          return;
        }

        const take = Math.min(AUDIT_EXPORT_BATCH_SIZE, remainingRows);
        const pageWhere: Prisma.AuditLogWhereInput = cursor
          ? {
              AND: [
                where,
                {
                  OR: [
                    { createdAt: { lt: cursor.createdAt } },
                    {
                      createdAt: cursor.createdAt,
                      id: { lt: cursor.id },
                    },
                  ],
                },
              ],
            }
          : where;
        const logs = await prisma.auditLog.findMany({
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          select: AUDIT_LOG_SELECT,
          take,
          where: pageWhere,
        });

        if (cancelled) return;
        if (logs.length === 0) {
          shouldFinalize = true;

          return;
        }

        const rows = logs.map((log) => {
          const visibleLog = getVisibleAuditLog(log, options);
          const poleLabel =
            getMetadataText(visibleLog.metadata, 'poleLabel') ?? log.poleKey;
          const pageLabel =
            getMetadataText(visibleLog.metadata, 'pageLabel') ?? log.pageKey;
          const tabLabel =
            getMetadataText(visibleLog.metadata, 'tabLabel') ?? log.tabKey;

          return [
            visibleLog.createdAt.toISOString(),
            visibleLog.action,
            visibleLog.category,
            visibleLog.description,
            poleLabel,
            pageLabel,
            tabLabel,
            visibleLog.ipAddress,
            visibleLog.userId,
            visibleLog.targetUserId,
          ]
            .map(escapeCsvCell)
            .join(';');
        });

        controller.enqueue(encoder.encode(`${rows.join('\r\n')}\r\n`));
        exportedRows += logs.length;
        cursor = logs.at(-1) ?? null;
        shouldFinalize =
          logs.length < take ||
          !cursor ||
          exportedRows >= AUDIT_EXPORT_MAX_ROWS;
      } catch (error) {
        finished = true;
        controller.error(error);
      }
    },
  });
  const date = new Date().toISOString().slice(0, 10);

  return new Response(stream, {
    headers: {
      'Cache-Control': 'no-store',
      'Content-Disposition': `attachment; filename="activite-utilisateur-${date}.csv"`,
      'Content-Type': 'text/csv; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Export-Max-Rows': String(AUDIT_EXPORT_MAX_ROWS),
      'X-Export-Truncated': String(options.truncated),
    },
  });
};

const getAuditFacets = async (
  userId: string,
  filters: AuditFilters,
  snapshotAt: Date,
  canViewProtectedAccountEvents: boolean,
): Promise<AuditFacets> => {
  const scopeFacetWhere = constrainAuditToSnapshot(
    buildAuditWhere(userId, filters, {
      canViewProtectedAccountEvents,
      includeScope: false,
      snapshotAt,
    }),
    snapshotAt,
  );
  const poleFacetWhere = constrainAuditToSnapshot(
    buildAuditWhere(userId, filters, {
      canViewProtectedAccountEvents,
      includePage: false,
      includePole: false,
      snapshotAt,
    }),
    snapshotAt,
  );
  const pageFacetWhere = constrainAuditToSnapshot(
    buildAuditWhere(userId, filters, {
      canViewProtectedAccountEvents,
      includePage: false,
      snapshotAt,
    }),
    snapshotAt,
  );
  const [
    allScopeCount,
    byScopeCount,
    onScopeCount,
    poleTotal,
    poleGroups,
    pageTotal,
    pageGroups,
  ] = await Promise.all([
    prisma.auditLog.count({ where: scopeFacetWhere }),
    prisma.auditLog.count({
      where: { AND: [scopeFacetWhere, { userId }] },
    }),
    prisma.auditLog.count({
      where: { AND: [scopeFacetWhere, { targetUserId: userId }] },
    }),
    prisma.auditLog.count({ where: poleFacetWhere }),
    prisma.auditLog.groupBy({
      _count: { _all: true },
      by: ['poleKey'],
      orderBy: { poleKey: 'asc' },
      where: { AND: [poleFacetWhere, { poleKey: { not: null } }] },
    }),
    prisma.auditLog.count({ where: pageFacetWhere }),
    prisma.auditLog.groupBy({
      _count: { _all: true },
      by: ['poleKey', 'pageKey'],
      orderBy: [{ poleKey: 'asc' }, { pageKey: 'asc' }],
      where: { AND: [pageFacetWhere, { pageKey: { not: null } }] },
    }),
  ]);

  return {
    pages: {
      options: pageGroups.flatMap((group) =>
        group.pageKey
          ? [
              {
                count: group._count._all,
                poleValue: group.poleKey,
                value: group.pageKey,
              },
            ]
          : [],
      ),
      total: pageTotal,
    },
    poles: {
      options: poleGroups.flatMap((group) =>
        group.poleKey
          ? [{ count: group._count._all, value: group.poleKey }]
          : [],
      ),
      total: poleTotal,
    },
    scopes: {
      all: allScopeCount,
      by: byScopeCount,
      on: onScopeCount,
    },
  };
};

// ============================================
// GET /api/users/[id]/audit - Get user audit logs
// ============================================
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<
  NextResponse<ApiSuccessResponse<AuditResponse> | ApiErrorResponse> | Response
> {
  try {
    const { id } = await params;
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    const isOwnAudit = auth.user.id === id;
    if (isOwnAudit) {
      const ownActivityCheck = requirePermission(
        auth.user,
        PERMISSIONS.ACCOUNT.VIEW_ACTIVITY,
      );
      if (!ownActivityCheck.success) return ownActivityCheck.response;
    } else {
      const permCheck = requirePermission(
        auth.user,
        PERMISSIONS.USERS.VIEW_ACTIVITY,
      );
      if (!permCheck.success) return permCheck.response;
    }

    const { searchParams } = new URL(request.url);
    const wantsCsvExport = searchParams.get('format') === 'csv';

    if (wantsCsvExport && !isOwnAudit) {
      const exportCheck = requirePermission(
        auth.user,
        PERMISSIONS.USERS.EXPORT_ACTIVITY,
      );
      if (!exportCheck.success) return exportCheck.response;
    }

    if (wantsCsvExport) {
      const proofCheck = requireRecentSensitiveActionProof(auth.session);
      if (!proofCheck.success) return proofCheck.response;
    }

    const user = await prisma.user.findUnique({
      select: { id: true, isProtected: true },
      where: { id },
    });

    if (!user) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Utilisateur non trouvé',
          },
          success: false,
        },
        { status: 404 },
      );
    }

    if (user.isProtected && !isOwnAudit) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message:
              "L'activité du compte racine est privée et ne peut être consultée que par son propriétaire",
          },
          success: false,
        },
        { status: 403 },
      );
    }

    const filters = getAuditFilters(searchParams);
    const canViewSensitiveDetails =
      auth.user.isProtected ||
      hasPermission(
        auth.user.role,
        PERMISSIONS.AUDIT.VIEW_SENSITIVE,
        auth.user.permissions,
      );
    const visibilityOptions = {
      canViewSensitiveDetails,
      isOwnAudit,
      viewedUserId: id,
    };
    const canViewProtectedAccountEvents = auth.user.isProtected;

    if (wantsCsvExport) {
      const generatedAt = new Date();
      const exportWhereClause = constrainAuditToSnapshot(
        buildAuditWhere(id, filters, {
          canViewProtectedAccountEvents,
          snapshotAt: generatedAt,
        }),
        generatedAt,
      );
      const rowCount = await prisma.auditLog.count({
        take: AUDIT_EXPORT_MAX_ROWS + 1,
        where: exportWhereClause,
      });
      const truncated = rowCount > AUDIT_EXPORT_MAX_ROWS;
      const auditRequestContext = await getAuditRequestContext();
      const exportFilters = {
        ...(filters.pageKey ? { pageKey: filters.pageKey } : {}),
        ...(filters.periodDays ? { periodDays: filters.periodDays } : {}),
        ...(filters.poleKey ? { poleKey: filters.poleKey } : {}),
        scope: filters.scope,
      };

      await createAuditLog({
        action: AuditAction.AUDIT_EXPORT,
        category: AuditCategory.SYSTEM,
        description:
          "Export du journal d'activité d'un utilisateur demandé (CSV)",
        ...auditRequestContext,
        metadata: {
          filters: exportFilters,
          format: 'csv',
          ...FEATURES.users.audit,
          phase: 'started',
          rowCount: 0,
          snapshotAt: generatedAt.toISOString(),
          tabKey: 'activity',
          tabLabel: 'Activité',
          truncated,
        },
        targetUserId: id,
        userId: auth.user.id,
      });

      return createAuditCsvResponse(exportWhereClause, {
        ...visibilityOptions,
        onComplete: async (summary) => {
          await createAuditLog({
            action: AuditAction.AUDIT_EXPORT,
            category: AuditCategory.SYSTEM,
            description: "Export du journal d'activité d'un utilisateur (CSV)",
            ...auditRequestContext,
            metadata: {
              filters: exportFilters,
              format: 'csv',
              generatedAt: generatedAt.toISOString(),
              ...FEATURES.users.audit,
              phase: 'completed',
              rowCount: summary.rowCount,
              snapshotAt: generatedAt.toISOString(),
              tabKey: 'activity',
              tabLabel: 'Activité',
              truncated: summary.truncated,
            },
            targetUserId: id,
            userId: auth.user.id,
          });
        },
        truncated,
      });
    }

    const defaultPageSize = await getSystemSettingValue('ui.defaultPageSize');
    const { limit: pageSize, page } = parsePagination(
      searchParams,
      defaultPageSize,
      {
        limitParam: 'pageSize',
      },
    );
    const includeLogs = searchParams.get('includeLogs') !== 'false';
    const rawCursor = searchParams.get('cursor');
    const filterHash = getAuditFilterFingerprint(
      id,
      filters,
      canViewProtectedAccountEvents,
    );
    const cursor = rawCursor ? decodeAuditCursor(rawCursor, filterHash) : null;

    if (rawCursor && !cursor) {
      return apiErrors.badRequest('Curseur de pagination invalide');
    }
    if (page > 1 && !cursor) {
      return apiErrors.badRequest(
        'Un curseur est requis pour charger les pages suivantes',
      );
    }
    if (cursor && !includeLogs) {
      return apiErrors.badRequest(
        'Un curseur ne peut pas être utilisé sans charger les événements',
      );
    }

    const snapshotAt = cursor ? new Date(cursor.snapshotAt) : new Date();
    const isInitialPage = cursor === null;
    const includeStatsParam = searchParams.get('includeStats');
    const includeStats =
      isInitialPage &&
      (includeStatsParam === null || includeStatsParam !== 'false');
    const includeFacets =
      isInitialPage && searchParams.get('includeFacets') === 'true';
    const selectedWhere = constrainAuditToSnapshot(
      buildAuditWhere(id, filters, {
        canViewProtectedAccountEvents,
        snapshotAt,
      }),
      snapshotAt,
    );
    const listWhere = constrainAuditToCursor(selectedWhere, cursor);
    const unfilteredWhere = constrainAuditToSnapshot(
      buildAuditWhere(
        id,
        { scope: 'all' },
        { canViewProtectedAccountEvents, snapshotAt },
      ),
      snapshotAt,
    );
    const [fetchedLogs, stats, facets] = await Promise.all([
      includeLogs
        ? prisma.auditLog.findMany({
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: AUDIT_LOG_SELECT,
            take: pageSize + 1,
            where: listWhere,
          })
        : Promise.resolve([]),
      includeStats
        ? Promise.all([
            prisma.auditLog.count({
              take: AUDIT_STATS_MAX_COUNT + 1,
              where: unfilteredWhere,
            }),
            prisma.auditLog.count({
              take: AUDIT_STATS_MAX_COUNT + 1,
              where: { AND: [unfilteredWhere, { action: 'LOGIN_FAILED' }] },
            }),
            prisma.auditLog.count({
              take: AUDIT_STATS_MAX_COUNT + 1,
              where: {
                AND: [unfilteredWhere, { action: 'LOGIN_SUCCESS', userId: id }],
              },
            }),
          ]).then(
            ([totalActions, failedLogins, successfulLogins]) =>
              ({
                failedLogins: Math.min(failedLogins, AUDIT_STATS_MAX_COUNT),
                failedLoginsCapped: failedLogins > AUDIT_STATS_MAX_COUNT,
                successfulLogins: Math.min(
                  successfulLogins,
                  AUDIT_STATS_MAX_COUNT,
                ),
                successfulLoginsCapped:
                  successfulLogins > AUDIT_STATS_MAX_COUNT,
                totalActions: Math.min(totalActions, AUDIT_STATS_MAX_COUNT),
                totalActionsCapped: totalActions > AUDIT_STATS_MAX_COUNT,
              }) satisfies UserAuditStats,
          )
        : Promise.resolve(null),
      includeFacets
        ? getAuditFacets(id, filters, snapshotAt, canViewProtectedAccountEvents)
        : Promise.resolve(null),
    ]);
    const hasMore = includeLogs && fetchedLogs.length > pageSize;
    const logs = hasMore ? fetchedLogs.slice(0, pageSize) : fetchedLogs;
    const lastLog = logs.at(-1);
    const nextCursor =
      hasMore && lastLog
        ? encodeAuditCursor({
            createdAt: lastLog.createdAt.toISOString(),
            filterHash,
            id: lastLog.id,
            snapshotAt: snapshotAt.toISOString(),
            v: AUDIT_CURSOR_VERSION,
          })
        : null;

    return NextResponse.json(
      {
        data: {
          facets,
          hasMore,
          logs: logs.map((log) => getVisibleAuditLog(log, visibilityOptions)),
          nextCursor,
          pagination: {
            page: cursor ? Math.max(page, 2) : 1,
            pageSize,
            total: null,
            totalPages: null,
          },
          snapshotAt: snapshotAt.toISOString(),
          stats,
        },
        success: true,
      },
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    return apiErrors.internal('USER_AUDIT', error);
  }
}
