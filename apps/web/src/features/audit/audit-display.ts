import {
  Archive,
  Ban,
  Bell,
  CheckCircle,
  Cpu,
  Download,
  History,
  Key,
  LogIn,
  LogOut,
  type LucideIcon,
  Pencil,
  RefreshCw,
  Settings,
  Shield,
  Trash2,
  UserMinus,
  UserPlus,
  XCircle,
} from 'lucide-react';

import { getPermissionDisplayLabel } from '$constants/permissions.constants';

export type AuditActionDisplayConfig = {
  color: string;
  icon: LucideIcon;
  label: string;
  sentence: string;
};

export type AuditChangeDiff = {
  after: unknown;
  before: unknown;
  fieldKey: string;
};

const PERMISSION_CHANGE_FIELD_PREFIX = 'permissions.';

const FIELD_LABELS = new Map<string, string>([
  ['contactEmail', 'Email de contact'],
  ['contactEmailVerifiedAt', 'Email de contact vérifié le'],
  ['email', 'Ancien email de connexion'],
  ['firstName', 'Prénom'],
  ['isActive', 'Actif'],
  ['lastName', 'Nom'],
  ['loginName', 'Identifiant de connexion'],
  ['passwordChange', 'Mot de passe'],
  ['passwordReset', 'Mot de passe'],
  ['permissions', 'Autorisations'],
  ['revokedSessions', 'Sessions révoquées'],
  ['role', 'Rôle'],
  ['value', 'Valeur'],
  ['version', 'Version'],
]);

export const AUDIT_ACTION_DISPLAY = new Map<string, AuditActionDisplayConfig>([
  [
    'ACCOUNT_LOCKED',
    {
      color: 'border-destructive/35 bg-destructive/10 text-destructive',
      icon: Ban,
      label: 'Compte verrouillé',
      sentence: 'a verrouillé le compte',
    },
  ],
  [
    'AUDIT_EXPORT',
    {
      color: 'border-info/35 bg-info/10 text-info',
      icon: Download,
      label: 'Journal exporté',
      sentence: 'a exporté le journal',
    },
  ],
  [
    'BACKGROUND_JOB_UPDATE',
    {
      color: 'border-warning/35 bg-warning/10 text-warning',
      icon: Cpu,
      label: 'Ancien traitement système',
      sentence: 'avait mis à jour un ancien traitement système',
    },
  ],
  [
    'LOGIN_FAILED',
    {
      color: 'border-destructive/35 bg-destructive/10 text-destructive',
      icon: XCircle,
      label: 'Connexion échouée',
      sentence: 'a échoué à se connecter',
    },
  ],
  [
    'LOGIN_SUCCESS',
    {
      color: 'border-success/35 bg-success/10 text-success',
      icon: LogIn,
      label: 'Connexion réussie',
      sentence: 's’est connecté',
    },
  ],
  [
    'LOGOUT',
    {
      color: 'border-primary/35 bg-primary/15 text-primary-emphasis',
      icon: LogOut,
      label: 'Déconnexion',
      sentence: 's’est déconnecté',
    },
  ],
  [
    'MFA_DISABLED',
    {
      color: 'border-warning/35 bg-warning/10 text-warning',
      icon: Shield,
      label: 'Double authentification désactivée',
      sentence: 'a désactivé la double authentification',
    },
  ],
  [
    'MFA_ENABLED',
    {
      color: 'border-success/35 bg-success/10 text-success',
      icon: Shield,
      label: 'Double authentification configurée',
      sentence: 'a configuré la double authentification',
    },
  ],
  [
    'MFA_RECOVERY_CODE_USED',
    {
      color: 'border-warning/35 bg-warning/10 text-warning',
      icon: Key,
      label: 'Code de secours utilisé',
      sentence: 'a utilisé un code de secours',
    },
  ],
  [
    'MFA_RECOVERY_CODES_REGENERATED',
    {
      color: 'border-info/35 bg-info/10 text-info',
      icon: RefreshCw,
      label: 'Codes de secours régénérés',
      sentence: 'a régénéré les codes de secours',
    },
  ],
  [
    'MFA_RESET',
    {
      color: 'border-warning/35 bg-warning/10 text-warning',
      icon: RefreshCw,
      label: 'Double authentification réinitialisée',
      sentence: 'a réinitialisé la double authentification',
    },
  ],
  [
    'NOTIFICATION_SEND',
    {
      color: 'border-info/35 bg-info/10 text-info',
      icon: Bell,
      label: 'Notification envoyée',
      sentence: 'a envoyé une notification',
    },
  ],
  [
    'PASSWORD_CHANGE',
    {
      color: 'border-warning/35 bg-warning/10 text-warning',
      icon: Key,
      label: 'Mot de passe modifié',
      sentence: 'a modifié le mot de passe',
    },
  ],
  [
    'PASSWORD_RESET',
    {
      color: 'border-warning/35 bg-warning/10 text-warning',
      icon: RefreshCw,
      label: 'Mot de passe réinitialisé',
      sentence: 'a réinitialisé le mot de passe',
    },
  ],
  [
    'PERMISSION_UPDATE',
    {
      color: 'border-info/35 bg-info/10 text-info',
      icon: Shield,
      label: 'Autorisations modifiées',
      sentence: 'a modifié les autorisations',
    },
  ],
  [
    'SESSION_INVALIDATE',
    {
      color: 'border-warning/35 bg-warning/10 text-warning',
      icon: RefreshCw,
      label: 'Sessions révoquées',
      sentence: 'a révoqué des sessions',
    },
  ],
  [
    'STEP_UP_FAILED',
    {
      color: 'border-destructive/35 bg-destructive/10 text-destructive',
      icon: XCircle,
      label: 'Confirmation renforcée échouée',
      sentence: 'a échoué à confirmer son identité',
    },
  ],
  [
    'STEP_UP_SUCCESS',
    {
      color: 'border-success/35 bg-success/10 text-success',
      icon: CheckCircle,
      label: 'Confirmation renforcée réussie',
      sentence: 'a confirmé son identité',
    },
  ],
  [
    'SYSTEM_SETTING_UPDATE',
    {
      color: 'border-info/35 bg-info/10 text-info',
      icon: Settings,
      label: 'Paramètre système modifié',
      sentence: 'a modifié un paramètre système',
    },
  ],
  [
    'USER_ACTIVATE',
    {
      color: 'border-success/35 bg-success/10 text-success',
      icon: CheckCircle,
      label: 'Utilisateur réactivé',
      sentence: 'a réactivé le compte',
    },
  ],
  [
    'USER_CREATE',
    {
      color: 'border-success/35 bg-success/10 text-success',
      icon: UserPlus,
      label: 'Utilisateur créé',
      sentence: 'a créé le compte',
    },
  ],
  [
    'USER_DEACTIVATE',
    {
      color: 'border-warning/35 bg-warning/10 text-warning',
      icon: UserMinus,
      label: 'Utilisateur désactivé',
      sentence: 'a désactivé le compte',
    },
  ],
  [
    'USER_DELETE',
    {
      color: 'border-destructive/35 bg-destructive/10 text-destructive',
      icon: Trash2,
      label: 'Utilisateur supprimé',
      sentence: 'a supprimé définitivement le compte',
    },
  ],
  [
    'USER_UPDATE',
    {
      color: 'border-info/35 bg-info/10 text-info',
      icon: Pencil,
      label: 'Utilisateur modifié',
      sentence: 'a modifié le profil',
    },
  ],
]);

export const DEFAULT_AUDIT_ACTION_DISPLAY: AuditActionDisplayConfig = {
  color: 'border-border/70 bg-surface-muted text-muted-foreground',
  icon: History,
  label: 'Action système',
  sentence: 'a réalisé une action',
};

const HISTORICAL_USER_ARCHIVE_DISPLAY: AuditActionDisplayConfig = {
  color: 'border-warning/35 bg-warning/10 text-warning',
  icon: Archive,
  label: 'Utilisateur archivé (historique)',
  sentence: 'a archivé le compte (historique)',
};

export const isIrreversibleUserDeletion = (
  action: string,
  metadata?: Record<string, unknown> | null,
): boolean =>
  action === 'USER_DELETE' &&
  metadata?.irreversible === true &&
  typeof metadata.deletionVersion === 'number' &&
  Number.isInteger(metadata.deletionVersion) &&
  metadata.deletionVersion >= 1;

export const getAuditActionDisplay = (
  action: string,
  metadata?: Record<string, unknown> | null,
): AuditActionDisplayConfig => {
  if (
    action === 'USER_DELETE' &&
    !isIrreversibleUserDeletion(action, metadata)
  ) {
    return HISTORICAL_USER_ARCHIVE_DISPLAY;
  }

  return (
    AUDIT_ACTION_DISPLAY.get(action) ?? {
      ...DEFAULT_AUDIT_ACTION_DISPLAY,
      label: action || DEFAULT_AUDIT_ACTION_DISPLAY.label,
    }
  );
};

export const AUDIT_ACTION_OPTIONS = [
  { label: 'Toutes les actions', value: 'all' },
  ...[...AUDIT_ACTION_DISPLAY.entries()]
    .map(([value, config]) => ({
      label:
        value === 'USER_DELETE'
          ? 'Suppression / archive historique'
          : config.label,
      value,
    }))
    .sort((left, right) => left.label.localeCompare(right.label, 'fr')),
];

export const isAuditRecord = (
  value: unknown,
): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

export const toValidAuditDate = (value: string | null): Date | null => {
  if (!value) return null;
  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatAuditRelativeTime = (value: string): string => {
  const date = toValidAuditDate(value);
  if (!date) return 'Date inconnue';
  const difference = Date.now() - date.getTime();
  const minutes = Math.floor(Math.abs(difference) / 60_000);
  const hours = Math.floor(Math.abs(difference) / 3_600_000);
  const days = Math.floor(Math.abs(difference) / 86_400_000);

  if (difference >= 0) {
    if (minutes < 1) return 'À l’instant';
    if (minutes < 60) return `Il y a ${minutes} min`;
    if (hours < 24) return `Il y a ${hours} h`;
    if (days < 7) return `Il y a ${days} j`;
  }

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export const formatAuditFullDate = (value: string): string => {
  const date = toValidAuditDate(value);
  if (!date) return 'Date inconnue';

  return date.toLocaleString('fr-FR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'long',
    second: '2-digit',
    timeZoneName: 'short',
    year: 'numeric',
  });
};

export const getAuditChangeFieldLabel = (fieldKey: string): string => {
  if (fieldKey.startsWith(PERMISSION_CHANGE_FIELD_PREFIX)) {
    const permissionKey = fieldKey.slice(PERMISSION_CHANGE_FIELD_PREFIX.length);

    return getPermissionDisplayLabel(permissionKey);
  }

  return FIELD_LABELS.get(fieldKey) ?? fieldKey;
};

const getPermissionDiffs = (
  before: unknown,
  after: unknown,
): AuditChangeDiff[] => {
  const beforeRecord = isAuditRecord(before) ? before : {};
  const afterRecord = isAuditRecord(after) ? after : {};
  const beforeValues = new Map(Object.entries(beforeRecord));
  const afterValues = new Map(Object.entries(afterRecord));
  const keys = new Set([
    ...Object.keys(beforeRecord),
    ...Object.keys(afterRecord),
  ]);

  return [...keys].flatMap((key) => {
    const beforeValue = beforeValues.get(key);
    const afterValue = afterValues.get(key);
    if (beforeValue === afterValue) return [];

    return [
      {
        after: afterValue,
        before: beforeValue,
        fieldKey: `${PERMISSION_CHANGE_FIELD_PREFIX}${key}`,
      },
    ];
  });
};

export const getAuditChangeDiffs = (
  metadata: Record<string, unknown> | null,
): AuditChangeDiff[] => {
  const before = isAuditRecord(metadata?.before) ? metadata.before : null;
  const after = isAuditRecord(metadata?.after) ? metadata.after : null;

  if (before || after) {
    const beforeValues = new Map(Object.entries(before ?? {}));
    const afterValues = new Map(Object.entries(after ?? {}));
    const keys = new Set([
      ...Object.keys(before ?? {}),
      ...Object.keys(after ?? {}),
    ]);

    return [...keys].flatMap((fieldKey) => {
      const beforeValue = beforeValues.get(fieldKey);
      const afterValue = afterValues.get(fieldKey);

      return fieldKey === 'permissions'
        ? getPermissionDiffs(beforeValue, afterValue)
        : [{ after: afterValue, before: beforeValue, fieldKey }];
    });
  }

  const changes = isAuditRecord(metadata?.changes) ? metadata.changes : null;
  if (changes) {
    return Object.entries(changes).flatMap(([fieldKey, value]) => {
      if (!isAuditRecord(value)) return [];
      const beforeValue = value.from;
      const afterValue = value.to;

      return fieldKey === 'permissions'
        ? getPermissionDiffs(beforeValue, afterValue)
        : [{ after: afterValue, before: beforeValue, fieldKey }];
    });
  }

  if (metadata?.passwordReset === true) {
    return [{ after: true, before: null, fieldKey: 'passwordReset' }];
  }
  if (metadata?.passwordChange === true) {
    return [{ after: true, before: null, fieldKey: 'passwordChange' }];
  }
  if (typeof metadata?.revokedSessions === 'number') {
    return [
      {
        after: metadata.revokedSessions,
        before: null,
        fieldKey: 'revokedSessions',
      },
    ];
  }

  return [];
};

export const formatAuditChangeValue = (
  fieldKey: string,
  value: unknown,
): string => {
  if (value === null || value === undefined || value === '') return '(vide)';
  if (fieldKey.startsWith(PERMISSION_CHANGE_FIELD_PREFIX)) {
    return value ? 'Autorisé' : 'Refusé';
  }
  if (fieldKey === 'isActive') return value ? 'Oui' : 'Non';
  if (fieldKey === 'role') {
    return value === 'ADMIN' ? 'Administrateur' : 'Utilisateur';
  }
  if (fieldKey === 'passwordReset') return 'Mot de passe temporaire généré';
  if (fieldKey === 'passwordChange') return 'Mot de passe modifié';
  if (fieldKey === 'revokedSessions') {
    const count = Number(value);

    return `${count} session${count > 1 ? 's' : ''}`;
  }
  if (typeof value === 'object') return JSON.stringify(value, null, 2);

  return String(value);
};
