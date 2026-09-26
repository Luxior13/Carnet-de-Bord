'use client';

import { UserRole } from '@repo/shared';
import {
  ArrowRight,
  Key,
  Plus,
  Search,
  SlidersHorizontal,
  UserMinus,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import React, {
  type FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import { ContentState } from '$components/layout/ContentState';
import { UserAvatar } from '$components/users/UserAvatar';
import {
  getAccessLabel,
  hasPermission,
  PERMISSIONS,
} from '$constants/permissions.constants';
import { PAGE_PATHS, userDetailPath } from '$constants/routes.constants';
import { useUser } from '$context/UserContext';
import { UsersOverview } from '$features/users/UsersOverview';
import type {
  PaginationInfo,
  UserStatsType,
  UserType,
} from '$types/auth.types';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import {
  DataTableDesktop,
  DataTableMobileList,
  DataTableSection,
} from '$ui/data-table-section';
import { Input } from '$ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { Skeleton } from '$ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '$ui/table';
import { cn } from '$utils/css.utils';
import {
  getUserDisplayName,
  getUserLoginDisplay,
  isUserIdentityMasked,
} from '$utils/user-display.utils';

type FilterStatus = 'all' | 'active' | 'inactive' | 'pending';
type FilterRole = 'all' | UserRole;
type SortOption = 'name' | 'recent' | 'created';

const FILTER_STATUS_OPTIONS: readonly FilterStatus[] = [
  'all',
  'active',
  'inactive',
  'pending',
];
const FILTER_ROLE_OPTIONS: readonly FilterRole[] = [
  'all',
  UserRole.ADMIN,
  UserRole.USER,
];
const SORT_OPTIONS: readonly SortOption[] = ['name', 'recent', 'created'];
const USER_SEARCH_MAX_LENGTH = 100;
// Keep the table wide; show the 15rem rail when the available workspace fits it.
const USERS_LIST_LAYOUT_CLASS_NAME =
  'grid min-w-0 grid-cols-1 items-start gap-4 @min-[94rem]/private-viewport:grid-cols-[minmax(0,1fr)_15rem] @min-[94rem]/private-viewport:gap-5';

const getSortLabel = (sort: SortOption): string => {
  switch (sort) {
    case 'created':
      return 'Date de création';
    case 'recent':
      return 'Dernière connexion';
    case 'name':
    default:
      return 'Nom (A–Z)';
  }
};

const normalizeFilterStatus = (value: string | null): FilterStatus =>
  FILTER_STATUS_OPTIONS.includes(value as FilterStatus)
    ? (value as FilterStatus)
    : 'all';

const normalizeFilterRole = (value: string | null): FilterRole =>
  FILTER_ROLE_OPTIONS.includes(value as FilterRole)
    ? (value as FilterRole)
    : 'all';

const normalizeSortOption = (value: string | null): SortOption =>
  SORT_OPTIONS.includes(value as SortOption) ? (value as SortOption) : 'name';

const normalizePage = (value: string | null): number => {
  const parsed = Number.parseInt(value ?? '1', 10);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
};

const normalizeSearchQuery = (value: string | null): string =>
  (value ?? '').trim().slice(0, USER_SEARCH_MAX_LENGTH);

const buildUsersQueryParams = ({
  limit,
  page,
  role,
  search,
  sort,
  status,
}: {
  limit: number | null;
  page: number;
  role: FilterRole;
  search: string;
  sort: SortOption;
  status: FilterStatus;
}): URLSearchParams => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  if (limit !== null) params.set('limit', String(limit));
  if (search) params.set('search', search);
  if (status !== 'all') params.set('status', status);
  if (role !== 'all') params.set('role', role);
  if (sort !== 'name') params.set('sort', sort);

  return params;
};

const buildUsersPageUrlParams = ({
  page,
  role,
  search,
  sort,
  status,
}: {
  page: number;
  role: FilterRole;
  search: string;
  sort: SortOption;
  status: FilterStatus;
}): URLSearchParams => {
  const params = new URLSearchParams();
  const normalizedSearch = normalizeSearchQuery(search);

  if (page > 1) params.set('page', String(page));
  if (normalizedSearch) params.set('search', normalizedSearch);
  if (status !== 'all') params.set('status', status);
  if (role !== 'all') params.set('role', role);
  if (sort !== 'name') params.set('sort', sort);

  return params;
};

const UserAccessLabel: FC<{
  user: Pick<UserType, 'isProtected' | 'role'>;
}> = ({ user }) => {
  const isAdministrator = user.isProtected || user.role === UserRole.ADMIN;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border bg-transparent px-2 py-0.5 text-[0.8125rem] leading-5 whitespace-nowrap',
        user.isProtected
          ? 'border-access-privileged/30 text-access-privileged'
          : isAdministrator
            ? 'border-access-admin/30 text-access-admin'
            : 'border-access-member/30 text-access-member',
      )}
    >
      {getAccessLabel(user)}
    </span>
  );
};

const UserStatusLabel: FC<{ isActive: boolean }> = ({ isActive }) => {
  return (
    <span
      className={cn(
        'text-muted-foreground inline-flex items-center gap-1.5 rounded-sm border bg-transparent px-2 py-0.5 text-[0.8125rem] leading-5 whitespace-nowrap',
        isActive ? 'border-success/30' : 'border-muted-foreground/30',
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          'size-1.5 shrink-0 rounded-full',
          isActive ? 'bg-success' : 'bg-muted-foreground/50',
        )}
      />
      {isActive ? 'Actif' : 'Désactivé'}
    </span>
  );
};

export const UsersListPage: FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQueryString = searchParams.toString();
  const { userData: currentUser } = useUser();
  const canCreateUsers =
    !!currentUser &&
    (currentUser.isProtected ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.CREATE,
        currentUser.permissions,
      ));
  const canRequestSecurityDetails =
    !!currentUser &&
    (currentUser.isProtected ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.VIEW_SECURITY,
        currentUser.permissions,
      ));

  const [users, setUsers] = useState<UserType[]>([]);
  const [stats, setStats] = useState<UserStatsType | null>(null);
  const [securityDetailsVisible, setSecurityDetailsVisible] = useState(false);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [lastSuccessfulLoadAt, setLastSuccessfulLoadAt] = useState<Date | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState(() =>
    normalizeSearchQuery(searchParams.get('search')),
  );
  const [debouncedSearch, setDebouncedSearch] = useState(() =>
    normalizeSearchQuery(searchParams.get('search')),
  );
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(() =>
    normalizeFilterStatus(searchParams.get('status')),
  );
  const [filterRole, setFilterRole] = useState<FilterRole>(() =>
    normalizeFilterRole(searchParams.get('role')),
  );
  const [sortBy, setSortBy] = useState<SortOption>(() =>
    normalizeSortOption(searchParams.get('sort')),
  );
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const hasLoadedUsersRef = useRef(false);
  const effectivePageSizeRef = useRef<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const isSyncingStateFromUrlRef = useRef(false);
  const lastSyncedQueryStringRef = useRef(currentQueryString);

  // Pagination
  const [currentPage, setCurrentPage] = useState(() =>
    normalizePage(searchParams.get('page')),
  );
  const effectiveFilterStatus: FilterStatus =
    currentUser && !canRequestSecurityDetails && filterStatus === 'pending'
      ? 'all'
      : filterStatus;

  const fetchUsers = useCallback(
    async (
      page = 1,
      search = '',
      status: FilterStatus = 'all',
      role: FilterRole = 'all',
      sort: SortOption = 'name',
    ): Promise<void> => {
      abortControllerRef.current?.abort();
      const controller = new AbortController();
      abortControllerRef.current = controller;

      try {
        setLoadError(null);
        if (hasLoadedUsersRef.current) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }

        if (page === 1) effectivePageSizeRef.current = null;
        const params = buildUsersQueryParams({
          limit: page > 1 ? effectivePageSizeRef.current : null,
          page,
          role,
          search,
          sort,
          status,
        });

        const response = await fetch(`/api/users?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await response.json();

        if (controller.signal.aborted) return;

        if (response.ok && data.success) {
          const nextPagination = data.data.pagination as PaginationInfo;
          effectivePageSizeRef.current = nextPagination.limit;
          const resolvedTotalPages = Math.max(
            1,
            nextPagination.totalPages || 0,
          );

          if (page > resolvedTotalPages) {
            setCurrentPage(resolvedTotalPages);

            return;
          }

          setUsers(data.data.users);
          setStats(data.data.stats);
          setSecurityDetailsVisible(data.data.securityDetailsVisible === true);
          setPagination(nextPagination);
          setLastSuccessfulLoadAt(new Date());
        } else {
          const message =
            data.error?.message || 'Impossible de charger les utilisateurs';
          setLoadError(message);
        }
      } catch {
        if (controller.signal.aborted) return;
        const message = 'Impossible de charger les utilisateurs';
        setLoadError(message);
      } finally {
        if (abortControllerRef.current !== controller) return;

        abortControllerRef.current = null;
        hasLoadedUsersRef.current = true;
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [],
  );

  useEffect((): (() => void) => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect((): void => {
    if (currentQueryString === lastSyncedQueryStringRef.current) return;

    const nextSearch = normalizeSearchQuery(searchParams.get('search'));

    isSyncingStateFromUrlRef.current = true;
    lastSyncedQueryStringRef.current = currentQueryString;
    setSearchQuery(nextSearch);
    setDebouncedSearch(nextSearch);
    setFilterStatus(normalizeFilterStatus(searchParams.get('status')));
    setFilterRole(normalizeFilterRole(searchParams.get('role')));
    setSortBy(normalizeSortOption(searchParams.get('sort')));
    setCurrentPage(normalizePage(searchParams.get('page')));
  }, [currentQueryString, searchParams]);

  useEffect((): void => {
    if (isSyncingStateFromUrlRef.current) {
      isSyncingStateFromUrlRef.current = false;

      return;
    }

    const params = buildUsersPageUrlParams({
      page: currentPage,
      role: filterRole,
      search: debouncedSearch,
      sort: sortBy,
      status: effectiveFilterStatus,
    });
    const nextQueryString = params.toString();

    if (currentQueryString === nextQueryString) return;

    lastSyncedQueryStringRef.current = nextQueryString;
    window.history.replaceState(
      null,
      '',
      nextQueryString ? `${pathname}?${nextQueryString}` : pathname,
    );
  }, [
    currentPage,
    currentQueryString,
    debouncedSearch,
    filterRole,
    effectiveFilterStatus,
    pathname,
    sortBy,
  ]);

  // Fetch on mount and when filters change
  useEffect((): void => {
    fetchUsers(
      currentPage,
      debouncedSearch,
      effectiveFilterStatus,
      filterRole,
      sortBy,
    );
  }, [
    fetchUsers,
    currentPage,
    debouncedSearch,
    effectiveFilterStatus,
    filterRole,
    sortBy,
  ]);

  useEffect((): void => {
    if (
      !currentUser ||
      canRequestSecurityDetails ||
      filterStatus !== 'pending'
    ) {
      return;
    }

    setFilterStatus('all');
    setCurrentPage(1);
  }, [canRequestSecurityDetails, currentUser, filterStatus]);

  // Handle search with debounce
  useEffect((): (() => void) => {
    const normalizedSearch = normalizeSearchQuery(searchQuery);

    // On mount and after a browser history navigation, both values already
    // come from the URL. Avoid forcing a valid deep-linked page back to 1.
    if (normalizedSearch === debouncedSearch) return () => undefined;

    const timer = setTimeout(() => {
      setDebouncedSearch(normalizedSearch);
      setCurrentPage(1); // Reset to page 1 on search
    }, 400);

    return () => clearTimeout(timer);
  }, [debouncedSearch, searchQuery]);

  // Handle other filter changes
  const handleFilterChange = (
    type: 'status' | 'role' | 'sort',
    value: string,
  ): void => {
    setCurrentPage(1); // Reset to page 1 on filter change
    if (type === 'status') {
      const nextStatus = normalizeFilterStatus(value);
      setFilterStatus(nextStatus);
    } else if (type === 'role') {
      const nextRole = normalizeFilterRole(value);
      setFilterRole(nextRole);
    } else {
      const nextSort = normalizeSortOption(value);
      setSortBy(nextSort);
    }
  };

  const clearFilters = (): void => {
    setSearchQuery('');
    setDebouncedSearch('');
    setFilterStatus('all');
    setFilterRole('all');
    setSortBy('name');
    setCurrentPage(1);
  };

  const getUserDetailHref = (userId: string): string =>
    userId === currentUser?.id
      ? '/mon-compte'
      : `${userDetailPath(userId)}?${new URLSearchParams({ returnTo: `${PAGE_PATHS.users}${currentQueryString ? `?${currentQueryString}` : ''}` })}`;

  const hasActiveFilters =
    !!searchQuery ||
    filterStatus !== 'all' ||
    filterRole !== 'all' ||
    sortBy !== 'name';

  const activeFilterCount =
    Number(effectiveFilterStatus !== 'all') +
    Number(filterRole !== 'all') +
    Number(sortBy !== 'name');

  const displayedUsers = users;

  // Total pages from server pagination
  const totalPages = pagination?.totalPages || 1;
  const totalFiltered = pagination?.total || users.length;

  const formatRelativeTime = (date: Date | string | null): string => {
    if (!date) return 'Jamais';
    const now = new Date();
    const then = new Date(date);
    if (Number.isNaN(then.getTime())) return 'Jamais';

    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays < 30) return `Il y a ${diffDays} j`;

    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  return (
    <div className="space-y-4">
      {loadError && (
        <ContentState
          action={
            <Button
              onClick={() =>
                void fetchUsers(
                  currentPage,
                  debouncedSearch,
                  effectiveFilterStatus,
                  filterRole,
                  sortBy,
                )
              }
              size="sm"
              type="button"
              variant="outline"
            >
              Réessayer
            </Button>
          }
          description={
            lastSuccessfulLoadAt && users.length > 0
              ? `Les dernières données fiables, actualisées à ${lastSuccessfulLoadAt.toLocaleTimeString(
                  'fr-FR',
                  {
                    hour: '2-digit',
                    minute: '2-digit',
                  },
                )}, restent affichées.`
              : undefined
          }
          kind="error"
          title={loadError}
        />
      )}
      <div className={USERS_LIST_LAYOUT_CLASS_NAME}>
        <UsersOverview
          isLoading={isLoading}
          securityDetailsVisible={
            isLoading ? canRequestSecurityDetails : securityDetailsVisible
          }
          stats={stats}
        />
        <DataTableSection
          className="rounded-lg"
          headerClassName="p-4 sm:p-5"
          contentClassName={
            isRefreshing ? 'opacity-60 transition-opacity' : undefined
          }
          toolbarClassName="@container/users-toolbar"
          toolbar={
            <div
              className={cn(
                'grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 @min-[32rem]/users-toolbar:grid-cols-6',
                canCreateUsers
                  ? '@min-[64rem]/users-toolbar:grid-cols-[minmax(16rem,1fr)_10rem_10rem_11rem_auto]'
                  : '@min-[64rem]/users-toolbar:grid-cols-[minmax(18rem,1fr)_10rem_10rem_11rem]',
              )}
            >
              <div
                className={cn(
                  'relative min-w-0 @min-[64rem]/users-toolbar:col-span-1',
                  canCreateUsers
                    ? '@min-[32rem]/users-toolbar:col-span-4'
                    : '@min-[32rem]/users-toolbar:col-span-6',
                )}
              >
                <Search
                  size={16}
                  className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
                />
                <Input
                  aria-label="Rechercher un compte utilisateur"
                  autoCapitalize="none"
                  autoComplete="off"
                  enterKeyHint="search"
                  name="directory-search"
                  placeholder="Rechercher…"
                  spellCheck={false}
                  title="Nom, identifiant ou email"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  maxLength={USER_SEARCH_MAX_LENGTH}
                  className="h-11 pr-12 pl-9 lg:h-10 [&::-webkit-search-cancel-button]:appearance-none"
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchQuery('')}
                    className="text-muted-foreground hover:text-foreground absolute top-0 right-0 size-11 lg:size-10"
                    aria-label="Effacer la recherche"
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>
              <Button
                aria-controls="users-list-filters"
                aria-expanded={filtersExpanded}
                aria-label={`Filtres et tri${activeFilterCount ? ` : ${activeFilterCount} actif${activeFilterCount > 1 ? 's' : ''}` : ''}`}
                className="h-11 gap-1.5 px-3 lg:h-10 @min-[32rem]/users-toolbar:hidden"
                onClick={() => setFiltersExpanded((expanded) => !expanded)}
                type="button"
                variant="outline"
              >
                <SlidersHorizontal aria-hidden="true" className="size-4" />
                <span className="sr-only @min-[22rem]/users-toolbar:not-sr-only">
                  Filtres
                </span>
                {activeFilterCount > 0 && (
                  <span className="text-primary-emphasis tabular-nums">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
              <div
                id="users-list-filters"
                className={cn(
                  'col-span-full gap-2 @min-[32rem]/users-toolbar:contents',
                  filtersExpanded ? 'grid' : 'hidden',
                )}
              >
                <Select
                  value={filterStatus}
                  onValueChange={(value) => handleFilterChange('status', value)}
                >
                  <SelectTrigger
                    aria-label="Filtrer par état du compte"
                    className="text-muted-foreground h-11 w-full min-w-0 bg-transparent lg:h-10 @min-[32rem]/users-toolbar:col-span-2 @min-[64rem]/users-toolbar:col-span-1"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    data-surface-tone="indigo"
                    className="rounded-lg"
                  >
                    <SelectItem value="all">Tous les états</SelectItem>
                    <SelectItem value="active">Actifs</SelectItem>
                    <SelectItem value="inactive">Désactivés</SelectItem>
                    {canRequestSecurityDetails && (
                      <SelectItem value="pending">
                        Mot de passe à changer
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <Select
                  value={filterRole}
                  onValueChange={(value) => handleFilterChange('role', value)}
                >
                  <SelectTrigger
                    aria-label="Filtrer par rôle"
                    className="text-muted-foreground h-11 w-full min-w-0 bg-transparent lg:h-10 @min-[32rem]/users-toolbar:col-span-2 @min-[64rem]/users-toolbar:col-span-1"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    data-surface-tone="indigo"
                    className="rounded-lg"
                  >
                    <SelectItem value="all">Tous les rôles</SelectItem>
                    <SelectItem value="ADMIN">Administrateurs</SelectItem>
                    <SelectItem value="USER">Utilisateurs</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={sortBy}
                  onValueChange={(value) => handleFilterChange('sort', value)}
                >
                  <SelectTrigger
                    aria-label="Trier les comptes utilisateurs"
                    className="text-muted-foreground h-11 w-full min-w-0 bg-transparent lg:h-10 @min-[32rem]/users-toolbar:col-span-2 @min-[64rem]/users-toolbar:col-span-1"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    data-surface-tone="indigo"
                    className="rounded-lg"
                  >
                    <SelectItem value="name">{getSortLabel('name')}</SelectItem>
                    <SelectItem value="recent">
                      {getSortLabel('recent')}
                    </SelectItem>
                    <SelectItem value="created">
                      {getSortLabel('created')}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {canCreateUsers && (
                <Button
                  asChild
                  size="sm"
                  className="col-span-full h-11 justify-self-end lg:h-10 @min-[32rem]/users-toolbar:col-span-2 @min-[32rem]/users-toolbar:col-start-5 @min-[32rem]/users-toolbar:row-start-1 @min-[64rem]/users-toolbar:col-span-1 @min-[64rem]/users-toolbar:col-start-5"
                >
                  <Link
                    href={`${PAGE_PATHS.newUser}?${new URLSearchParams({ returnTo: `${PAGE_PATHS.users}${currentQueryString ? `?${currentQueryString}` : ''}` })}`}
                  >
                    <Plus aria-hidden="true" className="size-4" />
                    Nouvel utilisateur
                  </Link>
                </Button>
              )}
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground col-span-full h-11 justify-self-start lg:h-10"
                >
                  <X size={14} />
                  Réinitialiser
                </Button>
              )}
              <p
                role="status"
                className={
                  hasActiveFilters || isRefreshing
                    ? 'text-muted-foreground col-span-full text-[0.8125rem] leading-5'
                    : 'sr-only'
                }
              >
                {isLoading
                  ? 'Chargement…'
                  : isRefreshing
                    ? 'Actualisation…'
                    : `${totalFiltered} compte${totalFiltered !== 1 ? 's' : ''} affiché${totalFiltered !== 1 ? 's' : ''}`}
              </p>
            </div>
          }
          pagination={
            totalPages > 1
              ? {
                  className:
                    '[&_p]:text-[0.8125rem] [&_span]:text-[0.8125rem] [&_button]:text-[0.8125rem]',
                  limit: pagination?.limit ?? 1,
                  onPageChange: setCurrentPage,
                  page: currentPage,
                  total: totalFiltered,
                  totalPages,
                }
              : undefined
          }
        >
          {isLoading ? (
            <div role="status" aria-label="Chargement" className="p-4">
              <Skeleton className="h-72 rounded-lg" />
            </div>
          ) : (
            <>
              <DataTableDesktop>
                <Table
                  aria-label="Comptes utilisateurs"
                  className="table-fixed"
                >
                  <TableHeader className="[&_th]:text-foreground [&_th]:h-11 [&_th]:text-[0.8125rem] [&_th]:leading-5">
                    <TableRow>
                      <TableHead>Compte</TableHead>
                      <TableHead className="w-44 @min-[64rem]/data-table:w-[18%]">
                        Accès
                      </TableHead>
                      <TableHead className="w-32 @min-[64rem]/data-table:w-[12%]">
                        État
                      </TableHead>
                      <TableHead className="w-40 @min-[64rem]/data-table:w-[18%]">
                        Dernière connexion
                      </TableHead>
                      <TableHead className="w-12">
                        <span className="sr-only">Action</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="h-44 text-center">
                          <ContentState
                            className="min-h-0 border-0 bg-transparent p-0"
                            icon={<UserMinus className="size-5" />}
                            layout="panel"
                            title={
                              loadError
                                ? 'Utilisateurs indisponibles'
                                : 'Aucun utilisateur trouvé'
                            }
                            action={
                              !loadError &&
                              hasActiveFilters && (
                                <Button
                                  type="button"
                                  variant="link"
                                  size="sm"
                                  onClick={clearFilters}
                                >
                                  Réinitialiser
                                </Button>
                              )
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedUsers.map((user) => (
                        <TableRow
                          className="group/row focus-within:ring-ring relative cursor-pointer focus-within:ring-2 focus-within:ring-inset"
                          key={user.id}
                        >
                          <TableCell className="h-16 py-2 align-top">
                            <Link
                              aria-label={
                                user.id === currentUser?.id
                                  ? 'Ouvrir mon compte'
                                  : `Ouvrir le compte de ${getUserDisplayName(user)}`
                              }
                              className="group/link flex min-w-0 items-start gap-2.5 rounded-md outline-none after:absolute after:inset-0 after:z-10 after:content-['']"
                              href={getUserDetailHref(user.id)}
                              prefetch={false}
                            >
                              <UserAvatar
                                user={user}
                                className="border-border-default size-9 shrink-0 rounded-full border"
                              />
                              <div className="min-w-0">
                                <div className="flex min-w-0 flex-wrap items-center gap-2">
                                  <span className="text-foreground truncate text-sm font-semibold">
                                    {getUserDisplayName(user)}
                                  </span>
                                  {isUserIdentityMasked(user) && (
                                    <span className="text-muted-foreground text-xs leading-5">
                                      Identité protégée
                                    </span>
                                  )}
                                </div>
                                <div className="mt-0.5 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                                  <p className="text-muted-foreground flex max-w-full min-w-0 items-center gap-1.5 truncate text-[0.8125rem] leading-5">
                                    <span className="min-w-0 truncate">
                                      {getUserLoginDisplay(user)}
                                    </span>
                                    {user.contactEmail && (
                                      <span className="truncate">
                                        · {user.contactEmail}
                                      </span>
                                    )}
                                  </p>
                                  {securityDetailsVisible &&
                                    user.mustChangePassword && (
                                      <Badge
                                        variant="outline"
                                        className="border-warning/30 text-warning max-w-full rounded-sm bg-transparent text-left text-xs whitespace-normal"
                                      >
                                        <Key
                                          aria-hidden="true"
                                          className="shrink-0"
                                        />
                                        Mot de passe à changer
                                      </Badge>
                                    )}
                                </div>
                              </div>
                            </Link>
                          </TableCell>
                          <TableCell className="pointer-events-none py-3">
                            <UserAccessLabel user={user} />
                          </TableCell>
                          <TableCell className="pointer-events-none py-3">
                            <UserStatusLabel isActive={user.isActive} />
                          </TableCell>
                          <TableCell className="text-muted-foreground pointer-events-none py-3 text-[0.8125rem] leading-5 tabular-nums">
                            {formatRelativeTime(user.lastLoginAt)}
                          </TableCell>
                          <TableCell className="pointer-events-none py-3">
                            <ArrowRight
                              aria-hidden="true"
                              className="text-muted-foreground size-4"
                            />
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </DataTableDesktop>
              <DataTableMobileList>
                {displayedUsers.length === 0 ? (
                  <ContentState
                    className="min-h-48 border-0 bg-transparent"
                    icon={<UserMinus className="size-5" />}
                    layout="panel"
                    title={
                      loadError
                        ? 'Utilisateurs indisponibles'
                        : 'Aucun utilisateur trouvé'
                    }
                    action={
                      !loadError &&
                      hasActiveFilters && (
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          onClick={clearFilters}
                        >
                          Réinitialiser
                        </Button>
                      )
                    }
                  />
                ) : (
                  displayedUsers.map((user) => (
                    <Link
                      aria-label={
                        user.id === currentUser?.id
                          ? 'Ouvrir mon compte'
                          : `Ouvrir le compte de ${getUserDisplayName(user)}`
                      }
                      className="hover:bg-surface-tile-hover focus-visible:bg-primary/10 focus-visible:ring-primary/70 block p-4 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                      href={getUserDetailHref(user.id)}
                      key={user.id}
                      prefetch={false}
                    >
                      <div className="flex items-start gap-3">
                        <UserAvatar
                          user={user}
                          className="border-border-default size-10 shrink-0 rounded-full border"
                        />
                        <div className="min-w-0 flex-1 space-y-2">
                          <div className="min-w-0">
                            <div className="flex min-w-0 flex-wrap items-center gap-2">
                              <h3 className="text-foreground min-w-0 text-sm font-semibold [overflow-wrap:anywhere]">
                                {getUserDisplayName(user)}
                              </h3>
                              {isUserIdentityMasked(user) && (
                                <span className="text-muted-foreground text-xs leading-5">
                                  Identité protégée
                                </span>
                              )}
                            </div>
                            <p className="text-muted-foreground mt-0.5 truncate text-[0.8125rem] leading-5">
                              {getUserLoginDisplay(user)}
                            </p>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                            <UserAccessLabel user={user} />
                            <UserStatusLabel isActive={user.isActive} />
                          </div>
                          {securityDetailsVisible &&
                            user.mustChangePassword && (
                              <div>
                                <Badge
                                  variant="outline"
                                  className="border-warning/30 text-warning max-w-full rounded-sm bg-transparent text-left text-xs whitespace-normal"
                                >
                                  Mot de passe à changer
                                </Badge>
                              </div>
                            )}
                          <p className="text-muted-foreground text-[0.8125rem] leading-5 tabular-nums">
                            Dernière connexion :{' '}
                            {formatRelativeTime(user.lastLoginAt).toLowerCase()}
                          </p>
                        </div>
                      </div>
                    </Link>
                  ))
                )}
              </DataTableMobileList>
            </>
          )}
        </DataTableSection>
      </div>
    </div>
  );
};
