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
import { SectionPanel } from '$components/layout/SectionPanel';
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
import { Separator } from '$ui/separator';
import { ServiceIcon } from '$ui/service-icon';
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
    fetchSessions();
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
        fetchSessions();
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
        fetchSessions();
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
      <SectionPanel
        icon={<Shield className="size-4" />}
        title="Sécurité"
        description="Mot de passe, sessions actives et déconnexions"
      >
        <button
          type="button"
          onClick={() => setShowPasswordDialog(true)}
          className="bg-popover hover:bg-accent flex w-full items-center justify-between gap-4 rounded-lg border p-4 text-left transition-colors"
        >
          <div className="flex min-w-0 items-center gap-3">
            <ServiceIcon className="bg-amber-500/10 text-amber-300">
              <Key className="size-5" />
            </ServiceIcon>
            <div className="min-w-0">
              <p className="font-medium">Mot de passe</p>
              <p className="text-muted-foreground text-sm">
                {userData.passwordChangedAt
                  ? `Modifié ${formatRelativeAccountTime(userData.passwordChangedAt)}`
                  : 'Jamais modifié'}
              </p>
            </div>
          </div>
          <ChevronRight className="text-muted-foreground size-5 shrink-0" />
        </button>
        <Separator />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <ServiceIcon>
              <Monitor className="size-5" />
            </ServiceIcon>
            <div>
              <p className="font-medium">Sessions actives</p>
              <p className="text-muted-foreground text-sm">
                {sessions.length} appareil{sessions.length > 1 ? 's' : ''}{' '}
                connecté{sessions.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          {otherSessionsCount > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRevokeDialog(true)}
              disabled={revokingAll}
            >
              <LogOut className="size-4" />
              Déconnecter ({otherSessionsCount})
            </Button>
          )}
        </div>
        {loadingSessions ? (
          <div className="space-y-2">
            <Skeleton className="h-14 rounded-lg" />
            <Skeleton className="h-14 rounded-lg" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="bg-popover text-muted-foreground rounded-lg border border-dashed px-4 py-5 text-sm">
            Aucune session active n&apos;a été trouvée.
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => {
              const { browser, device } = parseUserAgent(session.userAgent);
              const isPhone = device === 'iPhone/iPad' || device === 'Android';
              const DeviceIcon = isPhone ? Smartphone : Monitor;

              return (
                <div
                  key={session.id}
                  className={cn(
                    'flex items-center gap-3 rounded-lg border p-3',
                    session.isCurrent
                      ? 'border-primary/40 bg-primary/10'
                      : 'bg-popover',
                  )}
                >
                  <DeviceIcon className="text-primary size-5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {device} - {browser}
                      </span>
                      {session.isCurrent && (
                        <Badge variant="secondary">Actuelle</Badge>
                      )}
                      {session.rememberMe && (
                        <Badge variant="outline">Longue</Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground truncate text-xs">
                      {session.ipAddress || 'IP inconnue'} - Ouverte{' '}
                      {formatRelativeAccountTime(session.createdAt)}
                    </p>
                  </div>
                  {!session.isCurrent && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
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
      </SectionPanel>
      <ChangePasswordDialog
        open={showPasswordDialog}
        onCancel={() => setShowPasswordDialog(false)}
        onSuccess={() => {
          setShowPasswordDialog(false);
          onUpdate();
          toast.success('Mot de passe modifié avec succès');
        }}
      />
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent className="border-border overflow-hidden rounded-lg p-0">
          <div className="p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
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
