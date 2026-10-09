/** Stable page destinations, independent of navigation labels and API paths. */
export const PAGE_PATHS = {
  account: '/mon-compte',
  home: '/',
  internalNews: '/activite/actualites',
  login: '/login',
  newPerson: '/membres/repertoire/nouveau',
  newUser: '/systeme/utilisateurs/nouveau',
  persons: '/membres/repertoire',
  roadmap: '/systeme/feuille-de-route',
  search: '/recherche',
  system: '/systeme',
  systemActivity: '/systeme/journal-activite',
  systemSettings: '/systeme/parametres',
  users: '/systeme/utilisateurs',
} as const;

// These aliases go straight to the canonical destination, including /personnes.
// Only the resource collections accept suffixes; an alias creates no new page.
export const LEGACY_PAGE_ALIASES = [
  { collection: true, destination: PAGE_PATHS.persons, source: '/personnes' },
  {
    collection: true,
    destination: PAGE_PATHS.persons,
    source: '/vie-interne/repertoire',
  },
  {
    collection: true,
    destination: PAGE_PATHS.users,
    source: '/administration/utilisateurs',
  },
  {
    collection: false,
    destination: PAGE_PATHS.roadmap,
    source: '/vie-interne/actualite-interne',
  },
  // The internal news module is parked on the roadmap: its former page now
  // leads to the planning page instead of exposing a removed destination.
  {
    collection: false,
    destination: PAGE_PATHS.roadmap,
    source: PAGE_PATHS.internalNews,
  },
  {
    collection: false,
    destination: PAGE_PATHS.roadmap,
    source: '/feuille-de-route',
  },
  {
    collection: false,
    destination: PAGE_PATHS.users,
    source: '/administration',
  },
  {
    collection: false,
    destination: PAGE_PATHS.home,
    source: '/tableau-de-bord',
  },
  // The notifications module was parked on the roadmap: its former inbox now
  // leads to the planning page instead of exposing a removed destination.
  {
    collection: false,
    destination: PAGE_PATHS.roadmap,
    source: '/mes-notifications',
  },
  {
    collection: false,
    destination: PAGE_PATHS.roadmap,
    source: '/tableau-de-bord/mes-notifications',
  },
] as const;

export const PAGE_REDIRECTS = LEGACY_PAGE_ALIASES.map((alias) => ({
  destination: `${alias.destination}${alias.collection ? '/:path*' : ''}`,
  permanent: true,
  source: `${alias.source}${alias.collection ? '/:path*' : ''}`,
}));

export const getCanonicalPagePathname = (pathname: string): string => {
  const alias = LEGACY_PAGE_ALIASES.find(
    (entry) =>
      pathname === entry.source ||
      (entry.collection && pathname.startsWith(`${entry.source}/`)),
  );

  return alias
    ? `${alias.destination}${pathname.slice(alias.source.length)}`
    : pathname;
};

export const personDetailPath = (id: string): string =>
  `${PAGE_PATHS.persons}/${encodeURIComponent(id)}`;

export const userDetailPath = (id: string): string =>
  `${PAGE_PATHS.users}/${encodeURIComponent(id)}`;
