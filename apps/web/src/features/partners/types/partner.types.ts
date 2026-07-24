import type {
  PARTNER_CATEGORIES,
  PARTNER_LIST_SORTS,
  PARTNER_STATUSES,
} from '../partner.constants';

export type PartnerCategory = (typeof PARTNER_CATEGORIES)[number];
export type PartnerStatus = (typeof PARTNER_STATUSES)[number];
export type PartnerListSort = (typeof PARTNER_LIST_SORTS)[number];

export type PartnerActor = {
  displayName: string;
  loginName: string | null;
};

export type PartnerChannel = {
  id: string;
  isPrimary: boolean;
  label: string;
  type: 'EMAIL' | 'PHONE';
  value: string;
  version: number;
};

export type PartnerPeriod = {
  closedAt: string | null;
  closingNote: string | null;
  endedOn: string | null;
  id: string;
  startedOn: string | null;
  version: number;
};

export type PartnerContactPerson = {
  displayName: string;
  id: string;
  nickname: string | null;
};

export type PartnerContact = {
  closedAt: string | null;
  endedOn: string | null;
  id: string;
  isPrimary: boolean;
  label: string;
  person: PartnerContactPerson | null;
  startedOn: string | null;
  version: number;
};

export type PartnerFollowUpAction = {
  completedAt: string | null;
  completedBy: PartnerActor | null;
  description: string;
  dueOn: string | null;
  id: string;
  version: number;
};

export type PartnerFollowUp = {
  action: PartnerFollowUpAction | null;
  author: PartnerActor;
  contact: PartnerContactPerson | null;
  createdAt: string;
  id: string;
  occurredAt: string;
  text: string;
  updatedAt: string;
  version: number;
};

export type PartnerSummary = {
  categories: PartnerCategory[];
  createdAt: string;
  id: string;
  name: string;
  normalizedName: string;
  openAction: {
    description: string;
    dueOn: string | null;
  } | null;
  primaryContact: PartnerContactPerson | null;
  status: PartnerStatus;
  updatedAt: string;
  version: number;
  website: string | null;
};

export type PartnerDetail = Omit<
  PartnerSummary,
  'openAction' | 'primaryContact'
> & {
  channels: PartnerChannel[];
  contacts: PartnerContact[];
  createdBy: PartnerActor | null;
  description: string | null;
  followUps: PartnerFollowUp[];
  periods: PartnerPeriod[];
  updatedBy: PartnerActor | null;
};

export type PartnersListResponse = {
  items: PartnerSummary[];
  pagination: {
    hasMore: boolean;
    limit: number;
    nextCursor: string | null;
    snapshotAt: string;
  };
};

export type PartnerMutationResponse = {
  duplicateWarning?: {
    duplicateFound: boolean;
    names: string[];
  };
  partner: PartnerDetail;
};

export type PartnerActivityItem = {
  action: string;
  actor: PartnerActor;
  at: string;
  description: string;
  id: string;
};
