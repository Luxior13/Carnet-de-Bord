export type InboxFilter = 'all' | 'archived' | 'unread';

export const normalizeInboxFilter = (
  value: string | string[] | null | undefined,
): InboxFilter => {
  const status = Array.isArray(value) ? value[0] : value;

  return status === 'archived' || status === 'unread' ? status : 'all';
};
