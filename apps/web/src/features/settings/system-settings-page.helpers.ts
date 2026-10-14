import {
  getSystemSettingDefinition,
  isSystemSettingKey,
  type SystemSettingKey,
  type SystemSettingUnit,
} from '$constants/system-setting-catalog.constants';
import type { SystemSettingItem } from '$types/platform.types';

type SettingPresentation = {
  description: string;
  impact: string;
  title: string;
};

export type NormalizedSystemSettingItem = Omit<SystemSettingItem, 'value'> & {
  value: number;
};

/* UI order follows the page, not lexical key order. */

const SETTING_PRESENTATION = {
  'audit.retentionDays': {
    description:
      'Connexions, sécurité, administration et historique des personnes.',
    impact:
      'La durée s’applique au prochain nettoyage, sans suppression immédiate. Les événements et leurs détails sont supprimés ensemble. Une durée plus longue ne restaure pas les données déjà supprimées.',
    title: 'Conservation du journal',
  },
} as const satisfies Record<SystemSettingKey, SettingPresentation>;

export const SYSTEM_SETTING_KEYS = [
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
    typeof item.isStoredValueInvalid !== 'boolean' ||
    !isSystemSettingKey(item.key) ||
    item.key !== key ||
    typeof item.value !== 'number' ||
    !Number.isInteger(item.value) ||
    item.value < definition.min ||
    item.value > definition.max ||
    !Number.isSafeInteger(item.version) ||
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
  if (!Array.isArray(items))
    throw new Error('Catalogue de paramètres incomplet');
  const settings = new Map<SystemSettingKey, NormalizedSystemSettingItem>();

  for (const key of SYSTEM_SETTING_KEYS) {
    const matches = items.filter((candidate) => candidate?.key === key);
    if (matches.length !== 1)
      throw new Error('Catalogue de paramètres incomplet');
    const item = matches[0];
    settings.set(key, normalizeSetting(item, key));
  }

  return settings;
};
