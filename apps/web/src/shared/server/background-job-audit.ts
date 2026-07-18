import 'server-only';

import type { BackgroundJob, Prisma } from '@prisma/client';
import { AuditAction, AuditCategory } from '@repo/database';

import { FEATURES } from '$constants/feature-registry.constants';
import { createAuditLog } from '$server/auth';

type BackgroundJobAuditClient = Pick<
  Prisma.TransactionClient,
  'auditLog' | 'user'
>;

export type TerminalBackgroundJobFailureReason =
  'handler_error' | 'lease_expired';

export const auditTerminalBackgroundJobFailure = async (
  job: Pick<BackgroundJob, 'attempts' | 'id' | 'maxAttempts' | 'type'>,
  reason: TerminalBackgroundJobFailureReason,
  client: BackgroundJobAuditClient,
): Promise<void> => {
  await createAuditLog(
    {
      action: AuditAction.BACKGROUND_JOB_UPDATE,
      category: AuditCategory.SYSTEM,
      description:
        reason === 'lease_expired'
          ? `Traitement système interrompu puis définitivement expiré : ${job.type}`
          : `Traitement système définitivement échoué : ${job.type}`,
      metadata: {
        attempts: job.attempts,
        jobId: job.id,
        maxAttempts: job.maxAttempts,
        ...FEATURES.systemActivity.audit,
        phase: 'terminal_failure',
        reason,
        status: 'FAILED',
        tabKey: 'activity',
        tabLabel: 'Activité',
        type: job.type,
      },
      targetUserId: null,
      userId: null,
    },
    client,
  );
};
