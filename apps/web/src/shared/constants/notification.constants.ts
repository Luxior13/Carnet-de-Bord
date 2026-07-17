export const NOTIFICATION_INBOX_HREF = '/mes-notifications' as const;

export const LEGACY_NOTIFICATION_INBOX_HREF =
  '/tableau-de-bord/mes-notifications' as const;

export const NOTIFICATIONS_CHANGED_EVENT =
  'team-control:notifications-changed' as const;

export const notifyNotificationsChanged = (): void => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
  }
};
