import 'server-only';

import type { AuditFieldChange, AuditLog } from '@prisma/client';

import { FEATURES } from '$constants/feature-registry.constants';
import {
  getAccessLabel,
  getPermissionItem,
  hasPermission,
  PERMISSIONS,
} from '$constants/permissions.constants';
import { personDetailPath, userDetailPath } from '$constants/routes.constants';
import { getSystemSettingDefinition } from '$constants/system-setting-catalog.constants';
import {
  getPersonSocialNetwork,
  PERSON_STRUCTURE_STATUS_LABELS,
} from '$features/persons/person.constants';
import {
  decodePlainPersonAuditValues,
  decryptPersonAuditValues,
} from '$features/persons/server/person-audit';
import { formatDaysAsYears } from '$features/settings/system-settings-page.helpers';
import type { UserType } from '$types/auth.types';
import {
  describeUserAgent,
  formatIpAddress,
} from '$utils/session-display.utils';

import type {
  JournalChange,
  JournalEvent,
  JournalFact,
  JournalTone,
} from '../audit-journal.types';
import {
  BLOCKED_ATTEMPT_PROOFS,
  BLOCKED_ATTEMPT_STEPS,
  JOURNAL_ACTION_LABELS,
  LOGIN_FAILURE_REASONS,
  PERSON_FIELD_LABELS,
  PERSON_SECTION_LABELS,
  USER_FIELD_LABELS,
} from './audit-journal.labels';

export type JournalReader = Pick<
  UserType,
  'id' | 'isProtected' | 'permissions' | 'role'
>;

export type JournalRow = AuditLog & { fieldChanges: AuditFieldChange[] };

type ReaderRights = {
  canViewPersonContacts: boolean;
  canViewPersons: boolean;
  canViewUserContacts: boolean;
  canViewUsers: boolean;
  isProtected: boolean;
};

export const getReaderRights = (reader: JournalReader): ReaderRights => {
  const can = (key: string): boolean =>
    reader.isProtected || hasPermission(reader.role, key, reader.permissions);

  return {
    canViewPersonContacts: can(PERMISSIONS.PERSONS.VIEW_CONTACT),
    canViewPersons: can(PERMISSIONS.PERSONS.VIEW),
    canViewUserContacts: can(PERMISSIONS.USERS.VIEW_CONTACT),
    canViewUsers: can(PERMISSIONS.USERS.VIEW),
    isProtected: reader.isProtected,
  };
};

const EMPTY = '—';
const MASKED = 'Valeur masquée';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/u;

const formatValue = (fieldKey: string, value: unknown): string => {
  if (value === null || value === undefined || value === '') return EMPTY;
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (fieldKey === 'structureStatus' && typeof value === 'string')
    return (
      PERSON_STRUCTURE_STATUS_LABELS[
        value as keyof typeof PERSON_STRUCTURE_STATUS_LABELS
      ] ?? value
    );
  if (fieldKey === 'networkKey' && typeof value === 'string')
    return getPersonSocialNetwork(value)?.label ?? value;
  if (fieldKey === 'role' && typeof value === 'string')
    return getAccessLabel({ isProtected: false, role: value });
  if (typeof value === 'string' && DATE_ONLY.test(value))
    return new Date(`${value}T00:00:00Z`).toLocaleDateString('fr-FR', {
      timeZone: 'UTC',
    });
  if (typeof value === 'string' || typeof value === 'number')
    return String(value);

  return EMPTY;
};

/** A section's values follow the right that shows them in the Répertoire. */
const canReadPersonSection = (
  sectionKey: string,
  rights: ReaderRights,
): boolean =>
  sectionKey === 'contacts' || sectionKey === 'social'
    ? rights.canViewPersonContacts
    : rights.canViewPersons;

const projectPersonChange = (
  row: JournalRow,
  change: AuditFieldChange,
  rights: ReaderRights,
): JournalChange => {
  const field = PERSON_FIELD_LABELS[change.fieldKey] ?? change.fieldKey;
  const names = {
    field,
    label: [
      PERSON_SECTION_LABELS[change.sectionKey] ?? change.sectionKey,
      field,
    ].join(' · '),
  };
  if (change.valueMode === 'NONE')
    return { after: 'Valeur effacée', before: 'Valeur effacée', ...names };
  if (!canReadPersonSection(change.sectionKey, rights))
    return { after: MASKED, before: MASKED, ...names };

  let values: { after: unknown; before: unknown };
  try {
    values =
      change.valueMode === 'ENCRYPTED' &&
      change.valuesCiphertext &&
      change.valuesIv &&
      change.valuesAuthTag &&
      change.valueKeyVersion !== null
        ? decryptPersonAuditValues({
            auditLogId: row.id,
            changeType: change.changeType,
            entityId: change.entityId,
            fieldKey: change.fieldKey,
            recordId: change.recordId,
            sectionKey: change.sectionKey,
            valueKeyVersion: change.valueKeyVersion,
            valuesAuthTag: change.valuesAuthTag,
            valuesCiphertext: change.valuesCiphertext,
            valuesIv: change.valuesIv,
          })
        : decodePlainPersonAuditValues(change);
  } catch {
    return { after: 'Valeur illisible', before: 'Valeur illisible', ...names };
  }

  return {
    after: formatValue(change.fieldKey, values.after),
    before: formatValue(change.fieldKey, values.before),
    ...names,
  };
};

const projectUserChanges = (
  metadata: Record<string, unknown>,
  rights: ReaderRights,
): JournalChange[] => {
  const before = isRecord(metadata.before) ? metadata.before : {};
  const after = isRecord(metadata.after) ? metadata.after : {};

  return USER_FIELD_LABELS.flatMap(([key, label]) => {
    if (!Object.hasOwn(before, key) && !Object.hasOwn(after, key)) return [];
    if (key === 'contactEmail' && !rights.canViewUserContacts)
      return [{ after: MASKED, before: MASKED, label }];

    return [
      {
        // Keys come from the fixed USER_FIELD_LABELS list.
        // eslint-disable-next-line security/detect-object-injection
        after: formatValue(key, after[key]),
        // eslint-disable-next-line security/detect-object-injection
        before: formatValue(key, before[key]),
        label,
      },
    ];
  });
};

const permissionLabels = (value: unknown): string | null => {
  if (!Array.isArray(value) || value.length === 0) return null;

  return value
    .filter((key): key is string => typeof key === 'string')
    .map((key) => getPermissionItem(key)?.label ?? key)
    .join(', ');
};

const projectFacts = (row: JournalRow): JournalFact[] => {
  const metadata = isRecord(row.metadata) ? row.metadata : {};
  const facts: JournalFact[] = [];
  if (row.action === 'PERMISSION_UPDATE') {
    const granted = permissionLabels(metadata.effectivelyGrantedPermissionKeys);
    const revoked = permissionLabels(metadata.effectivelyRevokedPermissionKeys);
    if (granted) facts.push({ label: 'Accordées', value: granted });
    if (revoked) facts.push({ label: 'Retirées', value: revoked });
  }
  if (row.action === 'LOGIN_FAILED' && typeof metadata.reason === 'string')
    facts.push({
      label: 'Motif',
      value: LOGIN_FAILURE_REASONS[metadata.reason] ?? 'Autre motif',
    });
  if (row.action === 'ATTEMPTS_BLOCKED') {
    if (typeof metadata.step === 'string')
      facts.push({
        label: 'Étape',
        value: BLOCKED_ATTEMPT_STEPS[metadata.step] ?? 'Autre étape',
      });
    if (typeof metadata.proof === 'string')
      facts.push({
        label: 'Preuve refusée',
        value: BLOCKED_ATTEMPT_PROOFS[metadata.proof] ?? 'Autre preuve',
      });
    if (typeof metadata.blockedForSeconds === 'number')
      facts.push({
        label: 'Durée du blocage',
        value: `environ ${Math.max(1, Math.ceil(metadata.blockedForSeconds / 60))} min`,
      });
  }

  return facts;
};

const projectSettingChanges = (
  metadata: Record<string, unknown>,
): JournalChange[] => {
  if (metadata.settingKey !== 'audit.retentionDays') return [];
  const days = (side: unknown): string => {
    const value = isRecord(side) ? side.value : null;

    return typeof value === 'number'
      ? `${value.toLocaleString('fr-FR')} jours (${formatDaysAsYears(value)})`
      : 'Valeur par défaut';
  };

  return [
    {
      after: days(metadata.after),
      before: days(metadata.before),
      label: getSystemSettingDefinition('audit.retentionDays').label,
    },
  ];
};

const toneOf = (row: AuditLog): JournalTone => {
  if (row.outcome === 'FAILURE') return 'failure';
  if (row.severity === 'CRITICAL') return 'critical';
  if (row.severity === 'WARNING') return 'warning';

  return 'neutral';
};

const typeLabelOf = (row: AuditLog): string => {
  if (row.category === 'PERSON') return 'Personnes';
  if (row.stream === 'AUTHENTICATION' || row.stream === 'SECURITY')
    return 'Sécurité';
  if (row.category === 'USER' || row.category === 'PERMISSION')
    return 'Comptes et droits';
  if (row.action === 'SYSTEM_SETTING_UPDATE') return 'Paramètres';

  return 'Autres';
};

export const projectJournalEvent = (
  row: JournalRow,
  rights: ReaderRights,
  personNames: ReadonlyMap<string, string>,
): JournalEvent => {
  const metadata = isRecord(row.metadata) ? row.metadata : {};
  const isPerson = row.entityType === 'PERSON' && row.entityId !== null;
  const personName =
    isPerson && row.entityId
      ? rights.canViewPersons
        ? (personNames.get(row.entityId) ?? 'Fiche supprimée')
        : 'Fiche du répertoire'
      : null;
  const target: JournalEvent['target'] =
    isPerson && row.entityId && personName
      ? {
          href:
            rights.canViewPersons && personNames.has(row.entityId)
              ? personDetailPath(row.entityId)
              : null,
          id: row.entityId,
          kind: 'person',
          name: personName,
        }
      : row.targetUserId
        ? {
            // Same rule as a record: no link to a page the reader cannot open.
            href: rights.canViewUsers ? userDetailPath(row.targetUserId) : null,
            id: row.targetUserId,
            kind: 'user',
            name:
              row.targetDisplayNameSnapshot ??
              row.targetLoginNameSnapshot ??
              'Compte',
          }
        : null;
  const changes = isPerson
    ? row.fieldChanges.map((change) => projectPersonChange(row, change, rights))
    : row.action === 'SYSTEM_SETTING_UPDATE'
      ? projectSettingChanges(metadata)
      : projectUserChanges(metadata, rights);

  return {
    actor:
      row.userId || row.actorDisplayNameSnapshot
        ? {
            id: row.userId,
            loginName: row.actorLoginNameSnapshot,
            name:
              row.actorDisplayNameSnapshot ??
              row.actorLoginNameSnapshot ??
              'Compte',
          }
        : {
            id: null,
            loginName: null,
            name:
              row.eventKind === 'CONNECTION'
                ? 'Aucun compte reconnu'
                : 'Système',
          },
    at: row.createdAt.toISOString(),
    browser: row.userAgent ? describeUserAgent(row.userAgent).label : null,
    changes,
    facts: projectFacts(row),
    id: row.id,
    ip:
      rights.isProtected && row.ipAddress
        ? formatIpAddress(row.ipAddress)
        : null,
    ipMasked: !rights.isProtected && row.ipAddress !== null,
    label: JOURNAL_ACTION_LABELS[row.action],
    // The stored sentence names the object when no record is linked
    // (« Connexion échouée: alex », « Paramètre système mis à jour : … »).
    subject: target ? null : row.description,
    target,
    tone: toneOf(row),
    typeLabel: typeLabelOf(row),
  };
};

export const JOURNAL_AUDIT_LOCATION = FEATURES.systemActivity.audit;
