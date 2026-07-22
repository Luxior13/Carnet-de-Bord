export const PERSON_STRUCTURE_STATUSES = [
  'IN_STRUCTURE',
  'OUTSIDE_STRUCTURE',
] as const;

export const PERSON_STRUCTURE_STATUS_LABELS = {
  IN_STRUCTURE: 'Dans la structure',
  OUTSIDE_STRUCTURE: 'Hors structure',
} as const satisfies Record<(typeof PERSON_STRUCTURE_STATUSES)[number], string>;

export type PersonSocialNetworkStatus = 'active' | 'deprecated';

export type PersonSocialNetworkDefinition = {
  key: string;
  label: string;
  status: PersonSocialNetworkStatus;
};

export const PERSON_SOCIAL_NETWORKS: readonly PersonSocialNetworkDefinition[] =
  [
    { key: 'discord', label: 'Discord', status: 'active' },
    { key: 'instagram', label: 'Instagram', status: 'active' },
    { key: 'x', label: 'X', status: 'active' },
    { key: 'twitter', label: 'Twitter', status: 'deprecated' },
    { key: 'tiktok', label: 'TikTok', status: 'active' },
    { key: 'twitch', label: 'Twitch', status: 'active' },
    { key: 'youtube', label: 'YouTube', status: 'active' },
    { key: 'facebook', label: 'Facebook', status: 'active' },
    { key: 'linkedin', label: 'LinkedIn', status: 'active' },
  ] as const;

export const PERSON_CONTACT_LABEL_SUGGESTIONS = [
  'Personnel',
  'Professionnel',
  'Association',
  'Parent/tuteur',
  'Secondaire',
  'Autre',
] as const;

export const PERSON_SOCIAL_LABEL_SUGGESTIONS = [
  'Personnel',
  'Professionnel',
  'Secondaire',
  'Ancien',
  'Autre',
] as const;

export const PERSON_LIMITS = {
  emails: 10,
  fieldHistory: 2,
  phones: 10,
  socialProfiles: 20,
} as const;

export const PERSON_AUDIT_KEYS = {
  entityType: 'PERSON',
  sections: {
    contacts: 'contacts',
    identity: 'identity',
    social: 'social',
    structure: 'structure',
  },
} as const;

const PERSON_HISTORY_FIELDS = {
  contacts: new Set(['email', 'phone', 'label', 'isPrimary']),
  identity: new Set(['nickname', 'firstName', 'lastName', 'birthDate']),
  social: new Set([
    'networkKey',
    'identifier',
    'profileUrl',
    'label',
    'isPrimary',
  ]),
  structure: new Set(['structureStatus']),
} as const;

export const isAllowedPersonHistoryField = (
  sectionKey: string,
  fieldKey: string,
  recordId: string | null,
): boolean => {
  if (!(sectionKey in PERSON_HISTORY_FIELDS)) return false;
  const section = sectionKey as keyof typeof PERSON_HISTORY_FIELDS;
  const collectionField = section === 'contacts' || section === 'social';

  return (
    PERSON_HISTORY_FIELDS[section].has(fieldKey) &&
    (collectionField ? Boolean(recordId) : recordId === null)
  );
};

const SOCIAL_NETWORK_BY_KEY = new Map(
  PERSON_SOCIAL_NETWORKS.map((network) => [network.key, network]),
);

export const getPersonSocialNetwork = (
  key: string,
): PersonSocialNetworkDefinition | null =>
  SOCIAL_NETWORK_BY_KEY.get(key) ?? null;

export const isKnownPersonSocialNetwork = (key: string): boolean =>
  SOCIAL_NETWORK_BY_KEY.has(key);

export const isSelectablePersonSocialNetwork = (key: string): boolean =>
  getPersonSocialNetwork(key)?.status === 'active';
