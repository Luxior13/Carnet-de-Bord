/**
 * Browser-safe contract of the activity journal (rebuilt on 30 October 2026,
 * docs/pages/systeme/journal-activite.md). The server formats every label
 * and masks what the reader may not see; the page only displays.
 */

export const JOURNAL_TYPES = [
  'all',
  'security',
  'accounts',
  'persons',
  'settings',
] as const;
export type JournalType = (typeof JOURNAL_TYPES)[number];

export const JOURNAL_SHOWS = ['all', 'important', 'failures'] as const;
export type JournalShow = (typeof JOURNAL_SHOWS)[number];

/** One year at most: the retention decided on 30 October 2026. */
export const JOURNAL_PERIODS = ['24h', '7d', '30d', '1y'] as const;
export type JournalPeriod = (typeof JOURNAL_PERIODS)[number];

export const JOURNAL_PERIOD_LABELS: Record<JournalPeriod, string> = {
  '1y': '1 an',
  '24h': '24 heures',
  '30d': '30 jours',
  '7d': '7 jours',
};

export const JOURNAL_TYPE_LABELS: Record<JournalType, string> = {
  accounts: 'Comptes et droits',
  all: 'Tous',
  persons: 'Personnes',
  security: 'Sécurité',
  settings: 'Paramètres',
};

export const JOURNAL_SHOW_LABELS: Record<JournalShow, string> = {
  all: 'Tout',
  failures: 'Échecs',
  important: 'Importants',
};

export const JOURNAL_PAGE_SIZE = 50;
const JOURNAL_SEARCH_MIN_LENGTH = 3;
export const JOURNAL_SEARCH_MAX_LENGTH = 100;

export type JournalQuery = {
  page: number;
  period: JournalPeriod;
  /** A person record: its events only (link « Historique » of the record). */
  person: string | null;
  search: string;
  show: JournalShow;
  type: JournalType;
  /** An account, as author or as the account concerned. */
  user: string | null;
};

export const DEFAULT_JOURNAL_QUERY: JournalQuery = {
  page: 1,
  period: '7d',
  person: null,
  search: '',
  show: 'all',
  type: 'all',
  user: null,
};

export type JournalTone = 'critical' | 'failure' | 'neutral' | 'warning';

export type JournalChange = {
  after: string;
  before: string;
  /** Field alone, when `label` also names its section (« Email »). */
  field?: string;
  label: string;
};

/** Changes shown before « Afficher les N autres changements ». */
export const JOURNAL_VISIBLE_CHANGES = 6;

/**
 * The changed fields, each named once, for the collapsed line (31 October
 * 2026): « Prénom, Nom, Email », then « Prénom, Nom et 4 autres ».
 */
export const summarizeJournalChanges = (
  changes: readonly JournalChange[],
): string | null => {
  const names = [
    ...new Set(changes.map((change) => change.field ?? change.label)),
  ];
  if (names.length === 0) return null;
  if (names.length <= 3) return names.join(', ');

  return `${names.slice(0, 2).join(', ')} et ${names.length - 2} autres`;
};

export type JournalFact = {
  label: string;
  value: string;
};

export type JournalEvent = {
  /**
   * Account that acted; without one, « Aucun compte reconnu » for a
   * connection attempt and « Système » otherwise (id null).
   */
  actor: { id: string | null; loginName: string | null; name: string };
  at: string;
  browser: string | null;
  changes: JournalChange[];
  facts: JournalFact[];
  id: string;
  /** Shown to the superadmin only; `ipMasked` tells the others one exists. */
  ip: string | null;
  ipMasked: boolean;
  label: string;
  subject: string | null;
  target: {
    href: string | null;
    id: string;
    kind: 'person' | 'user';
    name: string;
  } | null;
  tone: JournalTone;
  typeLabel: string;
};

export type JournalResponse = {
  /** Instant the pages are read at, so new events never shift them. */
  asOf: string;
  events: JournalEvent[];
  /** Name of the account or record a contextual link narrows to. */
  focusLabel: string | null;
  pagination: {
    limit: number;
    page: number;
    total: number;
    totalPages: number;
  };
};

const PAGE_PATTERN = /^[1-9]\d{0,5}$/u;
const ID_PATTERN = /^[\w-]{1,128}$/u;

const pick = <T extends string>(
  values: readonly T[],
  value: string | null,
  fallback: T,
): T => (values.includes(value as T) ? (value as T) : fallback);

/** Reads the page or API query, dropping anything unknown or malformed. */
export const readJournalQuery = (params: URLSearchParams): JournalQuery => {
  const page = params.get('page') ?? '';
  const person = params.get('person');
  const user = params.get('user');

  return {
    page: PAGE_PATTERN.test(page) ? Number(page) : 1,
    period: pick(JOURNAL_PERIODS, params.get('period'), '7d'),
    person: person && ID_PATTERN.test(person) ? person : null,
    search: (params.get('search') ?? '')
      .trim()
      .replace(/\s+/gu, ' ')
      .slice(0, JOURNAL_SEARCH_MAX_LENGTH),
    show: pick(JOURNAL_SHOWS, params.get('show'), 'all'),
    type: pick(JOURNAL_TYPES, params.get('type'), 'all'),
    user: user && ID_PATTERN.test(user) ? user : null,
  };
};

/** Only the values that differ from the defaults, in a stable order. */
export const buildJournalParams = (query: JournalQuery): URLSearchParams => {
  const params = new URLSearchParams();
  if (query.type !== 'all') params.set('type', query.type);
  if (query.show !== 'all') params.set('show', query.show);
  if (query.period !== '7d') params.set('period', query.period);
  if (query.search) params.set('search', query.search);
  if (query.user) params.set('user', query.user);
  if (query.person) params.set('person', query.person);
  if (query.page > 1) params.set('page', String(query.page));

  return params;
};

/** Label of a closed filter value (keys come from the typed lists above). */
export const journalLabel = <T extends string>(
  labels: Record<T, string>,
  key: T,
): string =>
  // eslint-disable-next-line security/detect-object-injection
  labels[key];

/** A search shorter than three letters or digits is not applied. */
export const isJournalSearchApplicable = (search: string): boolean =>
  search.replace(/[^\p{L}\p{N}]/gu, '').length >= JOURNAL_SEARCH_MIN_LENGTH;
