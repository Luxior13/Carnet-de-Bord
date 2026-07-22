import type { NotificationSeverity } from '@repo/shared';

import type { SystemSettingKey } from '$constants/system-setting-catalog.constants';

export type NotificationItem = {
  archivedAt: string | null;
  body: string;
  createdAt: string;
  href: string | null;
  id: string;
  readAt: string | null;
  severity: NotificationSeverity;
  source: {
    kind: 'SYSTEM' | 'USER';
    label: string;
  };
  title: string;
  type: string;
};

export type NotificationListData = {
  items: NotificationItem[];
  pagination: import('$types/api.types').CursorPaginationMeta;
  unreadCount: number;
};

export type SystemSettingItem = {
  description: string | null;
  key: SystemSettingKey;
  updatedAt: string;
  value: unknown;
  version: number;
};
