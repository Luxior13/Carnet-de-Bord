import type { SystemSettingKey } from '$constants/system-setting-catalog.constants';

export type SystemSettingItem = {
  description: string | null;
  isStoredValueInvalid: boolean;
  key: SystemSettingKey;
  updatedAt: string;
  value: unknown;
  version: number;
};
