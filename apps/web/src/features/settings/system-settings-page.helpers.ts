import {
  getSystemSettingDefinition,
  isSystemSettingKey,
  type SystemSettingKey,
  type SystemSettingSection,
  type SystemSettingUnit,
} from '$constants/system-setting-catalog.constants';
import type { SystemSettingItem } from '$types/platform.types';

type SettingPresentation = {
  impact: string;
};

export type NormalizedSystemSettingItem = Omit<SystemSettingItem, 'value'> & {
  value: number;
};

/* UI order follows the page, not lexical key order. */
/* eslint-disable sort-keys-custom-order/object-keys */
const SETTING_PRESENTATION = {
  'notifications.retentionDays': {
    impact:
      'Les notifications lues, non lues et archivées sont concernées. L’archivage ne prolonge pas leur conservation. Une expiration peut les supprimer plus tôt.',
  },
  'audit.retentionDays': {
    impact:
      'Tous les événements du journal sont concernés : connexions, sécurité, administration et modifications des personnes, avec leurs détails.',
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
      'Durées globales appliquées lors des prochaines exécutions de maintenance.',
    id: 'retention',
    title: 'Conservation des données',
  },
];

export const SYSTEM_SETTING_KEYS = [
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
  const formatted = value.toLocaleString('fr-FR');
  if (unit === 'rows') return `${formatted} ligne${value > 1 ? 's' : ''}`;

  return `${formatted} jour${value > 1 ? 's' : ''}`;
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

export const isSettingDraftChanged = (
  draft: string,
  currentValue: number,
): boolean => getDraftNumber(draft) !== currentValue;

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
