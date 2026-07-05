import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  getUnknownPermissionKeys,
  PERMISSIONS,
} from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import { apiErrors } from '$server/api-response';
import {
  createAuditLogWithHeaders,
  invalidateAllUserSessions,
  mapUserToUserType,
} from '$server/auth';
import { prisma } from '$server/prisma';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { UserType } from '$types/auth.types';
import {
  optionalEmailSchema,
  optionalProfileString,
  optionalTrimmedStringMax,
} from '$utils/zod.utils';

type RouteParams = {
  params: Promise<{ id: string }>;
};

const isValidDateInput = (value: string): boolean => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const parsedDate = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === value
  );
};

const optionalProfileDateSchema = z
  .string()
  .optional()
  .nullable()
  .transform((value) => {
    if (value === undefined) return undefined;
    if (value === null) return null;

    const trimmedValue = value.trim();

    return trimmedValue ? trimmedValue : null;
  })
  .refine(
    (value) => value === undefined || value === null || isValidDateInput(value),
    { message: 'Date invalide' },
  )
  .transform((value) =>
    value === undefined || value === null
      ? value
      : new Date(`${value}T00:00:00.000Z`),
  );

const staffProfileSchema = z
  .object({
    department: optionalProfileString(80, 'Pôle trop long'),
    discordId: optionalProfileString(20, 'ID Discord trop long').refine(
      (value) =>
        value === undefined || value === null || /^\d{17,20}$/.test(value),
      { message: 'ID Discord invalide' },
    ),
    displayName: optionalProfileString(80, 'Nom affiche trop long'),
    internalNote: optionalProfileString(1000, 'Note interne trop longue'),
    jobTitle: optionalProfileString(80, 'Poste trop long'),
    joinedAt: optionalProfileDateSchema,
    phone: optionalProfileString(32, 'Telephone trop long'),
    timezone: optionalProfileString(64, 'Fuseau horaire trop long'),
  })
  .optional();

const STAFF_PROFILE_FIELDS = [
  'department',
  'discordId',
  'displayName',
  'internalNote',
  'jobTitle',
  'joinedAt',
  'phone',
  'timezone',
] as const;

type StaffProfileField = (typeof STAFF_PROFILE_FIELDS)[number];

const formatProfileAuditValue = (
  field: StaffProfileField,
  value: unknown,
): string | null => {
  if (value === undefined || value === null || value === '') return null;

  if (field === 'joinedAt') {
    const parsedDate = new Date(value as Date | string);

    if (Number.isNaN(parsedDate.getTime())) return null;

    return parsedDate.toISOString().slice(0, 10);
  }

  return String(value);
};

const arePermissionRecordsEqual = (
  first: Record<string, boolean> | null,
  second: Record<string, boolean> | null,
): boolean => {
  const firstEntries = new Map(Object.entries(first ?? {}));
  const secondEntries = new Map(Object.entries(second ?? {}));
  const keys = new Set([...firstEntries.keys(), ...secondEntries.keys()]);

  for (const key of keys) {
    if (
      (firstEntries.get(key) ?? false) !== (secondEntries.get(key) ?? false)
    ) {
      return false;
    }
  }

  return true;
};

// ============================================
// GET /api/users/[id] - Get single user
// ============================================
export async function GET(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<
  NextResponse<ApiSuccessResponse<{ user: UserType }> | ApiErrorResponse>
> {
  try {
    const { id } = await params;

    // Check authentication
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    // Check permission
    const permCheck = requirePermission(auth.user, PERMISSIONS.USERS.VIEW);
    if (!permCheck.success) return permCheck.response;

    const user = await prisma.user.findUnique({
      include: { staffProfile: true },
      where: { deletedAt: null, id },
    });

    if (!user) {
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

    return NextResponse.json({
      data: {
        user: mapUserToUserType(user, { includeStaffInternalNote: true }),
      },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('USER_GET', error);
  }
}

// ============================================
// PATCH /api/users/[id] - Update user
// ============================================
const permissionsSchema = z
  .record(z.string(), z.boolean())
  .nullable()
  .optional()
  .superRefine((value, context) => {
    const unknownPermissionKeys = getUnknownPermissionKeys(value);

    if (unknownPermissionKeys.length === 0) return;

    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: `Permission inconnue: ${unknownPermissionKeys.join(', ')}`,
    });
  });

const updateUserSchema = z.object({
  email: optionalEmailSchema,
  firstName: optionalTrimmedStringMax(50, 'Prénom trop long').pipe(
    z.string().min(1, 'Prénom requis').optional().nullable(),
  ),
  isActive: z.boolean().optional(),
  lastName: optionalTrimmedStringMax(50, 'Nom trop long').pipe(
    z.string().min(1, 'Nom requis').optional().nullable(),
  ),
  permissions: permissionsSchema,
  role: z.enum(['ADMIN', 'USER']).optional(),
  staffProfile: staffProfileSchema,
});

export async function PATCH(
  request: NextRequest,
  { params }: RouteParams,
): Promise<
  NextResponse<ApiSuccessResponse<{ user: UserType }> | ApiErrorResponse>
> {
  try {
    const { id } = await params;

    // Check authentication
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    const body = await request.json();
    const validation = updateUserSchema.safeParse(body);

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
      email,
      firstName,
      isActive,
      lastName,
      permissions,
      role,
      staffProfile,
    } = validation.data;
    const isPermissionsUpdate = permissions !== undefined;
    const isProfileUpdate =
      email !== undefined ||
      firstName !== undefined ||
      typeof isActive === 'boolean' ||
      lastName !== undefined ||
      role !== undefined ||
      staffProfile !== undefined;

    if (!isProfileUpdate && !isPermissionsUpdate) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Aucune modification fournie',
          },
          success: false,
        },
        { status: 400 },
      );
    }

    if (isProfileUpdate) {
      const updatePermCheck = requirePermission(
        auth.user,
        PERMISSIONS.USERS.UPDATE,
      );
      if (!updatePermCheck.success) return updatePermCheck.response;
    }

    if (isPermissionsUpdate) {
      const editPermCheck = requirePermission(
        auth.user,
        PERMISSIONS.USERS.EDIT_PERMISSIONS,
      );
      if (!editPermCheck.success) return editPermCheck.response;
    }

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      include: { staffProfile: true },
      where: { deletedAt: null, id },
    });

    if (!existingUser) {
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

    // Authorization checks
    // Non-protected users cannot modify protected accounts
    if (existingUser.isProtected && !auth.user.isProtected) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'Ce compte est protégé et ne peut pas être modifié',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    if (
      existingUser.role === 'ADMIN' &&
      !auth.user.isProtected &&
      (email !== undefined ||
        typeof isActive === 'boolean' ||
        isPermissionsUpdate ||
        role !== undefined)
    ) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message:
              "Seul un superadmin peut modifier les accès d'un administrateur",
          },
          success: false,
        },
        { status: 403 },
      );
    }

    // Cannot deactivate yourself
    if (isActive === false && existingUser.id === auth.user.id) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'Vous ne pouvez pas désactiver votre propre compte',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    if (
      isPermissionsUpdate &&
      existingUser.id === auth.user.id &&
      !auth.user.isProtected
    ) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'Vous ne pouvez pas modifier vos propres permissions',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    // Cannot deactivate protected accounts (unless you're protected too)
    if (
      isActive === false &&
      existingUser.isProtected &&
      !auth.user.isProtected
    ) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'Ce compte est protégé et ne peut pas être désactivé',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    // Cannot modify ADMIN role unless you're protected
    if (role === 'ADMIN' && !auth.user.isProtected) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message:
              "Vous n'êtes pas autorisé à promouvoir des utilisateurs en administrateur",
          },
          success: false,
        },
        { status: 403 },
      );
    }

    // Cannot demote ADMIN unless you're protected
    if (
      existingUser.role === 'ADMIN' &&
      role === 'USER' &&
      !auth.user.isProtected
    ) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message:
              "Vous n'êtes pas autorisé à modifier le rôle d'un administrateur",
          },
          success: false,
        },
        { status: 403 },
      );
    }

    // Check email uniqueness if changing
    if (email && email.toLowerCase().trim() !== existingUser.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email: email.toLowerCase().trim() },
      });

      if (existingEmail) {
        return NextResponse.json(
          {
            error: {
              code: ErrorCode.VALIDATION_ERROR,
              message: 'Cet email est déjà utilisé',
            },
            success: false,
          },
          { status: 400 },
        );
      }
    }

    // Build update data and track changes
    const updateData: Record<string, unknown> = {};
    const beforeValues: Record<string, unknown> = {};
    const afterValues: Record<string, unknown> = {};

    if (email) {
      const newEmail = email.toLowerCase().trim();
      if (newEmail !== existingUser.email) {
        beforeValues.email = existingUser.email;
        afterValues.email = newEmail;
        updateData.email = newEmail;
      }
    }
    if (firstName) {
      const newFirstName = firstName.trim();
      if (newFirstName !== existingUser.firstName) {
        beforeValues.firstName = existingUser.firstName;
        afterValues.firstName = newFirstName;
        updateData.firstName = newFirstName;
      }
    }
    if (lastName) {
      const newLastName = lastName.trim();
      if (newLastName !== existingUser.lastName) {
        beforeValues.lastName = existingUser.lastName;
        afterValues.lastName = newLastName;
        updateData.lastName = newLastName;
      }
    }
    if (role && role !== existingUser.role) {
      beforeValues.role = existingUser.role;
      afterValues.role = role;
      updateData.role = role;
    }
    if (typeof isActive === 'boolean' && isActive !== existingUser.isActive) {
      beforeValues.isActive = existingUser.isActive;
      afterValues.isActive = isActive;
      updateData.isActive = isActive;
    }
    if (permissions !== undefined) {
      const existingPerms = existingUser.permissions as Record<
        string,
        boolean
      > | null;
      // Only track if actually changed
      if (!arePermissionRecordsEqual(permissions, existingPerms)) {
        beforeValues.permissions = existingPerms;
        afterValues.permissions = permissions;
        updateData.permissions = permissions;
      }
    }
    /* eslint-disable security/detect-object-injection -- Staff profile keys are restricted to STAFF_PROFILE_FIELDS and validated by staffProfileSchema. */
    if (staffProfile !== undefined) {
      const staffProfileUpdateData: Record<string, Date | string | null> = {};

      for (const field of STAFF_PROFILE_FIELDS) {
        const nextValue = staffProfile[field];

        if (nextValue === undefined) continue;

        const previousValue = existingUser.staffProfile?.[field] ?? null;
        const previousAuditValue = formatProfileAuditValue(
          field,
          previousValue,
        );
        const nextAuditValue = formatProfileAuditValue(field, nextValue);

        if (previousAuditValue !== nextAuditValue) {
          const auditKey = `staffProfile.${field}`;
          beforeValues[auditKey] = previousAuditValue;
          afterValues[auditKey] = nextAuditValue;
          staffProfileUpdateData[field] = nextValue ?? null;
        }
      }

      if (Object.keys(staffProfileUpdateData).length > 0) {
        updateData.staffProfile = {
          upsert: {
            create: staffProfileUpdateData,
            update: staffProfileUpdateData,
          },
        };
      }
    }
    /* eslint-enable security/detect-object-injection */

    // Only update if there are actual changes
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        data: {
          user: mapUserToUserType(existingUser, {
            includeStaffInternalNote: true,
          }),
        },
        success: true,
      });
    }

    const updatedUser = await prisma.user.update({
      data: updateData,
      include: { staffProfile: true },
      where: { id },
    });
    const changedKeys = Object.keys(afterValues);
    const hasAccessChange =
      changedKeys.includes('permissions') || changedKeys.includes('role');

    // Build target name for audit log
    const targetName =
      existingUser.firstName && existingUser.lastName
        ? `${existingUser.firstName} ${existingUser.lastName}`
        : existingUser.email;

    // If deactivated, invalidate all sessions
    if (isActive === false) {
      await invalidateAllUserSessions(id);

      await createAuditLogWithHeaders({
        action: 'USER_DEACTIVATE',
        category: 'USER',
        description: `Utilisateur désactivé: ${updatedUser.email}`,
        metadata: {
          after: afterValues,
          before: beforeValues,
          targetName,
        },
        targetUserId: id,
        userId: auth.user.id,
      });
    } else if (isActive === true && existingUser.isActive === false) {
      if (hasAccessChange) {
        await invalidateAllUserSessions(id);
      }

      await createAuditLogWithHeaders({
        action: 'USER_ACTIVATE',
        category: 'USER',
        description: `Utilisateur activé: ${updatedUser.email}`,
        metadata: {
          after: afterValues,
          before: beforeValues,
          targetName,
        },
        targetUserId: id,
        userId: auth.user.id,
      });
    } else if (hasAccessChange) {
      await invalidateAllUserSessions(id);

      await createAuditLogWithHeaders({
        action: 'PERMISSION_UPDATE',
        category: 'PERMISSION',
        description: `Permissions modifiées: ${updatedUser.email}`,
        metadata: {
          after: afterValues,
          before: beforeValues,
          changes: changedKeys,
          targetName,
        },
        targetUserId: id,
        userId: auth.user.id,
      });
    } else {
      await createAuditLogWithHeaders({
        action: 'USER_UPDATE',
        category: 'USER',
        description: `Utilisateur modifié: ${updatedUser.email}`,
        metadata: {
          after: afterValues,
          before: beforeValues,
          changes: changedKeys,
          targetName,
        },
        targetUserId: id,
        userId: auth.user.id,
      });
    }

    return NextResponse.json({
      data: {
        user: mapUserToUserType(updatedUser, {
          includeStaffInternalNote: true,
        }),
      },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('USER_UPDATE', error);
  }
}

// ============================================
// DELETE /api/users/[id] - Delete user
// ============================================
export async function DELETE(
  _request: NextRequest,
  { params }: RouteParams,
): Promise<
  NextResponse<ApiSuccessResponse<{ message: string }> | ApiErrorResponse>
> {
  try {
    const { id } = await params;

    // Check authentication
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    // Check permission
    const permCheck = requirePermission(auth.user, PERMISSIONS.USERS.DELETE);
    if (!permCheck.success) return permCheck.response;

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      where: { deletedAt: null, id },
    });

    if (!existingUser) {
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

    // Cannot delete yourself
    if (existingUser.id === auth.user.id) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'Vous ne pouvez pas supprimer votre propre compte',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    // Cannot delete protected accounts
    if (existingUser.isProtected) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'Ce compte est protégé et ne peut pas être supprimé',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    if (existingUser.role === 'ADMIN' && !auth.user.isProtected) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'Seul un superadmin peut supprimer un administrateur',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    // Soft delete
    await prisma.user.update({
      data: { deletedAt: new Date(), isActive: false },
      where: { id },
    });

    // Invalidate all sessions
    await invalidateAllUserSessions(id);

    // Log audit
    await createAuditLogWithHeaders({
      action: 'USER_DELETE',
      category: 'USER',
      description: `Utilisateur supprimé: ${existingUser.email}`,
      metadata: { deletedUserId: id, email: existingUser.email },
      targetUserId: id,
      userId: auth.user.id,
    });

    return NextResponse.json({
      data: { message: 'Utilisateur supprimé' },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('USER_DELETE', error);
  }
}
