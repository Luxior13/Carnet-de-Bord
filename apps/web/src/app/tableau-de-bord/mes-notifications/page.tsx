import { permanentRedirect } from 'next/navigation';

import { NOTIFICATION_INBOX_HREF } from '$constants/notification.constants';

export default function LegacyNotificationsPage(): never {
  permanentRedirect(NOTIFICATION_INBOX_HREF);
}
