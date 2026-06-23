'use client';

import { UserRole } from '@repo/database';
import {
  ArrowUpDown,
  Clock,
  Key,
  type LucideIcon,
  Plus,
  Search,
  Shield,
  User,
  UserCheck,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { type FC, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

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
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '$ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '$ui/dropdown-menu';
import { Input } from '$ui/input';
import { Pagination } from '$ui/pagination';
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
import { Tabs, TabsList, TabsTrigger } from '$ui/tabs';

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
const USERS_PER_PAGE = 20;

const getSortLabel = (sort: SortOption): string => {
  switch (sort) {
    case 'created':
      return 'Création';
    case 'recent':
      return 'Connexion';
    case 'name':
    default:
      return 'Nom';
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

const buildUsersQueryParams = ({
  limit,
  page,
  role,
  search,
  sort,
  status,
}: {
  limit: number;
  page: number;
  role: FilterRole;
  search: string;
  sort: SortOption;
  status: FilterStatus;
}): URLSearchParams => {
  const params = new URLSearchParams();
  params.set('page', String(page));
  params.set('limit', String(limit));
  if (search) params.set('search', search);
  if (status !== 'all') params.set('status', status);
  if (role !== 'all') params.set('role', role);
  if (sort !== 'name') params.set('sort', sort);

  return params;
};

type UsersStatTone = 'neutral' | 'primary' | 'warning';

type UsersStatToneClassNames = {
  icon: string;
  value: string;
};

const getUsersStatToneClassNames = (
  tone: UsersStatTone,
): UsersStatToneClassNames => {
  if (tone === 'primary') {
    return {
      icon: 'bg-primary/10 text-primary',
      value: 'text-foreground',
    };
  }

  if (tone === 'warning') {
    return {
      icon: 'bg-amber-500/10 text-amber-400',
      value: 'text-amber-400',
    };
  }

  return {
    icon: 'bg-secondary text-secondary-foreground',
    value: 'text-foreground',
  };
};

const UserStatusBadge: FC<{ isActive: boolean }> = ({ isActive }) => {
  if (isActive) return <Badge variant="secondary">Actif</Badge>;

  return (
    <Badge
      variant="outline"
      className="border-muted-foreground/35 bg-muted/30 text-muted-foreground"
    >
      Inactif
    </Badge>
  );
};

const UsersStatCard: FC<{
  icon: LucideIcon;
  label: string;
  tone?: UsersStatTone;
  value: number;
}> = ({ icon: Icon, label, tone = 'neutral', value }) => {
  const toneClassNames = getUsersStatToneClassNames(tone);

  return (
    <Card className="border-border bg-card overflow-hidden rounded-lg py-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div
            className={`${toneClassNames.icon} flex h-10 w-10 items-center justify-center rounded-lg`}
          >
            <Icon size={20} />
          </div>
          <div>
            <p className={`${toneClassNames.value} text-2xl font-bold`}>
              {value}
            </p>
            <p className="text-muted-foreground text-xs">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const UsersTab: FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { userData } = useUser();

  // Get filters from URL
  const urlSearch = searchParams.get('q') || '';
  const urlStatus = normalizeFilterStatus(searchParams.get('status'));
  const urlRole = normalizeFilterRole(searchParams.get('role'));
  const urlSort = normalizeSortOption(searchParams.get('sort'));

  const [users, setUsers] = useState<UserType[]>([]);
  const [stats, setStats] = useState<UserStatsType | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(urlStatus);
  const [filterRole, setFilterRole] = useState<FilterRole>(urlRole);
  const [sortBy, setSortBy] = useState<SortOption>(urlSort);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const canCreateUsers = userData
    ? userData.isProtected ||
      hasPermission(
        userData.role,
        PERMISSIONS.USERS.CREATE,
        userData.permissions,
      )
    : false;

  // Update URL when filters change
  const updateUrlParams = useCallback(
    (params: Record<string, string>): void => {
      const newParams = new URLSearchParams(searchParams.toString());
      Object.entries(params).forEach(([key, value]) => {
        if (value && value !== 'all' && value !== 'name' && value !== '') {
          newParams.set(key, value);
        } else {
          newParams.delete(key);
        }
      });
      const queryString = newParams.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
        scroll: false,
      });
    },
    [router, pathname, searchParams],
  );

  useEffect((): void => {
    setSearchQuery(urlSearch);
    setDebouncedSearch(urlSearch);
    setFilterStatus(urlStatus);
    setFilterRole(urlRole);
    setSortBy(urlSort);
    setCurrentPage(1);
  }, [urlSearch, urlStatus, urlRole, urlSort]);

  const fetchUsers = useCallback(
    async (
      page = 1,
      search = '',
      status: FilterStatus = 'all',
      role: FilterRole = 'all',
      sort: SortOption = 'name',
    ): Promise<void> => {
      try {
        setIsLoading(true);

        const params = buildUsersQueryParams({
          limit: USERS_PER_PAGE,
          page,
          role,
          search,
          sort,
          status,
        });

        const response = await fetch(`/api/users?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
          setUsers(data.data.users);
          setStats(data.data.stats);
          setPagination(data.data.pagination);
        } else {
          toast.error(data.error?.message || 'Erreur lors du chargement');
        }
      } catch {
        toast.error('Erreur lors du chargement');
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  // Fetch on mount and when filters change
  useEffect((): void => {
    fetchUsers(currentPage, debouncedSearch, filterStatus, filterRole, sortBy);
  }, [
    fetchUsers,
    currentPage,
    debouncedSearch,
    filterStatus,
    filterRole,
    sortBy,
  ]);

  // Handle search with debounce
  useEffect((): (() => void) => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // Reset to page 1 on search
      updateUrlParams({ q: searchQuery });
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, updateUrlParams]);

  // Handle other filter changes
  const handleFilterChange = (
    type: 'status' | 'role' | 'sort',
    value: string,
  ): void => {
    setCurrentPage(1); // Reset to page 1 on filter change
    if (type === 'status') {
      const nextStatus = normalizeFilterStatus(value);
      setFilterStatus(nextStatus);
      updateUrlParams({ status: nextStatus });
    } else if (type === 'role') {
      const nextRole = normalizeFilterRole(value);
      setFilterRole(nextRole);
      updateUrlParams({ role: nextRole });
    } else {
      const nextSort = normalizeSortOption(value);
      setSortBy(nextSort);
      updateUrlParams({ sort: nextSort });
    }
  };

  const clearFilters = (): void => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterRole('all');
    setSortBy('name');
    router.replace(pathname, { scroll: false });
  };

  const openUserDetail = (userId: string): void => {
    router.push(`/administration/utilisateurs/${userId}`);
  };

  const handleOpenUserKeyDown = (
    event: React.KeyboardEvent,
    userId: string,
  ): void => {
    if (event.key !== 'Enter' && event.key !== ' ') return;

    event.preventDefault();
    openUserDetail(userId);
  };

  const hasActiveFilters =
    searchQuery || filterStatus !== 'all' || filterRole !== 'all';

  const displayedUsers = users;

  // Total pages from server pagination
  const totalPages = pagination?.totalPages || 1;
  const totalFiltered = pagination?.total || users.length;

  const formatRelativeTime = (date: Date | string | null): string => {
    if (!date) return 'Jamais';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "A l'instant";
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
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-12" />
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <UsersStatCard
            icon={Users}
            label="Total"
            value={stats.total}
            tone="primary"
          />
          <UsersStatCard icon={UserCheck} label="Actifs" value={stats.active} />
          <UsersStatCard
            icon={Key}
            label="MDP temporaire"
            value={stats.pendingPasswordChange}
            tone="warning"
          />
          <UsersStatCard
            icon={Clock}
            label="Cnx 24h"
            value={stats.recentLogins}
            tone="primary"
          />
        </div>
      )}
      <Card className="border-border/70 bg-card overflow-hidden rounded-lg py-0">
        <CardHeader className="bg-card p-4 sm:p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <CardTitle className="text-base">Annuaire utilisateurs</CardTitle>
              <CardDescription>
                {totalFiltered} utilisateur
                {totalFiltered !== 1 ? 's' : ''}
                {hasActiveFilters && stats && ` sur ${stats.total}`}
                {pagination &&
                  totalPages > 1 &&
                  ` - Page ${currentPage}/${totalPages}`}
              </CardDescription>
            </div>
            <div className="flex flex-wrap gap-2">
              {canCreateUsers && (
                <Button asChild className="h-9">
                  <Link href="/administration/utilisateurs/nouveau">
                    <Plus size={16} />
                    Nouveau
                  </Link>
                </Button>
              )}
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex min-w-0 flex-1 flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative w-full lg:max-w-xs">
                <Search
                  size={16}
                  className="text-muted-foreground absolute top-1/2 left-3 -translate-y-1/2"
                />
                <Input
                  placeholder="Rechercher..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 pr-8 pl-9"
                />
                {searchQuery && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setSearchQuery('')}
                    className="text-muted-foreground hover:text-foreground absolute top-1/2 right-1 size-7 -translate-y-1/2"
                  >
                    <X size={14} />
                  </Button>
                )}
              </div>
              <Tabs
                value={filterStatus}
                onValueChange={(value) => handleFilterChange('status', value)}
                className="min-w-0"
              >
                <div className="overflow-x-auto">
                  <TabsList className="h-9 w-max p-1">
                    <TabsTrigger value="all" className="h-7 px-2.5 text-xs">
                      Tous
                    </TabsTrigger>
                    <TabsTrigger value="active" className="h-7 px-2.5 text-xs">
                      Actifs
                    </TabsTrigger>
                    <TabsTrigger
                      value="inactive"
                      className="h-7 px-2.5 text-xs"
                    >
                      Inactifs
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="h-7 px-2.5 text-xs">
                      MDP
                    </TabsTrigger>
                  </TabsList>
                </div>
              </Tabs>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={filterRole}
                onValueChange={(v) => handleFilterChange('role', v)}
              >
                <SelectTrigger className="h-9 w-[140px]">
                  <SelectValue placeholder="Rôle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous les rôles</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="USER">Utilisateur</SelectItem>
                </SelectContent>
              </Select>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5">
                    <ArrowUpDown size={14} />
                    <span>Trier: {getSortLabel(sortBy)}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => handleFilterChange('sort', 'name')}
                  >
                    Nom (A-Z)
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleFilterChange('sort', 'recent')}
                  >
                    Dernière connexion
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleFilterChange('sort', 'created')}
                  >
                    Date de création
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-muted-foreground h-9"
                >
                  <X size={14} />
                  Effacer
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Utilisateur</TableHead>
                  <TableHead>Rôle</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Mot de passe</TableHead>
                  <TableHead>Dernière connexion</TableHead>
                  <TableHead className="w-24 text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-44 text-center">
                      <div className="flex flex-col items-center gap-2">
                        <UserMinus
                          size={32}
                          className="text-muted-foreground"
                        />
                        <p className="text-muted-foreground text-sm">
                          Aucun utilisateur trouvé
                        </p>
                        {hasActiveFilters && (
                          <Button
                            type="button"
                            variant="link"
                            size="sm"
                            onClick={clearFilters}
                          >
                            Effacer les filtres
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedUsers.map((user) => (
                    <TableRow
                      key={user.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Voir ${user.firstName} ${user.lastName}`}
                      className="hover:bg-accent/50 focus:bg-accent/50 cursor-pointer focus:outline-none"
                      onClick={() => openUserDetail(user.id)}
                      onKeyDown={(event) =>
                        handleOpenUserKeyDown(event, user.id)
                      }
                    >
                      <TableCell>
                        <div className="flex min-w-0 items-center gap-3">
                          <UserAvatar
                            user={user}
                            className="size-9 rounded-md"
                          />
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="text-foreground truncate font-medium">
                                {user.firstName} {user.lastName}
                              </span>
                              {user.isProtected && (
                                <Shield
                                  size={14}
                                  className="shrink-0 text-amber-500"
                                />
                              )}
                            </div>
                            <p className="text-muted-foreground truncate text-xs">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getRoleColor(user.role)}
                          className="shrink-0"
                        >
                          {user.role === 'ADMIN' ? (
                            <Shield size={10} className="mr-1" />
                          ) : (
                            <User size={10} className="mr-1" />
                          )}
                          {getAccessLabel(user)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <UserStatusBadge isActive={user.isActive} />
                      </TableCell>
                      <TableCell>
                        {user.mustChangePassword ? (
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 text-amber-400"
                          >
                            <Key size={10} className="mr-1" />À changer
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            À jour
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs">
                        {formatRelativeTime(user.lastLoginAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            openUserDetail(user.id);
                          }}
                        >
                          Ouvrir
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
          <div className="divide-border divide-y md:hidden">
            {displayedUsers.length === 0 ? (
              <div className="py-14 text-center">
                <UserMinus
                  size={40}
                  className="text-muted-foreground mx-auto mb-3"
                />
                <p className="text-muted-foreground">
                  Aucun utilisateur trouvé
                </p>
                {hasActiveFilters && (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={clearFilters}
                    className="mt-2"
                  >
                    Effacer les filtres
                  </Button>
                )}
              </div>
            ) : (
              displayedUsers.map((user) => (
                <div
                  key={user.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Voir ${user.firstName} ${user.lastName}`}
                  className="hover:bg-accent/50 focus:bg-accent/50 cursor-pointer p-4 focus:outline-none"
                  onClick={() => openUserDetail(user.id)}
                  onKeyDown={(event) => handleOpenUserKeyDown(event, user.id)}
                >
                  <div className="flex items-start gap-3">
                    <UserAvatar user={user} className="size-11 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="min-w-0">
                        <div className="flex min-w-0 items-center gap-2">
                          <h3 className="text-foreground truncate font-medium">
                            {user.firstName} {user.lastName}
                          </h3>
                          {user.isProtected && (
                            <Shield
                              size={14}
                              className="shrink-0 text-amber-500"
                            />
                          )}
                        </div>
                        <p className="text-muted-foreground truncate text-sm">
                          {user.email}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge
                          variant={getRoleColor(user.role)}
                          className="text-[10px]"
                        >
                          {getAccessLabel(user)}
                        </Badge>
                        {!user.isActive && (
                          <UserStatusBadge isActive={user.isActive} />
                        )}
                        {user.mustChangePassword && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/40 text-[10px] text-amber-400"
                          >
                            MDP temporaire
                          </Badge>
                        )}
                        <span className="text-muted-foreground ml-auto text-xs">
                          {formatRelativeTime(user.lastLoginAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
        {totalPages > 1 && (
          <CardFooter className="bg-card p-0">
            <Pagination
              page={currentPage}
              totalPages={totalPages}
              total={totalFiltered}
              limit={USERS_PER_PAGE}
              onPageChange={setCurrentPage}
              className="w-full rounded-none border-x-0 border-b-0 bg-transparent"
            />
          </CardFooter>
        )}
      </Card>
    </div>
  );
};
