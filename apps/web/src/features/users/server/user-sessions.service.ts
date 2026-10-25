import 'server-only';

import type { UserRole } from '@repo/database';

import { FEATURES } from '$constants/feature-registry.constants';
import { PERMISSIONS } from '$constants/permissions.constants';
import { createAuditLogWithHeaders } from '$server/audit-log';
import { prisma } from '$server/prisma';
import { assertRecentSensitiveActionProof } from '$server/sensitive-action';
import { serviceErrors } from '$server/service-error';
import { authorizeUserAction } from '$server/user-action-authorization';
import type { SessionType, UserSessionInfo, UserType } from '$types/auth.types';

type AdminActor = {
  actor: UserType;
  session: SessionType | null;
};

type ManagedTarget = {
  firstName: string;
  id: string;
  isProtected: boolean;
  lastName: string;
  loginName: string;
  role: UserRole;
  securityVersion: number;
};

const USERS_SECURITY_AUDIT_LOCATION = {
  ...FEATURES.users.audit,
  tabKey: 'security',
  tabLabel: 'Sécurité',
} as const;

const PROTECTED_TARGET_MESSAGE =
  'Les sessions du compte racine sont privées et ne peuvent être gérées que depuis Mon compte';

/**
 * Loads the target and refuses, in this order, a missing account, the actor
 * itself, the root and, for a non-root actor, another ADMIN.
 */
const getManagedTarget = async (
  actor: UserType,
  userId: string,
  selfMessage: string,
): Promise<ManagedTarget> => {
  const user = await prisma.user.findUnique({
    select: {
      firstName: true,
      id: true,
      isProtected: true,
      lastName: true,
      loginName: true,
      role: true,
      securityVersion: true,
    },
    where: { deletedAt: null, id: userId },
  });
  if (!user) throw serviceErrors.notFound('Utilisateur non trouvé');
  if (user.id === actor.id) throw serviceErrors.forbidden(selfMessage);
  if (user.isProtected) throw serviceErrors.forbidden(PROTECTED_TARGET_MESSAGE);
  if (user.role === 'ADMIN' && !actor.isProtected)
    throw serviceErrors.forbidden('Ce compte protégé ne peut pas être géré');

  return { ...user, lastName: user.lastName ?? '' };
};

// Every query is bound to the loaded state: a role or security change in
// between makes it match nothing.
const getStableTargetRelationFilter = (
  target: ManagedTarget,
  actorIsProtected: boolean,
): {
  is: {
    deletedAt: null;
    id: string;
    isProtected: false;
    role: UserRole;
    securityVersion: number;
  };
} => ({
  is: {
    deletedAt: null,
    id: target.id,
    isProtected: false,
    role: actorIsProtected ? target.role : 'USER',
    securityVersion: target.securityVersion,
  },
});

/** Current sessions of a managed account; expired ones are purged first. */
export const listManagedSessions = async (
  { actor, session }: AdminActor,
  userId: string,
): Promise<UserSessionInfo[]> => {
  const target = await getManagedTarget(
    actor,
    userId,
    'Gérez vos sessions depuis Mon compte',
  );

  return prisma.$transaction(async (transaction) => {
    const authorized = await authorizeUserAction(
      transaction,
      { actorId: actor.id, session },
      PERMISSIONS.USERS.VIEW_SESSIONS,
      target.id,
    );
    const now = authorized.checkedAt;
    const stableTarget = getStableTargetRelationFilter(
      target,
      authorized.user.isProtected,
    );
    await transaction.session.deleteMany({
      where: {
        OR: [
          { expiresAt: { lte: now } },
          { idleExpiresAt: { lte: now } },
          { securityVersion: { not: target.securityVersion } },
        ],
        user: stableTarget,
        userId: target.id,
      },
    });

    return transaction.session.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        createdAt: true,
        expiresAt: true,
        id: true,
        idleExpiresAt: true,
        ipAddress: true,
        lastSeenAt: true,
        rememberMe: true,
        userAgent: true,
      },
      where: {
        expiresAt: { gt: now },
        idleExpiresAt: { gt: now },
        securityVersion: target.securityVersion,
        user: stableTarget,
        userId: target.id,
      },
    });
  });
};

/**
 * Revokes one session (`sessionId`) or all of them; revoking all advances the
 * target security version. Needs a fresh sensitive-action proof, checked
 * again in the transaction. Returns the number of revoked sessions.
 */
export const revokeManagedSessions = async (
  { actor, session }: AdminActor,
  userId: string,
  sessionId: string | null,
): Promise<number> => {
  const target = await getManagedTarget(
    actor,
    userId,
    'Utilisez Mon compte pour gérer vos sessions',
  );
  assertRecentSensitiveActionProof(session);
  const targetName =
    target.firstName && target.lastName
      ? `${target.firstName} ${target.lastName}`
      : target.loginName;

  return prisma.$transaction(async (transaction) => {
    const authorized = await authorizeUserAction(
      transaction,
      { actorId: actor.id, session },
      PERMISSIONS.USERS.REVOKE_SESSIONS,
      target.id,
    );
    assertRecentSensitiveActionProof(authorized.session);
    const stableTarget = getStableTargetRelationFilter(
      target,
      authorized.user.isProtected,
    );

    if (sessionId) {
      const deleteResult = await transaction.session.deleteMany({
        where: { id: sessionId, user: stableTarget, userId: target.id },
      });
      if (deleteResult.count !== 1) {
        throw serviceErrors.notFound(
          'Session introuvable ou compte modifié depuis le chargement',
        );
      }
      await createAuditLogWithHeaders(
        {
          action: 'SESSION_INVALIDATE',
          category: 'AUTH',
          description: `Session révoquée pour: ${target.loginName}`,
          metadata: {
            revocationScope: 'single',
            revokedSessions: 1,
            sessionId,
            ...USERS_SECURITY_AUDIT_LOCATION,
            targetName,
          },
          targetUserId: target.id,
          userId: actor.id,
        },
        { client: transaction, required: true },
      );

      return 1;
    }

    const targetVersionAdvance = await transaction.user.updateMany({
      data: { securityVersion: { increment: 1 } },
      where: {
        deletedAt: null,
        id: target.id,
        isProtected: false,
        role: authorized.user.isProtected ? target.role : 'USER',
        securityVersion: target.securityVersion,
      },
    });
    if (targetVersionAdvance.count !== 1) {
      throw serviceErrors.conflict(
        'La sécurité ou le rôle de ce compte a changé. Rechargez la fiche avant de réessayer.',
      );
    }
    const deleteResult = await transaction.session.deleteMany({
      where: { userId: target.id },
    });
    await createAuditLogWithHeaders(
      {
        action: 'SESSION_INVALIDATE',
        category: 'AUTH',
        description: `Sessions révoquées pour: ${target.loginName}`,
        metadata: {
          revocationScope: 'all',
          revokedSessions: deleteResult.count,
          ...USERS_SECURITY_AUDIT_LOCATION,
          targetName,
        },
        targetUserId: target.id,
        userId: actor.id,
      },
      { client: transaction, required: true },
    );

    return deleteResult.count;
  });
};
