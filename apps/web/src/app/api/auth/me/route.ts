import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireAuth } from '$server/api-auth';
import { apiErrors } from '$server/api-response';
import { createAuditLogWithHeaders, mapUserToUserType } from '$server/auth';
import { prisma } from '$server/prisma';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { UserType } from '$types/auth.types';

type MeResponseData = {
  session: {
    expiresAt: string;
    rememberMe: boolean;
  } | null;
  user: UserType;
};

const updateProfileSchema = z.object({
  firstName: z
    .string()
    .min(1, 'Le prénom est requis')
    .max(50, 'Prénom trop long'),
  lastName: z.string().min(1, 'Le nom est requis').max(50, 'Nom trop long'),
});

export async function GET(): Promise<
  NextResponse<ApiSuccessResponse<MeResponseData> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const { session, user } = auth;

    return NextResponse.json({
      data: {
        session: session
          ? {
              expiresAt: session.expiresAt.toISOString(),
              rememberMe: session.rememberMe,
            }
          : null,
        user,
      },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('ME_GET', error);
  }
}

export async function PATCH(
  request: Request,
): Promise<
  NextResponse<ApiSuccessResponse<{ user: UserType }> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;
    const { user } = auth;

    const body = await request.json();
    const validation = updateProfileSchema.safeParse(body);

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

    const { firstName, lastName } = validation.data;

    // Update user profile
    const updatedUser = await prisma.user.update({
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      },
      include: { staffProfile: true },
      where: { id: user.id },
    });

    // Log the change
    await createAuditLogWithHeaders({
      action: 'USER_UPDATE',
      category: 'USER',
      description: `Profil mis à jour`,
      metadata: {
        changes: {
          firstName: { from: user.firstName, to: firstName.trim() },
          lastName: { from: user.lastName, to: lastName.trim() },
        },
      },
      userId: user.id,
    });

    return NextResponse.json({
      data: { user: mapUserToUserType(updatedUser) },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('ME_UPDATE', error);
  }
}
