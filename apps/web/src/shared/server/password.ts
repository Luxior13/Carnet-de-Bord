import 'server-only';

import { hash, parseOptions, verify } from '@node-rs/argon2';
import type { Prisma } from '@prisma/client';
import { type User, type UserRole } from '@repo/database';
import bcrypt from 'bcryptjs';

import { PERMISSIONS } from '$constants/permissions.constants';
import { isPasswordWithinLengthLimit } from '$utils/password.utils';

import {
  createAuditLog,
  getAuditRequestContext,
  type RequiredAuditLogInput,
} from './audit-log';
import {
  ProtectedAccountMutationError,
  SecurityVersionMismatchError,
} from './auth-errors';
import { logger } from './logger';
import { prisma } from './prisma';
import { generateTemporaryPassword } from './temporary-password';
import {
  assertUserActionProof,
  authorizeUserAction,
  type UserActionAuthority,
  UserActionAuthorizationError,
} from './user-action-authorization';

// OWASP Password Storage Cheat Sheet: argon2id, 19 MiB, 2 passes, 1 lane.
// The library's algorithm default is argon2id.
const ARGON2_OPTIONS = {
  memoryCost: 19_456,
  parallelism: 1,
  timeCost: 2,
} as const;
const ARGON2ID_PREFIX = '$argon2id$';
// bcrypt read only the first 72 bytes; no stored bcrypt password is longer.
const BCRYPT_MAX_PASSWORD_BYTES = 72;
const textEncoder = new TextEncoder();

/** bcrypt hashes written before 25 October 2026, upgraded at next login. */
const isLegacyBcryptHash = (passwordHash: string): boolean =>
  /^\$2[aby]\$/.test(passwordHash);

/** Hashes a new password with argon2id. */
export const hashPassword = async (password: string): Promise<string> => {
  if (!isPasswordWithinLengthLimit(password)) {
    throw new RangeError('Password exceeds the accepted length');
  }

  return hash(password, ARGON2_OPTIONS);
};

/** Verifies a password against an argon2id or legacy bcrypt hash. */
export const verifyPassword = async (
  password: string,
  passwordHash: string,
): Promise<boolean> => {
  if (!isPasswordWithinLengthLimit(password)) return false;
  if (isLegacyBcryptHash(passwordHash)) {
    return (
      textEncoder.encode(password).byteLength <= BCRYPT_MAX_PASSWORD_BYTES &&
      bcrypt.compare(password, passwordHash)
    );
  }
  if (!passwordHash.startsWith(ARGON2ID_PREFIX)) return false;
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
};

/** True when a stored hash is bcrypt or uses other argon2id parameters. */
const passwordHashNeedsUpgrade = (passwordHash: string): boolean => {
  if (!passwordHash.startsWith(ARGON2ID_PREFIX)) return true;
  try {
    const options = parseOptions(passwordHash);

    return (
      options.memoryCost !== ARGON2_OPTIONS.memoryCost ||
      options.timeCost !== ARGON2_OPTIONS.timeCost ||
      options.parallelism !== ARGON2_OPTIONS.parallelism
    );
  } catch {
    return true;
  }
};

/**
 * Rehashes a just-proved password with the current parameters. Only the hash
 * changes: no security version, date or session is touched, and a concurrent
 * credential change wins because the old hash must still be stored. A failure
 * never blocks the login; the next one retries.
 */
const upgradePasswordHash = async (
  userId: string,
  password: string,
  currentHash: string,
): Promise<void> => {
  if (!passwordHashNeedsUpgrade(currentHash)) return;
  try {
    const upgradedHash = await hashPassword(password);
    // Raw SQL keeps @updatedAt, the optimistic revision of the account,
    // unchanged for an administrator editing it at the same time.
    await prisma.$executeRaw`
      UPDATE "User"
      SET "passwordHash" = ${upgradedHash}
      WHERE "id" = ${userId}
        AND "deletedAt" IS NULL
        AND "passwordHash" = ${currentHash}
    `;
  } catch (error) {
    logger.warn('Password hash upgrade failed', { error, userId });
  }
};

// ============================================
// AUTHENTICATION
// ============================================

// Compared for an unknown login so the response time does not reveal which
// accounts exist; same parameters as a real hash.
const DUMMY_HASH =
  '$argon2id$v=19$m=19456,t=2,p=1$xoNoULLFe7jzncX1uCQ+0Q$Dd+0uOHlFS/xPUbSu/hqIxkm0PoQqoe+Dpfcpx1FIMk';

type AuthenticatedUser = Pick<
  User,
  | 'contactEmail'
  | 'contactEmailVerifiedAt'
  | 'createdAt'
  | 'firstName'
  | 'id'
  | 'isActive'
  | 'isProtected'
  | 'lastLoginAt'
  | 'lastName'
  | 'loginName'
  | 'mfaEnabledAt'
  | 'mustChangePassword'
  | 'passwordChangedAt'
  | 'passwordHash'
  | 'permissions'
  | 'role'
  | 'securityVersion'
> & {
  totpCredential: { updatedAt: Date } | null;
};

const AUTHENTICATION_USER_SELECT = {
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
  passwordHash: true,
  permissions: true,
  role: true,
  securityVersion: true,
  totpCredential: {
    select: { updatedAt: true },
  },
} satisfies Prisma.UserSelect;

/**
 * Authenticates a user with its canonical login name and password. The hash is
 * always compared, even for an unknown login, so timing does not reveal which
 * accounts exist. Repeated failures are bounded by the shared login rate
 * limiter (IP, login and IP + login buckets), never by a per-account lock that
 * anyone knowing the login name could keep closed.
 */
export const authenticateUser = async (
  loginName: string,
  password: string,
): Promise<
  | { success: true; user: AuthenticatedUser }
  | {
      error: 'ACCOUNT_DISABLED' | 'INVALID_CREDENTIALS';
      success: false;
      userId?: string;
    }
> => {
  const user = await prisma.user.findUnique({
    select: AUTHENTICATION_USER_SELECT,
    where: { deletedAt: null, loginName: loginName.toLowerCase().trim() },
  });
  const isValid = await verifyPassword(
    password,
    user?.passwordHash ?? DUMMY_HASH,
  );

  if (!user) return { error: 'INVALID_CREDENTIALS', success: false };
  if (!user.isActive) {
    return { error: 'ACCOUNT_DISABLED', success: false, userId: user.id };
  }
  if (!isValid) {
    return { error: 'INVALID_CREDENTIALS', success: false, userId: user.id };
  }
  await upgradePasswordHash(user.id, password, user.passwordHash);

  return { success: true, user };
};

// ============================================
// USER CRUD
// ============================================

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
  const requestContext = options.audit ? await getAuditRequestContext() : null;

  await prisma.$transaction(async (transaction) => {
    try {
      await authorizeUserAction(
        transaction,
        {
          actorId: userId,
          session: {
            securityVersion: options.expectedSecurityVersion,
            token: options.currentSessionToken,
          },
        },
        PERMISSIONS.ACCOUNT.CHANGE_PASSWORD,
        userId,
        { allowPasswordChangeRequired: true },
      );
    } catch (error) {
      if (error instanceof UserActionAuthorizationError && error.status === 401)
        throw new SecurityVersionMismatchError();
      throw error;
    }
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
    const currentSessionUpdate = await transaction.session.updateMany({
      data: {
        criticalMfaVerifiedAt: null,
        passwordReauthenticatedAt: null,
        securityVersion: nextSecurityVersion,
      },
      where: {
        securityVersion: options.expectedSecurityVersion,
        token: options.currentSessionToken,
        userId,
      },
    });

    if (currentSessionUpdate.count !== 1) {
      throw new SecurityVersionMismatchError();
    }

    await transaction.session.deleteMany({
      where: {
        token: { not: options.currentSessionToken },
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
  audit: RequiredAuditLogInput,
  options: {
    authority: UserActionAuthority;
    expectedRole?: UserRole;
    expectedSecurityVersion?: number;
    expectedUpdatedAt?: Date;
  },
): Promise<string> => {
  const tempPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(tempPassword);
  const requestContext = audit ? await getAuditRequestContext() : null;

  await prisma.$transaction(async (transaction) => {
    const authorized = await authorizeUserAction(
      transaction,
      options.authority,
      PERMISSIONS.USERS.RESET_PASSWORD,
      userId,
    );
    assertUserActionProof(authorized, 'sensitive');
    const userUpdate = await transaction.user.updateMany({
      data: {
        mustChangePassword: true,
        passwordChangedAt: null,
        passwordHash,
        securityVersion: { increment: 1 },
      },
      where: {
        id: userId,
        isProtected: false,
        ...(options.expectedRole ? { role: options.expectedRole } : {}),
        ...(options.expectedSecurityVersion === undefined
          ? {}
          : { securityVersion: options.expectedSecurityVersion }),
        ...(options.expectedUpdatedAt
          ? { updatedAt: options.expectedUpdatedAt }
          : {}),
      },
    });

    if (userUpdate.count !== 1) {
      if (
        options.expectedRole ||
        options.expectedSecurityVersion !== undefined ||
        options.expectedUpdatedAt
      ) {
        throw new SecurityVersionMismatchError();
      }

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
