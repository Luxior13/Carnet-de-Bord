import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  authenticateUser,
  createAuditLogWithHeaders,
  createSession,
  generateSessionToken,
  setSessionTokenCookie,
} from '$server/auth';
import { logger } from '$server/logger';
import {
  checkRateLimit,
  createRateLimitKey,
  recordLoginAttempt,
} from '$server/rate-limiter';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { UserType } from '$types/auth.types';
import { emailSchema, trimmedString } from '$utils/zod.utils';

const loginSchema = z.object({
  email: emailSchema,
  password: trimmedString.pipe(z.string().min(1, 'Mot de passe requis')),
  rememberMe: z.boolean().optional().default(false),
});

type LoginResponseData = {
  mustChangePassword: boolean;
  session: {
    expiresAt: string;
    rememberMe: boolean;
  };
  user: UserType;
};

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const firstIp = forwarded.split(',')[0];
    if (firstIp) return firstIp.trim();
  }

  return request.headers.get('x-real-ip') || 'unknown';
}

async function recordLoginAudit(data: {
  action: 'LOGIN_FAILED' | 'LOGIN_SUCCESS';
  description: string;
  email: string;
  reason?: string;
  userId?: string | null;
}): Promise<void> {
  try {
    await createAuditLogWithHeaders({
      action: data.action,
      category: 'AUTH',
      description: data.description,
      metadata: {
        email: data.email,
        ...(data.reason ? { reason: data.reason } : {}),
      },
      userId: data.userId ?? null,
    });
  } catch (error) {
    logger.error('Login audit error', {
      action: data.action,
      error,
      metadata: { email: data.email },
      userId: data.userId ?? undefined,
    });
  }
}

export async function POST(
  request: NextRequest,
): Promise<
  NextResponse<ApiSuccessResponse<LoginResponseData> | ApiErrorResponse>
> {
  try {
    const body = await request.json();
    const validation = loginSchema.safeParse(body);

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
    const clientIp = getClientIp(request);
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
        description: `Connexion echouee: ${email}`,
        email,
        reason: result.error,
        userId: result.userId,
      });

      // Handle account locked
      if (result.error === 'ACCOUNT_LOCKED' && result.lockedUntil) {
        const minutesLeft = Math.ceil(
          (result.lockedUntil.getTime() - Date.now()) / 60000,
        );

        return NextResponse.json(
          {
            error: {
              code: ErrorCode.ACCOUNT_LOCKED,
              message: `Compte verrouillé. Réessayez dans ${minutesLeft} minute${minutesLeft > 1 ? 's' : ''}.`,
            },
            success: false,
          },
          { status: 423 },
        );
      }

      const errorMap: Record<
        string,
        { code: ErrorCode; message: string; status: number }
      > = {
        ACCOUNT_DISABLED: {
          code: ErrorCode.ACCOUNT_DISABLED,
          message: 'Ce compte est désactivé',
          status: 403,
        },
        INVALID_CREDENTIALS: {
          code: ErrorCode.INVALID_CREDENTIALS,
          message: 'Email ou mot de passe incorrect',
          status: 401,
        },
      };

      const error = errorMap[result.error] || {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'Erreur interne',
        status: 500,
      };

      // Add remaining attempts info from account lockout system
      const remainingInfo =
        result.remainingAttempts !== undefined && result.remainingAttempts > 0
          ? ` (${result.remainingAttempts} tentative${result.remainingAttempts > 1 ? 's' : ''} restante${result.remainingAttempts > 1 ? 's' : ''})`
          : result.remainingAttempts === 0
            ? ' (dernière tentative avant blocage)'
            : '';

      return NextResponse.json(
        {
          error: {
            code: error.code,
            message: error.message + remainingInfo,
          },
          success: false,
        },
        { status: error.status },
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
    );
    await setSessionTokenCookie(session.token, session.expiresAt);
    await recordLoginAudit({
      action: 'LOGIN_SUCCESS',
      description: `Connexion reussie: ${result.user.email}`,
      email: result.user.email,
      userId: result.user.id,
    });

    const user: UserType = {
      createdAt: result.user.createdAt,
      email: result.user.email,
      firstName: result.user.firstName,
      id: result.user.id,
      isActive: result.user.isActive,
      isProtected: result.user.isProtected,
      lastLoginAt: result.user.lastLoginAt,
      lastName: result.user.lastName,
      mustChangePassword: result.user.mustChangePassword,
      passwordChangedAt: result.user.passwordChangedAt,
      permissions: result.user.permissions as Record<string, boolean> | null,
      role: result.user.role,
      staffProfile: null,
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
    logger.error('Login error', { action: 'LOGIN', error });

    return NextResponse.json(
      {
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Erreur interne du serveur',
        },
        success: false,
      },
      { status: 500 },
    );
  }
}
