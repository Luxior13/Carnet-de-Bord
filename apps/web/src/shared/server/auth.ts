import 'server-only';

import { sha256 } from '@oslojs/crypto/sha2';
import {
  encodeBase32LowerCaseNoPadding,
  encodeHexLowerCase,
} from '@oslojs/encoding';
import type { Prisma } from '@prisma/client';
import {
  type AuditAction,
  type AuditCategory,
  type User,
  type UserRole,
} from '@repo/database';
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';

import {
  hasPermission,
  normalizePermissionOverrides,
  type PermissionsData,
} from '$constants/permissions.constants';
import { env } from '$env';
import type { ServerAuthResponseType, UserType } from '$types/auth.types';
import { isPasswordWithinBcryptLimit } from '$utils/password.utils';

import { logger } from './logger';
import { prisma } from './prisma';
import { getClientIp, getRequestId, getUserAgent } from './request-context';

export const SESSION_COOKIE_NAME = 'session';
const SESSION_SHORT_DURATION_DAYS = 1;
const SESSION_LONG_DURATION_DAYS = 30;
const SESSION_SHORT_IDLE_DURATION_MINUTES = 30;
const SESSION_LONG_IDLE_DURATION_DAYS = 7;
const SESSION_ACTIVITY_UPDATE_INTERVAL_MINUTES = 1;
const BCRYPT_ROUNDS = 12;
const textEncoder = new TextEncoder();
const LEGACY_PLAINTEXT_SESSION_TOKEN_PATTERN = /^[a-z2-7]{52}$/;

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

type AuditClient = Pick<Prisma.TransactionClient, 'auditLog'>;

type RequiredAuditLogInput = Omit<AuditLogInput, 'ipAddress' | 'userAgent'>;

type AuditWriteOptions = {
  client?: AuditClient;
  required?: boolean;
};

const getRequestContext = async (): Promise<{
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

const hashSessionToken = (token: string): string => {
  return encodeHexLowerCase(sha256(textEncoder.encode(token)));
};

const isLegacyPlaintextSessionToken = (token: string): boolean => {
  return LEGACY_PLAINTEXT_SESSION_TOKEN_PATTERN.test(token);
};

const SESSION_USER_SELECT = {
  contactEmail: true,
  contactEmailVerifiedAt: true,
  createdAt: true,
  failedLoginAttempts: true,
  firstName: true,
  id: true,
  isActive: true,
  isProtected: true,
  lastLoginAt: true,
  lastName: true,
  lockedUntil: true,
  loginName: true,
  mustChangePassword: true,
  passwordChangedAt: true,
  permissions: true,
  role: true,
  securityVersion: true,
} satisfies Prisma.UserSelect;

const SESSION_WITH_USER_SELECT = {
  expiresAt: true,
  idleExpiresAt: true,
  lastSeenAt: true,
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

/**
 * Generates a random temporary password that meets complexity requirements:
 * - At least 8 characters (we use 14)
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character (for extra security)
 */
/* eslint-disable security/detect-object-injection -- Numeric indexes are bounded by internal strings and arrays during crypto-random character selection and shuffle. */
export const generateTemporaryPassword = (): string => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = '!@#$%&*';
  const allChars = lowercase + uppercase + digits + special;

  // Ensure at least one character from each required category
  const getRandomChar = (charset: string): string => {
    const bytes = new Uint8Array(1);
    crypto.getRandomValues(bytes);
    const index = (bytes[0] ?? 0) % charset.length;

    return charset[index] ?? charset[0] ?? 'a';
  };

  const requiredChars = [
    getRandomChar(lowercase),
    getRandomChar(uppercase),
    getRandomChar(digits),
    getRandomChar(special),
  ];

  // Fill the rest with random characters from all categories
  const remainingLength = 10; // Total 14 characters
  const bytes = new Uint8Array(remainingLength);
  crypto.getRandomValues(bytes);
  const randomChars = Array.from(
    bytes,
    (b) => allChars[b % allChars.length] ?? 'a',
  );

  // Combine and shuffle
  const combined = [...requiredChars, ...randomChars];
  const shuffleBytes = new Uint8Array(combined.length);
  crypto.getRandomValues(shuffleBytes);

  // Fisher-Yates shuffle using crypto random
  for (let i = combined.length - 1; i > 0; i--) {
    const j = (shuffleBytes[i] ?? 0) % (i + 1);
    const temp = combined[i];
    combined[i] = combined[j] ?? '';
    combined[j] = temp ?? '';
  }

  return combined.join('');
};
/* eslint-enable security/detect-object-injection */

/**
 * Hashes a password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  if (!isPasswordWithinBcryptLimit(password)) {
    throw new RangeError('Password exceeds bcrypt 72-byte limit');
  }

  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

/**
 * Verifies a password against a hash
 */
export const verifyPassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  if (!isPasswordWithinBcryptLimit(password)) return false;

  return bcrypt.compare(password, hash);
};

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Raised when an authentication operation was started from an obsolete
 * security state. Callers must make the client authenticate again instead of
 * retrying the mutation with the stale session.
 */
export class SecurityVersionMismatchError extends Error {
  constructor() {
    super('User security state changed during authentication');
    this.name = 'SecurityVersionMismatchError';
  }
}

export const isSecurityVersionMismatchError = (
  error: unknown,
): error is SecurityVersionMismatchError =>
  error instanceof SecurityVersionMismatchError;

/**
 * Raised when an administrative password reset targets the protected root
 * account. The root owner can still change their own password through the
 * authenticated password-change flow.
 */
export class ProtectedAccountMutationError extends Error {
  constructor() {
    super('The protected root account cannot be mutated administratively');
    this.name = 'ProtectedAccountMutationError';
  }
}

/**
 * Creates a new session in the database
 */
export const createSession = async (
  token: string,
  userId: string,
  authenticatedSecurityVersion: number,
  rememberMe = false,
  audit?: RequiredAuditLogInput,
): Promise<{
  expiresAt: Date;
  idleExpiresAt: Date;
  lastSeenAt: Date;
  rememberMe: boolean;
  token: string;
}> => {
  const sessionId = hashSessionToken(token);
  const requestContext = await getRequestContext();
  const durationDays = rememberMe
    ? SESSION_LONG_DURATION_DAYS
    : SESSION_SHORT_DURATION_DAYS;
  const loginAt = new Date();
  const expiresAt = new Date(
    loginAt.getTime() + 1000 * 60 * 60 * 24 * durationDays,
  );
  const idleExpiresAt = getIdleExpiration(loginAt, expiresAt, rememberMe);

  // Session creation, last-login state and its success audit must either all
  // commit or all roll back because they describe the same authentication.
  const session = await prisma.$transaction(async (transaction) => {
    // This conditional write both checks and locks the user row. A concurrent
    // password reset or access change therefore either revokes this session
    // after commit, or makes this transaction fail before issuing it.
    const userUpdate = await transaction.user.updateMany({
      data: { lastLoginAt: loginAt },
      where: {
        deletedAt: null,
        id: userId,
        isActive: true,
        securityVersion: authenticatedSecurityVersion,
      },
    });

    if (userUpdate.count !== 1) {
      throw new SecurityVersionMismatchError();
    }

    const createdSession = await transaction.session.create({
      data: {
        expiresAt,
        idleExpiresAt,
        ipAddress: requestContext.ipAddress,
        lastSeenAt: loginAt,
        rememberMe,
        securityVersion: authenticatedSecurityVersion,
        token: sessionId,
        userAgent: requestContext.userAgent,
        userId,
      },
    });

    if (audit) {
      await createAuditLog({ ...audit, ...requestContext }, transaction);
    }

    return createdSession;
  });

  return {
    expiresAt: session.expiresAt,
    idleExpiresAt: session.idleExpiresAt,
    lastSeenAt: session.lastSeenAt,
    rememberMe: session.rememberMe,
    token,
  };
};

/**
 * Validates a session token
 */
const validateSessionToken = async (
  token: string,
): Promise<ServerAuthResponseType> => {
  const hashedToken = hashSessionToken(token);
  let shouldMigrateLegacySession = false;

  let session = await prisma.session.findUnique({
    select: SESSION_WITH_USER_SELECT,
    where: { token: hashedToken },
  });

  if (!session && isLegacyPlaintextSessionToken(token)) {
    session = await prisma.session.findUnique({
      select: SESSION_WITH_USER_SELECT,
      where: { token },
    });
    shouldMigrateLegacySession = Boolean(session);
  }

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

  if (shouldMigrateLegacySession) {
    await prisma.session.updateMany({
      data: { token: hashedToken },
      where: { token: session.token },
    });
    session.token = hashedToken;
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
      expiresAt: session.expiresAt,
      idleExpiresAt: session.idleExpiresAt,
      lastSeenAt: session.lastSeenAt,
      rememberMe: session.rememberMe,
      securityVersion: session.securityVersion,
      token: session.token,
      userId: session.userId,
    },
    user,
  };
};

/**
 * Sets the session token cookie
 */
export const setSessionTokenCookie = async (
  token: string,
  expiresAt: Date,
): Promise<void> => {
  const ck = await cookies();
  ck.set(SESSION_COOKIE_NAME, token, {
    expires: expiresAt,
    httpOnly: true,
    path: '/',
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
  });
};

/**
 * Deletes the session cookie
 */
export const deleteSessionCookie = async (): Promise<void> => {
  const ck = await cookies();
  ck.delete(SESSION_COOKIE_NAME);
};

/**
 * Invalidates a session
 */
export const invalidateSession = async (token: string): Promise<void> => {
  const hashedToken = hashSessionToken(token);

  await prisma.session.deleteMany({
    where: {
      OR: [{ token: hashedToken }, { token }],
    },
  });
};

/**
 * Invalidates all sessions for a user
 */
export const invalidateAllUserSessions = async (
  userId: string,
): Promise<void> => {
  await prisma.session.deleteMany({
    where: { userId },
  });
};

/**
 * Invalidates all sessions for a user except the current one
 */
export const invalidateOtherUserSessions = async (
  userId: string,
  currentSessionToken: string,
): Promise<void> => {
  const hashedCurrentSessionToken = hashSessionToken(currentSessionToken);

  await prisma.session.deleteMany({
    where: {
      token: { notIn: [currentSessionToken, hashedCurrentSessionToken] },
      userId,
    },
  });
};

/**
 * Gets the authenticated session from cookie
 */
export const getAuthSession = async (
  refreshCookie = true,
): Promise<ServerAuthResponseType> => {
  const ck = await cookies();
  const token = ck.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return { session: null, user: null };
  }

  const { session, user } = await validateSessionToken(token);

  if (!session || !user) {
    ck.delete(SESSION_COOKIE_NAME);

    return { session: null, user: null };
  }

  // Check if user is still active
  if (!user.isActive) {
    await invalidateSession(token);
    ck.delete(SESSION_COOKIE_NAME);

    return { session: null, user: null };
  }

  if (refreshCookie) {
    await setSessionTokenCookie(token, session.expiresAt);
  }

  return { session, user };
};

// ============================================
// AUTHENTICATION
// ============================================

// Dummy hash used to prevent timing attacks when user doesn't exist
const DUMMY_HASH =
  '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4/0KjOj7.GWOPkCu';

// Security constants
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MINUTES = 30;

type AuthenticatedUser = Pick<
  User,
  | 'contactEmail'
  | 'contactEmailVerifiedAt'
  | 'createdAt'
  | 'failedLoginAttempts'
  | 'firstName'
  | 'id'
  | 'isActive'
  | 'isProtected'
  | 'lastLoginAt'
  | 'lastName'
  | 'loginName'
  | 'lockedUntil'
  | 'mustChangePassword'
  | 'passwordChangedAt'
  | 'passwordHash'
  | 'permissions'
  | 'role'
  | 'securityVersion'
>;

const AUTHENTICATION_USER_SELECT = {
  contactEmail: true,
  contactEmailVerifiedAt: true,
  createdAt: true,
  failedLoginAttempts: true,
  firstName: true,
  id: true,
  isActive: true,
  isProtected: true,
  lastLoginAt: true,
  lastName: true,
  lockedUntil: true,
  loginName: true,
  mustChangePassword: true,
  passwordChangedAt: true,
  passwordHash: true,
  permissions: true,
  role: true,
  securityVersion: true,
} satisfies Prisma.UserSelect;

/**
 * Authenticates a user with its canonical login name and password
 * Uses constant-time comparison to prevent timing attacks
 * Implements account lockout after MAX_FAILED_ATTEMPTS failures. The
 * protected root account relies on the independent login rate limiter so an
 * unauthenticated attacker cannot persistently mutate or lock the root row.
 */
export const authenticateUser = async (
  loginName: string,
  password: string,
): Promise<
  | { success: true; user: AuthenticatedUser }
  | {
      error: string;
      lockedUntil?: Date;
      remainingAttempts?: number;
      success: false;
      userId?: string;
    }
> => {
  const user = await prisma.user.findUnique({
    select: AUTHENTICATION_USER_SELECT,
    where: { deletedAt: null, loginName: loginName.toLowerCase().trim() },
  });

  // Always perform password verification to prevent timing attacks
  const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
  const isValid = await verifyPassword(password, hashToCompare);

  // User doesn't exist
  if (!user) {
    return { error: 'INVALID_CREDENTIALS', success: false };
  }

  const now = new Date();

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > now) {
    return {
      error: 'ACCOUNT_LOCKED',
      lockedUntil: user.lockedUntil,
      success: false,
      userId: user.id,
    };
  }

  const lockExpired = Boolean(user.lockedUntil && user.lockedUntil <= now);

  // Account is disabled
  if (!user.isActive) {
    return { error: 'ACCOUNT_DISABLED', success: false, userId: user.id };
  }

  // Password is invalid
  if (!isValid) {
    if (user.isProtected) {
      return {
        error: 'INVALID_CREDENTIALS',
        success: false,
        userId: user.id,
      };
    }

    const requestContext = await getRequestContext();
    const updatedLoginState = await prisma.$transaction(async (transaction) => {
      const failedState = await transaction.user.update({
        data: lockExpired
          ? { failedLoginAttempts: 1, lockedUntil: null }
          : { failedLoginAttempts: { increment: 1 } },
        select: { failedLoginAttempts: true },
        where: { id: user.id },
      });

      if (failedState.failedLoginAttempts < MAX_FAILED_ATTEMPTS) {
        return {
          failedLoginAttempts: failedState.failedLoginAttempts,
          lockedUntil: null,
        };
      }

      const lockedUntil = new Date(
        Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000,
      );

      await transaction.user.update({
        data: { lockedUntil },
        where: { id: user.id },
      });

      await createAuditLog(
        {
          action: 'ACCOUNT_LOCKED',
          category: 'AUTH',
          description: `Compte verrouillé après ${MAX_FAILED_ATTEMPTS} tentatives échouées`,
          ...requestContext,
          metadata: {
            pageKey: 'authentication',
            pageLabel: 'Authentification',
            poleKey: 'system',
            poleLabel: 'Système',
            tabKey: 'connections',
            tabLabel: 'Connexions',
          },
          targetUserId: user.id,
          userId: null,
        },
        transaction,
      );

      return {
        failedLoginAttempts: failedState.failedLoginAttempts,
        lockedUntil,
      };
    });
    const newFailedAttempts = updatedLoginState.failedLoginAttempts;
    const remainingAttempts = Math.max(
      0,
      MAX_FAILED_ATTEMPTS - newFailedAttempts,
    );

    if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      return {
        error: 'ACCOUNT_LOCKED',
        lockedUntil: updatedLoginState.lockedUntil ?? undefined,
        success: false,
        userId: user.id,
      };
    }

    return {
      error: 'INVALID_CREDENTIALS',
      remainingAttempts,
      success: false,
      userId: user.id,
    };
  }

  // Success - reset failed attempts
  if (user.failedLoginAttempts > 0 || lockExpired) {
    await prisma.user.update({
      data: { failedLoginAttempts: 0, lockedUntil: null },
      where: { id: user.id },
    });

    return {
      success: true,
      user: { ...user, failedLoginAttempts: 0, lockedUntil: null },
    };
  }

  return { success: true, user };
};

// ============================================
// USER CRUD
// ============================================

/**
 * Creates a new user (admin only)
 */
export const createUser = async (
  data: {
    contactEmail?: string | null;
    firstName: string;
    lastName: string;
    loginName: string;
    password: string;
    role: UserRole;
  },
  auditFactory?: (user: User) => RequiredAuditLogInput,
): Promise<User> => {
  const passwordHash = await hashPassword(data.password);
  const requestContext = auditFactory ? await getRequestContext() : null;
  const normalizedLoginName = data.loginName.toLowerCase().trim();

  return prisma.$transaction(async (transaction) => {
    const user = await transaction.user.create({
      data: {
        contactEmail: data.contactEmail?.toLowerCase().trim() || null,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        loginName: normalizedLoginName,
        mustChangePassword: true,
        passwordHash,
        role: data.role,
      },
    });

    // The reservation is in the same transaction as the user. If this login
    // name belonged to an older identity, its primary-key conflict rolls the
    // user creation back instead of silently recycling the identifier.
    await transaction.loginNameReservation.create({
      data: {
        loginName: normalizedLoginName,
        userId: user.id,
      },
    });

    if (auditFactory && requestContext) {
      await createAuditLog(
        { ...auditFactory(user), ...requestContext },
        transaction,
      );
    }

    return user;
  });
};

type UpdateUserPasswordOptions = {
  audit?: RequiredAuditLogInput;
  currentSessionToken: string;
  expectedSecurityVersion: number;
  rateLimitKey?: string;
};

/**
 * Updates user password
 */
export const updateUserPassword = async (
  userId: string,
  newPassword: string,
  options: UpdateUserPasswordOptions,
): Promise<void> => {
  const passwordHash = await hashPassword(newPassword);
  const requestContext = options.audit ? await getRequestContext() : null;

  await prisma.$transaction(async (transaction) => {
    const userUpdate = await transaction.user.updateMany({
      data: {
        mustChangePassword: false,
        passwordChangedAt: new Date(),
        passwordHash,
        securityVersion: { increment: 1 },
      },
      where: {
        id: userId,
        securityVersion: options.expectedSecurityVersion,
      },
    });

    if (userUpdate.count !== 1) {
      throw new SecurityVersionMismatchError();
    }

    const nextSecurityVersion = options.expectedSecurityVersion + 1;
    const hashedToken = hashSessionToken(options.currentSessionToken);
    const currentSessionTokens = [options.currentSessionToken, hashedToken];
    const currentSessionUpdate = await transaction.session.updateMany({
      data: { securityVersion: nextSecurityVersion },
      where: {
        securityVersion: options.expectedSecurityVersion,
        token: { in: currentSessionTokens },
        userId,
      },
    });

    if (currentSessionUpdate.count !== 1) {
      throw new SecurityVersionMismatchError();
    }

    await transaction.session.deleteMany({
      where: {
        token: { notIn: currentSessionTokens },
        userId,
      },
    });

    if (options.rateLimitKey) {
      await transaction.rateLimit.deleteMany({
        where: { key: options.rateLimitKey },
      });
    }

    if (options.audit && requestContext) {
      await createAuditLog(
        { ...options.audit, ...requestContext },
        transaction,
      );
    }
  });
};

/**
 * Resets user password (generates temp password)
 */
export const resetUserPassword = async (
  userId: string,
  audit?: RequiredAuditLogInput,
): Promise<string> => {
  const tempPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(tempPassword);
  const requestContext = audit ? await getRequestContext() : null;

  await prisma.$transaction(async (transaction) => {
    const userUpdate = await transaction.user.updateMany({
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        mustChangePassword: true,
        passwordChangedAt: null,
        passwordHash,
        securityVersion: { increment: 1 },
      },
      where: { id: userId, isProtected: false },
    });

    if (userUpdate.count !== 1) {
      throw new ProtectedAccountMutationError();
    }

    await transaction.session.deleteMany({
      where: { userId },
    });

    if (audit && requestContext) {
      await createAuditLog({ ...audit, ...requestContext }, transaction);
    }
  });

  return tempPassword;
};

/**
 * Maps server response to client response (removes sensitive data)
 */
export const mapToClientResponse = (
  serverResponse: ServerAuthResponseType,
): UserType | null => {
  if (!serverResponse.user) {
    return null;
  }

  return serverResponse.user;
};

/**
 * Get user by ID
 */
export const getUserById = async (id: string): Promise<User | null> => {
  return prisma.user.findUnique({
    where: { deletedAt: null, id },
  });
};

/**
 * Map User to UserType (client-safe)
 */
type ClientSafeUser = Pick<
  User,
  | 'contactEmail'
  | 'contactEmailVerifiedAt'
  | 'createdAt'
  | 'failedLoginAttempts'
  | 'firstName'
  | 'id'
  | 'isActive'
  | 'isProtected'
  | 'lastLoginAt'
  | 'lastName'
  | 'loginName'
  | 'lockedUntil'
  | 'mustChangePassword'
  | 'passwordChangedAt'
  | 'permissions'
  | 'role'
> &
  Partial<Pick<User, 'updatedAt'>>;

export const mapUserToUserType = (user: ClientSafeUser): UserType => ({
  contactEmail: user.contactEmail,
  contactEmailVerifiedAt: user.contactEmailVerifiedAt,
  createdAt: user.createdAt,
  failedLoginAttempts: user.failedLoginAttempts,
  firstName: user.firstName,
  id: user.id,
  isActive: user.isActive,
  isProtected: user.isProtected,
  lastLoginAt: user.lastLoginAt,
  lastName: user.lastName,
  lockedUntil: user.lockedUntil,
  loginName: user.loginName,
  mustChangePassword: user.mustChangePassword,
  passwordChangedAt: user.passwordChangedAt,
  permissions: normalizePermissionOverrides(
    user.permissions as PermissionsData | null,
  ),
  role: user.role,
  ...(user.updatedAt ? { updatedAt: user.updatedAt } : {}),
});

// ============================================
// PERMISSION CHECKING
// ============================================

/**
 * Checks if user has a specific permission
 */
export const checkUserPermission = (
  user: UserType,
  permissionKey: string,
): boolean => {
  return hasPermission(user.role, permissionKey, user.permissions);
};

// ============================================
// AUDIT LOGGING
// ============================================

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

  return typeof value === 'string' && value.trim().length > 0
    ? value.trim()
    : null;
};

export const createAuditLog = async (
  data: AuditLogInput,
  client: AuditClient = prisma,
): Promise<void> => {
  const metadata = data.requestId
    ? { ...(data.metadata ?? {}), requestId: data.requestId }
    : data.metadata;

  await client.auditLog.create({
    data: {
      action: data.action,
      category: data.category,
      description: data.description,
      ipAddress: data.ipAddress ?? null,
      metadata: metadata as Prisma.InputJsonValue | undefined,
      pageKey: getAuditLocationKey(data.metadata, 'pageKey'),
      poleKey: getAuditLocationKey(data.metadata, 'poleKey'),
      tabKey: getAuditLocationKey(data.metadata, 'tabKey'),
      targetUserId: data.targetUserId ?? null,
      userAgent: data.userAgent ?? null,
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
    const requestContext = await getRequestContext();
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
