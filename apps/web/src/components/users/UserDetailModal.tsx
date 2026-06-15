'use client';

import { UserRole } from '@repo/database';
import {
  AlertTriangle,
  Edit,
  History,
  Key,
  Loader2,
  Mail,
  Save,
  Shield,
  Trash2,
  User,
} from 'lucide-react';
import React, {
  type FC,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { toast } from 'sonner';

import { PermissionsEditor } from '$components/users/PermissionsEditor';
import { UserEditTab } from '$components/users/user-detail/UserEditTab';
import { UserHistoryTab } from '$components/users/user-detail/UserHistoryTab';
import { UserResumeTab } from '$components/users/user-detail/UserResumeTab';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '$ui/dialog';
import { apiFetch } from '$utils/api.utils';
import { cn } from '$utils/css.utils';

// ============================================
// CONSTANTS
// ============================================

type SectionId = 'resume' | 'edit' | 'permissions' | 'history';

const SECTIONS: { icon: React.ReactNode; id: SectionId; label: string }[] = [
  { icon: <User className="h-4 w-4" />, id: 'resume', label: 'Resume' },
  { icon: <Edit className="h-4 w-4" />, id: 'edit', label: 'Modifier' },
  {
    icon: <Shield className="h-4 w-4" />,
    id: 'permissions',
    label: 'Permissions',
  },
  { icon: <History className="h-4 w-4" />, id: 'history', label: 'Historique' },
];

// ============================================
// TYPES
// ============================================

type UserDetailModalProps = {
  onClose: () => void;
  onUserUpdated: () => void;
  open: boolean;
  userId: string;
};

// ============================================
// SECTION TITLE COMPONENT
// ============================================

const SectionTitle: FC<{ children: React.ReactNode }> = ({ children }) => (
  <DialogHeader className="border-border bg-card sticky top-0 z-10 shrink-0 border-b px-6 py-4">
    <DialogTitle className="text-foreground text-lg font-semibold">
      {children}
    </DialogTitle>
  </DialogHeader>
);

// ============================================
// COMPONENT
// ============================================

const UserDetailModal: FC<UserDetailModalProps> = ({
  onClose,
  onUserUpdated,
  open,
  userId,
}) => {
  const { userData: currentUser } = useUser();
  const [user, setUser] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<SectionId>('resume');

  // Edit form state
  const [editForm, setEditForm] = useState({
    email: '',
    firstName: '',
    isActive: true,
    lastName: '',
    role: 'USER' as UserRole,
  });
  const [isSaving, setIsSaving] = useState(false);

  // Reset password state
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [tempPassword, setTempPassword] = useState<string | null>(null);

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Audit state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditStats, setAuditStats] = useState<UserAuditStats | null>(null);
  const [isLoadingAudit, setIsLoadingAudit] = useState(false);

  // Permissions state
  const [permissions, setPermissions] = useState<PermissionsData | null>(null);
  const [isSavingPermissions, setIsSavingPermissions] = useState(false);
  const isProtectedActor = currentUser?.isProtected === true;

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
  const availableSections = useMemo(
    () =>
      SECTIONS.filter((section) => {
        if (section.id === 'edit') return canEditTargetProfile;
        if (section.id === 'permissions') return canManageTargetPermissions;

        return true;
      }),
    [canEditTargetProfile, canManageTargetPermissions],
  );

  const fetchUser = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/users/${userId}`);
      const data = await response.json();

      if (data.success) {
        setUser(data.data.user);
        setEditForm({
          email: data.data.user.email,
          firstName: data.data.user.firstName,
          isActive: data.data.user.isActive,
          lastName: data.data.user.lastName,
          role: data.data.user.role,
        });
        setPermissions(data.data.user.permissions);
      } else {
        toast.error(data.error?.message || 'Erreur lors du chargement');
        onClose();
      }
    } catch {
      toast.error('Erreur lors du chargement');
      onClose();
    } finally {
      setIsLoading(false);
    }
  }, [userId, onClose]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      setIsLoadingAudit(true);
      // Fetch up to 200 logs (max allowed by API)
      const response = await fetch(`/api/users/${userId}/audit?pageSize=200`);
      const data = await response.json();

      if (data.success) {
        setAuditLogs(data.data.logs);
        setAuditStats(data.data.stats);
      }
    } catch {
      // Silent fail
    } finally {
      setIsLoadingAudit(false);
    }
  }, [userId]);

  useEffect(() => {
    if (open && userId) {
      fetchUser();
      fetchAuditLogs();
      setActiveSection('resume');
    }
  }, [open, userId, fetchUser, fetchAuditLogs]);

  useEffect(() => {
    const hasActiveSection = availableSections.some(
      (section) => section.id === activeSection,
    );

    if (!hasActiveSection) {
      setActiveSection('resume');
    }
  }, [activeSection, availableSections]);

  const handleSave = async () => {
    if (!canEditTargetProfile) {
      toast.error('Permission insuffisante pour modifier cet utilisateur');

      return;
    }

    setIsSaving(true);
    try {
      const response = await apiFetch(`/api/users/${userId}`, {
        body: JSON.stringify(editForm),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const data = await response.json();

      if (data.success) {
        setUser(data.data.user);
        toast.success('Utilisateur mis à jour');
        onUserUpdated();
      } else {
        toast.error(data.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
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
        toast.success('Mot de passe réinitialisé');
        fetchUser();
        onUserUpdated();
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

  const handleDelete = async () => {
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
        onUserUpdated();
        onClose();
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

  const handleSavePermissions = async () => {
    if (!canManageTargetPermissions) {
      toast.error('Permission insuffisante pour modifier les permissions');

      return;
    }

    setIsSavingPermissions(true);
    try {
      const response = await apiFetch(`/api/users/${userId}`, {
        body: JSON.stringify({ permissions }),
        headers: { 'Content-Type': 'application/json' },
        method: 'PATCH',
      });
      const data = await response.json();

      if (data.success) {
        setUser(data.data.user);
        toast.success('Permissions mises a jour');
        onUserUpdated();
      } else {
        toast.error(data.error?.message || 'Erreur lors de la mise à jour');
      }
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const getSectionLabel = () => {
    const section = availableSections.find((s) => s.id === activeSection);

    return section?.label || 'Resume';
  };

  const renderContent = () => {
    if (!user) return null;

    switch (activeSection) {
      case 'resume':
        return <UserResumeTab user={user} auditStats={auditStats} />;
      case 'edit':
        return (
          <UserEditTab
            user={user}
            editForm={editForm}
            setEditForm={setEditForm}
            canEdit={canEditTargetProfile}
            isSaving={isSaving}
            onSave={handleSave}
            onResetPassword={() => setShowResetConfirm(true)}
            onDelete={() => setShowDeleteConfirm(true)}
            tempPassword={tempPassword}
            currentUserId={currentUser?.id}
            isCurrentUserProtected={currentUser?.isProtected}
          />
        );
      case 'permissions':
        return canManageTargetPermissions ? (
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto p-6">
              <PermissionsEditor
                role={user.role}
                permissions={permissions}
                onChange={setPermissions}
                disabled={!canManageTargetPermissions}
              />
            </div>
            <div className="border-border flex shrink-0 items-center justify-end border-t p-4">
              <Button
                onClick={handleSavePermissions}
                disabled={isSavingPermissions}
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSavingPermissions ? (
                  <Loader2 size={16} className="mr-2 animate-spin" />
                ) : (
                  <Save size={16} className="mr-2" />
                )}
                Enregistrer
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-8 text-center">
            <div className="bg-background/35 mb-4 flex h-16 w-16 items-center justify-center rounded-lg">
              <Shield className="text-muted-foreground h-8 w-8" />
            </div>
            <h3 className="text-foreground mb-2 text-lg font-medium">
              Acces restreint
            </h3>
            <p className="text-muted-foreground max-w-sm text-sm">
              Vous n&apos;avez pas acces a la gestion des permissions.
            </p>
          </div>
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

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
        <DialogContent
          className="border-border flex h-[85vh] max-h-[800px] max-w-4xl overflow-hidden rounded-lg p-0"
          hideCloseButton
        >
          {isLoading ? (
            <div className="bg-card flex w-full items-center justify-center">
              <Loader2 className="text-primary h-8 w-8 animate-spin" />
            </div>
          ) : user ? (
            <>
              {/* Sidebar */}
              <div className="border-border bg-background/35 flex w-56 shrink-0 flex-col border-r">
                {/* Gradient accent bar */}
                <div className="bg-primary h-1 w-full" />
                {/* Header - Avatar & Info */}
                <div className="border-border border-b p-4">
                  <div className="mb-3 flex justify-center">
                    <div className="bg-primary shadow-primary/20 flex h-16 w-16 items-center justify-center rounded-full text-xl font-semibold text-white shadow-lg">
                      {user.firstName.charAt(0)}
                      {user.lastName.charAt(0)}
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <h3 className="text-foreground font-semibold">
                        {user.firstName} {user.lastName}
                      </h3>
                      {user.isProtected && (
                        <Shield size={14} className="text-amber-500" />
                      )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {user.email}
                    </p>
                    {/* Status Badges */}
                    <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                      <Badge
                        variant={getRoleColor(user.role)}
                        className="text-[10px]"
                      >
                        {getAccessLabel(user)}
                      </Badge>
                      {!user.isActive && (
                        <Badge
                          variant="outline"
                          className="border-red-500/30 bg-red-500/10 text-[10px] text-red-400"
                        >
                          Inactif
                        </Badge>
                      )}
                      {user.mustChangePassword && (
                        <Badge
                          variant="outline"
                          className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-500"
                        >
                          MDP temp
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
                {/* Navigation */}
                <nav className="flex-1 space-y-1 p-3">
                  {availableSections.map((section) => (
                    <Button
                      type="button"
                      variant={
                        activeSection === section.id ? 'secondary' : 'ghost'
                      }
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={cn(
                        'h-9 w-full justify-start gap-2.5 rounded-md px-3',
                        activeSection === section.id
                          ? 'font-medium'
                          : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
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
                </nav>
                {/* Footer Actions */}
                <div className="border-border space-y-1 border-t p-3">
                  {user.email && (
                    <Button
                      asChild
                      variant="ghost"
                      className="text-muted-foreground h-9 w-full justify-start"
                    >
                      <a href={`mailto:${user.email}`}>
                        <Mail className="h-4 w-4" />
                        Envoyer un email
                      </a>
                    </Button>
                  )}
                  {canResetTargetPassword && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowResetConfirm(true)}
                      className="text-muted-foreground h-9 w-full justify-start"
                    >
                      <Key className="h-4 w-4" />
                      Reset mot de passe
                    </Button>
                  )}
                  {canDeleteTargetUser && (
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive h-9 w-full justify-start"
                    >
                      <Trash2 className="h-4 w-4" />
                      Supprimer
                    </Button>
                  )}
                </div>
              </div>
              {/* Content Area */}
              <div className="bg-card flex min-h-0 flex-1 flex-col">
                {/* Content Header */}
                <SectionTitle>{getSectionLabel()}</SectionTitle>
                {/* Content */}
                <div className="min-h-0 flex-1 overflow-y-auto">
                  {renderContent()}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
      {/* Reset Password Confirmation */}
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
      {/* Delete Confirmation */}
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
    </>
  );
};

export default UserDetailModal;
