import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrors, parseJsonBody } from '$server/api-response';
import {
  authenticateUser,
  createAuditLogWithHeaders,
  createSession,
  generateSessionToken,
  setSessionTokenCookie,
} from '$server/auth';
import {
  checkRateLimit,
  createRateLimitKey,
  recordLoginAttempt,
} from '$server/rate-limiter';
import { getClientIp } from '$server/request-context';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { UserType } from '$types/auth.types';
import { isPasswordWithinBcryptLimit } from '$utils/password.utils';
import { emailSchema } from '$utils/zod.utils';

const loginSchema = z
  .object({
    email: emailSchema,
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

type LoginResponseData = {
  mustChangePassword: boolean;
  session: {
    expiresAt: string;
    rememberMe: boolean;
  };
  user: UserType;
};

async function recordLoginAudit(data: {
  action: 'LOGIN_FAILED' | 'LOGIN_SUCCESS';
  description: string;
  email: string;
  reason?: string;
  userId?: string | null;
}): Promise<void> {
  await createAuditLogWithHeaders({
    action: data.action,
    category: 'AUTH',
    description: data.description,
    metadata: {
      email: data.email,
      ...AUTH_CONNECTION_AUDIT_LOCATION,
      ...(data.reason ? { reason: data.reason } : {}),
    },
    targetUserId: data.userId ?? null,
    userId: data.userId ?? null,
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

    const { email, password, rememberMe } = validation.data;

    // Rate limiting based on IP + email combination
    const clientIp = getClientIp(request.headers) ?? 'unknown';
    const rateLimitKey = createRateLimitKey(clientIp, email);
    const rateLimit = await checkRateLimit(rateLimitKey);

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

    const result = await authenticateUser(email, password);

    if (!result.success) {
      // Record failed attempt
      await recordLoginAttempt(rateLimitKey, false);
      await recordLoginAudit({
        action: 'LOGIN_FAILED',
        description: `Connexion échouée: ${email}`,
        email,
        reason: result.error,
        userId: result.userId,
      });

      return NextResponse.json(
        {
          error: {
            // Disabled, locked, unknown and wrong-password accounts share the
            // same public response to prevent account enumeration.
            code: ErrorCode.INVALID_CREDENTIALS,
            message: 'Email ou mot de passe incorrect',
          },
          success: false,
        },
        { status: 401 },
      );
    }

    // Record successful attempt (resets counter)
    await recordLoginAttempt(rateLimitKey, true);

    // Create session
    const token = generateSessionToken();
    const canUseLongSession =
      !result.user.isProtected && result.user.role !== 'ADMIN';
    const session = await createSession(
      token,
      result.user.id,
      rememberMe && canUseLongSession,
      {
        action: 'LOGIN_SUCCESS',
        category: 'AUTH',
        description: `Connexion réussie: ${result.user.email}`,
        metadata: {
          email: result.user.email,
          ...AUTH_CONNECTION_AUDIT_LOCATION,
        },
        targetUserId: result.user.id,
        userId: result.user.id,
      },
    );
    await setSessionTokenCookie(session.token, session.expiresAt);

    const user: UserType = {
      createdAt: result.user.createdAt,
      email: result.user.email,
      failedLoginAttempts: result.user.failedLoginAttempts,
      firstName: result.user.firstName,
      id: result.user.id,
      isActive: result.user.isActive,
      isProtected: result.user.isProtected,
      lastLoginAt: result.user.lastLoginAt,
      lastName: result.user.lastName,
      lockedUntil: result.user.lockedUntil,
      mustChangePassword: result.user.mustChangePassword,
      passwordChangedAt: result.user.passwordChangedAt,
      permissions: result.user.permissions as Record<string, boolean> | null,
      role: result.user.role,
    };

    return NextResponse.json({
      data: {
        mustChangePassword: result.user.mustChangePassword,
        session: {
          expiresAt: session.expiresAt.toISOString(),
          rememberMe: session.rememberMe,
        },
        user,
      },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('LOGIN', error, request);
  }
}
