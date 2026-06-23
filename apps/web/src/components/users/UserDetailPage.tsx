'use client';

import { UserRole } from '@repo/database';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Clock,
  Loader2,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import React, {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';

import AuthenticatedLayout from '$components/AuthenticatedLayout';
import { AccessDeniedState, PageState } from '$components/layout/PageState';
import { UserAccessTab } from '$components/users/user-detail/UserAccessTab';
import {
  normalizeUserDetailSection,
  USER_DETAIL_SECTIONS,
  type UserDetailSectionId,
} from '$components/users/user-detail/UserDetailNavigation';
import { UserHistoryTab } from '$components/users/user-detail/UserHistoryTab';
import {
  type ProfileForm,
  type StaffProfileForm,
  UserProfileTab,
} from '$components/users/user-detail/UserProfileTab';
import { UserResumeTab } from '$components/users/user-detail/UserResumeTab';
import { UserSecurityTab } from '$components/users/user-detail/UserSecurityTab';
import { UserAvatar } from '$components/users/UserAvatar';
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
  UserSessionInfo,
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
import { PageCanvas, PageHeader, PageShell } from '$ui/page-shell';
import { Skeleton } from '$ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '$ui/tabs';
import { apiFetch } from '$utils/api.utils';

type UserDetailPageProps = {
  userId: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@][^\s.@]*\.[^\s@]+$/;

const EMPTY_STAFF_PROFILE_FORM: StaffProfileForm = {
  department: '',
  discordId: '',
  displayName: '',
  internalNote: '',
  jobTitle: '',
  joinedAt: '',
  phone: '',
  timezone: '',
};

const STAFF_PROFILE_MAX_LENGTHS = {
  department: 80,
  discordId: 20,
  displayName: 80,
  internalNote: 1000,
  jobTitle: 80,
  phone: 32,
  timezone: 64,
} as const;

const formatDateInputValue = (
  date: Date | string | null | undefined,
): string => {
  if (!date) return '';

  return new Date(date).toISOString().slice(0, 10);
};

const normalizeProfileText = (value: string | null | undefined): string => {
  return value?.trim() ?? '';
};

const nullableProfileText = (value: string): string | null => {
  const trimmedValue = value.trim();

  return trimmedValue ? trimmedValue : null;
};

const mapStaffProfileToForm = (
  staffProfile: UserType['staffProfile'],
): StaffProfileForm => ({
  department: normalizeProfileText(staffProfile?.department),
  discordId: normalizeProfileText(staffProfile?.discordId),
  displayName: normalizeProfileText(staffProfile?.displayName),
  internalNote: normalizeProfileText(staffProfile?.internalNote),
  jobTitle: normalizeProfileText(staffProfile?.jobTitle),
  joinedAt: formatDateInputValue(staffProfile?.joinedAt),
  phone: normalizeProfileText(staffProfile?.phone),
  timezone: normalizeProfileText(staffProfile?.timezone),
});

const formatCompactDate = (date: Date | string | null): string => {
  if (!date) return 'Jamais';

  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const arePermissionsEqual = (
  first: PermissionsData | null,
  second: PermissionsData | null,
): boolean => {
  const firstEntries = new Map(Object.entries(first ?? {}));
  const secondEntries = new Map(Object.entries(second ?? {}));
  const keys = new Set([...firstEntries.keys(), ...secondEntries.keys()]);

  for (const key of keys) {
    if (
      (firstEntries.get(key) ?? false) !== (secondEntries.get(key) ?? false)
    ) {
      return false;
    }
  }

  return true;
};

const DetailSkeleton: FC = () => (
  <PageShell className="py-0">
    <PageCanvas contentClassName="space-y-4">
      <div className="space-y-4">
        <Skeleton className="h-12 w-full lg:hidden" />
        <Card className="shrink-0 overflow-hidden py-0">
          <div className="bg-primary h-1 w-full" />
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-center gap-3">
                <Skeleton className="size-10 rounded-lg" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-5 w-52 max-w-full" />
                  <Skeleton className="h-4 w-72 max-w-full" />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Skeleton className="h-7 w-32 rounded-md" />
                <Skeleton className="h-7 w-24 rounded-md" />
                <Skeleton className="h-7 w-28 rounded-md" />
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="border-border/60 bg-card rounded-lg border p-3 sm:p-4">
          <Skeleton className="h-7 w-48 max-w-full" />
        </div>
        <Skeleton className="min-h-96 w-full rounded-lg" />
      </div>
    </PageCanvas>
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
    staffProfile: EMPTY_STAFF_PROFILE_FORM,
  });
  const [isSaving, setIsSaving] = useState(false);

  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);
  const [showRevokeSessionsConfirm, setShowRevokeSessionsConfirm] =
    useState(false);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditStats, setAuditStats] = useState<UserAuditStats | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);
  const [securitySessions, setSecuritySessions] = useState<UserSessionInfo[]>(
    [],
  );
  const [isLoadingSecuritySessions, setIsLoadingSecuritySessions] =
    useState(false);
  const [isRevokingSecuritySessions, setIsRevokingSecuritySessions] =
    useState(false);

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
  const canManageTargetSessions = canResetTargetPassword;
  const canDeleteTargetUser =
    !!user && canDeleteUsers && !user.isProtected && !isSelf;
  const canEditTargetRole = !!user && isProtectedActor && !user.isProtected;
  const canEditTargetStatus = canEditTargetProfile;
  const availableSections = USER_DETAIL_SECTIONS;
  const profileErrors = useMemo(() => {
    const buildLengthError = (
      field: keyof typeof STAFF_PROFILE_MAX_LENGTHS,
      label: string,
    ): string | null => {
      return editForm.staffProfile[field].trim().length >
        STAFF_PROFILE_MAX_LENGTHS[field]
        ? `${label} trop long`
        : null;
    };

    return {
      email: !editForm.email.trim()
        ? 'Email obligatoire'
        : EMAIL_PATTERN.test(editForm.email.trim())
          ? null
          : 'Email invalide',
      firstName: !editForm.firstName.trim()
        ? 'Prénom obligatoire'
        : editForm.firstName.trim().length > 50
          ? 'Prénom trop long'
          : null,
      lastName: !editForm.lastName.trim()
        ? 'Nom obligatoire'
        : editForm.lastName.trim().length > 50
          ? 'Nom trop long'
          : null,
      staffProfile: {
        department: buildLengthError('department', 'Pole'),
        discordId:
          editForm.staffProfile.discordId.trim() &&
          !/^\d{17,20}$/.test(editForm.staffProfile.discordId.trim())
            ? 'ID Discord invalide'
            : buildLengthError('discordId', 'ID Discord'),
        displayName: buildLengthError('displayName', 'Nom affiché'),
        internalNote: buildLengthError('internalNote', 'Note interne'),
        jobTitle: buildLengthError('jobTitle', 'Poste'),
        joinedAt:
          editForm.staffProfile.joinedAt &&
          Number.isNaN(Date.parse(editForm.staffProfile.joinedAt))
            ? 'Date invalide'
            : null,
        phone: buildLengthError('phone', 'Téléphone'),
        timezone: buildLengthError('timezone', 'Fuseau horaire'),
      },
    };
  }, [editForm]);
  const hasProfileErrors =
    !!profileErrors.email ||
    !!profileErrors.firstName ||
    !!profileErrors.lastName ||
    Object.values(profileErrors.staffProfile).some(Boolean);
  const hasProfileChanges =
    !!user &&
    (editForm.email.trim().toLowerCase() !== user.email ||
      editForm.firstName.trim() !== user.firstName ||
      editForm.lastName.trim() !== user.lastName ||
      (
        Object.keys(EMPTY_STAFF_PROFILE_FORM) as Array<keyof StaffProfileForm>
      ).some((field) => {
        const currentValue = normalizeProfileText(editForm.staffProfile[field]);
        const savedValue = mapStaffProfileToForm(user.staffProfile)[field];

        return currentValue !== savedValue;
      }));
  const hasAccessChanges =
    !!user &&
    (editForm.role !== user.role ||
      !arePermissionsEqual(permissions, user.permissions));
  const hasSecurityChanges = !!user && editForm.isActive !== user.isActive;
  const hasCurrentSectionChanges =
    (activeSection === 'profile' && hasProfileChanges) ||
    (activeSection === 'access' && hasAccessChanges) ||
    (activeSection === 'security' && hasSecurityChanges);
  const canSaveProfile =
    canEditTargetProfile && hasProfileChanges && !hasProfileErrors;
  const canSaveAccess =
    hasAccessChanges && (canEditTargetRole || canManageTargetPermissions);
  const canSaveSecurity = canEditTargetStatus && !isSelf && hasSecurityChanges;

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
          staffProfile: mapStaffProfileToForm(loadedUser.staffProfile),
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

  const fetchSecuritySessions = useCallback(async (): Promise<void> => {
    if (!canManageTargetSessions) {
      setSecuritySessions([]);

      return;
    }

    try {
      setIsLoadingSecuritySessions(true);
      const response = await fetch(`/api/users/${userId}/sessions`);
      const data = await response.json();

      if (data.success) {
        setSecuritySessions(data.data.sessions);
      } else {
        setSecuritySessions([]);
      }
    } catch {
      setSecuritySessions([]);
    } finally {
      setIsLoadingSecuritySessions(false);
    }
  }, [canManageTargetSessions, userId]);

  useEffect(() => {
    void fetchUser();
    void fetchAuditLogs();
  }, [fetchUser, fetchAuditLogs]);

  useEffect(() => {
    if (activeSection === 'security') {
      void fetchSecuritySessions();
    }
  }, [activeSection, fetchSecuritySessions]);

  useEffect(() => {
    setActiveSection(normalizeUserDetailSection(searchParams.get('section')));
  }, [searchParams, userId]);

  const handleSectionChange = useCallback(
    (sectionId: UserDetailSectionId): void => {
      if (sectionId === activeSection) return;

      if (hasCurrentSectionChanges) {
        toast.error(
          'Enregistrez ou annulez les modifications avant de changer de section',
        );

        return;
      }

      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set('section', sectionId);
      setActiveSection(sectionId);
      router.replace(`${pathname}?${nextParams.toString()}`, {
        scroll: false,
      });
    },
    [activeSection, hasCurrentSectionChanges, pathname, router, searchParams],
  );

  const syncUserState = (updatedUser: UserType): void => {
    setUser(updatedUser);
    setEditForm({
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      isActive: updatedUser.isActive,
      lastName: updatedUser.lastName,
      role: updatedUser.role,
      staffProfile: mapStaffProfileToForm(updatedUser.staffProfile),
    });
    setPermissions(updatedUser.permissions);
  };

  const handleCancelProfile = (): void => {
    if (!user) return;

    setEditForm((currentForm) => ({
      ...currentForm,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      staffProfile: mapStaffProfileToForm(user.staffProfile),
    }));
  };

  const handleCancelAccess = (): void => {
    if (!user) return;

    setEditForm((currentForm) => ({
      ...currentForm,
      role: user.role,
    }));
    setPermissions(user.permissions);
  };

  const handleCancelSecurity = (): void => {
    if (!user) return;

    setEditForm((currentForm) => ({
      ...currentForm,
      isActive: user.isActive,
    }));
  };

  const handleSaveProfile = async (): Promise<void> => {
    if (!canEditTargetProfile) {
      toast.error('Permission insuffisante pour modifier cet utilisateur');

      return;
    }

    if (hasProfileErrors) {
      toast.error('Corrigez les champs du profil avant de sauvegarder');

      return;
    }

    if (!hasProfileChanges) {
      toast.info('Aucune modification à enregistrer');

      return;
    }

    setIsSaving(true);
    try {
      const response = await apiFetch(`/api/users/${userId}`, {
        body: JSON.stringify({
          email: editForm.email.trim(),
          firstName: editForm.firstName.trim(),
          lastName: editForm.lastName.trim(),
          staffProfile: {
            department: nullableProfileText(editForm.staffProfile.department),
            discordId: nullableProfileText(editForm.staffProfile.discordId),
            displayName: nullableProfileText(editForm.staffProfile.displayName),
            internalNote: nullableProfileText(
              editForm.staffProfile.internalNote,
            ),
            jobTitle: nullableProfileText(editForm.staffProfile.jobTitle),
            joinedAt: editForm.staffProfile.joinedAt || null,
            phone: nullableProfileText(editForm.staffProfile.phone),
            timezone: nullableProfileText(editForm.staffProfile.timezone),
          },
        }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const data = await response.json();

      if (data.success) {
        syncUserState(data.data.user);
        toast.success('Utilisateur mis à jour');
      } else {
        toast.error(data.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveAccess = async (): Promise<void> => {
    if (!canEditTargetRole && !canManageTargetPermissions) {
      toast.error('Permission insuffisante pour modifier les accès');

      return;
    }

    if (!hasAccessChanges) {
      toast.info('Aucune modification à enregistrer');

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
        toast.success('Accès mis à jour');
      } else {
        toast.error(data.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const handleSaveSecurity = async (): Promise<void> => {
    if (!canEditTargetStatus || isSelf) {
      toast.error('Permission insuffisante pour modifier cet état');

      return;
    }

    if (!hasSecurityChanges) {
      toast.info('Aucune modification à enregistrer');

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
        void fetchSecuritySessions();
        toast.success('Sécurité mise à jour');
      } else {
        toast.error(data.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async (): Promise<void> => {
    if (!canResetTargetPassword) {
      toast.error('Permission insuffisante pour réinitialiser ce mot de passe');
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
        toast.success('Mot de passe réinitialisé');
        void fetchUser();
        void fetchSecuritySessions();
      } else {
        toast.error(
          data.error?.message || 'Erreur lors de la réinitialisation',
        );
      }
    } catch {
      toast.error('Erreur lors de la réinitialisation');
    } finally {
      setIsResetting(false);
      setShowResetConfirm(false);
    }
  };

  const handleRevokeSecuritySessions = async (): Promise<void> => {
    if (!canManageTargetSessions) {
      toast.error('Permission insuffisante pour révoquer les sessions');

      return;
    }

    setIsRevokingSecuritySessions(true);
    try {
      const response = await apiFetch(`/api/users/${userId}/sessions`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Sessions révoquées');
        void fetchSecuritySessions();
      } else {
        toast.error(data.error?.message || 'Erreur lors de la révocation');
      }
    } catch {
      toast.error('Erreur lors de la révocation');
    } finally {
      setIsRevokingSecuritySessions(false);
      setShowRevokeSessionsConfirm(false);
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
        toast.success('Utilisateur supprimé');
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
              staffProfile: editForm.staffProfile,
            }}
            setForm={(form: ProfileForm) =>
              setEditForm((currentForm) => ({ ...currentForm, ...form }))
            }
            canEdit={canEditTargetProfile}
            isSaving={isSaving}
            onSave={handleSaveProfile}
            onCancel={handleCancelProfile}
            hasChanges={hasProfileChanges}
            canSave={canSaveProfile}
            errors={profileErrors}
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
            onCancel={handleCancelAccess}
            hasChanges={hasAccessChanges}
            canSave={canSaveAccess}
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
            canManageSessions={canManageTargetSessions}
            isSaving={isSaving}
            isLoadingSessions={isLoadingSecuritySessions}
            isRevokingSessions={isRevokingSecuritySessions}
            onSaveStatus={handleSaveSecurity}
            onResetPassword={() => setShowResetConfirm(true)}
            onRevokeSessions={() => setShowRevokeSessionsConfirm(true)}
            tempPassword={tempPassword}
            currentUserId={currentUser?.id}
            canSaveStatus={canSaveSecurity}
            hasStatusChanges={hasSecurityChanges}
            onCancelStatus={handleCancelSecurity}
            canDeleteUser={canDeleteTargetUser}
            onDeleteUser={() => setShowDeleteConfirm(true)}
            sessions={securitySessions}
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
        <AccessDeniedState
          actionHref="/administration/utilisateurs"
          actionLabel="Retour aux utilisateurs"
          description="Vous n'avez pas la permission de consulter cet utilisateur."
        />
      </AuthenticatedLayout>
    );
  }

  if (isLoading) {
    return (
      <AuthenticatedLayout
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
        <PageState
          actionHref="/administration/utilisateurs"
          actionLabel="Retour aux utilisateurs"
          description={errorMessage || "Impossible de charger l'utilisateur."}
          title="Utilisateur introuvable"
          tone="destructive"
        />
      </AuthenticatedLayout>
    );
  }

  return (
    <AuthenticatedLayout
      breadcrumbs={[
        { label: 'Administration' },
        { href: '/administration/utilisateurs', label: 'Utilisateurs' },
        {
          href: `/administration/utilisateurs/${user.id}`,
          label: `${user.firstName} ${user.lastName}`,
        },
      ]}
    >
      <PageShell className="py-0">
        <PageCanvas contentClassName="space-y-3">
          <div className="space-y-3">
            <PageHeader
              title={`${user.firstName} ${user.lastName}`}
              description={user.email}
              actions={
                <Button asChild variant="outline" size="sm">
                  <Link href="/administration/utilisateurs">
                    <ArrowLeft className="size-4" />
                    Retour
                  </Link>
                </Button>
              }
              icon={<UserAvatar user={user} className="size-10 rounded-lg" />}
              meta={
                <>
                  <Badge variant={getRoleColor(user.role)}>
                    {getAccessLabel(user)}
                  </Badge>
                  {user.isProtected && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 text-amber-400"
                    >
                      Protégé
                    </Badge>
                  )}
                  {user.isActive ? (
                    <Badge variant="secondary">Actif</Badge>
                  ) : (
                    <Badge
                      variant="outline"
                      className="border-muted-foreground/35 bg-muted/30 text-muted-foreground"
                    >
                      Inactif
                    </Badge>
                  )}
                  {user.mustChangePassword && (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 text-amber-400"
                    >
                      Mot de passe à changer
                    </Badge>
                  )}
                </>
              }
            />
            <div className="grid gap-3 md:grid-cols-3">
              <div className="border-border/70 bg-card flex items-center gap-3 rounded-lg border p-3">
                <Clock className="text-muted-foreground size-4" />
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">
                    Dernière connexion
                  </p>
                  <p className="truncate text-sm font-medium">
                    {formatCompactDate(user.lastLoginAt)}
                  </p>
                </div>
              </div>
              <div className="border-border/70 bg-card flex items-center gap-3 rounded-lg border p-3">
                <Calendar className="text-muted-foreground size-4" />
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">Créé</p>
                  <p className="truncate text-sm font-medium">
                    {formatCompactDate(user.createdAt)}
                  </p>
                </div>
              </div>
              <div className="border-border/70 bg-card flex items-center gap-3 rounded-lg border p-3">
                <Activity className="text-muted-foreground size-4" />
                <div className="min-w-0">
                  <p className="text-muted-foreground text-xs">Activité</p>
                  <p className="truncate text-sm font-medium">
                    {trackedActionsLabel}
                  </p>
                </div>
              </div>
            </div>
            <Tabs
              value={activeSection}
              onValueChange={(value) =>
                handleSectionChange(value as UserDetailSectionId)
              }
              className="min-w-0"
            >
              <div className="overflow-x-auto pb-1">
                <TabsList className="h-10 w-max p-1">
                  {availableSections.map((section) => (
                    <TabsTrigger
                      key={section.id}
                      value={section.id}
                      className="h-8 px-3 text-xs sm:text-sm"
                    >
                      <span
                        className={
                          activeSection === section.id ? 'text-primary' : ''
                        }
                      >
                        {section.icon}
                      </span>
                      {section.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
            </Tabs>
            <div>{renderContent()}</div>
          </div>
        </PageCanvas>
      </PageShell>
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent className="border-border overflow-hidden rounded-lg p-0">
          <div className="p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <AlertTriangle size={16} className="text-amber-400" />
                </div>
                Réinitialiser le mot de passe ?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Un nouveau mot de passe temporaire sera généré.
                L&apos;utilisateur devra le changer à sa prochaine connexion.
                Toutes ses sessions actives seront invalidées.
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
                Réinitialiser
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={showRevokeSessionsConfirm}
        onOpenChange={setShowRevokeSessionsConfirm}
      >
        <AlertDialogContent className="border-border overflow-hidden rounded-lg p-0">
          <div className="p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                  <AlertTriangle size={16} className="text-amber-400" />
                </div>
                Révoquer les sessions ?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-muted-foreground">
                Toutes les sessions actives de cet utilisateur seront
                déconnectées. Il devra se reconnecter.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel className="border-border">
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRevokeSecuritySessions}
                disabled={isRevokingSecuritySessions}
                className="bg-amber-500 text-white hover:bg-amber-500/90"
              >
                {isRevokingSecuritySessions && (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                )}
                Révoquer
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
                Cette action est irréversible. L&apos;utilisateur sera supprimé
                définitivement et toutes ses sessions seront invalidées.
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
