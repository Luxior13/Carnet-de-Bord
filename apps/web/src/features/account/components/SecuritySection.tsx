'use client';

import {
  AlertTriangle,
  ChevronRight,
  Key,
  Loader2,
  LogOut,
  Monitor,
  Shield,
  Smartphone,
  X,
} from 'lucide-react';
import React, { type FC, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ChangePasswordDialog } from '$components/ChangePasswordDialog';
import { AccountPanel } from '$features/account/components/AccountPanel';
import type { UserType } from '$types/auth.types';
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
import { Skeleton } from '$ui/skeleton';
import { apiFetch } from '$utils/api.utils';
import { cn } from '$utils/css.utils';

import { formatRelativeAccountTime, parseUserAgent } from '../account.utils';

type SessionInfo = {
  createdAt: string;
  expiresAt: string;
  id: string;
  ipAddress: string | null;
  isCurrent: boolean;
  rememberMe: boolean;
  userAgent: string | null;
};

type SecuritySectionProps = {
  onUpdate: () => Promise<void>;
  userData: UserType;
};

export const SecuritySection: FC<SecuritySectionProps> = ({
  onUpdate,
  userData,
}) => {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingAll, setRevokingAll] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);

  const fetchSessions = useCallback(async (): Promise<void> => {
    try {
      setLoadingSessions(true);
      const response = await fetch('/api/auth/sessions');
      const data = await response.json();

      if (data.success) {
        setSessions(data.data.sessions);
      }
    } catch {
      // Sessions are non-blocking for the account page.
    } finally {
      setLoadingSessions(false);
    }
  }, []);

  useEffect(() => {
    void fetchSessions();
  }, [fetchSessions]);

  const handleRevokeAllSessions = async (): Promise<void> => {
    try {
      setRevokingAll(true);
      const response = await apiFetch('/api/auth/sessions', {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Toutes les autres sessions ont été déconnectées');
        void fetchSessions();
      } else {
        toast.error(data.error?.message || 'Erreur');
      }
    } catch {
      toast.error('Erreur lors de la déconnexion');
    } finally {
      setRevokingAll(false);
      setShowRevokeDialog(false);
    }
  };

  const handleRevokeSession = async (sessionId: string): Promise<void> => {
    try {
      setRevokingId(sessionId);
      const response = await apiFetch(`/api/auth/sessions?id=${sessionId}`, {
        method: 'DELETE',
      });
      const data = await response.json();

      if (data.success) {
        toast.success('Session déconnectée');
        void fetchSessions();
      } else {
        toast.error(data.error?.message || 'Erreur');
      }
    } catch {
      toast.error('Erreur lors de la déconnexion');
    } finally {
      setRevokingId(null);
    }
  };

  const otherSessionsCount = sessions.filter(
    (session) => !session.isCurrent,
  ).length;

  return (
    <>
      <AccountPanel
        icon={<Shield className="size-4" />}
        title="Sécurité"
        description="Mot de passe, sessions actives et déconnexions"
        contentClassName="p-0"
      >
        <div className="divide-sidebar-border/45 divide-y">
          <button
            type="button"
            onClick={() => setShowPasswordDialog(true)}
            className="bg-sidebar-accent/[0.06] hover:bg-sidebar-accent/[0.14] group flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors sm:px-5"
          >
            <div className="flex min-w-0 items-center gap-3">
              <span className="border-sidebar-ring/30 bg-sidebar-accent/35 text-sidebar-ring flex size-9 shrink-0 items-center justify-center rounded-md border">
                <Key className="size-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sidebar-foreground text-sm font-medium">
                  Mot de passe
                </p>
                <p className="text-sidebar-foreground/58 text-sm">
                  {userData.passwordChangedAt
                    ? `Modifié ${formatRelativeAccountTime(userData.passwordChangedAt)}`
                    : 'Jamais modifié'}
                </p>
              </div>
            </div>
            <ChevronRight className="text-sidebar-foreground/45 group-hover:text-sidebar-ring size-5 shrink-0 transition-colors" />
          </button>
          <div className="bg-background/18 flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div className="flex items-center gap-3">
              <span className="border-sidebar-ring/30 bg-sidebar-accent/28 text-sidebar-ring flex size-9 shrink-0 items-center justify-center rounded-md border">
                <Monitor className="size-4" />
              </span>
              <div>
                <p className="text-sidebar-foreground text-sm font-medium">
                  Sessions actives
                </p>
                <p className="text-sidebar-foreground/58 text-sm">
                  {sessions.length} appareil{sessions.length > 1 ? 's' : ''}{' '}
                  connect{sessions.length > 1 ? 'és' : 'é'}
                </p>
              </div>
            </div>
            {otherSessionsCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-sidebar-ring/30 bg-sidebar-accent/20 hover:bg-sidebar-accent/32 rounded-lg"
                onClick={() => setShowRevokeDialog(true)}
                disabled={revokingAll}
              >
                <LogOut className="size-4" />
                Déconnecter ({otherSessionsCount})
              </Button>
            )}
          </div>
          <div className="px-4 py-4 sm:px-5">
            {loadingSessions ? (
              <div className="space-y-2">
                <Skeleton className="h-14 rounded-lg" />
                <Skeleton className="h-14 rounded-lg" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="border-sidebar-ring/20 bg-sidebar-accent/[0.08] text-sidebar-foreground/68 rounded-lg border border-dashed px-4 py-5 text-sm">
                Aucune session active n&apos;a été trouvée.
              </div>
            ) : (
              <div className="border-sidebar-border/55 bg-background/28 overflow-hidden rounded-lg border">
                {sessions.map((session) => {
                  const { browser, device } = parseUserAgent(session.userAgent);
                  const isPhone =
                    device === 'iPhone/iPad' || device === 'Android';
                  const DeviceIcon = isPhone ? Smartphone : Monitor;

                  return (
                    <div
                      key={session.id}
                      className={cn(
                        'border-sidebar-border/45 hover:bg-sidebar-accent/[0.06] flex items-center gap-3 border-b px-3 py-3 transition-colors last:border-b-0',
                        session.isCurrent &&
                          'bg-sidebar-accent/[0.14] shadow-[inset_3px_0_0_rgba(108,146,214,0.58)]',
                      )}
                    >
                      <span className="border-sidebar-border/60 bg-background/40 flex size-9 shrink-0 items-center justify-center rounded-md border">
                        <DeviceIcon className="text-sidebar-ring size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-medium">
                            {device} - {browser}
                          </span>
                          {session.isCurrent && (
                            <Badge variant="secondary" className="rounded-full">
                              Actuelle
                            </Badge>
                          )}
                          {session.rememberMe && (
                            <Badge variant="outline" className="rounded-full">
                              Longue
                            </Badge>
                          )}
                        </div>
                        <p className="text-sidebar-foreground/52 truncate text-xs">
                          {session.ipAddress || 'IP inconnue'} - Ouverte{' '}
                          {formatRelativeAccountTime(session.createdAt)}
                        </p>
                      </div>
                      {!session.isCurrent && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="rounded-lg"
                          onClick={() => handleRevokeSession(session.id)}
                          disabled={revokingId === session.id}
                          aria-label="Déconnecter cette session"
                        >
                          {revokingId === session.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <X className="size-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </AccountPanel>
      <ChangePasswordDialog
        open={showPasswordDialog}
        onCancel={() => setShowPasswordDialog(false)}
        onSuccess={() => {
          setShowPasswordDialog(false);
          void onUpdate();
          toast.success('Mot de passe modifié avec succès');
        }}
      />
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent className="border-sidebar-border overflow-hidden rounded-xl p-0">
          <div className="p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-sidebar-foreground flex items-center gap-2">
                <div className="bg-destructive/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <AlertTriangle size={16} className="text-destructive" />
                </div>
                Déconnecter les autres sessions ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Vous serez déconnecté de {otherSessionsCount} autre
                {otherSessionsCount > 1 ? 's' : ''} appareil
                {otherSessionsCount > 1 ? 's' : ''}. Seule cette session restera
                active.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleRevokeAllSessions}
                disabled={revokingAll}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {revokingAll && <Loader2 className="size-4 animate-spin" />}
                Déconnecter
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
