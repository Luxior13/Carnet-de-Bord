import { NextRequest, NextResponse } from 'next/server';

import {
  arePermissionOverridesEqual,
  enforcePermissionDependencies,
  getPermissionItem,
  hasCompleteAccessByRole,
  hasPermission,
  normalizePermissionOverrides,
  omitAccessPermissionOverrides,
  PERMISSIONS,
} from '$constants/permissions.constants';
import {
  getUserForActor,
  mapUserForActor,
  USER_DETAIL_SELECT,
} from '$features/users/server/user-detail.service';
import {
  LoginNameReservationConflictError,
  prepareUserUpdate,
  updateUserWithAudit,
} from '$features/users/server/user-update.service';
import {
  getChangedPermissionKeys,
  getPermissionScopeKeySet,
  mergePermissionOverridesForScope,
  toPermissionMap,
  updateUserSchema,
} from '$features/users/user-update.schema';
import { requireAuth, requirePermission } from '$server/api-auth';
import {
  apiError,
  apiErrors,
  isPrismaUniqueConstraintError,
  parseJsonBody,
} from '$server/api-response';
import { prisma } from '$server/prisma';
import {
  requireRecentPasswordReauthentication,
  requireRecentSensitiveActionProof,
} from '$server/sensitive-action';
import { UserActionAuthorizationError } from '$server/user-action-authorization';
import {
  deleteUserPermanently,
  UserDeletionStateChangedError,
} from '$server/user-deletion';
import {
  authorizeUserPermissionMutation,
  preauthorizeUserPermissionMutation,
} from '$server/user-permission-mutation-authorization';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { UserType } from '$types/auth.types';

type RouteParams = {
  params: Promise<{ id: string }>;
};

const isPrismaOptimisticConflict = (error: unknown): boolean =>
  !!error &&
  typeof error === 'object' &&
  'code' in error &&
  error.code === 'P2025';

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

    const user = await getUserForActor(id, auth.user);

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
        user,
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

    const {
      contactEmail,
      expectedUpdatedAt,
      firstName,
      isActive,
      lastName,
      loginName,
      permissions: requestedPermissions,
      permissionScope,
      role,
    } = validation.data;
    const normalizedRequestedPermissions =
      requestedPermissions === undefined
        ? undefined
        : normalizePermissionOverrides(requestedPermissions);
    const isPermissionsUpdate = requestedPermissions !== undefined;
    const isProfileUpdate = firstName !== undefined || lastName !== undefined;
    const isContactUpdate = contactEmail !== undefined;
    const isLoginUpdate = loginName !== undefined;
    const isStatusUpdate = typeof isActive === 'boolean';
    const isRoleUpdate = role !== undefined;

    if (
      !isProfileUpdate &&
      !isContactUpdate &&
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

    if (isContactUpdate) {
      const contactPermCheck = requirePermission(
        auth.user,
        PERMISSIONS.USERS.UPDATE_CONTACT,
      );
      if (!contactPermCheck.success) return contactPermCheck.response;
    }

    if (isStatusUpdate) {
      const statusPermCheck = requirePermission(
        auth.user,
        PERMISSIONS.USERS.UPDATE_STATUS,
      );
      if (!statusPermCheck.success) return statusPermCheck.response;
    }

    if (isRoleUpdate && !auth.user.isProtected) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'Seul le compte racine peut modifier un rôle',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    if (isPermissionsUpdate) {
      const preauthorization = preauthorizeUserPermissionMutation(
        auth.user,
        permissionScope,
      );
      if (!preauthorization.success) return preauthorization.response;
    }

    // Get existing user
    const existingUser = await prisma.user.findUnique({
      select: USER_DETAIL_SELECT,
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

    // The singleton root is owned by its authenticated identity. No other
    // account, permission override or future protected role may mutate it.
    if (existingUser.isProtected && existingUser.id !== auth.user.id) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message:
              'Le compte racine ne peut pas être modifié par un autre utilisateur',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    // Root identity, contact, status, role and access policy remain reserved
    // for the dedicated self-service or offline recovery flows.
    if (
      existingUser.isProtected &&
      existingUser.id === auth.user.id &&
      (isContactUpdate ||
        isLoginUpdate ||
        isPermissionsUpdate ||
        isRoleUpdate ||
        isStatusUpdate)
    ) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message:
              "Les paramètres sensibles du compte racine ne sont pas modifiables depuis l'application",
          },
          success: false,
        },
        { status: 403 },
      );
    }

    // Personal identity and contact changes have one canonical route:
    // /api/auth/me (and the re-authenticated contact endpoint). The delegated
    // administration endpoint must not become a second self-service path,
    // even for a privileged actor.
    if (
      existingUser.id === auth.user.id &&
      (isProfileUpdate || isLoginUpdate || isContactUpdate)
    ) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message:
              "Votre profil personnel ne peut pas être modifié depuis l'administration. Utilisez Mon compte.",
          },
          success: false,
        },
        { status: 403 },
      );
    }

    // Refuse every delegated mutation of another ADMIN before evaluating
    // target MFA or other state, so the response cannot disclose posture.
    if (existingUser.role === 'ADMIN' && !auth.user.isProtected) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.FORBIDDEN,
            message: 'Seul le compte racine peut modifier un administrateur',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    if (
      expectedUpdatedAt &&
      expectedUpdatedAt.getTime() !== existingUser.updatedAt.getTime()
    ) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.CONFLICT,
            message:
              'Cette fiche a été modifiée entre-temps. Rechargez-la avant de réessayer.',
          },
          success: false,
        },
        { status: 409 },
      );
    }

    const resultingRole = role ?? existingUser.role;

    // An ADMIN holds every administrative access permission; an explicit
    // access override for it would be silently meaningless, so refuse it.
    if (
      isPermissionsUpdate &&
      permissionScope !== 'account' &&
      hasCompleteAccessByRole(resultingRole) &&
      !arePermissionOverridesEqual(
        normalizedRequestedPermissions,
        omitAccessPermissionOverrides(normalizedRequestedPermissions),
      )
    ) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message:
              'Un administrateur possède toutes les autorisations administratives',
          },
          success: false,
        },
        { status: 400 },
      );
    }

    const existingPermissionOverrides = normalizePermissionOverrides(
      existingUser.permissions as Record<string, boolean> | null,
    );
    // A role change starts the administrative access from the new role: a
    // demoted ADMIN keeps no grant, a promoted USER no longer needs any.
    const basePermissionOverrides =
      isRoleUpdate && resultingRole !== existingUser.role
        ? omitAccessPermissionOverrides(existingPermissionOverrides)
        : existingPermissionOverrides;
    const mergedPermissions = isPermissionsUpdate
      ? permissionScope
        ? mergePermissionOverridesForScope(
            basePermissionOverrides,
            normalizedRequestedPermissions ?? null,
            permissionScope,
          )
        : (normalizedRequestedPermissions ?? null)
      : undefined;
    const permissions =
      isPermissionsUpdate || isRoleUpdate
        ? enforcePermissionDependencies(
            resultingRole,
            mergedPermissions === undefined
              ? basePermissionOverrides
              : mergedPermissions,
            permissionScope
              ? [...getPermissionScopeKeySet(permissionScope)]
              : undefined,
          )
        : undefined;
    const resultingPermissions =
      permissions === undefined ? existingPermissionOverrides : permissions;
    const requestedChangedPermissionKeys = isPermissionsUpdate
      ? getChangedPermissionKeys(existingPermissionOverrides, permissions)
      : [];
    const permissionMutationAuthorization = authorizeUserPermissionMutation({
      actor: auth.user,
      existingPermissions: existingPermissionOverrides,
      existingRole: existingUser.role,
      isPermissionsUpdate,
      isRoleUpdate,
      permissionScope,
      requestedChangedPermissionKeys,
      resultingPermissions,
      resultingRole,
    });
    if (!permissionMutationAuthorization.success) {
      return permissionMutationAuthorization.response;
    }
    const {
      effectivelyGrantedPermissionKeys,
      effectivelyRevokedPermissionKeys,
      requiredProofLevel,
    } = permissionMutationAuthorization;

    const gainsTargetMfaPermission = effectivelyGrantedPermissionKeys.some(
      (permissionKey) =>
        getPermissionItem(permissionKey)?.requiresTargetMfa === true,
    );
    const hasCompleteMfa =
      existingUser.mfaEnabledAt !== null &&
      Boolean(existingUser.totpCredential);

    if (
      (isRoleUpdate || isPermissionsUpdate) &&
      gainsTargetMfaPermission &&
      !hasCompleteMfa
    ) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.CONFLICT,
            message:
              "L'utilisateur doit activer complètement sa double authentification avant de recevoir des accès critiques",
          },
          success: false,
        },
        { status: 409 },
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
      const beforePermissions = existingPermissionOverrides;
      const afterPermissions =
        permissions !== undefined ? permissions : beforePermissions;
      const afterPermissionsMap = toPermissionMap(afterPermissions);
      const unauthorizedPermissionKeys = new Set(
        requestedChangedPermissionKeys.flatMap((permissionKey) =>
          afterPermissionsMap.get(permissionKey) === true &&
          !hasPermission(auth.user.role, permissionKey, auth.user.permissions)
            ? [permissionKey]
            : [],
        ),
      );

      for (const permissionKey of effectivelyGrantedPermissionKeys) {
        if (
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

    const mutation = prepareUserUpdate(existingUser, {
      ...validation.data,
      permissions,
    });
    const { changedKeys, updateData } = mutation;
    // Only update if there are actual changes
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        data: {
          user: mapUserForActor(existingUser, auth.user),
        },
        success: true,
      });
    }

    if (requiredProofLevel === 'password') {
      const passwordProofCheck = requireRecentPasswordReauthentication(
        auth.session,
      );
      if (!passwordProofCheck.success) return passwordProofCheck.response;
    }
    if (changedKeys.includes('isActive') || changedKeys.includes('loginName')) {
      const proofCheck = requireRecentSensitiveActionProof(auth.session);
      if (!proofCheck.success) return proofCheck.response;
    }

    const updatedUser = await updateUserWithAudit({
      actorId: auth.user.id,
      authority: {
        actorId: auth.user.id,
        authorization: auth.user,
        session: auth.session,
      },
      effectivelyGrantedPermissionKeys,
      effectivelyRevokedPermissionKeys,
      existingUser,
      expectedUpdatedAt,
      mutation,
      requiredProof:
        changedKeys.includes('isActive') || changedKeys.includes('loginName')
          ? 'sensitive'
          : requiredProofLevel,
    });

    return NextResponse.json({
      data: {
        user: mapUserForActor(updatedUser, auth.user),
      },
      success: true,
    });
  } catch (error) {
    if (error instanceof LoginNameReservationConflictError) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Cet identifiant est déjà utilisé',
          },
          success: false,
        },
        { status: 409 },
      );
    }

    if (error instanceof UserActionAuthorizationError)
      return apiError(error.code, error.message, error.status);

    if (isPrismaOptimisticConflict(error)) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.CONFLICT,
            message:
              'Cette fiche a été modifiée entre-temps. Rechargez-la avant de réessayer.',
          },
          success: false,
        },
        { status: 409 },
      );
    }

    if (isPrismaUniqueConstraintError(error)) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.VALIDATION_ERROR,
            message: 'Cet identifiant est déjà utilisé',
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
// DELETE /api/users/[id] - Irreversibly delete and anonymize user
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
    const permCheck = requirePermission(
      auth.user,
      PERMISSIONS.USERS.DELETE_ACCOUNT,
    );
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
            message: 'Seul le compte racine peut supprimer un administrateur',
          },
          success: false,
        },
        { status: 403 },
      );
    }

    if (existingUser.isActive) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.CONFLICT,
            message:
              'Désactivez d’abord ce compte avant de le supprimer définitivement',
          },
          success: false,
        },
        { status: 409 },
      );
    }

    const proofCheck = requireRecentPasswordReauthentication(auth.session);
    if (!proofCheck.success) return proofCheck.response;

    await deleteUserPermanently({
      actorId: auth.user.id,
      actorIsProtected: auth.user.isProtected,
      authority: {
        actorId: auth.user.id,
        authorization: auth.user,
        session: auth.session,
      },
      expectedSecurityVersion: existingUser.securityVersion,
      expectedUpdatedAt: existingUser.updatedAt,
      userId: id,
    });

    return NextResponse.json({
      data: { message: 'Utilisateur supprimé définitivement' },
      success: true,
    });
  } catch (error) {
    if (error instanceof UserDeletionStateChangedError) {
      return NextResponse.json(
        {
          error: {
            code: ErrorCode.CONFLICT,
            message:
              'L’état, la sécurité ou le rôle de ce compte a changé. Rechargez la fiche avant de réessayer.',
          },
          success: false,
        },
        { status: 409 },
      );
    }

    if (error instanceof UserActionAuthorizationError)
      return apiError(error.code, error.message, error.status);

    return apiErrors.internal('USER_DELETE', error);
  }
}
