import type { BackgroundJobStatus, NotificationSeverity } from '@repo/database';

export type NotificationItem = {
  archivedAt: string | null;
  body: string;
  createdAt: string;
  href: string | null;
  id: string;
  readAt: string | null;
  severity: NotificationSeverity;
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
  key: string;
  updatedAt: string;
  value: unknown;
  version: number;
};

export type BackgroundJobItem = {
  attempts: number;
  completedAt: Date | null;
  createdAt: Date;
  dedupeKey: string | null;
  id: string;
  lastError: string | null;
  lockedAt: Date | null;
  lockedBy: string | null;
  maxAttempts: number;
  payload: unknown;
  priority: number;
  runAt: Date;
  status: BackgroundJobStatus;
  type: string;
  updatedAt: Date;
};
