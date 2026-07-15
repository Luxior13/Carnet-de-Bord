'use client';

import {
  AlertTriangle,
  KeyRound,
  Laptop,
  Loader2,
  LogOut,
  Monitor,
  QrCode,
  RefreshCw,
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  X,
} from 'lucide-react';
import React, { type FC, useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { ChangePasswordDialog } from '$components/ChangePasswordDialog';
import {
  MfaActionDialog,
  type MfaActionMode,
} from '$features/auth/components/MfaActionDialog';
import { MfaSetupDialog } from '$features/auth/components/MfaSetupDialog';
import { type ApiResponse, RoutesApi } from '$types/api.types';
import type {
  MfaSetupConfirmationData,
  MfaStatus,
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
  idleExpiresAt: string;
  ipAddress: string | null;
  isCurrent: boolean;
  lastSeenAt: string;
  rememberMe: boolean;
  userAgent: string | null;
};

type SecuritySectionProps = {
  canChangePassword: boolean;
  canManageMfa: boolean;
  canManageSessions: boolean;
  canViewSecurity: boolean;
  onUpdate: (updatedUser?: UserType) => Promise<void>;
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
    <span className="border-primary/35 bg-primary/15 text-primary-emphasis flex size-7 items-center justify-center rounded-lg border">
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
        ? 'border-warning/35 bg-warning/10 text-warning'
        : tone === 'primary'
          ? 'border-primary/35 bg-primary/15 text-primary-emphasis'
          : 'border-border/70 bg-background/45 text-muted-foreground';

  return (
    <Card className="border-border/70 overflow-hidden rounded-md py-0">
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
        session.isCurrent && 'border-primary/35 bg-accent/[0.1]',
      )}
    >
      <span className="border-primary/35 bg-primary/15 text-primary-emphasis flex size-9 shrink-0 items-center justify-center rounded-lg border">
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
        <div className="text-muted-foreground mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs">
          <span>
            Active {formatRelativeAccountTime(session.lastSeenAt)} · inactivité
            jusqu’au {formatSessionDateTime(session.idleExpiresAt)}
          </span>
          <span>Limite absolue {formatSessionDateTime(session.expiresAt)}</span>
          <span>
            {session.ipAddress ? `IP ${session.ipAddress}` : 'IP inconnue'}
          </span>
        </div>
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
  canManageMfa,
  canManageSessions,
  canViewSecurity,
  onUpdate,
  userData,
}) => {
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [loadingMfaStatus, setLoadingMfaStatus] = useState(true);
  const [mfaStatusError, setMfaStatusError] = useState<string | null>(null);
  const [mfaSetupMode, setMfaSetupMode] = useState<
    'activate' | 'replace' | null
  >(null);
  const [mfaActionMode, setMfaActionMode] = useState<MfaActionMode | null>(
    null,
  );
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);

  const fetchMfaStatus = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (!canViewSecurity && !canManageMfa) {
        setMfaStatus(null);
        setMfaStatusError(null);
        setLoadingMfaStatus(false);

        return;
      }

      if (!signal?.aborted) {
        setLoadingMfaStatus(true);
        setMfaStatusError(null);
      }

      try {
        const response = await fetch(RoutesApi.mfa, {
          cache: 'no-store',
          signal,
        });
        const data = (await response.json()) as ApiResponse<MfaStatus>;

        if (!signal?.aborted && response.ok && data.success) {
          setMfaStatus(data.data);
        } else if (!signal?.aborted) {
          setMfaStatusError(
            data.success
              ? 'Impossible de charger la double authentification'
              : data.error.message ||
                  'Impossible de charger la double authentification',
          );
        }
      } catch {
        if (!signal?.aborted) {
          setMfaStatusError('Impossible de charger la double authentification');
        }
      } finally {
        if (!signal?.aborted) setLoadingMfaStatus(false);
      }
    },
    [canManageMfa, canViewSecurity],
  );

  const fetchSessions = useCallback(
    async (signal?: AbortSignal): Promise<void> => {
      if (!canManageSessions) {
        setSessions([]);
        setSessionsError(null);
        setLoadingSessions(false);

        return;
      }

      if (!signal?.aborted) {
        setLoadingSessions(true);
        setSessionsError(null);
      }

      try {
        const response = await fetch('/api/auth/sessions', { signal });
        const data = await response.json();

        if (!signal?.aborted && response.ok && data.success) {
          setSessions(data.data.sessions);
        } else if (!signal?.aborted) {
          setSessionsError(
            data.error?.message || 'Impossible de charger les sessions',
          );
        }
      } catch {
        if (!signal?.aborted) {
          setSessionsError('Impossible de charger les sessions');
        }
      } finally {
        if (!signal?.aborted) {
          setLoadingSessions(false);
        }
      }
    },
    [canManageSessions],
  );

  useEffect(() => {
    const controller = new AbortController();

    void fetchSessions(controller.signal);

    return (): void => {
      controller.abort();
    };
  }, [fetchSessions, userData.mfaEnabledAt]);

  useEffect(() => {
    const controller = new AbortController();

    void fetchMfaStatus(controller.signal);

    return (): void => {
      controller.abort();
    };
  }, [fetchMfaStatus, userData.mfaEnabledAt]);

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

  const handleMfaSetupComplete = async (
    data: MfaSetupConfirmationData,
  ): Promise<void> => {
    await onUpdate(data.user);
    await Promise.all([
      fetchMfaStatus(),
      ...(canManageSessions ? [fetchSessions()] : []),
    ]);
    setMfaSetupMode(null);
    toast.success(
      mfaSetupMode === 'replace'
        ? 'Application d’authentification remplacée'
        : 'Double authentification activée',
    );
  };

  const handleMfaActionComplete = async (
    updatedUser?: UserType,
  ): Promise<void> => {
    await onUpdate(updatedUser);
    await Promise.all([
      fetchMfaStatus(),
      ...(canManageSessions ? [fetchSessions()] : []),
    ]);
    setMfaActionMode(null);
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
    : sessionsError
      ? 'Indisponible'
      : currentSession
        ? getSessionTitle(currentSession)
        : 'Non détectée';
  const otherSessionsLabel = loadingSessions
    ? 'Chargement'
    : sessionsError
      ? 'Indisponible'
      : String(otherSessions.length);
  const canViewPasswordSecurity = canViewSecurity || canChangePassword;
  const canViewMfaSecurity = canViewSecurity || canManageMfa;
  const mfaEnabledAt =
    mfaStatus?.enabledAt ??
    (userData.mfaEnabledAt
      ? new Date(userData.mfaEnabledAt).toISOString()
      : null);
  const isMfaEnabled = !!mfaEnabledAt;
  const isMfaRequired = mfaStatus?.required ?? userData.isProtected;
  const mfaStatusLabel = loadingMfaStatus
    ? 'Chargement'
    : mfaStatusError
      ? 'Indisponible'
      : isMfaEnabled
        ? 'Active'
        : 'À activer';

  return (
    <>
      <div className="space-y-3">
        <div
          className={cn(
            'grid gap-3 sm:grid-cols-2',
            canViewPasswordSecurity && canViewMfaSecurity && canManageSessions
              ? 'xl:grid-cols-4'
              : 'xl:grid-cols-3',
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
          {canViewMfaSecurity && (
            <SecurityMetric
              description={
                isMfaEnabled
                  ? `Activée ${formatRelativeAccountTime(mfaEnabledAt)}`
                  : isMfaRequired
                    ? 'Obligatoire pour ce compte protégé'
                    : 'Protection supplémentaire disponible'
              }
              icon={<QrCode className="size-4" />}
              label="Double authentification"
              tone={isMfaEnabled ? 'primary' : 'warning'}
              value={mfaStatusLabel}
            />
          )}
          {canManageSessions && (
            <>
              <SecurityMetric
                icon={<Laptop className="size-4" />}
                label="Session actuelle"
                value={currentSessionLabel}
                description={
                  sessionsError
                    ? 'Impossible de charger les sessions'
                    : currentSession
                      ? `Active ${formatRelativeAccountTime(currentSession.lastSeenAt)}`
                      : 'Appareil utilisé maintenant'
                }
                tone={currentSession ? 'primary' : 'neutral'}
              />
              <SecurityMetric
                icon={<ShieldCheck className="size-4" />}
                label="Autres sessions"
                value={otherSessionsLabel}
                description={
                  sessionsError
                    ? 'Impossible de charger les sessions'
                    : otherSessions.length > 0
                      ? 'Appareils connectés à surveiller'
                      : 'Aucun autre appareil connecté'
                }
                tone={otherSessions.length > 0 ? 'warning' : 'primary'}
              />
            </>
          )}
        </div>
        {canViewPasswordSecurity && (
          <Card className="border-border/70 overflow-hidden rounded-md py-0">
            <CardHeader className="border-border/65 bg-surface-muted border-b p-3 sm:p-4">
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
                      className="border-warning/40 text-warning"
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
              <CardFooter className="border-border/65 bg-surface-muted justify-end border-t p-3 sm:p-4">
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
        {canViewMfaSecurity && (
          <Card className="border-border/70 overflow-hidden rounded-md py-0">
            <CardHeader className="border-border/65 bg-surface-muted border-b p-3 sm:p-4">
              <SectionTitle icon={<QrCode className="size-3.5" />}>
                Double authentification
              </SectionTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-3 sm:p-4">
              {loadingMfaStatus ? (
                <Skeleton className="h-32 rounded-md" />
              ) : mfaStatusError ? (
                <div
                  className="border-destructive/35 bg-destructive/10 text-destructive flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
                  role="alert"
                >
                  <span>{mfaStatusError}</span>
                  <Button
                    onClick={() => void fetchMfaStatus()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Réessayer
                  </Button>
                </div>
              ) : (
                <>
                  <div className="border-border/60 bg-popover space-y-3 rounded-md border p-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground text-sm">
                        État
                      </span>
                      <Badge
                        className={
                          isMfaEnabled
                            ? undefined
                            : 'border-warning/40 text-warning'
                        }
                        variant={isMfaEnabled ? 'secondary' : 'outline'}
                      >
                        {isMfaEnabled ? 'Active' : 'À activer'}
                      </Badge>
                    </div>
                    {mfaEnabledAt && (
                      <>
                        <Separator className="bg-border/60" />
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground text-sm">
                            Activée le
                          </span>
                          <span className="text-foreground text-right text-sm">
                            {formatSessionDateTime(mfaEnabledAt)}
                          </span>
                        </div>
                        <Separator className="bg-border/60" />
                        <div className="flex items-center justify-between gap-4">
                          <span className="text-muted-foreground text-sm">
                            Codes de secours disponibles
                          </span>
                          <span className="text-foreground text-sm font-semibold">
                            {mfaStatus?.recoveryCodesRemaining ?? '—'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  <div
                    className={cn(
                      'flex items-start gap-2 rounded-md border p-3 text-sm leading-6',
                      isMfaRequired && !isMfaEnabled
                        ? 'border-warning/30 bg-warning/10 text-warning'
                        : 'border-primary/25 bg-primary/[0.08] text-muted-foreground',
                    )}
                  >
                    <ShieldCheck className="text-primary-emphasis mt-1 size-4 shrink-0" />
                    <p>
                      {isMfaRequired
                        ? isMfaEnabled
                          ? 'Cette protection est obligatoire pour le compte superadmin et ne peut pas être désactivée.'
                          : 'Cette protection doit être activée pour continuer à utiliser le compte superadmin.'
                        : isMfaEnabled
                          ? 'Un code de votre application est demandé après le mot de passe.'
                          : 'Ajoutez une seconde preuve à votre mot de passe pour sécuriser vos connexions.'}
                    </p>
                  </div>
                  {isMfaEnabled && mfaStatus?.recoveryCodesRemaining === 0 && (
                    <div className="border-warning/30 bg-warning/10 text-warning rounded-md border p-3 text-sm leading-6">
                      Aucun code de secours n’est disponible. Générez-en de
                      nouveaux et conservez-les hors de votre téléphone.
                    </div>
                  )}
                </>
              )}
            </CardContent>
            {canManageMfa && !loadingMfaStatus && !mfaStatusError && (
              <CardFooter className="border-border/65 bg-surface-muted flex-wrap justify-end gap-2 border-t p-3 sm:p-4">
                {isMfaEnabled ? (
                  <>
                    <Button
                      className="gap-2"
                      onClick={() => setMfaActionMode('recovery-codes')}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <RefreshCw className="size-4" />
                      Nouveaux codes de secours
                    </Button>
                    <Button
                      className="gap-2"
                      onClick={() => setMfaSetupMode('replace')}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <QrCode className="size-4" />
                      Remplacer l’application
                    </Button>
                    {!isMfaRequired && (
                      <Button
                        className="gap-2"
                        onClick={() => setMfaActionMode('disable')}
                        size="sm"
                        type="button"
                        variant="destructive"
                      >
                        <ShieldOff className="size-4" />
                        Désactiver
                      </Button>
                    )}
                  </>
                ) : (
                  <Button
                    className="gap-2"
                    onClick={() => setMfaSetupMode('activate')}
                    size="sm"
                    type="button"
                  >
                    <QrCode className="size-4" />
                    Configurer l’application
                  </Button>
                )}
              </CardFooter>
            )}
          </Card>
        )}
        {canManageSessions && (
          <Card className="border-border/70 overflow-hidden rounded-md py-0">
            <CardHeader className="border-border/65 bg-surface-muted border-b p-3 sm:p-4">
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
              ) : sessionsError ? (
                <div
                  className="border-destructive/35 bg-destructive/10 text-destructive flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
                  role="alert"
                >
                  <span>{sessionsError}</span>
                  <Button
                    onClick={() => void fetchSessions()}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Réessayer
                  </Button>
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
                      <p className="text-muted-foreground text-xs font-medium uppercase">
                        Session actuelle
                      </p>
                      <SessionRow session={currentSession} />
                    </div>
                  )}
                  {otherSessions.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-muted-foreground text-xs font-medium uppercase">
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
              <CardFooter className="border-border/65 bg-surface-muted justify-end border-t p-3 sm:p-4">
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
        )}
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
      {mfaSetupMode && (
        <MfaSetupDialog
          loginName={userData.loginName}
          mode={mfaSetupMode}
          onCancel={() => setMfaSetupMode(null)}
          onComplete={handleMfaSetupComplete}
          open
        />
      )}
      {mfaActionMode && (
        <MfaActionDialog
          loginName={userData.loginName}
          mode={mfaActionMode}
          onCancel={() => setMfaActionMode(null)}
          onComplete={handleMfaActionComplete}
          open
        />
      )}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent className="border-border overflow-hidden rounded-md p-0">
          <div className="p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
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
