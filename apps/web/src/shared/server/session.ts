import 'server-only';

import { sha256 } from '@oslojs/crypto/sha2';
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from '@oslojs/encoding';
import type { Prisma } from '@prisma/client';
import { type MfaAuthenticationMethod } from '@repo/database';
import { cookies } from 'next/headers';
import { cache } from 'react';

import { PERMISSIONS } from '$constants/permissions.constants';
import { SESSION_COOKIE_NAME } from '$constants/security.constants';
import { env } from '$env';
import type { ServerAuthResponseType, UserType } from '$types/auth.types';

import {
  createAuditLog,
  getAuditRequestContext,
  type RequiredAuditLogInput,
} from './audit-log';
import { SecurityVersionMismatchError } from './auth-errors';
import { prisma } from './prisma';
import { authorizeUserAction } from './user-action-authorization';
import { mapUserToUserType } from './user-projection';

const SESSION_SHORT_DURATION_DAYS = 1;
const SESSION_LONG_DURATION_DAYS = 30;
const SESSION_SHORT_IDLE_DURATION_MINUTES = 30;
const SESSION_LONG_IDLE_DURATION_DAYS = 7;
const SESSION_ACTIVITY_UPDATE_INTERVAL_MINUTES = 1;
const textEncoder = new TextEncoder();

const hashSessionToken = (token: string): string => {
  return encodeHexLowerCase(sha256(textEncoder.encode(token)));
};

const SESSION_USER_SELECT = {
  contactEmail: true,
  contactEmailVerifiedAt: true,
  createdAt: true,
  firstName: true,
  id: true,
  isActive: true,
  isProtected: true,
  lastLoginAt: true,
  lastName: true,
  loginName: true,
  mfaEnabledAt: true,
  mustChangePassword: true,
  passwordChangedAt: true,
  permissions: true,
  role: true,
  securityVersion: true,
  totpCredential: {
    select: { userId: true },
  },
  updatedAt: true,
} satisfies Prisma.UserSelect;

const SESSION_WITH_USER_SELECT = {
  criticalMfaVerifiedAt: true,
  expiresAt: true,
  idleExpiresAt: true,
  lastSeenAt: true,
  mfaMethod: true,
  mfaVerifiedAt: true,
  passwordReauthenticatedAt: true,
  rememberMe: true,
  securityVersion: true,
  token: true,
  user: {
    select: SESSION_USER_SELECT,
  },
  userId: true,
} satisfies Prisma.SessionSelect;

const getSessionIdleDurationMs = (rememberMe: boolean): number => {
  return rememberMe
    ? 1000 * 60 * 60 * 24 * SESSION_LONG_IDLE_DURATION_DAYS
    : 1000 * 60 * SESSION_SHORT_IDLE_DURATION_MINUTES;
};

const getIdleExpiration = (
  activityAt: Date,
  absoluteExpiration: Date,
  rememberMe: boolean,
): Date => {
  return new Date(
    Math.min(
      absoluteExpiration.getTime(),
      activityAt.getTime() + getSessionIdleDurationMs(rememberMe),
    ),
  );
};

// ============================================
// TOKEN & PASSWORD GENERATION
// ============================================

/**
 * Generates a random session token
 */
export const generateSessionToken = (): string => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  return encodeBase32LowerCaseNoPadding(bytes);
};

type CreateSessionSecurityOptions = {
  additionalAudits?: RequiredAuditLogInput[];
  advanceSecurityVersion?: boolean;
  mfaMethod: MfaAuthenticationMethod;
  precondition: (
    transaction: Prisma.TransactionClient,
    authenticatedAt: Date,
  ) => Promise<void>;
  requireMfaEnabled: boolean;
  revokeExistingSessions?: boolean;
  sourceSessionToken?: string;
};

/**
 * Creates a new session in the database
 */
export const createSession = async (
  token: string,
  userId: string,
  authenticatedSecurityVersion: number,
  rememberMe: boolean,
  audit: RequiredAuditLogInput | undefined,
  securityOptions: CreateSessionSecurityOptions,
): Promise<{
  expiresAt: Date;
  idleExpiresAt: Date;
  lastSeenAt: Date;
  rememberMe: boolean;
  token: string;
  user: UserType;
}> => {
  const sessionId = hashSessionToken(token);
  const requestContext = await getAuditRequestContext();
  const durationDays = rememberMe
    ? SESSION_LONG_DURATION_DAYS
    : SESSION_SHORT_DURATION_DAYS;
  const loginAt = new Date();
  const defaultExpiresAt = new Date(
    loginAt.getTime() + 1000 * 60 * 60 * 24 * durationDays,
  );
  const defaultIdleExpiresAt = getIdleExpiration(
    loginAt,
    defaultExpiresAt,
    rememberMe,
  );
  const nextSecurityVersion =
    authenticatedSecurityVersion +
    (securityOptions.advanceSecurityVersion ? 1 : 0);

  if (
    securityOptions.sourceSessionToken &&
    (!securityOptions.advanceSecurityVersion ||
      !securityOptions.revokeExistingSessions)
  ) {
    throw new TypeError(
      'Session replacement requires a version advance and full session revocation',
    );
  }

  // Session creation, last-login state and its success audit must either all
  // commit or all roll back because they describe the same authentication.
  const session = await prisma.$transaction(async (transaction) => {
    if (securityOptions.sourceSessionToken) {
      await authorizeUserAction(
        transaction,
        {
          actorId: userId,
          session: {
            securityVersion: authenticatedSecurityVersion,
            token: securityOptions.sourceSessionToken,
          },
        },
        PERMISSIONS.ACCOUNT.MANAGE_MFA,
      );
    }
    // This conditional write both checks and locks the user row. A concurrent
    // password reset or access change therefore either revokes this session
    // after commit, or makes this transaction fail before issuing it.
    const userUpdate = await transaction.user.updateMany({
      data: {
        ...(securityOptions.sourceSessionToken ? {} : { lastLoginAt: loginAt }),
        ...(securityOptions.advanceSecurityVersion
          ? { securityVersion: { increment: 1 } }
          : {}),
      },
      where: {
        deletedAt: null,
        id: userId,
        isActive: true,
        // A protected recovery account must never receive a persistent
        // session, even if a future caller forwards an unsafe preference.
        ...(rememberMe ? { isProtected: false } : {}),
        ...(securityOptions.requireMfaEnabled
          ? { mfaEnabledAt: { not: null } }
          : {}),
        securityVersion: authenticatedSecurityVersion,
      },
    });

    if (userUpdate.count !== 1) {
      throw new SecurityVersionMismatchError();
    }

    // The conditional write can wait for another transaction's User lock.
    // Check challenge/source-session deadlines after that wait, not against
    // the earlier request time, so expired proofs cannot issue a session.
    const revalidatedAt = new Date();

    let sessionExpiresAt = defaultExpiresAt;
    let sessionIdleExpiresAt = defaultIdleExpiresAt;
    let sessionIpAddress = requestContext.ipAddress;
    let sessionRememberMe = rememberMe;
    let sessionUserAgent = requestContext.userAgent;

    if (securityOptions.sourceSessionToken) {
      const sourceSession = await transaction.session.updateMany({
        data: { lastSeenAt: loginAt },
        where: {
          expiresAt: { gt: revalidatedAt },
          idleExpiresAt: { gt: revalidatedAt },
          rememberMe,
          securityVersion: authenticatedSecurityVersion,
          token: securityOptions.sourceSessionToken,
          userId,
        },
      });
      if (sourceSession.count !== 1) {
        throw new SecurityVersionMismatchError();
      }

      const sourceSessionState = await transaction.session.findUnique({
        select: {
          expiresAt: true,
          idleExpiresAt: true,
          ipAddress: true,
          rememberMe: true,
          userAgent: true,
        },
        where: { token: securityOptions.sourceSessionToken },
      });
      if (!sourceSessionState) {
        throw new SecurityVersionMismatchError();
      }

      sessionExpiresAt = sourceSessionState.expiresAt;
      sessionIdleExpiresAt = sourceSessionState.idleExpiresAt;
      sessionIpAddress = sourceSessionState.ipAddress;
      sessionRememberMe = sourceSessionState.rememberMe;
      sessionUserAgent = sourceSessionState.userAgent;
    }

    await securityOptions.precondition(transaction, revalidatedAt);

    if (securityOptions.revokeExistingSessions) {
      await transaction.session.deleteMany({ where: { userId } });
    }

    const createdSession = await transaction.session.create({
      data: {
        criticalMfaVerifiedAt: null,
        expiresAt: sessionExpiresAt,
        idleExpiresAt: sessionIdleExpiresAt,
        ipAddress: sessionIpAddress,
        lastSeenAt: loginAt,
        mfaMethod: securityOptions.mfaMethod,
        mfaVerifiedAt: loginAt,
        passwordReauthenticatedAt: loginAt,
        rememberMe: sessionRememberMe,
        securityVersion: nextSecurityVersion,
        token: sessionId,
        userAgent: sessionUserAgent,
        userId,
      },
      select: {
        expiresAt: true,
        idleExpiresAt: true,
        lastSeenAt: true,
        rememberMe: true,
        user: { select: SESSION_USER_SELECT },
      },
    });

    if (audit) {
      await createAuditLog({ ...audit, ...requestContext }, transaction);
    }

    for (const additionalAudit of securityOptions.additionalAudits ?? []) {
      await createAuditLog(
        { ...additionalAudit, ...requestContext },
        transaction,
      );
    }

    return createdSession;
  });

  return {
    expiresAt: session.expiresAt,
    idleExpiresAt: session.idleExpiresAt,
    lastSeenAt: session.lastSeenAt,
    rememberMe: session.rememberMe,
    token,
    // lastLoginAt and updatedAt changed inside this transaction. Returning
    // its safe snapshot prevents the caller from reusing the challenge user.
    user: mapUserToUserType(session.user),
  };
};

/**
 * Validates a session token
 */
const validateSessionToken = async (
  token: string,
): Promise<ServerAuthResponseType> => {
  const session = await prisma.session.findUnique({
    select: SESSION_WITH_USER_SELECT,
    where: { token: hashSessionToken(token) },
  });

  if (!session) {
    return { session: null, user: null };
  }

  if (session.securityVersion !== session.user.securityVersion) {
    await prisma.session.deleteMany({
      where: {
        securityVersion: session.securityVersion,
        token: session.token,
      },
    });

    return { session: null, user: null };
  }

  const hasEnabledMfa = session.user.mfaEnabledAt !== null;
  const hasTotpCredential = session.user.totpCredential !== null;

  // MFA is mandatory for every human account. Imported, legacy or corrupted
  // states fail closed, and no password-only session may survive rollout.
  if (
    !hasEnabledMfa ||
    !hasTotpCredential ||
    session.mfaVerifiedAt === null ||
    session.mfaMethod === null ||
    (session.user.isProtected && session.rememberMe)
  ) {
    await prisma.session.deleteMany({
      where: { token: session.token },
    });

    return { session: null, user: null };
  }

  const activityAt = new Date();
  if (
    activityAt.getTime() >= session.expiresAt.getTime() ||
    activityAt.getTime() >= session.idleExpiresAt.getTime()
  ) {
    await prisma.session.deleteMany({
      where: { token: session.token },
    });

    return { session: null, user: null };
  }

  const shouldUpdateActivity =
    activityAt.getTime() - session.lastSeenAt.getTime() >=
    1000 * 60 * SESSION_ACTIVITY_UPDATE_INTERVAL_MINUTES;

  if (shouldUpdateActivity) {
    const activityCutoff = new Date(
      activityAt.getTime() -
        1000 * 60 * SESSION_ACTIVITY_UPDATE_INTERVAL_MINUTES,
    );
    const nextIdleExpiresAt = getIdleExpiration(
      activityAt,
      session.expiresAt,
      session.rememberMe,
    );
    const updateResult = await prisma.session.updateMany({
      data: {
        idleExpiresAt: nextIdleExpiresAt,
        lastSeenAt: activityAt,
      },
      where: {
        expiresAt: { gt: activityAt },
        idleExpiresAt: { gt: activityAt },
        lastSeenAt: { lte: activityCutoff },
        securityVersion: session.securityVersion,
        token: session.token,
      },
    });

    if (updateResult.count > 0) {
      session.idleExpiresAt = nextIdleExpiresAt;
      session.lastSeenAt = activityAt;
    }
  }

  const user = mapUserToUserType(session.user);

  return {
    session: {
      criticalMfaVerifiedAt: session.criticalMfaVerifiedAt,
      expiresAt: session.expiresAt,
      idleExpiresAt: session.idleExpiresAt,
      lastSeenAt: session.lastSeenAt,
      mfaVerifiedAt: session.mfaVerifiedAt,
      passwordReauthenticatedAt: session.passwordReauthenticatedAt,
      rememberMe: session.rememberMe,
      securityVersion: session.securityVersion,
      token: session.token,
      userId: session.userId,
    },
    user,
  };
};

type CookieStore = Awaited<ReturnType<typeof cookies>>;

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  path: '/',
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
} as const;

/**
 * Sets the session token cookie
 */
export const setSessionTokenCookie = async (
  token: string,
  expiresAt: Date,
): Promise<void> => {
  const ck = await cookies();
  ck.set(SESSION_COOKIE_NAME, token, {
    ...SESSION_COOKIE_OPTIONS,
    expires: expiresAt,
  });
};

// A deletion repeats the creation attributes: the browser ignores it for a
// `__Host-` cookie otherwise.
const expireSessionCookie = (ck: CookieStore): void => {
  ck.set(SESSION_COOKIE_NAME, '', {
    ...SESSION_COOKIE_OPTIONS,
    expires: new Date(0),
    maxAge: 0,
  });
};

/**
 * Deletes the session cookie
 */
export const deleteSessionCookie = async (): Promise<void> => {
  expireSessionCookie(await cookies());
};

/**
 * Invalidates the session whose cookie value is `token`.
 */
export const invalidateSession = async (token: string): Promise<void> => {
  await prisma.session.deleteMany({
    where: { token: hashSessionToken(token) },
  });
};

type AuthSessionReadOptions = {
  clearInvalidCookie: boolean;
  refreshCookie: boolean;
};

const readAuthSession = async ({
  clearInvalidCookie,
  refreshCookie,
}: AuthSessionReadOptions): Promise<ServerAuthResponseType> => {
  const ck = await cookies();
  const token = ck.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return { session: null, user: null };
  }

  const { session, user } = await validateSessionToken(token);

  if (!session || !user) {
    if (clearInvalidCookie) expireSessionCookie(ck);

    return { session: null, user: null };
  }

  // Check if user is still active
  if (!user.isActive) {
    await invalidateSession(token);
    if (clearInvalidCookie) expireSessionCookie(ck);

    return { session: null, user: null };
  }

  if (refreshCookie) {
    await setSessionTokenCookie(token, session.expiresAt);
  }

  return { session, user };
};

/**
 * Gets the authenticated session from a route handler. Invalid cookies are
 * cleared and active cookies may be refreshed because route handlers are
 * allowed to mutate response cookies.
 */
export const getAuthSession = async (
  refreshCookie = true,
): Promise<ServerAuthResponseType> =>
  readAuthSession({ clearInvalidCookie: true, refreshCookie });

/**
 * Read-only cookie variant for Server Components and layouts. Next.js does
 * not allow them to mutate cookies, but the database session remains the
 * authoritative source and invalid server-side state is still revoked.
 */
export const getPageAuthSession = cache(
  async (): Promise<ServerAuthResponseType> =>
    readAuthSession({ clearInvalidCookie: false, refreshCookie: false }),
);
