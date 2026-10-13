import { NextResponse } from 'next/server';
import { z } from 'zod';

import { PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiError, apiErrors, parseJsonBody } from '$server/api-response';
import { createAuditLogWithHeaders, mapUserToUserType } from '$server/auth';
import { prisma } from '$server/prisma';
import {
  authorizeUserAction,
  UserActionAuthorizationError,
} from '$server/user-action-authorization';
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
    idleExpiresAt: string;
    lastSeenAt: string;
    rememberMe: boolean;
  } | null;
  user: UserType;
};

const updateProfileSchema = z
  .object({
    expectedUpdatedAt: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value)),
    firstName: trimmedStringMinMax(
      1,
      50,
      'Le prénom est requis',
      'Prénom trop long',
    ),
    lastName: trimmedStringMinMax(0, 50, undefined, 'Nom trop long'),
  })
  .strict();

class ProfileConflictError extends Error {}

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
              idleExpiresAt: session.idleExpiresAt.toISOString(),
              lastSeenAt: session.lastSeenAt.toISOString(),
              rememberMe: session.rememberMe,
            }
          : null,
        user,
      },
      success: true,
    });
  } catch (error) {
    if (error instanceof UserActionAuthorizationError)
      return apiError(error.code, error.message, error.status);

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

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = updateProfileSchema.safeParse(parsedBody.data);

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

    const {
      expectedUpdatedAt,
      firstName: nextFirstName,
      lastName: nextLastName,
    } = validation.data;

    const profilePermission = requirePermission(
      user,
      PERMISSIONS.ACCOUNT.UPDATE_PROFILE,
    );
    if (!profilePermission.success) return profilePermission.response;
    if (
      !user.updatedAt ||
      new Date(user.updatedAt).getTime() !== expectedUpdatedAt.getTime()
    ) {
      throw new ProfileConflictError();
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

    const updatedUser = await prisma.$transaction(async (transaction) => {
      await authorizeUserAction(
        transaction,
        { actorId: user.id, session: auth.session },
        PERMISSIONS.ACCOUNT.UPDATE_PROFILE,
      );
      const current = await transaction.user.findUnique({
        where: { id: user.id },
      });
      if (
        !current ||
        current.updatedAt.getTime() !== expectedUpdatedAt.getTime()
      )
        throw new ProfileConflictError();
      if (
        nextFirstName === current.firstName &&
        nextLastName === current.lastName
      )
        return current;
      const result = await transaction.user.updateMany({
        data: {
          firstName: nextFirstName,
          lastName: nextLastName,
        },
        where: { id: user.id, updatedAt: expectedUpdatedAt },
      });
      if (result.count !== 1) throw new ProfileConflictError();
      const updatedProfile = await transaction.user.findUnique({
        where: { id: user.id },
      });
      if (!updatedProfile) throw new ProfileConflictError();

      await createAuditLogWithHeaders(
        {
          action: 'USER_UPDATE',
          category: 'USER',
          description: 'Profil mis à jour',
          metadata: {
            after: afterValues,
            before: beforeValues,
            changes,
            pageKey: 'account',
            pageLabel: 'Mon compte',
            poleKey: 'account',
            poleLabel: 'Espace personnel',
            tabKey: 'profile',
            tabLabel: 'Profil',
          },
          targetUserId: user.id,
          userId: user.id,
        },
        { client: transaction, required: true },
      );

      return updatedProfile;
    });

    return NextResponse.json({
      data: { user: mapUserToUserType(updatedUser) },
      success: true,
    });
  } catch (error) {
    if (error instanceof UserActionAuthorizationError)
      return apiError(error.code, error.message, error.status);
    if (error instanceof ProfileConflictError) {
      return apiError(
        ErrorCode.CONFLICT,
        'Votre profil a changé. Actualisez sa version avant de réessayer.',
        409,
      );
    }

    return apiErrors.internal('ME_UPDATE', error);
  }
}
