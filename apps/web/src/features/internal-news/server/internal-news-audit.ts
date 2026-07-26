import 'server-only';

import type { AuditAction, Prisma } from '@prisma/client';
import { AuditCategory } from '@repo/database';

import { FEATURES } from '$constants/feature-registry.constants';
import {
  AUDIT_EVENT_VERSION,
  getAuditEventClassification,
} from '$server/audit-event';
import { getAuditRequestContext } from '$server/auth';
import type { UserType } from '$types/auth.types';

const INTERNAL_ANNOUNCEMENT_ENTITY_TYPE = 'InternalAnnouncement';

export const createInternalNewsAudit = async (
  transaction: Prisma.TransactionClient,
  input: {
    action: AuditAction;
    actor: Pick<
      UserType,
      'firstName' | 'id' | 'lastName' | 'loginName' | 'role'
    >;
    description: string;
    entityId: string;
    metadata?: Record<string, unknown>;
  },
): Promise<void> => {
  const requestContext = await getAuditRequestContext().catch(() => ({
    ipAddress: null,
    requestId: null,
    userAgent: null,
  }));
  const classification = getAuditEventClassification(input.action);
  const displayName =
    `${input.actor.firstName.trim()} ${input.actor.lastName.trim()}`.trim() ||
    input.actor.loginName;

  await transaction.auditLog.create({
    data: {
      action: input.action,
      actorDisplayNameSnapshot: displayName,
      actorLoginNameSnapshot: input.actor.loginName,
      actorRoleSnapshot: input.actor.role,
      category: AuditCategory.SYSTEM,
      description: input.description,
      entityId: input.entityId,
      entityType: INTERNAL_ANNOUNCEMENT_ENTITY_TYPE,
      eventKind: classification.eventKind,
      eventVersion: AUDIT_EVENT_VERSION,
      ipAddress: requestContext.ipAddress,
      metadata: {
        ...FEATURES.internalNews.audit,
        ...(input.metadata ?? {}),
      } as Prisma.InputJsonValue,
      outcome: classification.outcome,
      pageKey: FEATURES.internalNews.audit.pageKey,
      poleKey: FEATURES.internalNews.audit.poleKey,
      requestId: requestContext.requestId,
      severity: classification.severity,
      stream: classification.stream,
      userAgent: requestContext.userAgent,
      userId: input.actor.id,
    },
  });
};
