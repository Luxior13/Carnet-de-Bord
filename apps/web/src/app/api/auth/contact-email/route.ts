import { NextResponse } from 'next/server';
import { z } from 'zod';

import { PERMISSIONS } from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors, parseJsonBody } from '$server/api-response';
import {
  createAuditLogWithHeaders,
  mapUserToUserType,
  verifyPassword,
} from '$server/auth';
import { prisma } from '$server/prisma';
import {
  recordLoginAttempt,
  reserveSensitiveActionRateLimit,
} from '$server/rate-limiter';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { UserType } from '$types/auth.types';
import { isPasswordWithinBcryptLimit } from '$utils/password.utils';

type ContactEmailResponseData = {
  user: UserType;
};

const validContactEmailSchema = z.string().email();
const contactEmailSchema = z.union([
  z.null(),
  z
    .string()
    .trim()
    .max(254, 'Adresse de contact trop longue')
    .refine(
      (value) =>
        value.length === 0 || validContactEmailSchema.safeParse(value).success,
      'Adresse de contact invalide',
    ),
]);

const updateContactEmailSchema = z
  .object({
    contactEmail: contactEmailSchema,
    currentPassword: z
      .string()
      .min(1, 'Le mot de passe actuel est requis')
      .refine(isPasswordWithinBcryptLimit, {
        message: 'Mot de passe trop long',
      }),
  })
  .strict();

const normalizeContactEmail = (contactEmail: null | string): null | string => {
  if (contactEmail === null || contactEmail.length === 0) return null;

  return contactEmail.toLowerCase();
};

const isOptimisticConflict = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'code' in error &&
  error.code === 'P2025';

export async function PATCH(
  request: Request,
): Promise<
  NextResponse<ApiSuccessResponse<ContactEmailResponseData> | ApiErrorResponse>
> {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    const contactPermission = requirePermission(
      auth.user,
      PERMISSIONS.ACCOUNT.UPDATE_CONTACT,
    );
    if (!contactPermission.success) return contactPermission.response;

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = updateContactEmailSchema.safeParse(parsedBody.data);

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

    const rateLimitKey = `account-reauth:${auth.user.id}`;
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
          headers: { 'Retry-After': String(retryAfter) },
          status: 429,
        },
      );
    }

    const storedUser = await prisma.user.findUnique({
      where: { deletedAt: null, id: auth.user.id },
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

    const isCurrentPasswordValid = await verifyPassword(
      validation.data.currentPassword,
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

    // A valid proof releases the sensitive-action quota. Invalid attempts stay
    // reserved and therefore cannot race past the bcrypt protection.
    await recordLoginAttempt(rateLimitKey, true);

    const nextContactEmail = normalizeContactEmail(
      validation.data.contactEmail,
    );

    if (nextContactEmail === storedUser.contactEmail) {
      return NextResponse.json({
        data: { user: mapUserToUserType(storedUser) },
        success: true,
      });
    }

    const updatedUser = await prisma.$transaction(async (transaction) => {
      const nextUser = await transaction.user.update({
        data: {
          contactEmail: nextContactEmail,
          contactEmailVerifiedAt: null,
        },
        where: {
          id: auth.user.id,
          updatedAt: storedUser.updatedAt,
        },
      });

      await createAuditLogWithHeaders(
        {
          action: 'USER_UPDATE',
          category: 'USER',
          description: 'Adresse de contact mise à jour',
          metadata: {
            after: { contactEmail: nextContactEmail },
            before: { contactEmail: storedUser.contactEmail },
            changes: {
              contactEmail: {
                from: storedUser.contactEmail,
                to: nextContactEmail,
              },
            },
            contactEmailVerificationReset:
              storedUser.contactEmailVerifiedAt !== null,
            pageKey: 'account',
            pageLabel: 'Mon compte',
            poleKey: 'account',
            poleLabel: 'Espace personnel',
            tabKey: 'profile',
            tabLabel: 'Profil',
          },
          targetUserId: auth.user.id,
          userId: auth.user.id,
        },
        { client: transaction, required: true },
      );

      return nextUser;
    });

    return NextResponse.json({
      data: { user: mapUserToUserType(updatedUser) },
      success: true,
    });
  } catch (error) {
    if (isOptimisticConflict(error)) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.CONFLICT,
            message:
              'Votre compte a été modifié entre-temps. Rechargez la page avant de réessayer.',
          },
          success: false,
        },
        { status: 409 },
      );
    }

    return apiErrors.internal('CONTACT_EMAIL_UPDATE', error, request);
  }
}
