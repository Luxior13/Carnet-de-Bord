'use client';

import { UserRole } from '@repo/database';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  Key,
  Loader2,
  Shield,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, { type FC, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { UserAccessTab } from '$components/users/user-detail/UserAccessTab';
import {
  getUserDetailSectionLabel,
  normalizeUserDetailSection,
  USER_DETAIL_SECTIONS,
  type UserDetailSectionId,
  UserDetailSidebarPanel,
} from '$components/users/user-detail/UserDetailNavigation';
import { UserHistoryTab } from '$components/users/user-detail/UserHistoryTab';
import { UserProfileTab } from '$components/users/user-detail/UserProfileTab';
import { UserResumeTab } from '$components/users/user-detail/UserResumeTab';
import { UserSecurityTab } from '$components/users/user-detail/UserSecurityTab';
import {
  getAccessLabel,
  getRoleColor,
  hasPermission,
  PERMISSIONS,
  type PermissionsData,
} from '$constants/permissions.constants';
import { useUser } from '$context/UserContext';
import type {
  AuditLogEntry,
  UserAuditStats,
  UserType,
} from '$types/auth.types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '$ui/alert-dialog';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Card, CardContent } from '$ui/card';
import { PageShell } from '$ui/page-shell';
import { ServiceIcon } from '$ui/service-icon';
import { Skeleton } from '$ui/skeleton';
import { apiFetch } from '$utils/api.utils';

type UserDetailPageProps = {
  userId: string;
};

const formatCompactDate = (date: Date | string | null): string => {
  if (!date) return 'Jamais';

  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const USER_DETAIL_SECTION_DESCRIPTIONS = new Map<UserDetailSectionId, string>([
  ['access', 'Role administratif, droits effectifs et permissions avancees.'],
  [
    'history',
    'Connexions, changements de securite et actions administratives.',
  ],
  ['profile', 'Identite, contact et informations visibles dans le staff.'],
  ['resume', 'Vue rapide du compte, du statut et des derniers signaux.'],
  ['security', 'Etat du compte, mot de passe et actions sensibles.'],
]);

const DetailSkeleton: FC = () => (
  <PageShell className="flex h-full max-w-5xl flex-col gap-5 py-0">
    <Skeleton className="mt-4 h-12 w-full lg:hidden" />
    <section className="border-border/70 bg-card/35 flex min-h-0 min-w-0 flex-1 flex-col border-x border-y-0 p-4 sm:p-5">
      <Card className="border-border/70 bg-card/70 shrink-0 overflow-hidden rounded-lg py-0">
        <div className="bg-primary h-1 w-full" />
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <Skeleton className="size-12 rounded-lg" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-5 w-52 max-w-full" />
              <Skeleton className="h-4 w-72 max-w-full" />
            </div>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
            <Skeleton className="h-12 rounded-lg" />
          </div>
        </CardContent>
      </Card>
      <div className="border-border/60 bg-background/25 mt-4 rounded-lg border p-3 sm:p-4">
        <Skeleton className="h-7 w-48 max-w-full" />
      </div>
      <div className="mt-4 min-h-0 flex-1">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    </section>
  </PageShell>
);

const AccessDenied: FC = () => (
  <PageShell className="max-w-3xl">
    <Card className="bg-card/70 rounded-lg py-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <ServiceIcon className="bg-destructive/10 text-destructive">
            <ShieldAlert className="size-5" />
          </ServiceIcon>
          <div className="space-y-3">
            <div>
              <h1 className="text-xl font-semibold">Acces refuse</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Vous n&apos;avez pas la permission de consulter cet utilisateur.
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/administration/utilisateurs">
                Retour aux utilisateurs
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </PageShell>
);

export const UserDetailPage: FC<UserDetailPageProps> = ({ userId }) => {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { userData: currentUser } = useUser();
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeSection, setActiveSection] =
    useState<UserDetailSectionId>('resume');

  const [editForm, setEditForm] = useState({
    email: '',
    firstName: '',
    isActive: true,
    lastName: '',
    role: 'USER' as UserRole,
  });
  const [isSaving, setIsSaving] = useState(false);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditStats, setAuditStats] = useState<UserAuditStats | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  const [permissions, setPermissions] = useState<PermissionsData | null>(null);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);

  const isProtectedActor = currentUser?.isProtected === true;
  const canViewUsers = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.VIEW,
        currentUser.permissions,
      )
    : false;
  const canUpdateUsers = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.UPDATE,
        currentUser.permissions,
      )
    : false;
  const canEditUserPermissions = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.EDIT_PERMISSIONS,
        currentUser.permissions,
      )
    : false;
  const canResetPasswords = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.RESET_PASSWORD,
        currentUser.permissions,
      )
    : false;
  const canDeleteUsers = currentUser
    ? isProtectedActor ||
      hasPermission(
        currentUser.role,
        PERMISSIONS.USERS.DELETE,
        currentUser.permissions,
      )
    : false;

  const isSelf = currentUser?.id === user?.id;
  const canEditTargetProfile =
    !!user && canUpdateUsers && (!user.isProtected || isProtectedActor);
  const canManageTargetPermissions =
    !!user && canEditUserPermissions && (!user.isProtected || isProtectedActor);
  const canResetTargetPassword =
    !!user &&
    canResetPasswords &&
    !isSelf &&
    (!user.isProtected || isProtectedActor);
  const canDeleteTargetUser =
    !!user && canDeleteUsers && !user.isProtected && !isSelf;
  const canEditTargetRole = !!user && isProtectedActor && !user.isProtected;
  const canEditTargetStatus = canEditTargetProfile;
  const availableSections = USER_DETAIL_SECTIONS;

  const fetchUser = useCallback(async (): Promise<void> => {
    if (!canViewUsers) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();

      if (data.success) {
        const loadedUser = data.data.user as UserType;
        setUser(loadedUser);
        setEditForm({
          email: loadedUser.email,
          firstName: loadedUser.firstName,
          isActive: loadedUser.isActive,
          lastName: loadedUser.lastName,
          role: loadedUser.role,
        });
        setPermissions(loadedUser.permissions);
      } else {
        setErrorMessage(
          data.error?.message || "Impossible de charger l'utilisateur",
        );
      }
    } catch {
      setErrorMessage("Impossible de charger l'utilisateur");
    } finally {
      setIsLoading(false);
    }
  }, [canViewUsers, userId]);

  const fetchAuditLogs = useCallback(async (): Promise<void> => {
    if (!canViewUsers) return;

    try {
      setIsLoadingAudit(true);
      const response = await fetch(`/api/users/${userId}/audit?pageSize=200`);
      const data = await response.json();

      if (data.success) {
        setAuditLogs(data.data.logs);
        setAuditStats(data.data.stats);
      }
    } catch {
      // Audit history is useful, but it should not block the profile page.
    } finally {
      setIsLoadingAudit(false);
    }
  }, [canViewUsers, userId]);

  useEffect(() => {
    void fetchUser();
    void fetchAuditLogs();
  }, [fetchUser, fetchAuditLogs]);

  useEffect(() => {
    setActiveSection(normalizeUserDetailSection(searchParams.get('section')));
  }, [searchParams, userId]);

  const handleSectionChange = useCallback(
    (sectionId: UserDetailSectionId): void => {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set('section', sectionId);
      setActiveSection(sectionId);
      router.replace(`${pathname}?${nextParams.toString()}`, {
        scroll: false,
      });
    },
    [pathname, router, searchParams],
  );

  const syncUserState = (updatedUser: UserType): void => {
    setUser(updatedUser);
    setEditForm({
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      isActive: updatedUser.isActive,
      lastName: updatedUser.lastName,
      role: updatedUser.role,
    });
    setPermissions(updatedUser.permissions);
  };

  const handleSaveProfile = async (): Promise<void> => {
    if (!canEditTargetProfile) {
      toast.error('Permission insuffisante pour modifier cet utilisateur');

      return;
    }

    setIsSaving(true);
    try {
      const response = await apiFetch(`/api/users/${userId}`, {
        body: JSON.stringify({
          email: editForm.email,
          firstName: editForm.firstName,
          lastName: editForm.lastName,
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const data = await response.json();

      if (data.success) {
        syncUserState(data.data.user);
        toast.success('Utilisateur mis a jour');
      } else {
        toast.error(data.error?.message || 'Erreur lors de la mise a jour');
      }
    } catch {
      toast.error('Erreur lors de la mise a jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAccess = async (): Promise<void> => {
    if (!canEditTargetRole && !canManageTargetPermissions) {
      toast.error('Permission insuffisante pour modifier les acces');

      return;
    }

    const payload: { permissions?: PermissionsData | null; role?: UserRole } =
      {};
    if (canEditTargetRole) payload.role = editForm.role;
    if (canManageTargetPermissions) payload.permissions = permissions;

    setIsSavingPermissions(true);
    try {
      const response = await apiFetch(`/api/users/${userId}`, {
        body: JSON.stringify(payload),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const data = await response.json();

      if (data.success) {
        syncUserState(data.data.user);
        toast.success('Acces mis a jour');
      } else {
        toast.error(data.error?.message || 'Erreur lors de la mise a jour');
      }
    } catch {
      toast.error('Erreur lors de la mise a jour');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const handleSaveSecurity = async (): Promise<void> => {
    if (!canEditTargetStatus || isSelf) {
      toast.error('Permission insuffisante pour modifier cet etat');

      return;
    }

    setIsSaving(true);
    try {
      const response = await apiFetch(`/api/users/${userId}`, {
        body: JSON.stringify({ isActive: editForm.isActive }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const data = await response.json();

      if (data.success) {
        syncUserState(data.data.user);
        toast.success('Securite mise a jour');
      } else {
        toast.error(data.error?.message || 'Erreur lors de la mise a jour');
      }
    } catch {
      toast.error('Erreur lors de la mise a jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async (): Promise<void> => {
    if (!canResetTargetPassword) {
      toast.error('Permission insuffisante pour reinitialiser ce mot de passe');
      setShowResetConfirm(false);

      return;
    }

    setIsResetting(true);
    try {
      const response = await apiFetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
      });
      const data = await response.json();

      if (data.success) {
        setTempPassword(data.data.temporaryPassword);
        handleSectionChange('security');
        toast.success('Mot de passe reinitialise');
        void fetchUser();
      } else {
        toast.error(
          data.error?.message || 'Erreur lors de la reinitialisation',
        );
      }
    } catch {
      toast.error('Erreur lors de la reinitialisation');
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    if (!canDeleteTargetUser) {
      toast.error('Permission insuffisante pour supprimer cet utilisateur');
      setShowDeleteConfirm(false);

      return;
    }

    setIsDeleting(true);
    try {
      const response = await apiFetch(`/api/users/${userId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Utilisateur supprime');
        router.push('/administration/utilisateurs');
      } else {
        toast.error(data.error?.message || 'Erreur lors de la suppression');
      }
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const activeSectionLabel = getUserDetailSectionLabel(activeSection);
  const activeSectionDescription =
    USER_DETAIL_SECTION_DESCRIPTIONS.get(activeSection) ?? '';
  const trackedActionsLabel = isLoadingAudit
    ? 'Chargement'
    : String(auditStats?.totalActions ?? auditLogs.length);

  const renderContent = (): React.ReactNode => {
    if (!user) return null;

    switch (activeSection) {
      case 'resume':
        return <UserResumeTab user={user} auditStats={auditStats} />;
      case 'profile':
        return (
          <UserProfileTab
            form={{
              email: editForm.email,
              firstName: editForm.firstName,
              lastName: editForm.lastName,
            }}
            setForm={(form) => setEditForm({ ...editForm, ...form })}
            canEdit={canEditTargetProfile}
            isSaving={isSaving}
            onSave={handleSaveProfile}
          />
        );
      case 'access':
        return (
          <UserAccessTab
            user={user}
            role={editForm.role}
            setRole={(role) => setEditForm({ ...editForm, role })}
            permissions={permissions}
            setPermissions={setPermissions}
            canEditRole={canEditTargetRole}
            canManagePermissions={canManageTargetPermissions}
            isSaving={isSavingPermissions}
            onSave={handleSaveAccess}
          />
        );
      case 'security':
        return (
          <UserSecurityTab
            user={user}
            isActive={editForm.isActive}
            setIsActive={(isActive) => setEditForm({ ...editForm, isActive })}
            canEditStatus={canEditTargetStatus}
            canResetPassword={canResetTargetPassword}
            isSaving={isSaving}
            onSaveStatus={handleSaveSecurity}
            onResetPassword={() => setShowResetConfirm(true)}
            tempPassword={tempPassword}
            currentUserId={currentUser?.id}
          />
        );
      case 'history':
        return (
          <UserHistoryTab
            auditLogs={auditLogs}
            isLoading={isLoadingAudit}
            userId={userId}
          />
        );
      default:
        return <UserResumeTab user={user} auditStats={auditStats} />;
    }
  };

  if (!canViewUsers) {
    return (
      <AuthenticatedLayout
        breadcrumbs={[
          { label: 'Administration' },
          { href: '/administration/utilisateurs', label: 'Utilisateurs' },
        ]}
      >
        <AccessDenied />
      </AuthenticatedLayout>
    );
  }

  if (isLoading) {
    return (
      <AuthenticatedLayout
        fullHeight
        breadcrumbs={[
          { label: 'Administration' },
          { href: '/administration/utilisateurs', label: 'Utilisateurs' },
        ]}
      >
        <DetailSkeleton />
      </AuthenticatedLayout>
    );
  }

  if (errorMessage || !user) {
    return (
      <AuthenticatedLayout
        breadcrumbs={[
          { label: 'Administration' },
          { href: '/administration/utilisateurs', label: 'Utilisateurs' },
        ]}
      >
        <PageShell className="max-w-3xl">
          <Card className="bg-card/70 rounded-lg py-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <ServiceIcon className="bg-destructive/10 text-destructive">
                  <ShieldAlert className="size-5" />
                </ServiceIcon>
                <div className="space-y-3">
                  <div>
                    <h1 className="text-xl font-semibold">
                      Utilisateur introuvable
                    </h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {errorMessage || "Impossible de charger l'utilisateur."}
                    </p>
                  </div>
                  <Button asChild variant="outline">
                    <Link href="/administration/utilisateurs">
                      Retour aux utilisateurs
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageShell>
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout
      fullHeight
      sidebarContext={
        <UserDetailSidebarPanel
          user={user}
          activeSection={activeSection}
          onSectionChange={handleSectionChange}
        />
      }
      breadcrumbs={[
        { label: 'Administration' },
        { href: '/administration/utilisateurs', label: 'Utilisateurs' },
        {
          href: `/administration/utilisateurs/${user.id}`,
          label: `${user.firstName} ${user.lastName}`,
        },
      ]}
    >
      <PageShell className="flex h-full max-w-5xl flex-col gap-5 py-0">
        <section className="border-border/70 bg-card/35 flex min-h-0 min-w-0 flex-1 flex-col border-x border-y-0 p-4 sm:p-5">
          <Card className="border-border/70 bg-card/70 shrink-0 overflow-hidden rounded-lg py-0">
            <div className="bg-primary h-1 w-full" />
            <CardContent className="p-4">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <Button
                    asChild
                    variant="outline"
                    size="icon"
                    className="shrink-0 lg:hidden"
                  >
                    <Link
                      href="/administration/utilisateurs"
                      aria-label="Retour"
                    >
                      <ArrowLeft className="size-4" />
                    </Link>
                  </Button>
                  <div className="bg-primary text-primary-foreground flex size-12 shrink-0 items-center justify-center rounded-lg text-sm font-semibold shadow-sm">
                    {user.firstName.charAt(0)}
                    {user.lastName.charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="flex min-w-0 items-center gap-2">
                      <h1 className="truncate text-xl font-semibold tracking-tight">
                        {user.firstName} {user.lastName}
                      </h1>
                      {user.isProtected && (
                        <Shield size={15} className="shrink-0 text-amber-500" />
                      )}
                    </div>
                    <p className="text-muted-foreground truncate text-sm">
                      {user.email}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant={getRoleColor(user.role)}>
                        {getAccessLabel(user)}
                      </Badge>
                      <Badge
                        variant={user.isActive ? 'secondary' : 'destructive'}
                      >
                        {user.isActive ? 'Actif' : 'Inactif'}
                      </Badge>
                      {user.mustChangePassword && (
                        <Badge
                          variant="outline"
                          className="border-amber-500 text-amber-500"
                        >
                          MDP temporaire
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {canResetTargetPassword && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setShowResetConfirm(true)}
                    >
                      <Key className="h-4 w-4" />
                      Reset MDP
                    </Button>
                  )}
                  {canDeleteTargetUser && (
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => setShowDeleteConfirm(true)}
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <div className="border-border/60 bg-background/30 rounded-lg border p-3">
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                    <Clock className="size-3.5" />
                    Derniere connexion
                  </p>
                  <p className="mt-1 truncate text-sm font-medium">
                    {formatCompactDate(user.lastLoginAt)}
                  </p>
                </div>
                <div className="border-border/60 bg-background/30 rounded-lg border p-3">
                  <p className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
                    <Calendar className="size-3.5" />
                    Cree le
                  </p>
                  <p className="mt-1 truncate text-sm font-medium">
                    {formatCompactDate(user.createdAt)}
                  </p>
                </div>
                <div className="border-border/60 bg-background/30 rounded-lg border p-3">
                  <p className="text-muted-foreground text-xs font-medium">
                    Actions journalisees
                  </p>
                  <p className="mt-1 truncate text-sm font-medium">
                    <Activity className="text-muted-foreground mr-1.5 inline size-3.5 align-[-2px]" />
                    {trackedActionsLabel}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="-mx-4 mt-4 overflow-x-auto px-4 lg:hidden">
            <div className="flex min-w-max gap-2 pb-1">
              {availableSections.map((section) => (
                <Button
                  type="button"
                  variant={
                    activeSection === section.id ? 'secondary' : 'outline'
                  }
                  key={section.id}
                  onClick={() => handleSectionChange(section.id)}
                  className="h-9 gap-2"
                >
                  <span
                    className={
                      activeSection === section.id ? 'text-primary' : ''
                    }
                  >
                    {section.icon}
                  </span>
                  {section.label}
                </Button>
              ))}
            </div>
          </div>
          <Card className="border-border/60 bg-background/25 my-4 rounded-lg py-0 shadow-none">
            <CardContent className="p-3 sm:p-4">
              <h2 className="text-base font-semibold">{activeSectionLabel}</h2>
              <p className="text-muted-foreground text-sm">
                {activeSectionDescription}
              </p>
            </CardContent>
          </Card>
          <div className="min-h-0 flex-1 overflow-y-auto pr-1">
            {renderContent()}
          </div>
        </section>
      </PageShell>
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent className="border-border overflow-hidden rounded-lg p-0">
          <div className="p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <AlertTriangle size={16} className="text-amber-400" />
                </div>
                Reinitialiser le mot de passe ?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Un nouveau mot de passe temporaire sera genere.
                L&apos;utilisateur devra le changer a sa prochaine connexion.
                Toutes ses sessions actives seront invalidees.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="border-border">
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetPassword}
                disabled={isResetting}
                className="bg-amber-500 text-white hover:bg-amber-500/90"
              >
                {isResetting && (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                )}
                Reinitialiser
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="border-border overflow-hidden rounded-lg p-0">
          <div className="p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <div className="bg-destructive/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <AlertTriangle size={16} className="text-destructive" />
                </div>
                Supprimer cet utilisateur ?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Cette action est irreversible. L&apos;utilisateur sera supprime
                definitivement et toutes ses sessions seront invalidees.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="border-border">
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isDeleting && (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                )}
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </AuthenticatedLayout>
  );
};
