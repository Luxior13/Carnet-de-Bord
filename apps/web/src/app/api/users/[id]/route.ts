import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { FEATURES } from '$constants/feature-registry.constants';
import {
  arePermissionOverridesEqual,
  enforcePermissionDependencies,
  getAccessPermissionKeys,
  getAccountPermissionKeys,
  getNonAssignablePermissionKeys,
  getPermissionItem,
  getUnknownPermissionKeys,
  hasPermission,
  normalizePermissionOverrides,
  PERMISSIONS,
  resolvePermissionKey,
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
  createSecurityNotification,
  type SecurityNotificationKind,
} from '$server/security-notifications';
import {
  requireRecentPasswordReauthentication,
  requireRecentSensitiveActionProof,
} from '$server/sensitive-action';
import {
  deleteUserPermanently,
  UserDeletionStateChangedError,
} from '$server/user-deletion';
import {
  authorizeUserPermissionMutation,
  preauthorizeUserPermissionMutation,
} from '$server/user-permission-mutation-authorization';
import { protectUserIdentityForActor } from '$server/user-visibility';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';
import type { UserType } from '$types/auth.types';
import {
  loginNameSchema,
  optionalEmailSchema,
  trimmedStringMinMax,
} from '$utils/zod.utils';

type RouteParams = {
  params: Promise<{ id: string }>;
};

class LoginNameReservationConflictError extends Error {
  constructor() {
    super('Login name is permanently reserved by another user');
    this.name = 'LoginNameReservationConflictError';
  }
}

const USERS_PAGE_AUDIT_LOCATION = FEATURES.users.audit;

const ACCOUNT_PERMISSION_KEY_SET = new Set(getAccountPermissionKeys());
const ACCESS_PERMISSION_KEY_SET = new Set(getAccessPermissionKeys());

type PermissionScope = 'access' | 'account';

const getPermissionScopeKeySet = (
  permissionScope: PermissionScope,
): ReadonlySet<string> =>
  permissionScope === 'account'
    ? ACCOUNT_PERMISSION_KEY_SET
    : ACCESS_PERMISSION_KEY_SET;

const mergePermissionOverridesForScope = (
  existingPermissions: Record<string, boolean> | null,
  requestedPermissions: Record<string, boolean> | null,
  permissionScope: PermissionScope,
): Record<string, boolean> | null => {
  const scopePermissionKeys = getPermissionScopeKeySet(permissionScope);
  const mergedPermissions = new Map(
    Object.entries(normalizePermissionOverrides(existingPermissions) ?? {}),
  );

  for (const permissionKey of scopePermissionKeys) {
    mergedPermissions.delete(permissionKey);
  }

  for (const [permissionKey, enabled] of Object.entries(
    normalizePermissionOverrides(requestedPermissions) ?? {},
  )) {
    if (scopePermissionKeys.has(permissionKey)) {
      mergedPermissions.set(permissionKey, enabled);
    }
  }

  return normalizePermissionOverrides(
    Object.fromEntries(mergedPermissions) as Record<string, boolean>,
  );
};

const getPermissionOverridesForActor = (
  permissions: Record<string, boolean> | null,
  actor: UserType,
): Record<string, boolean> | null => {
  const normalizedPermissions = normalizePermissionOverrides(permissions);

  if (actor.isProtected) return normalizedPermissions;

  const visiblePermissionKeys = new Set<string>();

  if (
    hasPermission(actor.role, PERMISSIONS.USERS.VIEW_ACCESS, actor.permissions)
  ) {
    for (const permissionKey of ACCESS_PERMISSION_KEY_SET) {
      visiblePermissionKeys.add(permissionKey);
    }
  }

  if (
    hasPermission(
      actor.role,
      PERMISSIONS.USERS.VIEW_ACCOUNT_POLICY,
      actor.permissions,
    )
  ) {
    for (const permissionKey of ACCOUNT_PERMISSION_KEY_SET) {
      visiblePermissionKeys.add(permissionKey);
    }
  }

  if (visiblePermissionKeys.size === 0) return null;

  return normalizePermissionOverrides(
    Object.fromEntries(
      Object.entries(normalizedPermissions ?? {}).filter(([permissionKey]) =>
        visiblePermissionKeys.has(permissionKey),
      ),
    ),
  );
};

type UserWithCriticalAccessReadiness = Parameters<
  typeof mapUserToUserType
>[0] & {
  totpCredential?: { userId: string } | null;
};

const mapUserForActor = (
  user: UserWithCriticalAccessReadiness,
  actor: UserType,
): UserType => {
  const clientUser = mapUserToUserType(user);
  const canViewContact =
    actor.id === clientUser.id ||
    actor.isProtected ||
    hasPermission(
      actor.role,
      PERMISSIONS.USERS.VIEW_CONTACT,
      actor.permissions,
    ) ||
    hasPermission(
      actor.role,
      PERMISSIONS.USERS.UPDATE_CONTACT,
      actor.permissions,
    );
  const canViewSecurity =
    actor.id === clientUser.id ||
    actor.isProtected ||
    hasPermission(
      actor.role,
      PERMISSIONS.USERS.VIEW_SECURITY,
      actor.permissions,
    );

  return protectUserIdentityForActor(
    {
      ...clientUser,
      criticalAccessReady:
        clientUser.mfaEnabledAt !== null && Boolean(user.totpCredential),
      ...(canViewContact
        ? {}
        : { contactEmail: null, contactEmailVerifiedAt: null }),
      ...(canViewSecurity
        ? { securityDetailsVisible: true }
        : {
            failedLoginAttempts: 0,
            lockedUntil: null,
            mfaEnabledAt: null,
            mustChangePassword: false,
            passwordChangedAt: null,
            securityDetailsVisible: false,
          }),
      permissions: getPermissionOverridesForActor(
        clientUser.permissions,
        actor,
      ),
    },
    actor,
  );
};

const isPrismaOptimisticConflict = (error: unknown): boolean =>
  !!error &&
  typeof error === 'object' &&
  'code' in error &&
  error.code === 'P2025';

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
      include: { totpCredential: { select: { userId: true } } },
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
        user: mapUserForActor(user, auth.user),
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
    if (unknownPermissionKeys.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Permission inconnue: ${unknownPermissionKeys.join(', ')}`,
      });
    }

    const nonAssignablePermissionKeys = getNonAssignablePermissionKeys(value);
    if (nonAssignablePermissionKeys.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Permission non attribuable: ${nonAssignablePermissionKeys.join(', ')}`,
      });
    }
  });

const updateUserSchema = z
  .object({
    contactEmail: optionalEmailSchema,
    expectedUpdatedAt: z
      .string()
      .datetime({ offset: true })
      .transform((value) => new Date(value))
      .optional(),
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
    loginName: loginNameSchema.optional(),
    permissions: permissionsSchema,
    permissionScope: z.enum(['access', 'account']).optional(),
    role: z.enum(['ADMIN', 'USER']).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.permissions !== undefined ||
        value.role !== undefined ||
        value.loginName !== undefined ||
        value.contactEmail !== undefined) &&
      value.expectedUpdatedAt === undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message:
          'La version de la fiche est requise pour modifier les informations sensibles',
        path: ['expectedUpdatedAt'],
      });
    }

    if (
      value.permissionScope !== undefined &&
      value.permissions === undefined
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Le scope exige un payload de permissions',
        path: ['permissionScope'],
      });
    }

    if (value.permissionScope === 'account' && value.role !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Le rôle appartient au scope d'accès",
        path: ['role'],
      });
    }

    if (
      value.permissions === undefined ||
      value.permissionScope === undefined
    ) {
      return;
    }

    const scopePermissionKeys = getPermissionScopeKeySet(value.permissionScope);
    const outOfScopePermissionKeys = Object.keys(
      value.permissions ?? {},
    ).filter((permissionKey) => {
      const canonicalPermissionKeys = resolvePermissionKey(permissionKey);

      return (
        canonicalPermissionKeys.length > 0 &&
        canonicalPermissionKeys.some(
          (canonicalPermissionKey) =>
            !scopePermissionKeys.has(canonicalPermissionKey),
        )
      );
    });

    if (outOfScopePermissionKeys.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Permission hors scope: ${outOfScopePermissionKeys.join(', ')}`,
        path: ['permissions'],
      });
    }
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
      include: { totpCredential: { select: { userId: true } } },
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

    const existingPermissionOverrides = normalizePermissionOverrides(
      existingUser.permissions as Record<string, boolean> | null,
    );
    const mergedPermissions = isPermissionsUpdate
      ? permissionScope
        ? mergePermissionOverridesForScope(
            existingPermissionOverrides,
            normalizedRequestedPermissions ?? null,
            permissionScope,
          )
        : (normalizedRequestedPermissions ?? null)
      : undefined;
    const resultingRole = role ?? existingUser.role;
    const permissions =
      isPermissionsUpdate || isRoleUpdate
        ? enforcePermissionDependencies(
            resultingRole,
            mergedPermissions === undefined
              ? existingPermissionOverrides
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

    // Build update data and track changes
    const updateData: Record<string, unknown> = {};
    const beforeValues: Record<string, unknown> = {};
    const afterValues: Record<string, unknown> = {};

    if (loginName && loginName !== existingUser.loginName) {
      beforeValues.loginName = existingUser.loginName;
      afterValues.loginName = loginName;
      updateData.loginName = loginName;
    }
    if (contactEmail !== undefined) {
      const newContactEmail = contactEmail ?? null;
      if (newContactEmail !== existingUser.contactEmail) {
        beforeValues.contactEmail = existingUser.contactEmail;
        afterValues.contactEmail = newContactEmail;
        updateData.contactEmail = newContactEmail;
        // An administrator can record a contact address, but only a future
        // proof-of-control flow may mark it as verified.
        updateData.contactEmailVerifiedAt = null;
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
      // Only track if actually changed
      if (
        !arePermissionOverridesEqual(permissions, existingPermissionOverrides)
      ) {
        beforeValues.permissions = existingPermissionOverrides;
        afterValues.permissions = permissions;
        updateData.permissions = permissions ?? Prisma.DbNull;
      }
    }
    // Only update if there are actual changes
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({
        data: {
          user: mapUserForActor(existingUser, auth.user),
        },
        success: true,
      });
    }

    const changedKeys = Object.keys(afterValues);
    const hasAuthorizationChange =
      changedKeys.includes('permissions') || changedKeys.includes('role');
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

    // Build target name for audit log
    const targetName =
      existingUser.firstName && existingUser.lastName
        ? `${existingUser.firstName} ${existingUser.lastName}`
        : existingUser.loginName;
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
      ? { tabKey: 'account', tabLabel: 'Autonomie du compte' }
      : { tabKey: 'access', tabLabel: 'Autorisations' };

    const updatedLoginName =
      typeof updateData.loginName === 'string'
        ? updateData.loginName
        : existingUser.loginName;
    const auditEntries: AuditLogInput[] = [];

    if (changedKeys.includes('isActive') && isActive === false) {
      auditEntries.push({
        action: 'USER_DEACTIVATE',
        category: 'USER',
        description: `Utilisateur désactivé: ${updatedLoginName}`,
        metadata: {
          after: afterValues,
          before: beforeValues,
          ...USERS_PAGE_AUDIT_LOCATION,
          tabKey: 'security',
          tabLabel: 'Sécurité',
          targetName,
        },
        targetUserId: id,
        userId: auth.user.id,
      });
    } else if (changedKeys.includes('isActive') && isActive === true) {
      auditEntries.push({
        action: 'USER_ACTIVATE',
        category: 'USER',
        description: `Utilisateur réactivé: ${updatedLoginName}`,
        metadata: {
          after: afterValues,
          before: beforeValues,
          ...USERS_PAGE_AUDIT_LOCATION,
          tabKey: 'security',
          tabLabel: 'Sécurité',
          targetName,
        },
        targetUserId: id,
        userId: auth.user.id,
      });
    }

    if (hasAuthorizationChange) {
      auditEntries.push({
        action: 'PERMISSION_UPDATE',
        category: 'PERMISSION',
        description: `Autorisations modifiées : ${updatedLoginName}`,
        metadata: {
          after: afterValues,
          before: beforeValues,
          changes: changedKeys,
          effectivelyGrantedPermissionKeys,
          effectivelyRevokedPermissionKeys,
          ...USERS_PAGE_AUDIT_LOCATION,
          ...permissionAuditTab,
          targetName,
        },
        targetUserId: id,
        userId: auth.user.id,
      });
    }

    if (auditEntries.length === 0) {
      auditEntries.push({
        action: 'USER_UPDATE',
        category: 'USER',
        description: `Utilisateur modifié: ${updatedLoginName}`,
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
      });
    }

    const hasAccessPermissionChange = changedPermissionKeys.some(
      (permissionKey) => ACCESS_PERMISSION_KEY_SET.has(permissionKey),
    );
    const shouldInvalidateSessions =
      (changedKeys.includes('isActive') && isActive === false) ||
      changedKeys.includes('loginName') ||
      changedKeys.includes('role') ||
      hasAccessPermissionChange;

    const securityNotificationKind: SecurityNotificationKind | null =
      changedKeys.includes('isActive')
        ? isActive
          ? 'ACCOUNT_ACTIVATED'
          : 'ACCOUNT_DEACTIVATED'
        : hasAuthorizationChange
          ? 'ACCESS_CHANGED'
          : changedKeys.includes('loginName')
            ? 'LOGIN_NAME_CHANGED'
            : changedKeys.includes('contactEmail')
              ? 'CONTACT_EMAIL_CHANGED'
              : null;

    if (shouldInvalidateSessions) {
      updateData.securityVersion = { increment: 1 };
    }

    const updatedUser = await prisma.$transaction(async (transaction) => {
      if (changedKeys.includes('loginName')) {
        const reservation = await transaction.loginNameReservation.findUnique({
          where: { loginName: updatedLoginName },
        });

        if (reservation && reservation.userId !== id) {
          throw new LoginNameReservationConflictError();
        }

        // Returning to one of this user's former names is allowed. A brand-new
        // name is reserved before the User update, and the whole reservation
        // rolls back if optimistic concurrency or auditing later fails.
        if (!reservation) {
          await transaction.loginNameReservation.create({
            data: { loginName: updatedLoginName, userId: id },
          });
        }
      }

      const nextUser = await transaction.user.update({
        data: updateData,
        include: { totpCredential: { select: { userId: true } } },
        where: {
          id,
          securityVersion: existingUser.securityVersion,
          updatedAt: expectedUpdatedAt ?? existingUser.updatedAt,
        },
      });

      if (shouldInvalidateSessions) {
        await transaction.session.deleteMany({ where: { userId: id } });
      }

      for (const auditEntry of auditEntries) {
        await createAuditLogWithHeaders(auditEntry, {
          client: transaction,
          required: true,
        });
      }
      if (securityNotificationKind) {
        await createSecurityNotification(
          {
            actorUserId: auth.user.id,
            kind: securityNotificationKind,
            recipientUserId: id,
          },
          transaction,
        );
      }

      return nextUser;
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

    return apiErrors.internal('USER_DELETE', error);
  }
}
