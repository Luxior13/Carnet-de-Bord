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

import { PARTNER_AUDIT_KEYS } from '../partner.constants';

export const createPartnerAudit = async (
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
    tabKey?: string;
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
      category: AuditCategory.PARTNER,
      description: input.description,
      entityId: input.entityId,
      entityType: PARTNER_AUDIT_KEYS.entityType,
      eventKind: classification.eventKind,
      eventVersion: AUDIT_EVENT_VERSION,
      ipAddress: requestContext.ipAddress,
      metadata: {
        ...FEATURES.partners.audit,
        ...(input.metadata ?? {}),
      } as Prisma.InputJsonValue,
      outcome: classification.outcome,
      pageKey: FEATURES.partners.audit.pageKey,
      poleKey: FEATURES.partners.audit.poleKey,
      requestId: requestContext.requestId,
      severity: classification.severity,
      stream: classification.stream,
      tabKey: input.tabKey ?? null,
      userAgent: requestContext.userAgent,
      userId: input.actor.id,
    },
  });
};
