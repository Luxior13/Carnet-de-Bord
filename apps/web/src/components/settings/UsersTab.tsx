'use client';

import { UserRole } from '@repo/database';
import {
  ArrowUpDown,
  Clock,
  Download,
  Key,
  Loader2,
  Plus,
  Search,
  Shield,
  User,
  UserCheck,
  UserMinus,
  Users,
  X,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '$ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '$ui/dropdown-menu';
import { Input } from '$ui/input';
import { Label } from '$ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '$ui/select';
import { Skeleton } from '$ui/skeleton';
import { apiFetch } from '$utils/api.utils';

type FilterStatus = 'all' | 'active' | 'inactive' | 'pending';
type FilterRole = 'all' | UserRole;
type SortOption = 'name' | 'recent' | 'created';

const USERS_PER_PAGE = 20;

export const UsersTab: FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { userData } = useUser();

  // Get filters from URL
  const urlSearch = searchParams.get('q') || '';
  const urlStatus = (searchParams.get('status') as FilterStatus) || 'all';
  const urlRole = (searchParams.get('role') as FilterRole) || 'all';
  const urlSort = (searchParams.get('sort') as SortOption) || 'name';

  const [users, setUsers] = useState<UserType[]>([]);
  const [stats, setStats] = useState<UserStatsType | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [debouncedSearch, setDebouncedSearch] = useState(urlSearch);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(urlStatus);
  const [filterRole, setFilterRole] = useState<FilterRole>(urlRole);
  const [sortBy, setSortBy] = useState<SortOption>(urlSort);

  // Create user dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'USER' as UserRole,
  });
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);

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
  const canCreateAdminUsers = userData?.isProtected ?? false;

  // Update URL when filters change
  const updateUrlParams = useCallback(
    (params: Record<string, string>) => {
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

  const fetchUsers = useCallback(
    async (page = 1, search = '', status = 'all', role = 'all') => {
      try {
        setIsLoading(true);

        // Build query params
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('limit', String(USERS_PER_PAGE));
        if (search) params.set('search', search);
        if (status !== 'all') params.set('status', status);
        if (role !== 'all') params.set('role', role);

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
  useEffect(() => {
    fetchUsers(currentPage, debouncedSearch, filterStatus, filterRole);
  }, [fetchUsers, currentPage, debouncedSearch, filterStatus, filterRole]);

  // Handle search with debounce
  useEffect(() => {
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
  ) => {
    setCurrentPage(1); // Reset to page 1 on filter change
    if (type === 'status') {
      setFilterStatus(value as FilterStatus);
      updateUrlParams({ status: value });
    } else if (type === 'role') {
      setFilterRole(value as FilterRole);
      updateUrlParams({ role: value });
    } else {
      setSortBy(value as SortOption);
      updateUrlParams({ sort: value });
    }
  };

  const handleCreateUser = async () => {
    if (!canCreateUsers) {
      toast.error('Permission insuffisante pour creer un utilisateur');

      return;
    }

    if (!newUser.email || !newUser.firstName || !newUser.lastName) {
      toast.error('Veuillez remplir tous les champs');

      return;
    }

    setIsCreating(true);
    try {
      const response = await apiFetch('/api/users', {
        body: JSON.stringify(newUser),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setCreatedUserId(data.data.user.id);
        setTempPassword(data.data.temporaryPassword);
        toast.success('Utilisateur cree avec succes');
        fetchUsers();
      } else {
        toast.error(data.error?.message || 'Erreur lors de la creation');
      }
    } catch {
      toast.error('Erreur lors de la creation');
    } finally {
      setIsCreating(false);
    }
  };

  const handleCloseCreateDialog = () => {
    setShowCreateDialog(false);
    setCreatedUserId(null);
    setNewUser({ email: '', firstName: '', lastName: '', role: 'USER' });
    setTempPassword(null);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setFilterStatus('all');
    setFilterRole('all');
    setSortBy('name');
    router.replace(pathname, { scroll: false });
  };

  const openUserDetail = (userId: string) => {
    router.push(`/administration/utilisateurs/${userId}`);
  };

  const hasActiveFilters =
    searchQuery || filterStatus !== 'all' || filterRole !== 'all';

  // Sort current page client-side
  const displayedUsers = useMemo(() => {
    const result = [...users];

    result.sort((a, b) => {
      switch (sortBy) {
        case 'recent':
          return (
            new Date(b.lastLoginAt || 0).getTime() -
            new Date(a.lastLoginAt || 0).getTime()
          );
        case 'created':
          return (
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        default:
          return `${a.firstName} ${a.lastName}`.localeCompare(
            `${b.firstName} ${b.lastName}`,
          );
      }
    });

    return result;
  }, [users, sortBy]);

  // Total pages from server pagination
  const totalPages = pagination?.totalPages || 1;
  const totalFiltered = pagination?.total || users.length;

  const formatRelativeTime = (date: Date | string | null) => {
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

  const exportToCSV = () => {
    // Limit export to current page data (server already paginated)
    const maxExport = 500;
    const usersToExport = displayedUsers.slice(0, maxExport);

    const headers = [
      'Prenom',
      'Nom',
      'Email',
      'Role',
      'Statut',
      'Derniere connexion',
      'Date creation',
    ];

    const rows = usersToExport.map((user) => [
      user.firstName,
      user.lastName,
      user.email,
      getAccessLabel(user),
      user.isActive ? 'Actif' : 'Inactif',
      user.lastLoginAt
        ? new Date(user.lastLoginAt).toLocaleDateString('fr-FR')
        : 'Jamais',
      new Date(user.createdAt).toLocaleDateString('fr-FR'),
    ]);

    const csvContent = [
      headers.join(';'),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(';')),
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `utilisateurs_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    toast.success(`${usersToExport.length} utilisateur(s) exporte(s)`);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-foreground text-xl font-semibold">
            Utilisateurs
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {stats?.total || 0} utilisateur{(stats?.total || 0) > 1 ? 's' : ''}
          </p>
        </div>
      </div>
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="border-border bg-card/70 overflow-hidden rounded-lg border p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                <Users size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-foreground text-2xl font-bold">
                  {stats.total}
                </p>
                <p className="text-muted-foreground text-xs">Total</p>
              </div>
            </div>
          </div>
          <div className="border-border bg-card/70 overflow-hidden rounded-lg border p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <UserCheck size={20} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-emerald-400">
                  {stats.active}
                </p>
                <p className="text-muted-foreground text-xs">Actifs</p>
              </div>
            </div>
          </div>
          <div className="border-border bg-card/70 overflow-hidden rounded-lg border p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <Key size={20} className="text-amber-300" />
              </div>
              <div>
                <p className="text-2xl font-bold text-amber-300">
                  {stats.pendingPasswordChange}
                </p>
                <p className="text-muted-foreground text-xs">MDP temp</p>
              </div>
            </div>
          </div>
          <div className="border-border bg-card/70 overflow-hidden rounded-lg border p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-lg">
                <Clock size={20} className="text-primary" />
              </div>
              <div>
                <p className="text-primary text-2xl font-bold">
                  {stats.recentLogins}
                </p>
                <p className="text-muted-foreground text-xs">Cnx 24h</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Filters & Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative w-full sm:w-auto sm:min-w-[200px]">
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
          {/* Status filter */}
          <Select
            value={filterStatus}
            onValueChange={(v) => handleFilterChange('status', v)}
          >
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="active">Actifs</SelectItem>
              <SelectItem value="inactive">Inactifs</SelectItem>
              <SelectItem value="pending">MDP temp</SelectItem>
            </SelectContent>
          </Select>
          {/* Role filter */}
          <Select
            value={filterRole}
            onValueChange={(v) => handleFilterChange('role', v)}
          >
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="USER">Utilisateur</SelectItem>
            </SelectContent>
          </Select>
          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 gap-1.5">
                <ArrowUpDown size={14} />
                <span className="hidden sm:inline">Trier</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem
                onClick={() => handleFilterChange('sort', 'name')}
              >
                Nom (A-Z)
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleFilterChange('sort', 'recent')}
              >
                Derniere connexion
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleFilterChange('sort', 'created')}
              >
                Date de creation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {/* Clear filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-muted-foreground h-9"
            >
              <X size={14} className="mr-1" />
              Effacer
            </Button>
          )}
        </div>
        {/* Action buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={exportToCSV}
            disabled={displayedUsers.length === 0}
            className="h-9 shrink-0"
          >
            <Download size={16} className="mr-1.5" />
            <span className="hidden sm:inline">Exporter</span>
          </Button>
          {canCreateUsers && (
            <Button
              onClick={() => setShowCreateDialog(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 shrink-0"
            >
              <Plus size={16} className="mr-1.5" />
              Nouveau
            </Button>
          )}
        </div>
      </div>
      {/* Results count */}
      <div className="text-muted-foreground text-sm">
        {totalFiltered} utilisateur
        {totalFiltered !== 1 ? 's' : ''}
        {hasActiveFilters && stats && ` sur ${stats.total}`}
        {pagination && totalPages > 1 && ` • Page ${currentPage}/${totalPages}`}
      </div>
      {/* Users List */}
      <div className="space-y-2">
        {displayedUsers.length === 0 ? (
          <div className="border-border bg-background/35 rounded-lg border py-12 text-center">
            <UserMinus
              size={40}
              className="text-muted-foreground mx-auto mb-3"
            />
            <p className="text-muted-foreground">Aucun utilisateur trouve</p>
            {hasActiveFilters && (
              <Button
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
              className="group border-border bg-card/70 hover:border-primary/50 hover:bg-card focus:border-primary cursor-pointer rounded-lg border p-4 transition-all hover:shadow-md focus:outline-none"
              onClick={() => openUserDetail(user.id)}
              onKeyDown={(e) => e.key === 'Enter' && openUserDetail(user.id)}
            >
              <div className="flex items-center gap-3">
                {/* Avatar with gradient */}
                <div className="bg-primary flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-sm font-semibold text-white">
                  {user.firstName.charAt(0)}
                  {user.lastName.charAt(0)}
                </div>
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="text-foreground truncate font-medium">
                      {user.firstName} {user.lastName}
                    </h3>
                    {user.isProtected && (
                      <Shield size={14} className="shrink-0 text-amber-500" />
                    )}
                  </div>
                  <p className="text-muted-foreground truncate text-sm">
                    {user.email}
                  </p>
                </div>
                {/* Right side - Badges and time */}
                <div className="hidden items-center gap-2 sm:flex">
                  <Badge variant={getRoleColor(user.role)} className="shrink-0">
                    {user.role === 'ADMIN' ? (
                      <Shield size={10} className="mr-1" />
                    ) : (
                      <User size={10} className="mr-1" />
                    )}
                    {getAccessLabel(user)}
                  </Badge>
                  {!user.isActive && (
                    <Badge variant="destructive" className="shrink-0">
                      Inactif
                    </Badge>
                  )}
                  {user.mustChangePassword && (
                    <Badge
                      variant="outline"
                      className="shrink-0 border-amber-500 text-amber-500"
                    >
                      <Key size={10} className="mr-1" />
                      Temp
                    </Badge>
                  )}
                  <span className="text-muted-foreground ml-2 shrink-0 text-xs">
                    {formatRelativeTime(user.lastLoginAt)}
                  </span>
                </div>
                {/* Mobile badges */}
                <div className="flex items-center gap-1 sm:hidden">
                  <Badge
                    variant={getRoleColor(user.role)}
                    className="text-[10px]"
                  >
                    {user.isProtected
                      ? 'Superadmin'
                      : user.role === 'ADMIN'
                        ? 'Admin'
                        : 'User'}
                  </Badge>
                  {!user.isActive && (
                    <span className="h-2 w-2 rounded-full bg-red-500" />
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-border flex items-center justify-between border-t pt-4">
          <p className="text-muted-foreground text-sm">
            Page {currentPage} sur {totalPages} ({totalFiltered} utilisateur
            {totalFiltered > 1 ? 's' : ''})
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="h-8 px-3"
            >
              Precedent
            </Button>
            {/* Page numbers */}
            <div className="hidden gap-1 sm:flex">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }

                return (
                  <Button
                    key={page}
                    variant={currentPage === page ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                    className={`h-8 w-8 p-0 ${currentPage === page ? 'bg-primary hover:bg-primary/90 text-white' : ''}`}
                  >
                    {page}
                  </Button>
                );
              })}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="h-8 px-3"
            >
              Suivant
            </Button>
          </div>
        </div>
      )}
      {/* Create User Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={handleCloseCreateDialog}>
        <DialogContent className="border-border overflow-hidden rounded-lg p-0 sm:max-w-md">
          <div className="bg-primary h-1 w-full" />
          <div className="p-6">
            <DialogHeader>
              <DialogTitle className="text-foreground flex items-center gap-2">
                <div className="bg-primary/20 flex h-8 w-8 items-center justify-center rounded-lg">
                  <Plus size={16} className="text-primary" />
                </div>
                Nouvel utilisateur
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Un mot de passe temporaire sera genere automatiquement.
              </DialogDescription>
            </DialogHeader>
            {tempPassword ? (
              <div className="mt-4 space-y-4">
                <div className="overflow-hidden rounded-lg border border-emerald-500/20 bg-emerald-500/10">
                  <div className="p-4">
                    <p className="mb-2 text-sm font-medium text-emerald-400">
                      Utilisateur ajoute avec succes
                    </p>
                    <p className="text-muted-foreground mb-2 text-xs">
                      Mot de passe temporaire :
                    </p>
                    <code className="bg-card border-border text-foreground block rounded-md border px-3 py-2 font-mono text-sm">
                      {tempPassword}
                    </code>
                    <p className="text-muted-foreground mt-2 text-xs">
                      Communiquez ce mot de passe a l&apos;utilisateur. Il devra
                      le changer a sa premiere connexion.
                    </p>
                  </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  {createdUserId && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        router.push(
                          `/administration/utilisateurs/${createdUserId}`,
                        );
                        handleCloseCreateDialog();
                      }}
                      className="border-border"
                    >
                      Ouvrir la fiche
                    </Button>
                  )}
                  <Button
                    onClick={handleCloseCreateDialog}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Fermer
                  </Button>
                </DialogFooter>
              </div>
            ) : (
              <div className="mt-4 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label
                      htmlFor="newFirstName"
                      className="text-foreground"
                      required
                    >
                      Prenom
                    </Label>
                    <Input
                      id="newFirstName"
                      value={newUser.firstName}
                      onChange={(e) =>
                        setNewUser({ ...newUser, firstName: e.target.value })
                      }
                      placeholder="Jean"
                      className="border-border"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label
                      htmlFor="newLastName"
                      className="text-foreground"
                      required
                    >
                      Nom
                    </Label>
                    <Input
                      id="newLastName"
                      value={newUser.lastName}
                      onChange={(e) =>
                        setNewUser({ ...newUser, lastName: e.target.value })
                      }
                      placeholder="Dupont"
                      className="border-border"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="newEmail"
                    className="text-foreground"
                    required
                  >
                    Email
                  </Label>
                  <Input
                    id="newEmail"
                    type="email"
                    value={newUser.email}
                    onChange={(e) =>
                      setNewUser({ ...newUser, email: e.target.value })
                    }
                    placeholder="jean.dupont@example.com"
                    className="border-border"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="newRole" className="text-foreground" required>
                    Role
                  </Label>
                  <Select
                    value={newUser.role}
                    onValueChange={(v) =>
                      setNewUser({ ...newUser, role: v as UserRole })
                    }
                  >
                    <SelectTrigger id="newRole" className="border-border">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USER">Utilisateur</SelectItem>
                      {canCreateAdminUsers && (
                        <SelectItem value="ADMIN">Administrateur</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-muted-foreground text-xs">
                    Pour un acces simple, gardez Utilisateur. Le superadmin
                    reste le compte technique protege.
                  </p>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="outline"
                    onClick={handleCloseCreateDialog}
                    className="border-border"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleCreateUser}
                    disabled={
                      isCreating ||
                      !newUser.email ||
                      !newUser.firstName ||
                      !newUser.lastName
                    }
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isCreating ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Creation...
                      </>
                    ) : (
                      'Creer'
                    )}
                  </Button>
                </DialogFooter>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
