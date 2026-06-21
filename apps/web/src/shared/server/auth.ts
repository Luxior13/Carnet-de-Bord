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
  type StaffProfile,
  type User,
  type UserRole,
} from '@repo/database';
import bcrypt from 'bcryptjs';
import { cookies, headers } from 'next/headers';

import {
  hasPermission,
  type PermissionsData,
} from '$constants/permissions.constants';
import { env } from '$env';
import type { ServerAuthResponseType, UserType } from '$types/auth.types';

import { prisma } from './prisma';

export const SESSION_COOKIE_NAME = 'session';
const SESSION_SHORT_DURATION_DAYS = 1;
const SESSION_LONG_DURATION_DAYS = 30;
const SESSION_RENEWAL_THRESHOLD_DAYS = 7;
const BCRYPT_ROUNDS = 12;
const textEncoder = new TextEncoder();

const hashSessionToken = (token: string): string => {
  return encodeHexLowerCase(sha256(textEncoder.encode(token)));
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

/**
 * Hashes a password using bcrypt
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
};

/**
 * Verifies a password against a hash
 */
export const verifyPassword = async (
  password: string,
  hash: string,
): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// ============================================
// SESSION MANAGEMENT
// ============================================

/**
 * Creates a new session in the database
 */
export const createSession = async (
  token: string,
  userId: string,
  rememberMe = false,
): Promise<{ expiresAt: Date; rememberMe: boolean; token: string }> => {
  const sessionId = hashSessionToken(token);
  const headersList = await headers();
  const durationDays = rememberMe
    ? SESSION_LONG_DURATION_DAYS
    : SESSION_SHORT_DURATION_DAYS;

  const session = await prisma.session.create({
    data: {
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * durationDays),
      ipAddress:
        headersList.get('x-forwarded-for') ||
        headersList.get('x-real-ip') ||
        null,
      rememberMe,
      token: sessionId,
      userAgent: headersList.get('user-agent') || null,
      userId,
    },
  });

  // Update last login
  await prisma.user.update({
    data: { lastLoginAt: new Date() },
    where: { id: userId },
  });

  return {
    expiresAt: session.expiresAt,
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

  const session = await prisma.session.findFirst({
    include: {
      user: {
        include: { staffProfile: true },
      },
    },
    where: {
      OR: [{ token: hashedToken }, { token }],
    },
  });

  if (!session || Date.now() >= session.expiresAt.getTime()) {
    if (session) {
      await prisma.session.delete({
        where: { token: session.token },
      });
    }

    return { session: null, user: null };
  }

  // Long sessions renew when they are close to expiring.
  if (
    session.rememberMe &&
    Date.now() >=
      session.expiresAt.getTime() -
        1000 * 60 * 60 * 24 * SESSION_RENEWAL_THRESHOLD_DAYS
  ) {
    session.expiresAt = new Date(
      Date.now() + 1000 * 60 * 60 * 24 * SESSION_LONG_DURATION_DAYS,
    );
    await prisma.session.update({
      data: { expiresAt: session.expiresAt },
      where: { token: session.token },
    });
  }

  const user = mapUserToUserType(session.user);

  return {
    session: {
      expiresAt: session.expiresAt,
      rememberMe: session.rememberMe,
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
  await prisma.session.deleteMany({
    where: {
      NOT: { token: currentSessionToken },
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

/**
 * Authenticates a user with email and password
 * Uses constant-time comparison to prevent timing attacks
 * Implements account lockout after MAX_FAILED_ATTEMPTS failures
 */
export const authenticateUser = async (
  email: string,
  password: string,
): Promise<
  | { success: true; user: User }
  | {
      error: string;
      lockedUntil?: Date;
      remainingAttempts?: number;
      success: false;
      userId?: string;
    }
> => {
  const user = await prisma.user.findUnique({
    where: { deletedAt: null, email: email.toLowerCase().trim() },
  });

  // Always perform password verification to prevent timing attacks
  const hashToCompare = user?.passwordHash ?? DUMMY_HASH;
  const isValid = await verifyPassword(password, hashToCompare);

  // User doesn't exist
  if (!user) {
    return { error: 'INVALID_CREDENTIALS', success: false };
  }

  // Check if account is locked
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    return {
      error: 'ACCOUNT_LOCKED',
      lockedUntil: user.lockedUntil,
      success: false,
      userId: user.id,
    };
  }

  // If lock has expired, reset the counter
  if (user.lockedUntil && user.lockedUntil <= new Date()) {
    await prisma.user.update({
      data: { failedLoginAttempts: 0, lockedUntil: null },
      where: { id: user.id },
    });
  }

  // Account is disabled
  if (!user.isActive) {
    return { error: 'ACCOUNT_DISABLED', success: false, userId: user.id };
  }

  // Password is invalid
  if (!isValid) {
    const newFailedAttempts = user.failedLoginAttempts + 1;
    const remainingAttempts = MAX_FAILED_ATTEMPTS - newFailedAttempts;

    if (newFailedAttempts >= MAX_FAILED_ATTEMPTS) {
      // Lock the account
      const lockedUntil = new Date(
        Date.now() + LOCKOUT_DURATION_MINUTES * 60 * 1000,
      );
      await prisma.user.update({
        data: {
          failedLoginAttempts: newFailedAttempts,
          lockedUntil,
        },
        where: { id: user.id },
      });

      // Log the account lock
      await prisma.auditLog.create({
        data: {
          action: 'ACCOUNT_LOCKED',
          category: 'AUTH',
          description: `Compte verrouillé après ${MAX_FAILED_ATTEMPTS} tentatives échouées`,
          userId: user.id,
        },
      });

      return {
        error: 'ACCOUNT_LOCKED',
        lockedUntil,
        success: false,
        userId: user.id,
      };
    }

    // Increment failed attempts
    await prisma.user.update({
      data: { failedLoginAttempts: newFailedAttempts },
      where: { id: user.id },
    });

    return {
      error: 'INVALID_CREDENTIALS',
      remainingAttempts,
      success: false,
      userId: user.id,
    };
  }

  // Success - reset failed attempts
  if (user.failedLoginAttempts > 0) {
    await prisma.user.update({
      data: { failedLoginAttempts: 0, lockedUntil: null },
      where: { id: user.id },
    });
  }

  return { success: true, user };
};

// ============================================
// USER CRUD
// ============================================

/**
 * Creates a new user (admin only)
 */
export const createUser = async (data: {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: UserRole;
}): Promise<User> => {
  const passwordHash = await hashPassword(data.password);

  return prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      mustChangePassword: true,
      passwordHash,
      role: data.role,
    },
  });
};

/**
 * Updates user password
 */
export const updateUserPassword = async (
  userId: string,
  newPassword: string,
): Promise<void> => {
  const passwordHash = await hashPassword(newPassword);

  await prisma.user.update({
    data: {
      mustChangePassword: false,
      passwordChangedAt: new Date(),
      passwordHash,
    },
    where: { id: userId },
  });
};

/**
 * Resets user password (generates temp password)
 */
export const resetUserPassword = async (userId: string): Promise<string> => {
  const tempPassword = generateTemporaryPassword();
  const passwordHash = await hashPassword(tempPassword);

  await prisma.user.update({
    data: {
      mustChangePassword: true,
      passwordChangedAt: null,
      passwordHash,
    },
    where: { id: userId },
  });

  // Invalidate all sessions
  await invalidateAllUserSessions(userId);

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
type UserWithOptionalStaffProfile = User & {
  staffProfile?: StaffProfile | null;
};

type MapUserOptions = {
  includeStaffInternalNote?: boolean;
};

const mapStaffProfileToClient = (
  staffProfile: StaffProfile | null | undefined,
  options: MapUserOptions = {},
): UserType['staffProfile'] => {
  if (!staffProfile) return null;

  return {
    createdAt: staffProfile.createdAt,
    department: staffProfile.department,
    discordId: staffProfile.discordId,
    displayName: staffProfile.displayName,
    id: staffProfile.id,
    internalNote: options.includeStaffInternalNote
      ? staffProfile.internalNote
      : null,
    jobTitle: staffProfile.jobTitle,
    joinedAt: staffProfile.joinedAt,
    phone: staffProfile.phone,
    timezone: staffProfile.timezone,
    updatedAt: staffProfile.updatedAt,
    userId: staffProfile.userId,
  };
};

export const mapUserToUserType = (
  user: UserWithOptionalStaffProfile,
  options: MapUserOptions = {},
): UserType => ({
  createdAt: user.createdAt,
  email: user.email,
  firstName: user.firstName,
  id: user.id,
  isActive: user.isActive,
  isProtected: user.isProtected,
  lastLoginAt: user.lastLoginAt,
  lastName: user.lastName,
  mustChangePassword: user.mustChangePassword,
  passwordChangedAt: user.passwordChangedAt,
  permissions: user.permissions as PermissionsData | null,
  role: user.role,
  staffProfile: mapStaffProfileToClient(user.staffProfile, options),
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
export const createAuditLog = async (data: {
  action: AuditAction;
  category: AuditCategory;
  description: string;
  ipAddress?: string | null;
  metadata?: Record<string, unknown>;
  userAgent?: string | null;
  userId?: string | null;
}): Promise<void> => {
  await prisma.auditLog.create({
    data: {
      action: data.action,
      category: data.category,
      description: data.description,
      ipAddress: data.ipAddress ?? null,
      metadata: data.metadata as Prisma.InputJsonValue | undefined,
      userAgent: data.userAgent ?? null,
      userId: data.userId ?? null,
    },
  });
};

/**
 * Creates audit log with request headers
 */
export const createAuditLogWithHeaders = async (data: {
  action: AuditAction;
  category: AuditCategory;
  description: string;
  metadata?: Record<string, unknown>;
  userId?: string | null;
}): Promise<void> => {
  const headersList = await headers();

  await createAuditLog({
    ...data,
    ipAddress:
      headersList.get('x-forwarded-for') ||
      headersList.get('x-real-ip') ||
      null,
    userAgent: headersList.get('user-agent') || null,
  });
};
