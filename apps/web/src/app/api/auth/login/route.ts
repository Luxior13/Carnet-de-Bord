import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  normalizePermissionOverrides,
  requiresMfaForAccess,
} from '$constants/permissions.constants';
import { apiErrors, parseJsonBody } from '$server/api-response';
import {
  authenticateUser,
  createAuditLogWithHeaders,
  createSession,
  generateSessionToken,
  isSecurityVersionMismatchError,
  setSessionTokenCookie,
} from '$server/auth';
import { clearMfaChallengeCookie, createMfaChallenge } from '$server/mfa';
import {
  createLoginRateLimitKeys,
  recordSuccessfulLogin,
  reserveLoginRateLimits,
} from '$server/rate-limiter';
import { getClientIp } from '$server/request-context';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { UserType } from '$types/auth.types';
import { isPasswordWithinBcryptLimit } from '$utils/password.utils';
import { loginNameSchema } from '$utils/zod.utils';

const loginSchema = z
  .object({
    loginName: loginNameSchema,
    password: z
      .string()
      .min(1, 'Mot de passe requis')
      .refine(isPasswordWithinBcryptLimit, {
        message: 'Mot de passe trop long',
      }),
    rememberMe: z.boolean().optional().default(false),
  })
  .strict();

const AUTH_CONNECTION_AUDIT_LOCATION = {
  pageKey: 'authentication',
  pageLabel: 'Authentification',
  poleKey: 'system',
  poleLabel: 'Système',
  tabKey: 'connections',
  tabLabel: 'Connexions',
} as const;

type LoginResponseData =
  | {
      challengeExpiresAt: string;
      status: 'mfa_required' | 'mfa_setup_required';
    }
  | {
      mustChangePassword: boolean;
      session: {
        expiresAt: string;
        idleExpiresAt: string;
        lastSeenAt: string;
        rememberMe: boolean;
      };
      status: 'authenticated';
      user: UserType;
    };

async function recordLoginAudit(data: {
  action: 'LOGIN_FAILED' | 'LOGIN_SUCCESS';
  description: string;
  loginName: string;
  reason?: string;
  userId?: string | null;
}): Promise<void> {
  await createAuditLogWithHeaders({
    action: data.action,
    category: 'AUTH',
    description: data.description,
    metadata: {
      loginName: data.loginName,
      ...AUTH_CONNECTION_AUDIT_LOCATION,
      ...(data.reason ? { reason: data.reason } : {}),
    },
    targetUserId: data.userId ?? null,
    // A failed attempt is produced by an unauthenticated source, not by the
    // owner of the account being targeted.
    userId: data.action === 'LOGIN_SUCCESS' ? (data.userId ?? null) : null,
  });
}

export async function POST(
  request: NextRequest,
): Promise<
  NextResponse<ApiSuccessResponse<LoginResponseData> | ApiErrorResponse>
> {
  try {
    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = loginSchema.safeParse(parsedBody.data);

    if (!validation.success) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            details: validation.error.flatten().fieldErrors,
            message: 'Données invalides',
          },
          success: false,
        },
        { status: 400 },
      );
    }

    const { loginName, password, rememberMe } = validation.data;

    // Independent buckets prevent rotating either IPs or login names from
    // providing an unlimited supply of fresh password checks.
    // The account bucket also remains mandatory for the claimed root login:
    // bypassing it before authentication would let a distributed attacker
    // turn rotating source IPs into an unbounded password oracle. The root
    // user row itself is never persistently locked by failed attempts.
    const clientIp = getClientIp(request.headers) ?? 'unknown';
    const rateLimitKeys = createLoginRateLimitKeys(clientIp, loginName);
    const rateLimit = await reserveLoginRateLimits(rateLimitKeys);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.RATE_LIMITED,
            message:
              'Trop de tentatives. Réessayez dans ' +
              Math.ceil((rateLimit.retryAfter || 0) / 60) +
              ' minutes.',
          },
          success: false,
        },
        {
          headers: {
            'Retry-After': String(rateLimit.retryAfter || 1800),
          },
          status: 429,
        },
      );
    }

    const result = await authenticateUser(loginName, password);

    if (!result.success) {
      await recordLoginAudit({
        action: 'LOGIN_FAILED',
        description: `Connexion échouée: ${loginName}`,
        loginName,
        reason: result.error,
        userId: result.userId,
      });

      return NextResponse.json(
        {
          error: {
            // Disabled, locked, unknown and wrong-password accounts share the
            // same public response to prevent account enumeration.
            code: ErrorCode.INVALID_CREDENTIALS,
            message: 'Identifiant ou mot de passe incorrect',
          },
          success: false,
        },
        { status: 401 },
      );
    }

    await recordSuccessfulLogin(rateLimitKeys);

    const hasEnabledMfa = result.user.mfaEnabledAt !== null;
    const hasTotpCredential = result.user.totpCredential !== null;
    const requiresPrivilegedMfa =
      result.user.role === 'ADMIN' ||
      requiresMfaForAccess(
        result.user.role,
        result.user.permissions as Record<string, boolean> | null,
      );
    const canUseLongSession =
      !result.user.isProtected && !requiresPrivilegedMfa;
    const effectiveRememberMe = rememberMe && canUseLongSession;
    const requiresPrivilegedSetup =
      requiresPrivilegedMfa && !hasEnabledMfa && !hasTotpCredential;

    if (requiresPrivilegedSetup || (hasEnabledMfa && hasTotpCredential)) {
      const purpose = requiresPrivilegedSetup ? 'SETUP' : 'LOGIN';
      const challenge = await createMfaChallenge({
        credentialUpdatedAt: result.user.totpCredential?.updatedAt ?? null,
        purpose,
        rememberMe: effectiveRememberMe,
        securityVersion: result.user.securityVersion,
        userId: result.user.id,
      });

      return NextResponse.json({
        data: {
          challengeExpiresAt: challenge.expiresAt.toISOString(),
          status: requiresPrivilegedSetup
            ? ('mfa_setup_required' as const)
            : ('mfa_required' as const),
        },
        success: true,
      });
    }

    // Every half-configured account fails closed. Administrators with both MFA
    // markers absent enter the mandatory bootstrap branch above.
    if (hasEnabledMfa !== hasTotpCredential) {
      await recordLoginAudit({
        action: 'LOGIN_FAILED',
        description: `Connexion interrompue: ${result.user.loginName}`,
        loginName: result.user.loginName,
        reason: 'MFA_STATE_INCONSISTENT',
        userId: result.user.id,
      });

      return NextResponse.json(
        {
          error: {
            code: ErrorCode.INVALID_CREDENTIALS,
            message: 'Identifiant ou mot de passe incorrect',
          },
          success: false,
        },
        { status: 401 },
      );
    }

    await clearMfaChallengeCookie();

    // Create a password-only session only for an ordinary account whose MFA
    // state is consistently disabled.
    const token = generateSessionToken();
    let session;
    try {
      session = await createSession(
        token,
        result.user.id,
        result.user.securityVersion,
        effectiveRememberMe,
        {
          action: 'LOGIN_SUCCESS',
          category: 'AUTH',
          description: `Connexion réussie: ${result.user.loginName}`,
          metadata: {
            loginName: result.user.loginName,
            ...AUTH_CONNECTION_AUDIT_LOCATION,
          },
          targetUserId: result.user.id,
          userId: result.user.id,
        },
      );
    } catch (error) {
      if (!isSecurityVersionMismatchError(error)) throw error;

      await recordLoginAudit({
        action: 'LOGIN_FAILED',
        description: `Connexion interrompue: ${result.user.loginName}`,
        loginName: result.user.loginName,
        reason: 'SECURITY_STATE_CHANGED',
        userId: result.user.id,
      });

      return NextResponse.json(
        {
          error: {
            code: ErrorCode.INVALID_CREDENTIALS,
            message: 'Identifiant ou mot de passe incorrect',
          },
          success: false,
        },
        { status: 401 },
      );
    }
    await setSessionTokenCookie(session.token, session.expiresAt);

    const user: UserType = {
      contactEmail: result.user.contactEmail,
      contactEmailVerifiedAt: result.user.contactEmailVerifiedAt,
      createdAt: result.user.createdAt,
      failedLoginAttempts: result.user.failedLoginAttempts,
      firstName: result.user.firstName,
      id: result.user.id,
      isActive: result.user.isActive,
      isProtected: result.user.isProtected,
      lastLoginAt: result.user.lastLoginAt,
      lastName: result.user.lastName,
      lockedUntil: result.user.lockedUntil,
      loginName: result.user.loginName,
      mfaEnabledAt: result.user.mfaEnabledAt,
      mustChangePassword: result.user.mustChangePassword,
      passwordChangedAt: result.user.passwordChangedAt,
      permissions: normalizePermissionOverrides(
        result.user.permissions as Record<string, boolean> | null,
      ),
      role: result.user.role,
    };

    return NextResponse.json({
      data: {
        mustChangePassword: result.user.mustChangePassword,
        session: {
          expiresAt: session.expiresAt.toISOString(),
          idleExpiresAt: session.idleExpiresAt.toISOString(),
          lastSeenAt: session.lastSeenAt.toISOString(),
          rememberMe: session.rememberMe,
        },
        status: 'authenticated',
        user,
      },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('LOGIN', error, request);
  }
}
