import { z } from 'zod';

const defineSystemSetting = <TSchema extends z.ZodType>(definition: {
  defaultValue: z.infer<TSchema>;
  description: string;
  schema: TSchema;
}): {
  defaultValue: z.infer<TSchema>;
  description: string;
  schema: TSchema;
} => definition;

export const SYSTEM_SETTING_DEFINITIONS = {
  'audit.retentionDays': defineSystemSetting({
    defaultValue: 1_095,
    description: "Durée de conservation du journal d'activité en jours",
    schema: z.number().int().min(365).max(3_650),
  }),
  'jobs.retentionDays': defineSystemSetting({
    defaultValue: 30,
    description: 'Durée de conservation des traitements terminés en jours',
    schema: z.number().int().min(7).max(365),
  }),
  'notifications.retentionDays': defineSystemSetting({
    defaultValue: 180,
    description: 'Durée de conservation des notifications en jours',
    schema: z.number().int().min(30).max(730),
  }),
  'ui.defaultPageSize': defineSystemSetting({
    defaultValue: 25,
    description: 'Nombre de lignes proposé par défaut dans les listes',
    schema: z.number().int().min(10).max(100),
  }),
} as const;

export type SystemSettingKey = keyof typeof SYSTEM_SETTING_DEFINITIONS;

export const isSystemSettingKey = (key: string): key is SystemSettingKey =>
  Object.hasOwn(SYSTEM_SETTING_DEFINITIONS, key);

export const parseSystemSettingValue = (
  key: SystemSettingKey,
  value: unknown,
): unknown => {
  // SystemSettingKey is a closed union derived from this object.
  // eslint-disable-next-line security/detect-object-injection
  return SYSTEM_SETTING_DEFINITIONS[key].schema.parse(value);
};
