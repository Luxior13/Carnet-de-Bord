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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '$ui/card';
import { Separator } from '$ui/separator';
import { ServiceIcon } from '$ui/service-icon';
import { Skeleton } from '$ui/skeleton';
import { apiFetch } from '$utils/api.utils';
import { cn } from '$utils/css.utils';

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

  const formatRelativeTime = (date: Date | string | null): string => {
    if (!date) return 'Jamais';
    const now = new Date();
    const then = new Date(date);
    const diffMs = now.getTime() - then.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "A l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;

    return new Date(date).toLocaleDateString('fr-FR');
  };

  const parseUserAgent = (
    ua: string | null,
  ): { browser: string; device: string } => {
    if (!ua) return { browser: 'Inconnu', device: 'Inconnu' };

    let device = 'Ordinateur';
    let browser = 'Navigateur';

    if (ua.includes('iPhone') || ua.includes('iPad')) device = 'iPhone/iPad';
    else if (ua.includes('Android')) device = 'Android';
    else if (ua.includes('Windows')) device = 'Windows';
    else if (ua.includes('Mac')) device = 'Mac';
    else if (ua.includes('Linux')) device = 'Linux';

    if (ua.includes('Chrome') && !ua.includes('Edge')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome'))
      browser = 'Safari';
    else if (ua.includes('Edge')) browser = 'Edge';

    return { browser, device };
  };

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

  const otherSessionsCount = sessions.filter((s) => !s.isCurrent).length;

  return (
    <>
      <Card className="bg-card">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ServiceIcon className="bg-amber-500/10 text-amber-300">
              <Shield className="size-5" />
            </ServiceIcon>
            <div>
              <CardTitle>Sécurité</CardTitle>
              <CardDescription>Mot de passe et sessions</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setShowPasswordDialog(true)}
            className="bg-popover hover:bg-accent h-auto w-full justify-between rounded-lg border p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <ServiceIcon className="bg-amber-500/10 text-amber-300">
                <Key className="size-5" />
              </ServiceIcon>
              <div>
                <p className="font-medium">Mot de passe</p>
                <p className="text-muted-foreground text-sm">
                  {userData.passwordChangedAt
                    ? `Modifié ${formatRelativeTime(userData.passwordChangedAt)}`
                    : 'Jamais modifié'}
                </p>
              </div>
            </div>
            <ChevronRight className="text-muted-foreground size-5" />
          </Button>
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
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => {
                const { browser, device } = parseUserAgent(session.userAgent);
                const isPhone =
                  device === 'iPhone/iPad' || device === 'Android';
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
                    <DeviceIcon className="text-primary size-5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
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
                        {formatRelativeTime(session.createdAt)}
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
        </CardContent>
      </Card>
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
