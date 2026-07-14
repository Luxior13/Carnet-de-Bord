import { AuditAction, AuditCategory } from '@repo/database';
import { NextRequest, NextResponse } from 'next/server';

import { PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors } from '$server/api-response';
import { prisma } from '$server/prisma';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
} from '$types/api.types';

const DEFAULT_LIMIT = 40;
const MAX_LIMIT = 100;

const DATE_RANGES = new Map<string, number>([
  ['24h', 24 * 60 * 60 * 1000],
  ['7d', 7 * 24 * 60 * 60 * 1000],
  ['30d', 30 * 24 * 60 * 60 * 1000],
  ['90d', 90 * 24 * 60 * 60 * 1000],
]);

const AUDIT_ACTIONS = new Set<string>(Object.values(AuditAction));
const AUDIT_CATEGORIES = new Set<string>(Object.values(AuditCategory));
const CONNECTION_ACTIONS: AuditAction[] = [
  AuditAction.ACCOUNT_LOCKED,
  AuditAction.LOGIN_FAILED,
  AuditAction.LOGIN_SUCCESS,
  AuditAction.LOGOUT,
];
const CONNECTION_ACTION_VALUES = new Set<string>(CONNECTION_ACTIONS);
const SAFE_AUDIT_METADATA_KEYS = new Set([
  'pageKey',
  'pageLabel',
  'poleKey',
  'poleLabel',
  'tabKey',
  'tabLabel',
]);

type JournalLog = {
  action: AuditAction;
  actorName: string | null;
  category: AuditCategory;
  createdAt: string;
  description: string;
  id: string;
  ipAddress: string | null;
  metadata: Record<string, unknown> | null;
  targetName: string | null;
  targetUserId: string | null;
  userId: string | null;
};

type JournalResponse = {
  logs: JournalLog[];
  nextCursor: string | null;
  pageSize: number;
};

const clampLimit = (value: string | null): number => {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) return DEFAULT_LIMIT;

  return Math.min(Math.max(Math.floor(parsedValue), 1), MAX_LIMIT);
};

const getEnumFilter = <T extends string>(
  value: string | null,
  allowedValues: Set<string>,
): T | undefined => {
  if (!value || value === 'all') return undefined;

  return allowedValues.has(value) ? (value as T) : undefined;
};

const getDateRangeStart = (value: string | null): Date | undefined => {
  if (!value || value === 'all') return undefined;

  const duration = DATE_RANGES.get(value);

  if (!duration) return undefined;

  return new Date(Date.now() - duration);
};

const getTextFilter = (value: string | null): string | undefined => {
  if (!value || value === 'all') return undefined;

  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : undefined;
};

const getUserName = (
  user:
    | {
        firstName: string;
        lastName: string;
        loginName: string;
      }
    | undefined,
): string | null => {
  if (!user) return null;

  return user.firstName && user.lastName
    ? `${user.firstName} ${user.lastName}`
    : user.loginName;
};

const getVisibleMetadata = (
  metadata: Record<string, unknown> | null,
  canViewSensitiveAudit: boolean,
): Record<string, unknown> | null => {
  if (!metadata || canViewSensitiveAudit) return metadata;

  const safeMetadata = Object.fromEntries(
    Object.entries(metadata).filter(
      ([key, value]) =>
        SAFE_AUDIT_METADATA_KEYS.has(key) &&
        typeof value === 'string' &&
        value.trim().length > 0,
    ),
  );

  return Object.keys(safeMetadata).length > 0 ? safeMetadata : null;
};

export async function GET(
  request: NextRequest,
): Promise<
  NextResponse<ApiSuccessResponse<JournalResponse> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    const permCheck = requirePermission(auth.user, PERMISSIONS.SYSTEM.AUDIT);
    if (!permCheck.success) return permCheck.response;

    const { searchParams } = new URL(request.url);
    const limit = clampLimit(searchParams.get('limit'));
    const cursor = searchParams.get('cursor') || undefined;
    const logType =
      searchParams.get('logType') === 'connections'
        ? 'connections'
        : 'activity';
    const action =
      logType === 'connections'
        ? undefined
        : getEnumFilter<AuditAction>(searchParams.get('action'), AUDIT_ACTIONS);
    const connectionAction =
      logType === 'connections'
        ? getEnumFilter<AuditAction>(
            searchParams.get('connectionAction'),
            CONNECTION_ACTION_VALUES,
          )
        : undefined;
    const category =
      logType === 'connections'
        ? undefined
        : getEnumFilter<AuditCategory>(
            searchParams.get('category'),
            AUDIT_CATEGORIES,
          );
    const createdAfter = getDateRangeStart(searchParams.get('period'));
    const actorId = searchParams.get('actorId') || undefined;
    const pageKey =
      logType === 'connections'
        ? undefined
        : getTextFilter(searchParams.get('pageKey'));
    const poleKey =
      logType === 'connections'
        ? undefined
        : getTextFilter(searchParams.get('poleKey'));
    const targetUserId = searchParams.get('targetUserId') || undefined;
    const canViewSensitiveAudit = auth.user.isProtected;
    const logTypeFilter = action
      ? undefined
      : connectionAction
        ? { action: connectionAction }
        : logType === 'connections'
          ? { action: { in: CONNECTION_ACTIONS } }
          : { action: { notIn: CONNECTION_ACTIONS } };

    const andFilters = [
      action ? { action } : undefined,
      logTypeFilter,
      category ? { category } : undefined,
      createdAfter ? { createdAt: { gte: createdAfter } } : undefined,
      actorId ? { userId: actorId } : undefined,
      poleKey ? { poleKey } : undefined,
      pageKey ? { pageKey } : undefined,
      targetUserId ? { targetUserId } : undefined,
    ].filter((filter): filter is NonNullable<typeof filter> => !!filter);

    const logs = await prisma.auditLog.findMany({
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: {
        action: true,
        category: true,
        createdAt: true,
        description: true,
        id: true,
        ipAddress: true,
        metadata: true,
        targetUserId: true,
        userId: true,
      },
      skip: cursor ? 1 : 0,
      take: limit + 1,
      where: andFilters.length > 0 ? { AND: andFilters } : undefined,
    });

    const visibleLogs = logs.slice(0, limit);
    const userIds = new Set(
      visibleLogs
        .flatMap((log) => [log.userId, log.targetUserId])
        .filter((userId): userId is string => !!userId),
    );
    const users = await prisma.user.findMany({
      select: {
        firstName: true,
        id: true,
        lastName: true,
        loginName: true,
      },
      where: { id: { in: [...userIds] } },
    });
    const usersById = new Map(users.map((user) => [user.id, user]));
    const hasMore = logs.length > limit;
    const lastLog = visibleLogs.at(-1);

    return NextResponse.json(
      {
        data: {
          logs: visibleLogs.map((log) => {
            const metadata = log.metadata as Record<string, unknown> | null;
            const metadataTargetName =
              typeof metadata?.targetName === 'string'
                ? metadata.targetName
                : null;

            return {
              action: log.action,
              actorName: getUserName(
                log.userId ? usersById.get(log.userId) : undefined,
              ),
              category: log.category,
              createdAt: log.createdAt.toISOString(),
              description: log.description,
              id: log.id,
              ipAddress: canViewSensitiveAudit ? log.ipAddress : null,
              metadata: getVisibleMetadata(metadata, canViewSensitiveAudit),
              targetName:
                metadataTargetName ??
                getUserName(
                  log.targetUserId
                    ? usersById.get(log.targetUserId)
                    : undefined,
                ),
              targetUserId: log.targetUserId,
              userId: log.userId,
            };
          }),
          nextCursor: hasMore && lastLog ? lastLog.id : null,
          pageSize: limit,
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
    return apiErrors.internal('SYSTEM_ACTIVITY_JOURNAL', error);
  }
}
