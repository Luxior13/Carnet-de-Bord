import { NextResponse } from 'next/server';
import { z } from 'zod';

import { apiErrors } from '$server/api-response';
import {
  createAuditLogWithHeaders,
  getAuthSession,
  invalidateOtherUserSessions,
  updateUserPassword,
  verifyPassword,
} from '$server/auth';
import { prisma } from '$server/prisma';
import { ErrorCode } from '$types/api.types';
import { validatePassword } from '$utils/password.utils';

const changePasswordSchema = z.object({
  confirmPassword: z
    .string()
    .min(1, 'La confirmation du mot de passe est requise'),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(1, 'Le nouveau mot de passe est requis'),
});

export async function POST(request: Request) {
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

    const body = await request.json();
    const validation = changePasswordSchema.safeParse(body);

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

    // Validate password complexity
    const passwordValidation = validatePassword(newPassword);
    if (!passwordValidation.isValid) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            details: { password: passwordValidation.errors },
            message: passwordValidation.errors[0],
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

    // Update password
    await updateUserPassword(user.id, newPassword);
    if (session) {
      await invalidateOtherUserSessions(user.id, session.token);
    }

    await createAuditLogWithHeaders({
      action: 'PASSWORD_CHANGE',
      category: 'AUTH',
      description: 'Mot de passe modifié',
      targetUserId: user.id,
      userId: user.id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return apiErrors.internal('CHANGE_PASSWORD', error);
  }
}
