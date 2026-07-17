import {
  normalizeSearchValue,
  type RankedSearchItem,
} from '$components/layout/global-search.utils';
import {
  canAccessNavigationItem,
  getDefaultNavigationSpace,
  getNavigationAvailability,
  getNavigationSpaceItems,
  type NavigationSpace,
  type NavItem,
} from '$constants/app.constants';

export type SearchCatalogItem = RankedSearchItem & {
  description?: string;
  groupLabel: string;
  href: string;
  icon: NavItem['icon'];
  id: string;
  label: string;
  source: 'account' | 'navigation';
  sourceLabel: string;
  space: NavigationSpace;
};

type SearchUser = Parameters<typeof canAccessNavigationItem>[0];

const createCatalogItem = (
  item: Pick<NavItem, 'description' | 'href' | 'icon' | 'label'>,
  space: NavigationSpace,
  options: {
    groupLabel?: string;
    source?: SearchCatalogItem['source'];
    sourceLabel?: string;
  } = {},
): SearchCatalogItem => {
  const groupLabel = options.groupLabel ?? space.label;

  return {
    description: item.description,
    groupLabel,
    href: item.href,
    icon: item.icon,
    id: `${options.source ?? 'navigation'}:${item.href}`,
    label: item.label,
    labelSearchText: normalizeSearchValue(item.label),
    searchText: normalizeSearchValue(
      `${groupLabel} ${space.summary} ${item.label} ${item.description ?? ''}`,
    ),
    source: options.source ?? 'navigation',
    sourceLabel: options.sourceLabel ?? 'Pages',
    space,
    spaceSearchText: normalizeSearchValue(groupLabel),
  };
};

export const buildSearchCatalog = (
  spaces: readonly NavigationSpace[],
  user: SearchUser,
): SearchCatalogItem[] => {
  const seenHrefs = new Set<string>();
  const results: SearchCatalogItem[] = [];

  for (const space of spaces) {
    for (const item of getNavigationSpaceItems(space)) {
      if (
        seenHrefs.has(item.href) ||
        getNavigationAvailability(item) !== 'live' ||
        !canAccessNavigationItem(user, item)
      ) {
        continue;
      }

      seenHrefs.add(item.href);
      results.push(createCatalogItem(item, space));
    }
  }

  if (!user || seenHrefs.has('/mon-compte')) return results;

  const accountSpace =
    spaces.find((space) => space.id === 'dashboard') ??
    getDefaultNavigationSpace();
  results.push(
    createCatalogItem(
      {
        description: 'Profil, sécurité, sessions et activité personnelle.',
        href: '/mon-compte',
        icon: 'UserCheck',
        label: 'Mon compte',
      },
      accountSpace,
      {
        groupLabel: 'Compte personnel',
        source: 'account',
        sourceLabel: 'Compte',
      },
    ),
  );

  return results;
};

export const getSuggestedSearchItems = (
  results: readonly SearchCatalogItem[],
  activeSpace: NavigationSpace,
  limit = 8,
): SearchCatalogItem[] => {
  const activeSpaceResults = results.filter(
    (result) => result.space.id === activeSpace.id,
  );
  const otherResults = results.filter(
    (result) => result.space.id !== activeSpace.id,
  );

  return [...activeSpaceResults, ...otherResults].slice(0, limit);
};
