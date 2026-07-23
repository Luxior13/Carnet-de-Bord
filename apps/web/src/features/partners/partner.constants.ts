export const PARTNER_CATEGORIES = ['SPONSOR', 'PARTNER'] as const;
export const PARTNER_STATUSES = [
  'PROSPECT',
  'DISCUSSION',
  'ACTIVE',
  'ENDED',
  'CLOSED',
] as const;
export const PARTNER_LIST_SORTS = ['name', 'updated'] as const;

export const PARTNER_CATEGORY_LABELS = {
  PARTNER: 'Partenaire',
  SPONSOR: 'Sponsor',
} as const;

export const PARTNER_STATUS_LABELS = {
  ACTIVE: 'Actif',
  CLOSED: 'Sans suite',
  DISCUSSION: 'En discussion',
  ENDED: 'Terminé',
  PROSPECT: 'Prospect',
} as const;

export const PARTNER_LIMITS = {
  channels: 10,
  contacts: 30,
  followUpPage: 50,
} as const;

export const PARTNER_AUDIT_KEYS = {
  entityType: 'PARTNER',
  informationSection: 'information',
} as const;
