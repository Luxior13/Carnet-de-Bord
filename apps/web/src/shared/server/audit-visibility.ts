import 'server-only';

import type { AuditAction, AuditCategory } from '@repo/database';

import { isHistoricalAuditPermissionKey } from '$constants/permissions.constants';

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
  'deletionVersion',
  'irreversible',
]);

const SENSITIVE_METADATA_KEYS = new Set([
  ...PUBLIC_METADATA_KEYS,
  'adminRecovery',
  'attempts',
  'authenticationMethod',
  'archivedUserId',
  'contactEmailVerificationReset',
  'createdUserId',
  'effectivelyGrantedPermissionKeys',
  'effectivelyRevokedPermissionKeys',
  'filters',
  'format',
  'generatedAt',
  'jobId',
  'loginName',
  'maxAttempts',
  'notificationId',
  'passwordChange',
  'passwordReset',
  'reason',
  'recipientCount',
  'recoveryCodesGenerated',
  'replacing',
  'revocationScope',
  'revokedSessions',
  'role',
  'rowCount',
  'sessionId',
  'snapshotAt',
  'settingKey',
  'status',
  'targetName',
  'truncated',
  'type',
  'phase',
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
  'value',
  'version',
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
  BACKGROUND_JOB_UPDATE: 'Ancien traitement en arrière-plan mis à jour',
  LOGIN_FAILED: 'Tentative de connexion échouée',
  LOGIN_SUCCESS: 'Connexion réussie',
  LOGOUT: 'Déconnexion',
  MFA_DISABLED: 'Double authentification désactivée',
  MFA_ENABLED: 'Double authentification activée',
  MFA_RECOVERY_CODE_USED: 'Code de secours utilisé',
  MFA_RECOVERY_CODES_REGENERATED: 'Codes de secours renouvelés',
  MFA_RESET: 'Double authentification réinitialisée',
  NOTIFICATION_SEND: 'Notification envoyée',
  PARTNER_CONTACTS_UPDATE: 'Contacts du partenaire modifiés',
  PARTNER_CREATE: 'Fiche partenaire créée',
  PARTNER_DELETE: 'Fiche partenaire supprimée',
  PARTNER_FOLLOW_UP_COMPLETE: 'Action de suivi mise à jour',
  PARTNER_FOLLOW_UP_CREATE: 'Suivi partenaire ajouté',
  PARTNER_FOLLOW_UP_DELETE: 'Suivi partenaire supprimé',
  PARTNER_FOLLOW_UP_UPDATE: 'Suivi partenaire modifié',
  PARTNER_MERGE: 'Fiches partenaires fusionnées',
  PARTNER_PERIOD_CREATE: 'Période de relation créée',
  PARTNER_PERIOD_UPDATE: 'Période de relation modifiée',
  PARTNER_STATUS_UPDATE: 'Statut du partenaire modifié',
  PARTNER_UPDATE: 'Fiche partenaire modifiée',
  PASSWORD_CHANGE: 'Mot de passe modifié',
  PASSWORD_RESET: 'Mot de passe réinitialisé',
  PERMISSION_UPDATE: 'Autorisations modifiées',
  PERSON_CREATE: 'Fiche créée',
  PERSON_DELETE: 'Fiche supprimée',
  PERSON_UPDATE: 'Fiche modifiée',
  SESSION_INVALIDATE: 'Sessions révoquées',
  STEP_UP_FAILED: 'Échec de confirmation renforcée',
  STEP_UP_SUCCESS: 'Confirmation renforcée réussie',
  SYSTEM_SETTING_UPDATE: 'Paramètre système mis à jour',
  USER_ACTIVATE: 'Compte réactivé',
  USER_CREATE: 'Compte utilisateur créé',
  USER_DEACTIVATE: 'Compte désactivé',
  USER_UPDATE: 'Compte utilisateur modifié',
};

const CATEGORY_DESCRIPTIONS: Record<AuditCategory, string> = {
  AUTH: "Événement d'authentification",
  PARTNER: 'Événement partenaire',
  PERMISSION: "Modification d'autorisation",
  PERSON: 'Événement du répertoire',
  SYSTEM: 'Événement système',
  USER: 'Événement utilisateur',
};

const LEGACY_PERSON_DESCRIPTION_RENAMES = new Map<string, string>([
  ['Email ajouté à une fiche personne', 'Email ajouté à une fiche'],
  ['Email d’une fiche personne modifié', 'Email d’une fiche modifié'],
  ['Email supprimé d’une fiche personne', 'Email supprimé d’une fiche'],
  ['Fiche personne créée', 'Fiche créée'],
  ['Fiche personne modifiée', 'Fiche modifiée'],
  ['Fiche personne supprimée', 'Fiche supprimée'],
  ['Fiche personne supprimée définitivement', 'Fiche supprimée définitivement'],
  ['Identité de la fiche personne modifiée', 'Identité de la fiche modifiée'],
  [
    'Réseau social ajouté à une fiche personne',
    'Réseau social ajouté à une fiche',
  ],
  [
    'Réseau social d’une fiche personne modifié',
    'Réseau social d’une fiche modifié',
  ],
  [
    'Réseau social supprimé d’une fiche personne',
    'Réseau social supprimé d’une fiche',
  ],
  ['Téléphone ajouté à une fiche personne', 'Téléphone ajouté à une fiche'],
  ['Téléphone d’une fiche personne modifié', 'Téléphone d’une fiche modifié'],
  ['Téléphone supprimé d’une fiche personne', 'Téléphone supprimé d’une fiche'],
]);

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
      isHistoricalAuditPermissionKey(permissionKey) &&
      typeof enabled === 'boolean'
        ? [[permissionKey, enabled]]
        : [],
    ),
  );
};

const sanitizePermissionKeyList = (value: unknown): string[] | undefined => {
  if (!Array.isArray(value)) return undefined;

  return [
    ...new Set(
      value.filter(
        (entry): entry is string =>
          typeof entry === 'string' && isHistoricalAuditPermissionKey(entry),
      ),
    ),
  ].slice(0, MAX_METADATA_ARRAY_ENTRIES);
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
  if (field === 'version') {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0
      ? value
      : undefined;
  }
  if (field === 'value') return sanitizeMetadataValue(value, 1);

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
            : key === 'effectivelyGrantedPermissionKeys' ||
                key === 'effectivelyRevokedPermissionKeys'
              ? sanitizePermissionKeyList(entryValue)
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
  metadata?: unknown;
}): string => {
  if (options.canViewSensitiveDetails) {
    const description =
      options.category === 'PERSON'
        ? (LEGACY_PERSON_DESCRIPTION_RENAMES.get(options.description) ??
          options.description)
        : options.description;

    return description.slice(0, 4_000);
  }

  if (options.action === 'USER_DELETE') {
    const metadata = toRecord(options.metadata);
    const deletionVersion = metadata?.deletionVersion;

    return metadata?.irreversible === true &&
      typeof deletionVersion === 'number' &&
      Number.isInteger(deletionVersion) &&
      deletionVersion >= 1
      ? 'Compte utilisateur supprimé'
      : 'Compte utilisateur archivé (historique)';
  }

  return (
    PUBLIC_DESCRIPTIONS[options.action] ??
    CATEGORY_DESCRIPTIONS[options.category]
  );
};
