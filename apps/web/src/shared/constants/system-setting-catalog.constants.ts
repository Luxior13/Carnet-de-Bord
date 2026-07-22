export type SystemSettingSection = 'interface' | 'retention';
export type SystemSettingUnit = 'days' | 'rows';

export type SystemSettingCatalogItem = Readonly<{
  defaultValue: number;
  description: string;
  label: string;
  max: number;
  min: number;
  passwordWhenDecreasing: boolean;
  section: SystemSettingSection;
  unit: SystemSettingUnit;
}>;

const defineSystemSetting = <const TSetting extends SystemSettingCatalogItem>(
  setting: TSetting,
): TSetting => setting;

/**
 * Browser-safe metadata for every configurable global setting. Validation
 * schemas are derived from this closed catalogue on the server.
 */
export const SYSTEM_SETTING_CATALOG = {
  'audit.retentionDays': defineSystemSetting({
    defaultValue: 1_095,
    description: "Durée de conservation du journal d'activité en jours",
    label: "Journal d'activité",
    max: 3_650,
    min: 365,
    passwordWhenDecreasing: true,
    section: 'retention',
    unit: 'days',
  }),
  'notifications.retentionDays': defineSystemSetting({
    defaultValue: 180,
    description: 'Durée de conservation des notifications en jours',
    label: 'Notifications',
    max: 730,
    min: 30,
    passwordWhenDecreasing: true,
    section: 'retention',
    unit: 'days',
  }),
  'ui.defaultPageSize': defineSystemSetting({
    defaultValue: 25,
    description: 'Nombre de lignes proposé par défaut dans les listes',
    label: 'Nombre de lignes par défaut',
    max: 100,
    min: 10,
    passwordWhenDecreasing: false,
    section: 'interface',
    unit: 'rows',
  }),
} as const satisfies Record<string, SystemSettingCatalogItem>;

export type SystemSettingKey = keyof typeof SYSTEM_SETTING_CATALOG;

export const isSystemSettingKey = (key: string): key is SystemSettingKey =>
  Object.hasOwn(SYSTEM_SETTING_CATALOG, key);

export const getSystemSettingDefinition = (
  key: SystemSettingKey,
): (typeof SYSTEM_SETTING_CATALOG)[SystemSettingKey] => {
  // SystemSettingKey is a closed union derived from this catalogue.
  // eslint-disable-next-line security/detect-object-injection
  return SYSTEM_SETTING_CATALOG[key];
};

export const requiresPasswordForSystemSettingChange = (
  key: SystemSettingKey,
  currentValue: number,
  nextValue: number,
): boolean => {
  const definition = getSystemSettingDefinition(key);

  return definition.passwordWhenDecreasing && nextValue < currentValue;
};
