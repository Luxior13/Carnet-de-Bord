import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  arePermissionOverridesEqual,
  getAccountPermissionKeys,
  getAllPermissionKeys,
  getUnknownPermissionKeys,
  hasPermission,
  PERMISSIONS,
} from '$constants/permissions.constants';
import { requireAuth, requirePermission } from '$server/api-auth';
import {
  apiErrors,
  isPrismaUniqueConstraintError,
  parseJsonBody,
} from '$server/api-response';
import {
  type AuditLogInput,
  createAuditLogWithHeaders,
  mapUserToUserType,
} from '$server/auth';
import { prisma } from '$server/prisma';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { UserType } from '$types/auth.types';
import { emailSchema, trimmedStringMinMax } from '$utils/zod.utils';

type RouteParams = {
  params: Promise<{ id: string }>;
};

const USERS_PAGE_AUDIT_LOCATION = {
  pageKey: 'users',
  pageLabel: 'Utilisateurs & permissions',
  poleKey: 'system',
  poleLabel: 'Système',
} as const;

const ACCOUNT_PERMISSION_KEY_SET = new Set(getAccountPermissionKeys());

const toPermissionMap = (value: unknown): Map<string, boolean> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return new Map();
  }

  return new Map(
    Object.entries(value).flatMap(([permissionKey, enabled]) =>
      typeof enabled === 'boolean' ? [[permissionKey, enabled] as const] : [],
    ),
  );
};

const getChangedPermissionKeys = (
  before: unknown,
  after: unknown,
): string[] => {
  const beforeMap = toPermissionMap(before);
  const afterMap = toPermissionMap(after);
  const permissionKeys = new Set([...beforeMap.keys(), ...afterMap.keys()]);

  return [...permissionKeys].filter(
    (permissionKey) =>
      beforeMap.get(permissionKey) !== afterMap.get(permissionKey),
  );
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

    const canViewAccess =
      auth.user.isProtected ||
      hasPermission(
        auth.user.role,
        PERMISSIONS.USERS.VIEW_ACCESS,
        auth.user.permissions,
      );
    const clientUser = mapUserToUserType(user);

    return NextResponse.json({
      data: {
        user: {
          ...clientUser,
          permissions: canViewAccess ? clientUser.permissions : null,
        },
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

const updateUserSchema = z
  .object({
    email: emailSchema.optional(),
    firstName: trimmedStringMinMax(
      1,
      50,
      'Prénom requis',
      'Prénom trop long',
    ).optional(),
    isActive: z.boolean().optional(),
    lastName: trimmedStringMinMax(
      1,
      50,
      'Nom requis',
      'Nom trop long',
    ).optional(),
    permissions: permissionsSchema,
    role: z.enum(['ADMIN', 'USER']).optional(),
  })
  .strict();

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

    const parsedBody = await parseJsonBody(request);
    if (!parsedBody.success) return parsedBody.response;
    const validation = updateUserSchema.safeParse(parsedBody.data);

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

    const { email, firstName, isActive, lastName, permissions, role } =
      validation.data;
    const isPermissionsUpdate = permissions !== undefined;
    const isProfileUpdate = firstName !== undefined || lastName !== undefined;
    const isLoginUpdate = email !== undefined;
    const isStatusUpdate = typeof isActive === 'boolean';
    const isRoleUpdate = role !== undefined;

    if (
      !isProfileUpdate &&
      !isLoginUpdate &&
      !isStatusUpdate &&
      !isRoleUpdate &&
      !isPermissionsUpdate
    ) {
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
      const profilePermCheck = requirePermission(
        auth.user,
        PERMISSIONS.USERS.UPDATE_PROFILE,
      );
      if (!profilePermCheck.success) return profilePermCheck.response;
    }

    if (isLoginUpdate) {
      const loginPermCheck = requirePermission(
        auth.user,
        PERMISSIONS.USERS.UPDATE_LOGIN,
      );
      if (!loginPermCheck.success) return loginPermCheck.response;
    }

    if (isStatusUpdate) {
      const statusPermCheck = requirePermission(
        auth.user,
        PERMISSIONS.USERS.MANAGE_STATUS,
      );
      if (!statusPermCheck.success) return statusPermCheck.response;
    }

    if (isRoleUpdate) {
      const rolePermCheck = requirePermission(
        auth.user,
        PERMISSIONS.USERS.MANAGE_ROLES,
      );
      if (!rolePermCheck.success) return rolePermCheck.response;
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

    // A protected account is the recovery invariant for administration. Even
    // another protected actor cannot disable or demote it.
    if (existingUser.isProtected && (isActive === false || role === 'USER')) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'Un compte protégé doit rester actif et administrateur',
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

    if (!auth.user.isProtected && (isPermissionsUpdate || isRoleUpdate)) {
      const beforePermissions = existingUser.permissions as Record<
        string,
        boolean
      > | null;
      const afterPermissions =
        permissions !== undefined ? permissions : beforePermissions;
      const afterRole = role ?? existingUser.role;
      const unauthorizedPermissionKeys = new Set(
        Object.entries(afterPermissions ?? {}).flatMap(
          ([permissionKey, enabled]) =>
            enabled &&
            !hasPermission(auth.user.role, permissionKey, auth.user.permissions)
              ? [permissionKey]
              : [],
        ),
      );

      for (const permissionKey of getAllPermissionKeys()) {
        const isGainedEffectively =
          !hasPermission(existingUser.role, permissionKey, beforePermissions) &&
          hasPermission(afterRole, permissionKey, afterPermissions);

        if (
          isGainedEffectively &&
          !hasPermission(auth.user.role, permissionKey, auth.user.permissions)
        ) {
          unauthorizedPermissionKeys.add(permissionKey);
        }
      }

      if (unauthorizedPermissionKeys.size > 0) {
        return NextResponse.json(
          {
            error: {
              code: ErrorCode.FORBIDDEN,
              message:
                'Vous ne pouvez pas accorder une permission que vous ne possedez pas',
            },
            success: false,
          },
          { status: 403 },
        );
      }
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
      if (!arePermissionOverridesEqual(permissions, existingPerms)) {
        beforeValues.permissions = existingPerms;
        afterValues.permissions = permissions;
        updateData.permissions = permissions;
      }
    }
    // Only update if there are actual changes
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        data: {
          user: mapUserToUserType(existingUser),
        },
        success: true,
      });
    }

    const changedKeys = Object.keys(afterValues);
    const hasAccessChange =
      changedKeys.includes('permissions') || changedKeys.includes('role');

    // Build target name for audit log
    const targetName =
      existingUser.firstName && existingUser.lastName
        ? `${existingUser.firstName} ${existingUser.lastName}`
        : existingUser.email;
    const changedPermissionKeys = changedKeys.includes('permissions')
      ? getChangedPermissionKeys(
          beforeValues.permissions,
          afterValues.permissions,
        )
      : [];
    const hasOnlyAccountPermissionChanges =
      changedKeys.length === 1 &&
      changedPermissionKeys.length > 0 &&
      changedPermissionKeys.every((permissionKey) =>
        ACCOUNT_PERMISSION_KEY_SET.has(permissionKey),
      );
    const permissionAuditTab = hasOnlyAccountPermissionChanges
      ? { tabKey: 'account', tabLabel: 'Compte personnel' }
      : { tabKey: 'access', tabLabel: 'Accès' };

    const updatedEmail =
      typeof updateData.email === 'string'
        ? updateData.email
        : existingUser.email;
    let auditData: AuditLogInput;

    if (isActive === false) {
      auditData = {
        action: 'USER_DEACTIVATE',
        category: 'USER',
        description: `Utilisateur désactivé: ${updatedEmail}`,
        metadata: {
          after: afterValues,
          before: beforeValues,
          ...USERS_PAGE_AUDIT_LOCATION,
          tabKey: 'resume',
          tabLabel: 'Résumé',
          targetName,
        },
        targetUserId: id,
        userId: auth.user.id,
      };
    } else if (isActive === true && existingUser.isActive === false) {
      auditData = {
        action: 'USER_ACTIVATE',
        category: 'USER',
        description: `Utilisateur activé: ${updatedEmail}`,
        metadata: {
          after: afterValues,
          before: beforeValues,
          ...USERS_PAGE_AUDIT_LOCATION,
          tabKey: 'resume',
          tabLabel: 'Résumé',
          targetName,
        },
        targetUserId: id,
        userId: auth.user.id,
      };
    } else if (hasAccessChange) {
      auditData = {
        action: 'PERMISSION_UPDATE',
        category: 'PERMISSION',
        description: `Permissions modifiées: ${updatedEmail}`,
        metadata: {
          after: afterValues,
          before: beforeValues,
          changes: changedKeys,
          ...USERS_PAGE_AUDIT_LOCATION,
          ...permissionAuditTab,
          targetName,
        },
        targetUserId: id,
        userId: auth.user.id,
      };
    } else {
      auditData = {
        action: 'USER_UPDATE',
        category: 'USER',
        description: `Utilisateur modifié: ${updatedEmail}`,
        metadata: {
          after: afterValues,
          before: beforeValues,
          changes: changedKeys,
          ...USERS_PAGE_AUDIT_LOCATION,
          tabKey: 'profile',
          tabLabel: 'Profil',
          targetName,
        },
        targetUserId: id,
        userId: auth.user.id,
      };
    }

    const shouldInvalidateSessions = isActive === false || hasAccessChange;
    const updatedUser = await prisma.$transaction(async (transaction) => {
      const nextUser = await transaction.user.update({
        data: updateData,
        where: { id },
      });

      if (shouldInvalidateSessions) {
        await transaction.session.deleteMany({ where: { userId: id } });
      }

      await createAuditLogWithHeaders(auditData, {
        client: transaction,
        required: true,
      });

      return nextUser;
    });

    return NextResponse.json({
      data: {
        user: mapUserToUserType(updatedUser),
      },
      success: true,
    });
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Cet email est déjà utilisé',
          },
          success: false,
        },
        { status: 409 },
      );
    }

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

    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        data: { deletedAt: new Date(), isActive: false },
        where: { id },
      });

      await transaction.session.deleteMany({ where: { userId: id } });

      await createAuditLogWithHeaders(
        {
          action: 'USER_DELETE',
          category: 'USER',
          description: `Utilisateur supprimé: ${existingUser.email}`,
          metadata: {
            deletedUserId: id,
            email: existingUser.email,
            ...USERS_PAGE_AUDIT_LOCATION,
            tabKey: 'resume',
            tabLabel: 'Résumé',
          },
          targetUserId: id,
          userId: auth.user.id,
        },
        { client: transaction, required: true },
      );
    });

    return NextResponse.json({
      data: { message: 'Utilisateur supprimé' },
      success: true,
    });
  } catch (error) {
    return apiErrors.internal('USER_DELETE', error);
  }
}
