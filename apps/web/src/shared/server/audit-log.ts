import 'server-only';

import type { Prisma } from '@prisma/client';
import { type AuditAction, type AuditCategory } from '@repo/database';
import { headers } from 'next/headers';

import {
  AUDIT_EVENT_VERSION,
  getAuditEventClassification,
  toAuditIdentitySnapshot,
} from './audit-event';
import { logger } from './logger';
import { prisma } from './prisma';
import { getClientIp, getRequestId, getUserAgent } from './request-context';

export type AuditLogInput = {
  action: AuditAction;
  category: AuditCategory;
  description: string;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
  requestId?: string | null;
  targetUserId?: string | null;
  userAgent?: string | null;
  userId?: string | null;
};

type AuditClient = {
  auditLog: Pick<Prisma.TransactionClient['auditLog'], 'create'>;
  user: Pick<Prisma.TransactionClient['user'], 'findMany'>;
};

export type RequiredAuditLogInput = Omit<
  AuditLogInput,
  'ipAddress' | 'userAgent'
>;

type AuditWriteOptions = {
  client?: AuditClient;
  required?: boolean;
};

export const getAuditRequestContext = async (): Promise<{
  ipAddress: string | null;
  requestId: string | null;
  userAgent: string | null;
}> => {
  const headersList = await headers();

  return {
    ipAddress: getClientIp(headersList),
    requestId: getRequestId(headersList),
    userAgent: getUserAgent(headersList),
  };
};

// ============================================
// AUDIT LOGGING
// ============================================

const AUDIT_DESCRIPTION_MAX_BYTES = 4 * 1024;
const AUDIT_METADATA_MAX_BYTES = 64 * 1024;
const AUDIT_LOCATION_KEY_MAX_LENGTH = 100;
const AUDIT_LOCATION_KEY_PATTERN = /^[a-z0-9][a-z0-9._/-]*$/;
const AUDIT_IP_ADDRESS_MAX_LENGTH = 64;
const AUDIT_REQUEST_ID_MAX_LENGTH = 191;
const AUDIT_USER_AGENT_MAX_LENGTH = 1_024;

const validateAuditDescription = (description: string): string => {
  if (
    description.trim().length === 0 ||
    Buffer.byteLength(description, 'utf8') > AUDIT_DESCRIPTION_MAX_BYTES
  ) {
    throw new RangeError('Audit description is empty or too large');
  }

  return description;
};

const validateAuditMetadataSize = (
  metadata: Record<string, unknown> | undefined,
): void => {
  if (!metadata) return;

  const serializedMetadata = JSON.stringify(metadata);
  if (
    !serializedMetadata ||
    Buffer.byteLength(serializedMetadata, 'utf8') > AUDIT_METADATA_MAX_BYTES
  ) {
    throw new RangeError('Audit metadata exceeds the 64 KiB limit');
  }
};

/**
 * Creates an audit log entry
 */
const getAuditLocationKey = (
  metadata: Record<string, unknown> | undefined,
  key: 'pageKey' | 'poleKey' | 'tabKey',
): string | null => {
  const value = Object.entries(metadata ?? {}).find(
    ([entryKey]) => entryKey === key,
  )?.[1];

  if (typeof value !== 'string' || value.trim().length === 0) return null;

  const normalizedValue = value.trim();
  if (
    normalizedValue.length > AUDIT_LOCATION_KEY_MAX_LENGTH ||
    !AUDIT_LOCATION_KEY_PATTERN.test(normalizedValue)
  ) {
    throw new RangeError(`Invalid audit location key: ${key}`);
  }

  return normalizedValue;
};

const AUDIT_SNAPSHOT_USER_SELECT = {
  firstName: true,
  id: true,
  lastName: true,
  loginName: true,
  role: true,
} as const satisfies Prisma.UserSelect;

const getAuditIdentitySnapshots = async (
  data: Pick<AuditLogInput, 'targetUserId' | 'userId'>,
  client: AuditClient,
): Promise<{
  actor: ReturnType<typeof toAuditIdentitySnapshot> | null;
  target: ReturnType<typeof toAuditIdentitySnapshot> | null;
}> => {
  const userIds = [
    ...new Set([data.userId, data.targetUserId].filter(Boolean)),
  ] as string[];

  if (userIds.length === 0) return { actor: null, target: null };

  const users = await client.user.findMany({
    select: AUDIT_SNAPSHOT_USER_SELECT,
    where: { id: { in: userIds } },
  });
  const snapshotsById = new Map(
    users.map((user) => [
      user.id,
      toAuditIdentitySnapshot({ ...user, lastName: user.lastName ?? '' }),
    ]),
  );

  return {
    actor: data.userId ? (snapshotsById.get(data.userId) ?? null) : null,
    target: data.targetUserId
      ? (snapshotsById.get(data.targetUserId) ?? null)
      : null,
  };
};

export const createAuditLog = async (
  data: AuditLogInput,
  client: AuditClient = prisma,
): Promise<void> => {
  const classification = getAuditEventClassification(data.action);
  const requestId = data.requestId?.slice(0, AUDIT_REQUEST_ID_MAX_LENGTH);
  const metadata = requestId
    ? { ...(data.metadata ?? {}), requestId }
    : data.metadata;
  const description = validateAuditDescription(data.description);
  const pageKey = getAuditLocationKey(data.metadata, 'pageKey');
  const poleKey = getAuditLocationKey(data.metadata, 'poleKey');
  const tabKey = getAuditLocationKey(data.metadata, 'tabKey');
  validateAuditMetadataSize(metadata);
  const snapshots = await getAuditIdentitySnapshots(data, client);

  await client.auditLog.create({
    data: {
      action: data.action,
      actorDisplayNameSnapshot: snapshots.actor?.displayName ?? null,
      actorLoginNameSnapshot: snapshots.actor?.loginName ?? null,
      actorRoleSnapshot: snapshots.actor?.role ?? null,
      category: data.category,
      description,
      eventKind: classification.eventKind,
      eventVersion: AUDIT_EVENT_VERSION,
      ipAddress: data.ipAddress?.slice(0, AUDIT_IP_ADDRESS_MAX_LENGTH) ?? null,
      metadata: metadata as Prisma.InputJsonValue | undefined,
      outcome: classification.outcome,
      pageKey,
      poleKey,
      requestId: requestId ?? null,
      severity: classification.severity,
      stream: classification.stream,
      tabKey,
      targetDisplayNameSnapshot: snapshots.target?.displayName ?? null,
      targetLoginNameSnapshot: snapshots.target?.loginName ?? null,
      targetRoleSnapshot: snapshots.target?.role ?? null,
      targetUserId: data.targetUserId ?? null,
      userAgent: data.userAgent?.slice(0, AUDIT_USER_AGENT_MAX_LENGTH) ?? null,
      userId: data.userId ?? null,
    },
  });
};

/**
 * Creates audit log with request headers
 */
export const createAuditLogWithHeaders = async (
  data: RequiredAuditLogInput,
  options: AuditWriteOptions = {},
): Promise<void> => {
  let requestId: string | undefined;

  try {
    const requestContext = await getAuditRequestContext();
    requestId = requestContext.requestId ?? undefined;

    await createAuditLog(
      { ...data, ...requestContext },
      options.client ?? prisma,
    );
  } catch (error) {
    logger.error('Audit log error', {
      action: data.action,
      error,
      metadata: {
        category: data.category,
        targetUserId: data.targetUserId ?? null,
      },
      requestId,
      userId: data.userId ?? undefined,
    });

    // Mutations that share the same database pass their transaction client
    // and require the audit write. Rethrowing makes Prisma roll back both.
    if (options.required) throw error;
  }
};
