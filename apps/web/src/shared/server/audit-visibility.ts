import 'server-only';

import type { AuditAction, AuditCategory } from '@repo/database';

import { isKnownPermissionKey } from '$constants/permissions.constants';

const PUBLIC_LOCATION_METADATA_KEYS = new Set([
  'pageKey',
  'pageLabel',
  'poleKey',
  'poleLabel',
  'tabKey',
  'tabLabel',
]);

const PUBLIC_METADATA_KEYS = new Set([
  ...PUBLIC_LOCATION_METADATA_KEYS,
  'after',
  'before',
  'changes',
]);

const SENSITIVE_METADATA_KEYS = new Set([
  ...PUBLIC_METADATA_KEYS,
  'adminRecovery',
  'authenticationMethod',
  'contactEmailVerificationReset',
  'createdUserId',
  'deletedUserId',
  'filters',
  'format',
  'generatedAt',
  'loginName',
  'passwordChange',
  'passwordReset',
  'reason',
  'recoveryCodesGenerated',
  'replacing',
  'revocationScope',
  'revokedSessions',
  'role',
  'rowCount',
  'sessionId',
  'snapshotAt',
  'targetName',
  'truncated',
]);

const SECRET_KEY_PATTERN =
  /access.?key|api.?key|authorization|cookie|credential|hash|otp|passphrase|password|private.?key|recovery.?code|refresh|secret|seed|token|totp/i;
const DIFF_FIELD_KEYS = new Set([
  'contactEmail',
  'firstName',
  'isActive',
  'lastName',
  'loginName',
  'permissions',
  'role',
]);
const PUBLIC_DIFF_FIELD_KEYS = new Set(['firstName', 'isActive', 'lastName']);
const STRING_DIFF_FIELD_KEYS = new Set([
  'contactEmail',
  'firstName',
  'lastName',
  'loginName',
]);
const MAX_METADATA_DEPTH = 6;
const MAX_METADATA_ARRAY_ENTRIES = 100;
const MAX_METADATA_OBJECT_KEYS = 100;
const MAX_METADATA_STRING_LENGTH = 4_000;

const PUBLIC_DESCRIPTIONS: Partial<Record<AuditAction, string>> = {
  ACCOUNT_LOCKED: 'Compte verrouillé',
  AUDIT_EXPORT: "Journal d'activité exporté",
  LOGIN_FAILED: 'Tentative de connexion échouée',
  LOGIN_SUCCESS: 'Connexion réussie',
  LOGOUT: 'Déconnexion',
  MFA_DISABLED: 'Double authentification désactivée',
  MFA_ENABLED: 'Double authentification activée',
  MFA_RECOVERY_CODE_USED: 'Code de secours utilisé',
  MFA_RECOVERY_CODES_REGENERATED: 'Codes de secours renouvelés',
  MFA_RESET: 'Double authentification réinitialisée',
  PASSWORD_CHANGE: 'Mot de passe modifié',
  PASSWORD_RESET: 'Mot de passe réinitialisé',
  PERMISSION_UPDATE: 'Autorisations modifiées',
  SESSION_INVALIDATE: 'Sessions révoquées',
  STEP_UP_FAILED: 'Échec de confirmation renforcée',
  STEP_UP_SUCCESS: 'Confirmation renforcée réussie',
  USER_ACTIVATE: 'Compte activé',
  USER_CREATE: 'Compte utilisateur créé',
  USER_DEACTIVATE: 'Compte désactivé',
  USER_DELETE: 'Compte utilisateur supprimé',
  USER_UPDATE: 'Compte utilisateur modifié',
};

const CATEGORY_DESCRIPTIONS: Record<AuditCategory, string> = {
  AUTH: "Événement d'authentification",
  PERMISSION: "Modification d'autorisation",
  SYSTEM: 'Événement système',
  USER: 'Événement utilisateur',
};

const toRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  return value as Record<string, unknown>;
};

const sanitizeMetadataValue = (value: unknown, depth: number): unknown => {
  if (depth > MAX_METADATA_DEPTH) return undefined;
  if (
    value === null ||
    typeof value === 'boolean' ||
    typeof value === 'number'
  ) {
    return value;
  }
  if (typeof value === 'string') {
    return value.slice(0, MAX_METADATA_STRING_LENGTH);
  }
  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_METADATA_ARRAY_ENTRIES)
      .map((entry) => sanitizeMetadataValue(entry, depth + 1))
      .filter((entry) => entry !== undefined);
  }

  const record = toRecord(value);
  if (!record) return undefined;

  return Object.fromEntries(
    Object.entries(record)
      .slice(0, MAX_METADATA_OBJECT_KEYS)
      .flatMap(([key, entryValue]) => {
        if (SECRET_KEY_PATTERN.test(key)) return [];

        const sanitizedValue = sanitizeMetadataValue(entryValue, depth + 1);

        return sanitizedValue === undefined ? [] : [[key, sanitizedValue]];
      }),
  );
};

const sanitizePermissionDiff = (value: unknown): unknown => {
  if (value === null) return null;

  const permissions = toRecord(value);
  if (!permissions) return undefined;

  return Object.fromEntries(
    Object.entries(permissions).flatMap(([permissionKey, enabled]) =>
      isKnownPermissionKey(permissionKey) && typeof enabled === 'boolean'
        ? [[permissionKey, enabled]]
        : [],
    ),
  );
};

const sanitizeDiffFieldValue = (field: string, value: unknown): unknown => {
  if (field === 'permissions') return sanitizePermissionDiff(value);
  if (STRING_DIFF_FIELD_KEYS.has(field)) {
    return typeof value === 'string' ||
      (field === 'contactEmail' && value === null)
      ? value
      : undefined;
  }
  if (field === 'isActive') {
    return typeof value === 'boolean' ? value : undefined;
  }
  if (field === 'role') {
    return value === 'ADMIN' || value === 'USER' ? value : undefined;
  }

  return undefined;
};

const sanitizeDiffObject = (
  value: unknown,
  allowedFieldKeys: ReadonlySet<string> = DIFF_FIELD_KEYS,
): Record<string, unknown> | null => {
  const diff = toRecord(value);
  if (!diff) return null;

  const sanitizedDiff = Object.fromEntries(
    Object.entries(diff).flatMap(([field, entryValue]) => {
      if (!allowedFieldKeys.has(field)) return [];

      const change = toRecord(entryValue);
      if (change && ('from' in change || 'to' in change)) {
        const from = sanitizeDiffFieldValue(field, change.from);
        const to = sanitizeDiffFieldValue(field, change.to);

        return [
          [
            field,
            {
              ...(from !== undefined ? { from } : {}),
              ...(to !== undefined ? { to } : {}),
            },
          ],
        ];
      }

      const sanitizedValue = sanitizeDiffFieldValue(field, entryValue);

      return sanitizedValue === undefined ? [] : [[field, sanitizedValue]];
    }),
  );

  return Object.keys(sanitizedDiff).length > 0 ? sanitizedDiff : null;
};

const sanitizeChanges = (
  value: unknown,
  allowedFieldKeys: ReadonlySet<string> = DIFF_FIELD_KEYS,
): unknown => {
  if (Array.isArray(value)) {
    const sanitizedChanges = value.filter(
      (entry): entry is string =>
        typeof entry === 'string' && allowedFieldKeys.has(entry),
    );

    return sanitizedChanges.length > 0 ? sanitizedChanges : undefined;
  }

  return sanitizeDiffObject(value, allowedFieldKeys);
};

/**
 * Audit metadata is allowlisted even for privileged readers. This prevents a
 * future writer from accidentally exposing a token or credential through the
 * journal UI.
 */
export const sanitizeAuditMetadata = (
  value: unknown,
  canViewSensitiveDetails: boolean,
): Record<string, unknown> | null => {
  const metadata = toRecord(value);
  if (!metadata) return null;

  const allowedKeys = canViewSensitiveDetails
    ? SENSITIVE_METADATA_KEYS
    : PUBLIC_METADATA_KEYS;
  const sanitizedMetadata = Object.fromEntries(
    Object.entries(metadata).flatMap(([key, entryValue]) => {
      if (!allowedKeys.has(key)) return [];
      if (
        !canViewSensitiveDetails &&
        PUBLIC_LOCATION_METADATA_KEYS.has(key) &&
        (typeof entryValue !== 'string' || entryValue.trim().length === 0)
      ) {
        return [];
      }

      const sanitizedValue =
        key === 'after' || key === 'before'
          ? sanitizeDiffObject(
              entryValue,
              canViewSensitiveDetails
                ? DIFF_FIELD_KEYS
                : PUBLIC_DIFF_FIELD_KEYS,
            )
          : key === 'changes'
            ? sanitizeChanges(
                entryValue,
                canViewSensitiveDetails
                  ? DIFF_FIELD_KEYS
                  : PUBLIC_DIFF_FIELD_KEYS,
              )
            : sanitizeMetadataValue(entryValue, 1);

      return sanitizedValue === undefined || sanitizedValue === null
        ? []
        : [[key, sanitizedValue]];
    }),
  );

  return Object.keys(sanitizedMetadata).length > 0 ? sanitizedMetadata : null;
};

export const getVisibleAuditDescription = (options: {
  action: AuditAction;
  canViewSensitiveDetails: boolean;
  category: AuditCategory;
  description: string;
}): string =>
  options.canViewSensitiveDetails
    ? options.description.slice(0, 4_000)
    : (PUBLIC_DESCRIPTIONS[options.action] ??
      CATEGORY_DESCRIPTIONS[options.category]);
