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
import { trimmedStringMinMax } from '$utils/zod.utils';

type MeResponseData = {
  session: {
    expiresAt: string;
    rememberMe: boolean;
  } | null;
  user: UserType;
};

const updateProfileSchema = z.object({
  firstName: trimmedStringMinMax(
    1,
    50,
    'Le prénom est requis',
    'Prénom trop long',
  ),
  lastName: trimmedStringMinMax(1, 50, 'Le nom est requis', 'Nom trop long'),
});

export async function GET(): Promise<
  NextResponse<ApiSuccessResponse<MeResponseData> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth(undefined, {
      allowPasswordChangeRequired: true,
    });
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

    const { firstName: nextFirstName, lastName: nextLastName } =
      validation.data;

    if (nextFirstName === user.firstName && nextLastName === user.lastName) {
      return NextResponse.json({
        data: { user },
        success: true,
      });
    }

    const beforeValues: Record<string, unknown> = {};
    const afterValues: Record<string, unknown> = {};
    const changes: Record<string, { from: unknown; to: unknown }> = {};

    if (nextFirstName !== user.firstName) {
      beforeValues.firstName = user.firstName;
      afterValues.firstName = nextFirstName;
      changes.firstName = { from: user.firstName, to: nextFirstName };
    }

    if (nextLastName !== user.lastName) {
      beforeValues.lastName = user.lastName;
      afterValues.lastName = nextLastName;
      changes.lastName = { from: user.lastName, to: nextLastName };
    }

    // Update user profile
    const updatedUser = await prisma.user.update({
      data: {
        firstName: nextFirstName,
        lastName: nextLastName,
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
        after: afterValues,
        before: beforeValues,
        changes,
        pageKey: 'account',
        pageLabel: 'Mon compte',
        poleKey: 'account',
        poleLabel: 'Compte',
        tabKey: 'profile',
        tabLabel: 'Profil',
      },
      targetUserId: user.id,
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
