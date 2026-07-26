import type { CursorPaginationMeta } from '$types/api.types';

export const INTERNAL_NEWS_FILTERS = [
  'all',
  'announcements',
  'partners',
] as const;

export type InternalNewsFilter = (typeof INTERNAL_NEWS_FILTERS)[number];

export type InternalNewsActor = {
  displayName: string;
  loginName: string | null;
};

type InternalNewsItemBase = {
  actor: InternalNewsActor;
  body: string;
  id: string;
  occurredAt: string;
  title: string;
};

export type InternalAnnouncementItem = InternalNewsItemBase & {
  href: null;
  isPinned: boolean;
  kind: 'ANNOUNCEMENT';
};

export type InternalPartnerNewsItem = InternalNewsItemBase & {
  href: string;
  kind: 'PARTNER_EVENT';
  partner: {
    id: string;
    name: string;
  };
  statusTransition: {
    from: string | null;
    to: string;
  };
};

export type InternalNewsItem =
  InternalAnnouncementItem | InternalPartnerNewsItem;

export type InternalNewsResponse = {
  items: InternalNewsItem[];
  pagination: CursorPaginationMeta;
  pinned: InternalAnnouncementItem[];
};

export type PublishInternalAnnouncementInput = {
  body: string;
  isPinned: boolean;
  title: string;
};

export type UpdateInternalAnnouncementPinInput = {
  isPinned: boolean;
};
