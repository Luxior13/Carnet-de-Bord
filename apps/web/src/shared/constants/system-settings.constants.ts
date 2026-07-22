import { z } from 'zod';

import {
  SYSTEM_SETTING_CATALOG,
  type SystemSettingCatalogItem,
  type SystemSettingKey,
} from '$constants/system-setting-catalog.constants';

export {
  isSystemSettingKey,
  type SystemSettingKey,
} from '$constants/system-setting-catalog.constants';

const defineSystemSetting = <const TSetting extends SystemSettingCatalogItem>(
  definition: TSetting,
): TSetting & { schema: z.ZodNumber } => ({
  ...definition,
  schema: z.number().int().min(definition.min).max(definition.max),
});

export const SYSTEM_SETTING_DEFINITIONS = {
  'audit.retentionDays': defineSystemSetting(
    SYSTEM_SETTING_CATALOG['audit.retentionDays'],
  ),
  'notifications.retentionDays': defineSystemSetting(
    SYSTEM_SETTING_CATALOG['notifications.retentionDays'],
  ),
  'ui.defaultPageSize': defineSystemSetting(
    SYSTEM_SETTING_CATALOG['ui.defaultPageSize'],
  ),
} as const;

export const parseSystemSettingValue = (
  key: SystemSettingKey,
  value: unknown,
): unknown => {
  // SystemSettingKey is a closed union derived from this object.
  // eslint-disable-next-line security/detect-object-injection
  return SYSTEM_SETTING_DEFINITIONS[key].schema.parse(value);
};
