import { z } from 'zod';

import {
  getAccessPermissionKeys,
  getAccountPermissionKeys,
  getNonAssignablePermissionKeys,
  getUnknownPermissionKeys,
  normalizePermissionOverrides,
  resolvePermissionKey,
} from '$constants/permissions.constants';
import {
  loginNameSchema,
  optionalEmailSchema,
  trimmedStringMinMax,
} from '$utils/zod.utils';

const ACCOUNT_PERMISSION_KEY_SET = new Set(getAccountPermissionKeys());
const ACCESS_PERMISSION_KEY_SET = new Set(getAccessPermissionKeys());

type PermissionScope = 'access' | 'account';

export const getPermissionScopeKeySet = (
  permissionScope: PermissionScope,
): ReadonlySet<string> =>
  permissionScope === 'account'
    ? ACCOUNT_PERMISSION_KEY_SET
    : ACCESS_PERMISSION_KEY_SET;

export const mergePermissionOverridesForScope = (
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

export const toPermissionMap = (value: unknown): Map<string, boolean> => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return new Map();
  }

  return new Map(
    Object.entries(value).flatMap(([permissionKey, enabled]) =>
      typeof enabled === 'boolean' ? [[permissionKey, enabled] as const] : [],
    ),
  );
};

export const getChangedPermissionKeys = (
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

export const updateUserSchema = z
  .object({
    contactEmail: optionalEmailSchema,
    expectedUpdatedAt: z
      .string({ error: 'La version de la fiche est requise' })
      .datetime({ offset: true })
      .transform((value) => new Date(value)),
    firstName: trimmedStringMinMax(
      1,
      50,
      'Prénom requis',
      'Prénom trop long',
    ).optional(),
    isActive: z.boolean().optional(),
    lastName: trimmedStringMinMax(0, 50, undefined, 'Nom trop long').optional(),
    loginName: loginNameSchema.optional(),
    permissions: permissionsSchema,
    permissionScope: z.enum(['access', 'account']).optional(),
    role: z.enum(['ADMIN', 'USER']).optional(),
  })
  .strict()
  .superRefine((value, context) => {
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

export type UserUpdateInput = z.infer<typeof updateUserSchema>;
