import { Bell, History, ListFilter, type LucideIcon } from 'lucide-react';

import {
  getSystemSettingDefinition,
  isSystemSettingKey,
  type SystemSettingKey,
  type SystemSettingSection,
  type SystemSettingUnit,
} from '$constants/system-setting-catalog.constants';
import type { SystemSettingItem } from '$types/platform.types';

type SettingPresentation = {
  icon: LucideIcon;
  impact: string;
};

export type NormalizedSystemSettingItem = Omit<SystemSettingItem, 'value'> & {
  value: number;
};

/* UI order follows the page, not lexical key order. */
/* eslint-disable sort-keys-custom-order/object-keys */
const SETTING_PRESENTATION = {
  'ui.defaultPageSize': {
    icon: ListFilter,
    impact:
      'La nouvelle valeur sera proposée lors des prochains chargements de listes.',
  },
  'notifications.retentionDays': {
    icon: Bell,
    impact:
      'La maintenance planifiée supprimera les notifications plus anciennes lors de sa prochaine exécution. Une augmentation ne restaure pas ce qui a déjà été supprimé.',
  },
  'audit.retentionDays': {
    icon: History,
    impact:
      "La maintenance planifiée supprimera les événements plus anciens lors de sa prochaine exécution. Une augmentation ne restaure pas l'historique supprimé.",
  },
} as const satisfies Record<SystemSettingKey, SettingPresentation>;
/* eslint-enable sort-keys-custom-order/object-keys */

export const SECTION_DEFINITIONS: ReadonlyArray<{
  description: string;
  id: SystemSettingSection;
  title: string;
}> = [
  {
    description:
      "Réglages de présentation appliqués à l'ensemble des utilisateurs.",
    id: 'interface',
    title: 'Interface générale',
  },
  {
    description:
      'Durées de conservation appliquées par la maintenance planifiée.',
    id: 'retention',
    title: 'Conservation des données',
  },
];

export const SYSTEM_SETTING_KEYS = [
  'ui.defaultPageSize',
  'notifications.retentionDays',
  'audit.retentionDays',
] as const satisfies readonly SystemSettingKey[];

export const getSettingPresentation = (
  key: SystemSettingKey,
): SettingPresentation => {
  // SystemSettingKey is a closed union covered by SETTING_PRESENTATION.
  // eslint-disable-next-line security/detect-object-injection
  return SETTING_PRESENTATION[key];
};

export const formatSettingValue = (
  value: number,
  unit: SystemSettingUnit,
): string => {
  if (unit === 'rows') return `${value} ligne${value > 1 ? 's' : ''}`;

  return `${value} jour${value > 1 ? 's' : ''}`;
};

export const formatUpdatedAt = (updatedAt: string): string => {
  const date = new Date(updatedAt);
  if (Number.isNaN(date.getTime())) return 'Date de modification indisponible';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

export const getDraftNumber = (value: string): number | null => {
  if (value.trim().length === 0) return null;
  const parsedValue = Number(value);

  return Number.isInteger(parsedValue) ? parsedValue : null;
};

export const getValidationMessage = (
  key: SystemSettingKey,
  draftValue: string,
): string | null => {
  const value = getDraftNumber(draftValue);
  const definition = getSystemSettingDefinition(key);
  if (value === null) return 'Saisissez un nombre entier.';
  if (value < definition.min || value > definition.max) {
    return `Choisissez une valeur comprise entre ${definition.min} et ${definition.max}.`;
  }

  return null;
};

export const normalizeSetting = (
  item: SystemSettingItem | undefined,
  key: SystemSettingKey,
): NormalizedSystemSettingItem => {
  const definition = getSystemSettingDefinition(key);
  if (
    !item ||
    !isSystemSettingKey(item.key) ||
    item.key !== key ||
    typeof item.value !== 'number' ||
    !Number.isInteger(item.value) ||
    item.value < definition.min ||
    item.value > definition.max ||
    !Number.isInteger(item.version) ||
    item.version < 0 ||
    typeof item.updatedAt !== 'string' ||
    (item.version > 0 && Number.isNaN(new Date(item.updatedAt).getTime()))
  ) {
    throw new Error('Catalogue de paramètres incomplet');
  }

  return { ...item, value: item.value };
};

export const normalizeSettings = (
  items: SystemSettingItem[],
): Map<SystemSettingKey, NormalizedSystemSettingItem> => {
  const settings = new Map<SystemSettingKey, NormalizedSystemSettingItem>();

  for (const key of SYSTEM_SETTING_KEYS) {
    const item = items.find((candidate) => candidate.key === key);
    settings.set(key, normalizeSetting(item, key));
  }

  return settings;
};
