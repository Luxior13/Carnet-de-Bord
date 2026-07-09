'use client';

import {
  AlertTriangle,
  KeyRound,
  Laptop,
  Loader2,
  LogOut,
  Monitor,
  Shield,
  ShieldCheck,
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
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '$ui/card';
import { Separator } from '$ui/separator';
import { Skeleton } from '$ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
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
  canChangePassword: boolean;
  canViewSecurity: boolean;
  onUpdate: () => Promise<void>;
  userData: UserType;
};

type SecurityMetricProps = {
  description: string;
  icon: React.ReactNode;
  label: string;
  tone?: 'danger' | 'neutral' | 'primary' | 'warning';
  value: string;
};

const SectionTitle: FC<{
  children: React.ReactNode;
  icon: React.ReactNode;
}> = ({ children, icon }) => (
  <CardTitle className="text-foreground flex items-center gap-2 text-sm font-semibold">
    <span className="border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring flex size-7 items-center justify-center rounded-lg border">
      {icon}
    </span>
    {children}
  </CardTitle>
);

const SecurityMetric: FC<SecurityMetricProps> = ({
  description,
  icon,
  label,
  tone = 'neutral',
  value,
}) => {
  const toneClassName =
    tone === 'danger'
      ? 'border-destructive/35 bg-destructive/10 text-destructive'
      : tone === 'warning'
        ? 'border-amber-500/35 bg-amber-500/10 text-amber-400'
        : tone === 'primary'
          ? 'border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring'
          : 'border-sidebar-border/70 bg-background/45 text-muted-foreground';

  return (
    <Card className="border-sidebar-border/70 overflow-hidden rounded-xl py-0">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <span
            className={`${toneClassName} flex size-9 shrink-0 items-center justify-center rounded-lg border`}
          >
            {icon}
          </span>
          <div className="min-w-0">
            <p className="text-muted-foreground text-xs">{label}</p>
            <p className="text-foreground mt-0.5 truncate text-sm font-semibold">
              {value}
            </p>
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">
              {description}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const formatSessionDateTime = (date: string | null): string => {
  if (!date) return 'Date inconnue';

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) return 'Date inconnue';

  return parsedDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const getSessionDeviceIcon = (device: string): typeof Monitor => {
  return device === 'iPhone/iPad' || device === 'Android'
    ? Smartphone
    : Monitor;
};

const getSessionTitle = (session: SessionInfo): string => {
  const { browser, device } = parseUserAgent(session.userAgent);

  return `${device} - ${browser}`;
};

type SessionRowProps = {
  isRevoking?: boolean;
  onRevoke?: (sessionId: string) => void;
  session: SessionInfo;
};

const SessionRow: FC<SessionRowProps> = ({ isRevoking, onRevoke, session }) => {
  const { browser, device } = parseUserAgent(session.userAgent);
  const DeviceIcon = getSessionDeviceIcon(device);
  const canRevoke = !!onRevoke && !session.isCurrent;

  return (
    <div
      className={cn(
        'border-border/60 bg-popover flex items-center gap-3 rounded-md border p-3',
        session.isCurrent &&
          'border-sidebar-ring/35 bg-sidebar-accent/[0.1] shadow-[inset_3px_0_0_rgba(108,146,214,0.5)]',
      )}
    >
      <span className="border-sidebar-ring/35 bg-sidebar-ring/15 text-sidebar-ring flex size-9 shrink-0 items-center justify-center rounded-lg border">
        <DeviceIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="text-foreground truncate text-sm font-medium">
            {device} - {browser}
          </p>
          {session.isCurrent && (
            <Badge variant="secondary" className="rounded-full">
              Actuelle
            </Badge>
          )}
          {session.rememberMe && (
            <Badge variant="outline" className="rounded-full">
              Longue session
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground mt-1 truncate text-xs">
          Ouverte {formatRelativeAccountTime(session.createdAt)} - Expire le{' '}
          {formatSessionDateTime(session.expiresAt)}
          {session.ipAddress ? ` - IP ${session.ipAddress}` : ''}
        </p>
      </div>
      {canRevoke && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-lg"
              onClick={() => onRevoke(session.id)}
              disabled={isRevoking}
              aria-label="Déconnecter cette session"
            >
              {isRevoking ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <X className="size-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">Déconnecter cette session</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
};

export const SecuritySection: FC<SecuritySectionProps> = ({
  canChangePassword,
  canViewSecurity,
  onUpdate,
  userData,
}) => {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [revokingAll, setRevokingAll] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);

  const fetchSessions = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (!signal?.aborted) {
        setLoadingSessions(true);
      }

      try {
        const response = await fetch('/api/auth/sessions', { signal });
        const data = await response.json();

        if (!signal?.aborted && response.ok && data.success) {
          setSessions(data.data.sessions);
        }
      } catch {
        // Sessions are non-blocking for the account page.
      } finally {
        if (!signal?.aborted) {
          setLoadingSessions(false);
        }
      }
    },
    [],
  );

  useEffect(() => {
    const controller = new AbortController();

    void fetchSessions(controller.signal);

    return (): void => {
      controller.abort();
    };
  }, [fetchSessions]);

  const handleRevokeAllSessions = async (): Promise<void> => {
    try {
      setRevokingAll(true);
      const response = await apiFetch('/api/auth/sessions', {
        method: 'DELETE',
      });
      const data = await response.json();

      if (response.ok && data.success) {
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

      if (response.ok && data.success) {
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

  const currentSession = sessions.find((session) => session.isCurrent);
  const otherSessions = sessions.filter((session) => !session.isCurrent);
  const passwordStatusLabel = userData.mustChangePassword
    ? 'À changer'
    : userData.passwordChangedAt
      ? 'À jour'
      : 'Jamais modifié';
  const passwordChangedLabel = userData.passwordChangedAt
    ? formatRelativeAccountTime(userData.passwordChangedAt)
    : 'Jamais';
  const currentSessionLabel = loadingSessions
    ? 'Chargement'
    : currentSession
      ? getSessionTitle(currentSession)
      : 'Non détectée';
  const otherSessionsLabel = loadingSessions
    ? 'Chargement'
    : String(otherSessions.length);
  const canViewPasswordSecurity = canViewSecurity || canChangePassword;

  return (
    <>
      <div className="space-y-3">
        <div
          className={cn(
            'grid gap-3',
            canViewPasswordSecurity ? 'md:grid-cols-3' : 'md:grid-cols-2',
          )}
        >
          {canViewPasswordSecurity && (
            <SecurityMetric
              icon={<KeyRound className="size-4" />}
              label="Mot de passe"
              value={passwordStatusLabel}
              description={`Dernier changement : ${passwordChangedLabel}`}
              tone={userData.mustChangePassword ? 'warning' : 'primary'}
            />
          )}
          <SecurityMetric
            icon={<Laptop className="size-4" />}
            label="Session actuelle"
            value={currentSessionLabel}
            description={
              currentSession
                ? `Ouverte ${formatRelativeAccountTime(currentSession.createdAt)}`
                : 'Appareil utilisé maintenant'
            }
            tone={currentSession ? 'primary' : 'neutral'}
          />
          <SecurityMetric
            icon={<ShieldCheck className="size-4" />}
            label="Autres sessions"
            value={otherSessionsLabel}
            description={
              otherSessions.length > 0
                ? 'Appareils connectés à surveiller'
                : 'Aucun autre appareil connecté'
            }
            tone={otherSessions.length > 0 ? 'warning' : 'primary'}
          />
        </div>
        {canViewPasswordSecurity && (
          <Card className="border-sidebar-border/70 overflow-hidden rounded-xl py-0">
            <CardHeader className="border-sidebar-border/65 bg-surface-muted border-b p-3 sm:p-4">
              <SectionTitle icon={<KeyRound className="size-3.5" />}>
                Mot de passe
              </SectionTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-3 sm:p-4">
              <div className="border-border/60 bg-popover space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground text-sm">État</span>
                  {userData.mustChangePassword ? (
                    <Badge
                      variant="outline"
                      className="border-amber-500/40 text-amber-400"
                    >
                      À changer
                    </Badge>
                  ) : (
                    <Badge variant="secondary">À jour</Badge>
                  )}
                </div>
                <Separator className="bg-border/60" />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground text-sm">
                    Dernier changement
                  </span>
                  <span className="text-foreground text-sm">
                    {passwordChangedLabel}
                  </span>
                </div>
                <Separator className="bg-border/60" />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground text-sm">
                    Tentatives échouées
                  </span>
                  <span className="text-foreground text-sm">
                    {userData.failedLoginAttempts}
                  </span>
                </div>
              </div>
            </CardContent>
            {canChangePassword && (
              <CardFooter className="border-sidebar-border/65 bg-surface-muted justify-end border-t p-3 sm:p-4">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPasswordDialog(true)}
                  className="gap-2"
                >
                  <Shield className="size-4" />
                  Changer le mot de passe
                </Button>
              </CardFooter>
            )}
          </Card>
        )}
        <Card className="border-sidebar-border/70 overflow-hidden rounded-xl py-0">
          <CardHeader className="border-sidebar-border/65 bg-surface-muted border-b p-3 sm:p-4">
            <SectionTitle icon={<Monitor className="size-3.5" />}>
              Sessions actives
            </SectionTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-3 sm:p-4">
            {loadingSessions ? (
              <div className="space-y-2">
                <Skeleton className="h-16 rounded-md" />
                <Skeleton className="h-16 rounded-md" />
              </div>
            ) : sessions.length === 0 ? (
              <div className="border-border/60 bg-popover rounded-md border p-3">
                <p className="text-muted-foreground text-sm">
                  Aucune session active n&apos;a été trouvée.
                </p>
              </div>
            ) : (
              <>
                {currentSession && (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
                      Session actuelle
                    </p>
                    <SessionRow session={currentSession} />
                  </div>
                )}
                {otherSessions.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
                      Autres sessions
                    </p>
                    <div className="space-y-2">
                      {otherSessions.map((session) => (
                        <SessionRow
                          key={session.id}
                          session={session}
                          isRevoking={revokingId === session.id}
                          onRevoke={handleRevokeSession}
                        />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="border-border/60 bg-popover rounded-md border p-3">
                    <p className="text-muted-foreground text-sm">
                      Aucune autre session active.
                    </p>
                  </div>
                )}
              </>
            )}
          </CardContent>
          {otherSessions.length > 0 && (
            <CardFooter className="border-sidebar-border/65 bg-surface-muted justify-end border-t p-3 sm:p-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setShowRevokeDialog(true)}
                disabled={revokingAll}
              >
                {revokingAll ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <LogOut className="size-4" />
                )}
                Déconnecter les autres sessions
              </Button>
            </CardFooter>
          )}
        </Card>
      </div>
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
                Vous serez déconnecté de {otherSessions.length} autre
                {otherSessions.length > 1 ? 's' : ''} appareil
                {otherSessions.length > 1 ? 's' : ''}. Seule cette session
                restera active.
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
