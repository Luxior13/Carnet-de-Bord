import React from 'react';

import { hasPermission, PERMISSIONS } from '$constants/permissions.constants';
import { NotificationInboxPage } from '$features/notifications/NotificationInboxPage';
import {
  getDefaultNotificationListLimit,
  listNotifications,
} from '$features/notifications/server/notification-list.service';
import { getPageAuthSession } from '$server/auth';
import type { NotificationListData } from '$types/platform.types';

export default async function NotificationsPage(): Promise<React.ReactNode> {
  const { user } = await getPageAuthSession();
  const canView = Boolean(
    user &&
    !user.mustChangePassword &&
    (user.isProtected ||
      hasPermission(
        user.role,
        PERMISSIONS.NOTIFICATIONS.VIEW,
        user.permissions,
      )),
  );
  let initialData: NotificationListData | undefined;

  if (user && canView) {
    try {
      const limit = await getDefaultNotificationListLimit();
      initialData = await listNotifications({
        limit,
        status: 'all',
        userId: user.id,
      });
    } catch {
      // The client preserves its established retry state when the initial
      // server snapshot is temporarily unavailable.
    }
  }

  return <NotificationInboxPage initialData={initialData} />;
}
