'use client';

import { UserRole } from '@repo/shared';
import {
  ArrowRight,
  Key,
  Search,
  Shield,
  User,
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
  getRoleColor,
  hasPermission,
  PERMISSIONS,
} from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
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

const UserStatusBadge: FC<{ isActive: boolean }> = ({ isActive }) => {
  if (isActive) return <Badge variant="success">Actif</Badge>;

  return (
    <Badge
      variant="outline"
      className="border-muted-foreground/35 bg-muted/30 text-muted-foreground"
    >
      Désactivé
    </Badge>
  );
};

export const UsersListPage: FC = () => {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentQueryString = searchParams.toString();
  const { userData: currentUser } = useUser();
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
      : `/administration/utilisateurs/${userId}`;

  const hasActiveFilters =
    !!searchQuery ||
    filterStatus !== 'all' ||
    filterRole !== 'all' ||
    sortBy !== 'name';

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
    if (diffMins < 60) return `${diffMins}min`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 30) return `${diffDays}j`;

    return new Date(date).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    });
  };

  if (isLoading) {
    return (
      <div role="status" aria-label="Chargement">
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

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
      <DataTableSection
        title="Comptes utilisateurs"
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span>
              {totalFiltered} compte{totalFiltered !== 1 ? 's' : ''}
              {hasActiveFilters && stats ? ` sur ${stats.total}` : ''}
              {stats
                ? ` · ${stats.active} actif${stats.active !== 1 ? 's' : ''}`
                : ''}
            </span>
            {securityDetailsVisible &&
              stats?.pendingPasswordChange !== null &&
              stats?.pendingPasswordChange !== undefined &&
              stats.pendingPasswordChange > 0 && (
                <span className="text-warning">
                  · {stats.pendingPasswordChange} mot
                  {stats.pendingPasswordChange !== 1 ? 's' : ''} de passe à
                  changer
                </span>
              )}
            {isRefreshing && <span>· Actualisation…</span>}
          </span>
        }
        headerClassName="p-3 sm:p-4"
        contentClassName={
          isRefreshing ? 'opacity-60 transition-opacity' : undefined
        }
        toolbar={
          <div className="grid w-full min-w-0 gap-2 sm:grid-cols-2 2xl:grid-cols-[minmax(16rem,1fr)_12rem_12rem_13rem_auto]">
            <div className="relative min-w-0 sm:col-span-2 2xl:col-span-1">
              <Search
                size={16}
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2"
              />
              <Input
                aria-label="Rechercher un compte utilisateur"
                placeholder="Nom, identifiant ou email…"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                maxLength={USER_SEARCH_MAX_LENGTH}
                className="pr-10 pl-9"
              />
              {searchQuery && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchQuery('')}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 size-8 -translate-y-1/2"
                  aria-label="Effacer la recherche"
                >
                  <X size={14} />
                </Button>
              )}
            </div>
            <Select
              value={filterStatus}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger
                aria-label="Filtrer par état du compte"
                className="w-full min-w-0"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
                className="w-full min-w-0"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
                className="w-full min-w-0"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">{getSortLabel('name')}</SelectItem>
                <SelectItem value="recent">{getSortLabel('recent')}</SelectItem>
                <SelectItem value="created">
                  {getSortLabel('created')}
                </SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="text-muted-foreground min-h-10"
              >
                <X size={14} />
                Réinitialiser
              </Button>
            )}
          </div>
        }
        pagination={
          totalPages > 1
            ? {
                limit: pagination?.limit ?? 1,
                onPageChange: setCurrentPage,
                page: currentPage,
                total: totalFiltered,
                totalPages,
              }
            : undefined
        }
      >
        <DataTableDesktop>
          <Table>
            <TableHeader className="[&_th]:h-9">
              <TableRow>
                <TableHead>Compte</TableHead>
                <TableHead>Accès</TableHead>
                <TableHead>État</TableHead>
                {securityDetailsVisible && <TableHead>Sécurité</TableHead>}
                <TableHead>Dernière connexion</TableHead>
                <TableHead className="w-14">
                  <span className="sr-only">Action</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedUsers.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={securityDetailsVisible ? 6 : 5}
                    className="h-44 text-center"
                  >
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
                    className="group/row focus-within:ring-ring/40 relative cursor-pointer focus-within:ring-2 focus-within:ring-inset"
                    key={user.id}
                  >
                    <TableCell className="py-2">
                      <Link
                        aria-label={
                          user.id === currentUser?.id
                            ? 'Ouvrir mon compte'
                            : `Ouvrir le compte de ${getUserDisplayName(user)}`
                        }
                        className="group/link flex min-w-0 items-center gap-2.5 rounded-md outline-none after:absolute after:inset-0 after:z-10 after:content-['']"
                        href={getUserDetailHref(user.id)}
                        prefetch={false}
                      >
                        <UserAvatar
                          user={user}
                          className="border-border-default group-hover/link:border-primary/35 size-8 rounded-full border transition-colors"
                        />
                        <div className="min-w-0">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="text-foreground group-hover/link:text-primary-emphasis truncate text-sm font-medium transition-colors">
                              {getUserDisplayName(user)}
                            </span>
                            {user.isProtected && (
                              <span title="Compte racine">
                                <Shield
                                  aria-hidden="true"
                                  size={14}
                                  className="text-warning shrink-0"
                                />
                                <span className="sr-only">Compte racine</span>
                              </span>
                            )}
                            {isUserIdentityMasked(user) && (
                              <Badge
                                variant="outline"
                                className="border-warning/35 text-warning shrink-0 px-1.5 py-0 text-xs"
                              >
                                Identité protégée
                              </Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground flex min-w-0 items-center gap-1.5 truncate text-xs">
                            <span className="shrink-0 font-mono">
                              {getUserLoginDisplay(user)}
                            </span>
                            {user.contactEmail && (
                              <span className="truncate">
                                · {user.contactEmail}
                              </span>
                            )}
                          </p>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell className="pointer-events-none py-2">
                      <Badge
                        variant={getRoleColor(user.role)}
                        className="shrink-0 text-xs"
                      >
                        {user.role === 'ADMIN' ? (
                          <Shield size={10} className="mr-1" />
                        ) : (
                          <User size={10} className="mr-1" />
                        )}
                        {getAccessLabel(user)}
                      </Badge>
                    </TableCell>
                    <TableCell className="pointer-events-none py-2">
                      <UserStatusBadge isActive={user.isActive} />
                    </TableCell>
                    {securityDetailsVisible && (
                      <TableCell className="pointer-events-none py-2">
                        {user.mustChangePassword ? (
                          <Badge
                            variant="outline"
                            className="border-warning/40 text-warning text-xs"
                          >
                            <Key size={10} className="mr-1" />
                            Mot de passe à changer
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            À jour
                          </span>
                        )}
                      </TableCell>
                    )}
                    <TableCell className="text-muted-foreground pointer-events-none py-2 text-xs">
                      {formatRelativeTime(user.lastLoginAt)}
                    </TableCell>
                    <TableCell className="pointer-events-none py-2">
                      <ArrowRight
                        aria-hidden="true"
                        className="text-muted-foreground size-4 transition-transform group-hover/row:translate-x-0.5"
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
                className="hover:bg-surface-raised/70 focus-visible:bg-primary/10 focus-visible:ring-primary/70 block p-3 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset"
                href={getUserDetailHref(user.id)}
                key={user.id}
                prefetch={false}
              >
                <div className="flex items-start gap-3">
                  <UserAvatar
                    user={user}
                    className="border-border-default size-10 rounded-full border"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="min-w-0">
                      <div className="flex min-w-0 items-center gap-2">
                        <h3 className="text-foreground truncate font-medium">
                          {getUserDisplayName(user)}
                        </h3>
                        {user.isProtected && (
                          <span title="Compte racine">
                            <Shield
                              aria-hidden="true"
                              size={14}
                              className="text-warning shrink-0"
                            />
                            <span className="sr-only">Compte racine</span>
                          </span>
                        )}
                        {isUserIdentityMasked(user) && (
                          <Badge
                            variant="outline"
                            className="border-warning/35 text-warning shrink-0 px-1.5 py-0 text-xs"
                          >
                            Identité protégée
                          </Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground flex min-w-0 items-center gap-1.5 truncate text-xs">
                        <span className="shrink-0 font-mono">
                          {getUserLoginDisplay(user)}
                        </span>
                        {user.contactEmail && (
                          <span className="truncate">
                            · {user.contactEmail}
                          </span>
                        )}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge
                        variant={getRoleColor(user.role)}
                        className="text-xs"
                      >
                        {getAccessLabel(user)}
                      </Badge>
                      <UserStatusBadge isActive={user.isActive} />
                      {securityDetailsVisible && user.mustChangePassword && (
                        <Badge
                          variant="outline"
                          className="border-warning/40 text-warning text-xs"
                        >
                          Mot de passe à changer
                        </Badge>
                      )}
                      <span className="text-muted-foreground ml-auto text-xs">
                        Connexion {formatRelativeTime(user.lastLoginAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            ))
          )}
        </DataTableMobileList>
      </DataTableSection>
    </div>
  );
};
