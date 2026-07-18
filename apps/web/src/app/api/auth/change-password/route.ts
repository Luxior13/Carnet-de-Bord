import { NextResponse } from 'next/server';
import { z } from 'zod';

import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { apiErrors, parseJsonBody } from '$server/api-response';
import {
  deleteSessionCookie,
  getAuthSession,
  isSecurityVersionMismatchError,
  updateUserPassword,
  verifyPassword,
} from '$server/auth';
import { prisma } from '$server/prisma';
import {
  recordLoginAttempt,
  reserveSensitiveActionRateLimit,
} from '$server/rate-limiter';
import { type ApiErrorResponse, ErrorCode } from '$types/api.types';
import { validatePassword } from '$utils/password.utils';

type ChangePasswordSuccessResponse = {
  success: true;
};

const changePasswordSchema = z
  .object({
    confirmPassword: z
      .string()
      .min(1, 'La confirmation du mot de passe est requise'),
    currentPassword: z.string().optional(),
    newPassword: z.string().min(1, 'Le nouveau mot de passe est requis'),
  })
  .strict();

export async function POST(
  request: Request,
): Promise<NextResponse<ChangePasswordSuccessResponse | ApiErrorResponse>> {
  try {
    const { session, user } = await getAuthSession();

    if (!session || !user) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Non autorisé',
          },
          success: false,
        },
        { status: 401 },
      );
    }

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = changePasswordSchema.safeParse(parsedBody.data);

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

    const { confirmPassword, currentPassword, newPassword } = validation.data;
    const rateLimitKey = `account-reauth:${user.id}`;

    if (
      !user.mustChangePassword &&
      !user.isProtected &&
      !hasPermission(
        user.role,
        PERMISSIONS.ACCOUNT.CHANGE_PASSWORD,
        user.permissions,
      )
    ) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message: "Vous n'avez pas la permission de changer ce mot de passe",
          },
          success: false,
        },
        { status: 403 },
      );
    }

    // Validate password complexity
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      const passwordError =
        passwordValidation.errors[0] ?? 'Mot de passe invalide';

      return NextResponse.json(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            details: { password: passwordValidation.errors },
            message: passwordError,
          },
          success: false,
        },
        { status: 400 },
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Les mots de passe ne correspondent pas',
          },
          success: false,
        },
        { status: 400 },
      );
    }

    const storedUser = await prisma.user.findUnique({
      select: { passwordHash: true },
      where: { id: user.id },
    });

    if (!storedUser) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.NOT_FOUND,
            message: 'Utilisateur non trouvé',
          },
          success: false,
        },
        { status: 404 },
      );
    }

    if (!user.mustChangePassword) {
      if (!currentPassword) {
        return NextResponse.json(
          {
            error: {
              code: ErrorCode.VALIDATION_ERROR,
              message: 'Le mot de passe actuel est requis',
            },
            success: false,
          },
          { status: 400 },
        );
      }

      const rateLimit = await reserveSensitiveActionRateLimit(rateLimitKey);

      if (!rateLimit.allowed) {
        const retryAfter = rateLimit.retryAfter ?? 1800;

        return NextResponse.json(
          {
            error: {
              code: ErrorCode.RATE_LIMITED,
              message:
                'Trop de tentatives. Réessayez dans ' +
                Math.ceil(retryAfter / 60) +
                ' minutes.',
            },
            success: false,
          },
          {
            headers: {
              'Retry-After': String(retryAfter),
            },
            status: 429,
          },
        );
      }

      const isCurrentPasswordValid = await verifyPassword(
        currentPassword,
        storedUser.passwordHash,
      );

      if (!isCurrentPasswordValid) {
        return NextResponse.json(
          {
            error: {
              code: ErrorCode.VALIDATION_ERROR,
              message: 'Le mot de passe actuel est incorrect',
            },
            success: false,
          },
          { status: 400 },
        );
      }

      // A correct proof releases the shared account reauthentication quota.
      // The transactional cleanup in updateUserPassword remains an idempotent
      // safety net if this request proceeds to the password mutation.
      await recordLoginAttempt(rateLimitKey, true);
    }

    const isSamePassword = await verifyPassword(
      newPassword,
      storedUser.passwordHash,
    );

    if (isSamePassword) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: "Le nouveau mot de passe doit être différent de l'actuel",
          },
          success: false,
        },
        { status: 400 },
      );
    }

    // Password state, rate-limit reset, other-session revocation and audit are
    // one transaction so a partial security change cannot be reported as done.
    await updateUserPassword(user.id, newPassword, {
      audit: {
        action: 'PASSWORD_CHANGE',
        category: 'AUTH',
        description: 'Mot de passe modifié',
        metadata: {
          pageKey: 'account',
          pageLabel: 'Mon compte',
          passwordChange: true,
          poleKey: 'account',
          poleLabel: 'Espace personnel',
          tabKey: 'security',
          tabLabel: 'Sécurité',
        },
        targetUserId: user.id,
        userId: user.id,
      },
      currentSessionToken: session.token,
      expectedSecurityVersion: session.securityVersion,
      rateLimitKey,
      securityNotification: { actorUserId: user.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (isSecurityVersionMismatchError(error)) {
      await deleteSessionCookie();

      return NextResponse.json(
        {
          error: {
            code: ErrorCode.UNAUTHORIZED,
            message: 'Votre session a expiré. Veuillez vous reconnecter.',
          },
          success: false,
        },
        { status: 401 },
      );
    }

    return apiErrors.internal('CHANGE_PASSWORD', error);
  }
}
