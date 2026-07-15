import type { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';

import { PAGINATION } from '$constants/pagination.constants';
import { PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, parsePagination } from '$server/api-response';
import { prisma } from '$server/prisma';
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
  logs: AuditLogEntry[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  stats: UserAuditStats | null;
};

const SAFE_AUDIT_METADATA_KEYS = new Set([
  'pageKey',
  'pageLabel',
  'poleKey',
  'poleLabel',
  'tabKey',
  'tabLabel',
]);
const ALLOWED_PERIOD_DAYS = new Set([7, 30, 90]);
const AUDIT_EXPORT_BATCH_SIZE = 500;

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

const PUBLIC_AUDIT_DESCRIPTIONS: Record<AuditLogRecord['action'], string> = {
  ACCOUNT_LOCKED: 'Compte verrouillé',
  LOGIN_FAILED: 'Tentative de connexion échouée',
  LOGIN_SUCCESS: 'Connexion réussie',
  LOGOUT: 'Déconnexion',
  MFA_DISABLED: 'Double authentification désactivée',
  MFA_ENABLED: 'Double authentification activée',
  MFA_RECOVERY_CODE_USED: 'Code de secours utilisé',
  MFA_RECOVERY_CODES_REGENERATED: 'Codes de secours renouvelés',
  PASSWORD_CHANGE: 'Mot de passe modifié',
  PASSWORD_RESET: 'Mot de passe réinitialisé',
  PERMISSION_UPDATE: 'Autorisations modifiées',
  SESSION_INVALIDATE: 'Sessions révoquées',
  USER_ACTIVATE: 'Compte activé',
  USER_CREATE: 'Compte utilisateur créé',
  USER_DEACTIVATE: 'Compte désactivé',
  USER_DELETE: 'Compte utilisateur supprimé',
  USER_UPDATE: 'Compte utilisateur modifié',
};

const toAuditMetadata = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  return value as Record<string, unknown>;
};

const getVisibleAuditMetadata = (
  value: unknown,
  canViewFullDetails: boolean,
): Record<string, unknown> | null => {
  const metadata = toAuditMetadata(value);

  if (!metadata || canViewFullDetails) return metadata;

  const safeMetadata = Object.fromEntries(
    Object.entries(metadata).filter(
      ([key, entryValue]) =>
        SAFE_AUDIT_METADATA_KEYS.has(key) &&
        typeof entryValue === 'string' &&
        entryValue.trim().length > 0,
    ),
  );

  return Object.keys(safeMetadata).length > 0 ? safeMetadata : null;
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

const buildAuditWhere = (
  userId: string,
  filters: AuditFilters,
  options: {
    includePage?: boolean;
    includePole?: boolean;
    includeScope?: boolean;
  } = {},
): Prisma.AuditLogWhereInput => {
  const {
    includePage = true,
    includePole = true,
    includeScope = true,
  } = options;
  const userFilter: Prisma.AuditLogWhereInput = {
    OR: [{ userId }, { targetUserId: userId }],
  };
  const additionalFilters: Prisma.AuditLogWhereInput[] = [];

  if (filters.periodDays) {
    additionalFilters.push({
      createdAt: {
        gte: new Date(Date.now() - filters.periodDays * 24 * 60 * 60 * 1000),
      },
    });
  }
  if (includeScope && filters.scope === 'by') {
    additionalFilters.push({ userId });
  }
  if (includeScope && filters.scope === 'on') {
    additionalFilters.push({ targetUserId: userId });
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

const getVisibleAuditLog = (
  log: AuditLogRecord,
  options: {
    isOwnAudit: boolean;
    isProtectedViewer: boolean;
    viewedUserId: string;
  },
): AuditLogEntry => {
  const canViewFullDetails =
    options.isProtectedViewer ||
    (options.isOwnAudit && log.userId === options.viewedUserId);
  const canViewPersonalSecuritySource =
    options.isOwnAudit &&
    log.targetUserId === options.viewedUserId &&
    (log.action === 'LOGIN_FAILED' || log.action === 'ACCOUNT_LOCKED');

  return {
    action: log.action,
    category: log.category,
    createdAt: log.createdAt,
    description: canViewFullDetails
      ? log.description
      : PUBLIC_AUDIT_DESCRIPTIONS[log.action],
    id: log.id,
    ipAddress:
      canViewFullDetails || canViewPersonalSecuritySource
        ? log.ipAddress
        : null,
    metadata: getVisibleAuditMetadata(log.metadata, canViewFullDetails),
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
  const safeValue = /^[=+@-]/.test(rawValue) ? `'${rawValue}` : rawValue;

  return `"${safeValue.replaceAll('"', '""')}"`;
};

const createAuditCsvResponse = (
  where: Prisma.AuditLogWhereInput,
  options: {
    isOwnAudit: boolean;
    isProtectedViewer: boolean;
    viewedUserId: string;
  },
): Response => {
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller): Promise<void> {
      try {
        controller.enqueue(
          encoder.encode(
            '\ufeffDate;Action;Catégorie;Description;Pôle;Page;Onglet;Adresse IP;Acteur;Compte concerné\r\n',
          ),
        );

        let cursor: string | undefined;

        while (true) {
          const logs = await prisma.auditLog.findMany({
            cursor: cursor ? { id: cursor } : undefined,
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: AUDIT_LOG_SELECT,
            skip: cursor ? 1 : 0,
            take: AUDIT_EXPORT_BATCH_SIZE,
            where,
          });

          if (logs.length === 0) break;

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
          cursor = logs.at(-1)?.id;
          if (logs.length < AUDIT_EXPORT_BATCH_SIZE || !cursor) break;
        }

        controller.close();
      } catch (error) {
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
    },
  });
};

const getAuditFacets = async (
  userId: string,
  filters: AuditFilters,
): Promise<AuditFacets> => {
  const scopeFacetWhere = buildAuditWhere(userId, filters, {
    includeScope: false,
  });
  const poleFacetWhere = buildAuditWhere(userId, filters, {
    includePage: false,
    includePole: false,
  });
  const pageFacetWhere = buildAuditWhere(userId, filters, {
    includePage: false,
  });
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
        PERMISSIONS.USERS.EXPORT,
      );
      if (!exportCheck.success) return exportCheck.response;
    }

    const user = await prisma.user.findUnique({
      select: { id: true },
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

    const filters = getAuditFilters(searchParams);
    const whereClause = buildAuditWhere(id, filters);
    const visibilityOptions = {
      isOwnAudit,
      isProtectedViewer: auth.user.isProtected,
      viewedUserId: id,
    };

    if (wantsCsvExport) {
      return createAuditCsvResponse(whereClause, visibilityOptions);
    }

    const {
      limit: pageSize,
      page,
      skip,
    } = parsePagination(searchParams, PAGINATION.DEFAULT_LIMIT, {
      limitParam: 'pageSize',
    });
    const includeLogs = searchParams.get('includeLogs') !== 'false';
    const includeStatsParam = searchParams.get('includeStats');
    const includeStats =
      includeStatsParam === null ? page === 1 : includeStatsParam !== 'false';
    const includeFacets = searchParams.get('includeFacets') === 'true';
    const unfilteredWhere = buildAuditWhere(id, {
      scope: 'all',
    });
    const totalPromise = prisma.auditLog.count({ where: whereClause });
    const hasSelectedFilters =
      filters.scope !== 'all' ||
      filters.periodDays !== undefined ||
      filters.poleKey !== undefined ||
      filters.pageKey !== undefined;
    const overallTotalPromise = includeStats
      ? hasSelectedFilters
        ? prisma.auditLog.count({ where: unfilteredWhere })
        : totalPromise
      : Promise.resolve(0);
    const [total, logs, stats, facets] = await Promise.all([
      totalPromise,
      includeLogs
        ? prisma.auditLog.findMany({
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            select: AUDIT_LOG_SELECT,
            skip,
            take: pageSize,
            where: whereClause,
          })
        : Promise.resolve([]),
      includeStats
        ? Promise.all([
            overallTotalPromise,
            prisma.auditLog.count({
              where: {
                action: 'LOGIN_FAILED',
                OR: [{ targetUserId: id }, { userId: id }],
              },
            }),
            prisma.auditLog.count({
              where: { action: 'LOGIN_SUCCESS', userId: id },
            }),
          ]).then(
            ([totalActions, failedLogins, successfulLogins]) =>
              ({
                failedLogins,
                successfulLogins,
                totalActions,
              }) satisfies UserAuditStats,
          )
        : Promise.resolve(null),
      includeFacets ? getAuditFacets(id, filters) : Promise.resolve(null),
    ]);

    return NextResponse.json(
      {
        data: {
          facets,
          logs: logs.map((log) => getVisibleAuditLog(log, visibilityOptions)),
          pagination: {
            page,
            pageSize,
            total,
            totalPages: Math.ceil(total / pageSize),
          },
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
