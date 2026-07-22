import type { PERSON_STRUCTURE_STATUSES } from '../person.constants';

export type PersonStructureStatus = (typeof PERSON_STRUCTURE_STATUSES)[number];

export type PersonAuditActor = {
  displayName: string;
  loginName: string | null;
};

export type PersonLastChange = {
  action: string;
  actor: PersonAuditActor;
  at: string;
} | null;

export type PersonEmailItem = {
  createdAt: string;
  email: string;
  id: string;
  isPrimary: boolean;
  label: string;
  updatedAt: string;
  version: number;
};

export type PersonPhoneItem = {
  countryCode: string;
  createdAt: string;
  id: string;
  isPrimary: boolean;
  label: string;
  phone: string;
  updatedAt: string;
  version: number;
};

export type PersonSocialProfileItem = {
  createdAt: string;
  id: string;
  identifier: string | null;
  isPrimary: boolean;
  label: string;
  networkKey: string;
  profileUrl: string | null;
  updatedAt: string;
  version: number;
};

export type PersonSummary = {
  createdAt: string;
  firstName: string | null;
  id: string;
  lastName: string | null;
  matchedByContact: boolean;
  nickname: string | null;
  structureStatus: PersonStructureStatus;
  updatedAt: string;
  version: number;
};

export type PersonDetail = Omit<PersonSummary, 'matchedByContact'> & {
  age: number | null;
  birthDate: string | null;
  emails: PersonEmailItem[];
  isAdult: boolean | null;
  lastChange: PersonLastChange;
  phones: PersonPhoneItem[];
  socialProfiles: PersonSocialProfileItem[];
};

export type PersonsListResponse = {
  items: PersonSummary[];
  pagination: {
    hasMore: boolean;
    limit: number;
    nextCursor: string | null;
    snapshotAt: string;
  };
};

export type PersonDuplicateWarning = {
  duplicateFound: boolean;
  /**
   * Optional form paths identifying the matching values. Kept optional so
   * older clients that only understand `duplicateFound` remain compatible.
   */
  fields?: string[];
  matches?: Array<{
    fieldKey: 'email' | 'identifier' | 'phone' | 'profileUrl';
    recordId: string;
  }>;
};

export type PersonMutationResponse = {
  duplicateWarning?: PersonDuplicateWarning;
  person: PersonDetail;
};

export type PersonFieldHistoryItem = {
  action: string;
  actor: PersonAuditActor;
  after: unknown | null;
  at: string;
  before: unknown | null;
  id: string;
};

export type PersonFieldHistoryResponse = {
  items: PersonFieldHistoryItem[];
};
