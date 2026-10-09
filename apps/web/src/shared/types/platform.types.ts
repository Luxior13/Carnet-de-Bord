import type { SystemSettingKey } from '$constants/system-setting-catalog.constants';

export type SystemSettingItem = {
  description: string | null;
  key: SystemSettingKey;
  updatedAt: string;
  value: unknown;
  version: number;
};
