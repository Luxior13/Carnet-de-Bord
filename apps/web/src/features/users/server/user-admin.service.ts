import 'server-only';

import { FEATURES } from '$constants/feature-registry.constants';
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
import type { CreateUserInput } from '$features/users/create-user.schema';
import {
  getChangedPermissionKeys,
  getPermissionScopeKeySet,
  mergePermissionOverridesForScope,
  toPermissionMap,
  type UserUpdateInput,
} from '$features/users/user-update.schema';
import { assertPermission } from '$server/api-auth';
import { isPrismaUniqueConstraintError } from '$server/api-response';
import { prisma } from '$server/prisma';
import {
  assertRecentPasswordReauthentication,
  assertRecentSensitiveActionProof,
} from '$server/sensitive-action';
import { ServiceError, serviceErrors } from '$server/service-error';
import { generateTemporaryPassword } from '$server/temporary-password';
import {
  deleteUserPermanently,
  UserDeletionStateChangedError,
} from '$server/user-deletion';
import {
  authorizeUserPermissionMutation,
  preauthorizeUserPermissionMutation,
} from '$server/user-permission-mutation-authorization';
import { mapUserToUserType } from '$server/user-projection';
import { ErrorCode } from '$types/api.types';
import type { SessionType, UserType } from '$types/auth.types';

import { createUser } from './user-create.service';
import { mapUserForActor, USER_DETAIL_SELECT } from './user-detail.service';
import {
  LoginNameReservationConflictError,
  prepareUserUpdate,
  updateUserWithAudit,
} from './user-update.service';

type AdminActor = {
  actor: UserType;
  session: SessionType | null;
};

const USER_NOT_FOUND_MESSAGE = 'Utilisateur non trouvé';
const STALE_RECORD_MESSAGE =
  'Cette fiche a été modifiée entre-temps. Rechargez-la avant de réessayer.';

const isPrismaOptimisticConflict = (error: unknown): boolean =>
  !!error &&
  typeof error === 'object' &&
  'code' in error &&
  error.code === 'P2025';

const LOGIN_NAME_TAKEN_MESSAGE = 'Cet identifiant est déjà utilisé';

const loginNameTaken = (
  status: number,
  details?: Record<string, string[]>,
): ServiceError =>
  new ServiceError(
    ErrorCode.VALIDATION_ERROR,
    LOGIN_NAME_TAKEN_MESSAGE,
    status,
    {
      details,
    },
  );
const creationLoginNameTaken = (status: number): ServiceError =>
  loginNameTaken(status, { loginName: [LOGIN_NAME_TAKEN_MESSAGE] });

/**
 * Creates an account with a temporary password shown once. An ADMIN account
 * is reserved to the root and needs a fresh sensitive-action proof; the
 * transaction repeats both checks. Throws `ServiceError` refusals.
 */
export const createUserForActor = async (
  { actor, session }: AdminActor,
  input: CreateUserInput,
): Promise<{ temporaryPassword: string; user: UserType }> => {
  const { contactEmail, firstName, lastName, loginName, role } = input;
  // Creation holds the identity; a contact address needs the right to edit
  // contact addresses, like the Directory (audit DRT-03, 25 October 2026).
  if (contactEmail) assertPermission(actor, PERMISSIONS.USERS.UPDATE_CONTACT);
  if (role === 'ADMIN' && !actor.isProtected) {
    throw serviceErrors.forbidden(
      "Vous n'êtes pas autorisé à créer des comptes administrateurs",
    );
  }
  const existingUser = await prisma.user.findUnique({
    select: { id: true },
    where: { loginName },
  });
  if (existingUser) throw creationLoginNameTaken(400);
  if (role === 'ADMIN') assertRecentSensitiveActionProof(session);

  const temporaryPassword = generateTemporaryPassword();
  try {
    const newUser = await createUser(
      {
        contactEmail: contactEmail ?? null,
        firstName,
        lastName,
        loginName,
        password: temporaryPassword,
        role,
      },
      { actorId: actor.id, session },
      (createdUser) => ({
        action: 'USER_CREATE',
        category: 'USER',
        description: `Utilisateur créé: ${createdUser.loginName}`,
        metadata: {
          createdUserId: createdUser.id,
          loginName: createdUser.loginName,
          ...FEATURES.users.audit,
          role: createdUser.role,
          tabKey: 'creation',
          tabLabel: 'Création',
        },
        targetUserId: createdUser.id,
        userId: actor.id,
      }),
    );

    return { temporaryPassword, user: mapUserToUserType(newUser) };
  } catch (error) {
    if (isPrismaUniqueConstraintError(error)) throw creationLoginNameTaken(409);
    throw error;
  }
};

/**
 * Delegated administration update of another account. Every refusal is
 * decided before the target state is disclosed, then repeated under the user
 * lock by `updateUserWithAudit`. Throws `ServiceError` refusals.
 */
export const updateUserForActor = async (
  { actor, session }: AdminActor,
  userId: string,
  input: UserUpdateInput,
): Promise<UserType> => {
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
  } = input;
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
    throw serviceErrors.validation('Aucune modification fournie');
  }

  if (isProfileUpdate)
    assertPermission(actor, PERMISSIONS.USERS.UPDATE_PROFILE);
  if (isLoginUpdate) assertPermission(actor, PERMISSIONS.USERS.UPDATE_LOGIN);
  if (isContactUpdate)
    assertPermission(actor, PERMISSIONS.USERS.UPDATE_CONTACT);
  if (isStatusUpdate) assertPermission(actor, PERMISSIONS.USERS.UPDATE_STATUS);
  if (isRoleUpdate && !actor.isProtected)
    throw serviceErrors.forbidden('Seul le superadmin peut modifier un rôle');
  if (isPermissionsUpdate)
    preauthorizeUserPermissionMutation(actor, permissionScope);

  const existingUser = await prisma.user.findUnique({
    select: USER_DETAIL_SELECT,
    where: { deletedAt: null, id: userId },
  });
  if (!existingUser) throw serviceErrors.notFound(USER_NOT_FOUND_MESSAGE);

  // The singleton root is owned by its authenticated identity. No other
  // account, permission override or future protected role may mutate it.
  if (existingUser.isProtected && existingUser.id !== actor.id) {
    throw serviceErrors.forbidden(
      'Le superadmin ne peut pas être modifié par un autre utilisateur',
    );
  }

  // Root identity, contact, status, role and access policy remain reserved
  // for the dedicated self-service or offline recovery flows.
  if (
    existingUser.isProtected &&
    existingUser.id === actor.id &&
    (isContactUpdate ||
      isLoginUpdate ||
      isPermissionsUpdate ||
      isRoleUpdate ||
      isStatusUpdate)
  ) {
    throw serviceErrors.forbidden(
      "Les paramètres sensibles du superadmin ne sont pas modifiables depuis l'application",
    );
  }

  // Personal identity and contact changes have one canonical route:
  // /api/auth/me (and the re-authenticated contact endpoint). The delegated
  // administration endpoint must not become a second self-service path,
  // even for a privileged actor.
  if (
    existingUser.id === actor.id &&
    (isProfileUpdate || isLoginUpdate || isContactUpdate)
  ) {
    throw serviceErrors.forbidden(
      "Votre profil personnel ne peut pas être modifié depuis l'administration. Utilisez Mon compte.",
    );
  }

  // Refuse every delegated mutation of another ADMIN before evaluating
  // target MFA or other state, so the response cannot disclose posture.
  if (existingUser.role === 'ADMIN' && !actor.isProtected) {
    throw serviceErrors.forbidden(
      'Seul le superadmin peut modifier un administrateur',
    );
  }

  if (
    expectedUpdatedAt &&
    expectedUpdatedAt.getTime() !== existingUser.updatedAt.getTime()
  ) {
    throw serviceErrors.conflict(STALE_RECORD_MESSAGE);
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
    throw serviceErrors.validation(
      'Un administrateur possède toutes les autorisations administratives',
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
  const {
    effectivelyGrantedPermissionKeys,
    effectivelyRevokedPermissionKeys,
    requiredProofLevel,
  } = authorizeUserPermissionMutation({
    actor,
    existingPermissions: existingPermissionOverrides,
    existingRole: existingUser.role,
    isPermissionsUpdate,
    isRoleUpdate,
    permissionScope,
    requestedChangedPermissionKeys,
    resultingPermissions,
    resultingRole,
  });

  const gainsTargetMfaPermission = effectivelyGrantedPermissionKeys.some(
    (permissionKey) =>
      getPermissionItem(permissionKey)?.requiresTargetMfa === true,
  );
  const hasCompleteMfa =
    existingUser.mfaEnabledAt !== null && Boolean(existingUser.totpCredential);
  if (
    (isRoleUpdate || isPermissionsUpdate) &&
    gainsTargetMfaPermission &&
    !hasCompleteMfa
  ) {
    throw serviceErrors.conflict(
      "L'utilisateur doit activer complètement sa double authentification avant de recevoir des accès critiques",
    );
  }

  if (isActive === false && existingUser.id === actor.id) {
    throw serviceErrors.forbidden(
      'Vous ne pouvez pas désactiver votre propre compte',
    );
  }
  if (
    isPermissionsUpdate &&
    existingUser.id === actor.id &&
    !actor.isProtected
  ) {
    throw serviceErrors.forbidden(
      'Vous ne pouvez pas modifier vos propres permissions',
    );
  }

  if (!actor.isProtected && (isPermissionsUpdate || isRoleUpdate)) {
    const afterPermissionsMap = toPermissionMap(
      permissions !== undefined ? permissions : existingPermissionOverrides,
    );
    const lacksPermission = (permissionKey: string): boolean =>
      !hasPermission(actor.role, permissionKey, actor.permissions);
    const grantsUnheldPermission =
      requestedChangedPermissionKeys.some(
        (permissionKey) =>
          afterPermissionsMap.get(permissionKey) === true &&
          lacksPermission(permissionKey),
      ) || effectivelyGrantedPermissionKeys.some(lacksPermission);
    if (grantsUnheldPermission) {
      throw serviceErrors.forbidden(
        'Vous ne pouvez pas accorder une permission que vous ne possedez pas',
      );
    }
  }

  const mutation = prepareUserUpdate(existingUser, { ...input, permissions });
  const { changedKeys, updateData } = mutation;
  if (Object.keys(updateData).length === 0)
    return mapUserForActor(existingUser, actor);

  const changesSensitiveIdentity =
    changedKeys.includes('isActive') || changedKeys.includes('loginName');
  if (requiredProofLevel === 'password')
    assertRecentPasswordReauthentication(session);
  if (changesSensitiveIdentity) assertRecentSensitiveActionProof(session);

  try {
    const updatedUser = await updateUserWithAudit({
      actorId: actor.id,
      authority: { actorId: actor.id, authorization: actor, session },
      effectivelyGrantedPermissionKeys,
      effectivelyRevokedPermissionKeys,
      existingUser,
      expectedUpdatedAt,
      mutation,
      requiredProof: changesSensitiveIdentity
        ? 'sensitive'
        : requiredProofLevel,
    });

    return mapUserForActor(updatedUser, actor);
  } catch (error) {
    if (error instanceof LoginNameReservationConflictError)
      throw loginNameTaken(409);
    if (isPrismaOptimisticConflict(error))
      throw serviceErrors.conflict(STALE_RECORD_MESSAGE);
    if (isPrismaUniqueConstraintError(error)) throw loginNameTaken(409);
    throw error;
  }
};

/**
 * Irreversibly deletes and anonymizes a deactivated account. The route has
 * already checked `users:delete_account`; the transaction checks it again.
 * Throws `ServiceError` refusals.
 */
export const deleteUserForActor = async (
  { actor, session }: AdminActor,
  userId: string,
): Promise<void> => {
  const existingUser = await prisma.user.findUnique({
    where: { deletedAt: null, id: userId },
  });
  if (!existingUser) throw serviceErrors.notFound(USER_NOT_FOUND_MESSAGE);
  if (existingUser.id === actor.id) {
    throw serviceErrors.forbidden(
      'Vous ne pouvez pas supprimer votre propre compte',
    );
  }
  if (existingUser.isProtected) {
    throw serviceErrors.forbidden(
      'Ce compte est protégé et ne peut pas être supprimé',
    );
  }
  if (existingUser.role === 'ADMIN' && !actor.isProtected) {
    throw serviceErrors.forbidden(
      'Seul le superadmin peut supprimer un administrateur',
    );
  }
  if (existingUser.isActive) {
    throw serviceErrors.conflict(
      'Désactivez d’abord ce compte avant de le supprimer définitivement',
    );
  }
  assertRecentPasswordReauthentication(session);

  try {
    await deleteUserPermanently({
      actorId: actor.id,
      actorIsProtected: actor.isProtected,
      authority: { actorId: actor.id, authorization: actor, session },
      expectedSecurityVersion: existingUser.securityVersion,
      expectedUpdatedAt: existingUser.updatedAt,
      userId,
    });
  } catch (error) {
    if (error instanceof UserDeletionStateChangedError) {
      throw serviceErrors.conflict(
        'L’état, la sécurité ou le rôle de ce compte a changé. Rechargez la fiche avant de réessayer.',
      );
    }
    throw error;
  }
};
