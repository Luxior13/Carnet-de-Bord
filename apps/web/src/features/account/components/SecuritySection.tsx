'use client';

import {
  AlertTriangle,
  KeyRound,
  Loader2,
  LogOut,
  Monitor,
  QrCode,
  RefreshCw,
  Shield,
  ShieldCheck,
} from 'lucide-react';
import React, {
  type FC,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import { ChangePasswordDialog } from '$components/ChangePasswordDialog';
import { MfaActionDialog } from '$features/auth/components/MfaActionDialog';
import { MfaSetupDialog } from '$features/auth/components/MfaSetupDialog';
import { RoutesApi } from '$types/api.types';
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
import { Button } from '$ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '$ui/card';
import { Separator } from '$ui/separator';
import { ServiceIcon } from '$ui/service-icon';
import { Skeleton } from '$ui/skeleton';
import { ApiClientError } from '$utils/api.utils';
import { cn } from '$utils/css.utils';

import { formatRelativeAccountTime } from '../account.utils';
import { accountSecurityRequest } from '../account-security-request';
import {
  formatSessionDateTime,
  getSessionTitle,
  type SessionInfo,
  SessionRow,
} from './AccountSessionRow';

type SecuritySectionProps = {
  canChangePassword: boolean;
  canManageMfa: boolean;
  canManageSessions: boolean;
  canViewSecurity: boolean;
  onUpdate: (updatedUser?: UserType) => Promise<void>;
  userData: UserType;
};

const focusSecurityHeading = (id: string): void => {
  const heading = document.getElementById(id);
  if (!heading?.getClientRects().length) return;
  heading.focus({ preventScroll: true });
  heading.scrollIntoView({
    behavior: 'instant',
    block: 'nearest',
    inline: 'nearest',
  });
};

const SectionTitle: FC<{
  children: React.ReactNode;
  icon: React.ReactNode;
  id: string;
}> = ({ children, icon, id }) => (
  <h3
    id={id}
    tabIndex={-1}
    className="text-foreground flex scroll-mt-16 items-center gap-2 text-sm font-semibold"
  >
    <ServiceIcon className="size-7">{icon}</ServiceIcon>
    {children}
  </h3>
);

const StatusBadge: FC<{
  label: string;
  tone: 'muted' | 'success' | 'warning';
}> = ({ label, tone }) => {
  const toneClassName =
    tone === 'warning'
      ? 'border-warning/40 bg-warning/15 text-warning'
      : tone === 'success'
        ? 'border-success/40 bg-success/15 text-success'
        : 'border-muted-foreground/35 bg-muted/30 text-muted-foreground';

  return (
    <span
      className={cn(
        'inline-flex w-fit shrink-0 items-center gap-1.5 rounded-[5px] border px-2 py-0.5 text-xs leading-5 font-medium whitespace-nowrap',
        toneClassName,
      )}
    >
      <span
        aria-hidden="true"
        className="size-1.5 shrink-0 rounded-full bg-current"
      />
      {label}
    </span>
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
  const lifetimeRef = useRef<AbortController | null>(null);
  const revokingRef = useRef(false);
  const sessionsRequestRef = useRef(0);
  const mfaRequestRef = useRef(0);
  const sessionsFocusRef = useRef(false);
  const mfaFocusRef = useRef(false);
  const sessionMutationRef = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    lifetimeRef.current = controller;
    // A later user action owns the focus, even if an earlier retry finishes.
    const cancelFocus = (): void => {
      sessionsFocusRef.current = false;
      mfaFocusRef.current = false;
    };
    document.addEventListener('pointerdown', cancelFocus, true);
    document.addEventListener('keydown', cancelFocus, true);
    document.addEventListener('wheel', cancelFocus, { passive: true });

    return (): void => {
      controller.abort();
      document.removeEventListener('pointerdown', cancelFocus, true);
      document.removeEventListener('keydown', cancelFocus, true);
      document.removeEventListener('wheel', cancelFocus);
    };
  }, []);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [mfaStatus, setMfaStatus] = useState<MfaStatus | null>(null);
  const [loadingMfaStatus, setLoadingMfaStatus] = useState(true);
  const [mfaStatusError, setMfaStatusError] = useState<string | null>(null);
  const [mfaSetupMode, setMfaSetupMode] = useState<
    'activate' | 'replace' | null
  >(null);
  const [showRecoveryCodesDialog, setShowRecoveryCodesDialog] = useState(false);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionsNotice, setSessionsNotice] = useState<string | null>(null);
  const [revokingAll, setRevokingAll] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [sessionToRevoke, setSessionToRevoke] = useState<SessionInfo | null>(
    null,
  );
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);

  const fetchMfaStatus = useCallback(
    async (signal = lifetimeRef.current?.signal): Promise<void> => {
      if (!signal || signal.aborted) return;
      const requestId = ++mfaRequestRef.current;
      const isCurrent = (): boolean =>
        !signal.aborted && requestId === mfaRequestRef.current;
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
        const data = await accountSecurityRequest<MfaStatus>(
          RoutesApi.mfa,
          signal,
          { cache: 'no-store' },
        );
        if (isCurrent()) setMfaStatus(data);
      } catch (failure) {
        if (isCurrent()) {
          if (
            failure instanceof ApiClientError &&
            [401, 403].includes(failure.status)
          )
            setMfaStatus(null);
          setMfaStatusError('Impossible de charger la double authentification');
        }
      } finally {
        if (isCurrent()) setLoadingMfaStatus(false);
      }
    },
    [canManageMfa, canViewSecurity],
  );

  const fetchSessions = useCallback(
    async (signal = lifetimeRef.current?.signal): Promise<void> => {
      if (!signal || signal.aborted) return;
      const requestId = ++sessionsRequestRef.current;
      const isCurrent = (): boolean =>
        !signal.aborted && requestId === sessionsRequestRef.current;
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
        const data = await accountSecurityRequest<{ sessions: SessionInfo[] }>(
          '/api/auth/sessions',
          signal,
          { cache: 'no-store' },
        );
        if (isCurrent()) setSessions(data.sessions);
      } catch (failure) {
        if (isCurrent()) {
          if (
            failure instanceof ApiClientError &&
            [401, 403].includes(failure.status)
          )
            setSessions([]);
          setSessionsError('Impossible de charger les sessions');
        }
      } finally {
        if (isCurrent()) {
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

  useEffect(() => {
    if (!loadingSessions && sessionsFocusRef.current) {
      sessionsFocusRef.current = false;
      focusSecurityHeading('account-sessions-heading');
    }
  }, [loadingSessions, sessionsError]);
  useEffect(() => {
    if (!loadingMfaStatus && mfaFocusRef.current) {
      mfaFocusRef.current = false;
      focusSecurityHeading('account-mfa-heading');
    }
  }, [loadingMfaStatus, mfaStatusError]);

  const handleRevokeSession = async (sessionId?: string): Promise<void> => {
    const signal = lifetimeRef.current?.signal;
    if (!canManageSessions || !signal || signal.aborted || revokingRef.current)
      return;
    revokingRef.current = true;
    sessionMutationRef.current = true;
    let reload = false;
    try {
      setSessionsNotice(null);
      if (sessionId) setRevokingId(sessionId);
      else setRevokingAll(true);
      await accountSecurityRequest<null>(
        sessionId
          ? `/api/auth/sessions?id=${encodeURIComponent(sessionId)}`
          : '/api/auth/sessions',
        signal,
        { method: 'DELETE' },
      );
      if (signal.aborted) return;
      toast.success(
        sessionId
          ? 'Session déconnectée'
          : 'Toutes les autres sessions ont été déconnectées',
      );
      reload = true;
    } catch (failure) {
      if (signal.aborted) return;
      if (
        failure instanceof ApiClientError &&
        [401, 403].includes(failure.status)
      ) {
        setSessions([]);
        setSessionsError(
          'Votre accès aux sessions doit être vérifié. Rechargez la liste avant de continuer.',
        );
      } else if (
        !(failure instanceof ApiClientError) ||
        failure.status >= 500 ||
        failure.code === 'INVALID_RESPONSE'
      ) {
        setSessionsNotice(
          'La réponse n’a pas pu être confirmée. Vérifiez les sessions restantes avant de recommencer.',
        );
        reload = true;
      } else if (failure.status === 404) {
        setSessionsNotice(
          'Cette session n’est plus disponible. Vérifiez les sessions restantes avant de continuer.',
        );
        reload = true;
      } else {
        toast.error(failure.message);
      }
    } finally {
      // A completed mutation must not leave its modal locked on a later GET.
      if (!signal.aborted) {
        setRevokingAll(false);
        setRevokingId(null);
        setShowRevokeDialog(false);
        setSessionToRevoke(null);
      }
      if (!signal.aborted && reload) {
        await fetchSessions();
      }
      revokingRef.current = false;
    }
  };

  const handleMfaSetupComplete = async (
    data: MfaSetupConfirmationData,
  ): Promise<void> => {
    if (lifetimeRef.current?.signal.aborted) return;
    await onUpdate(data.user);
    if (lifetimeRef.current?.signal.aborted) return;
    await Promise.all([
      fetchMfaStatus(),
      ...(canManageSessions ? [fetchSessions()] : []),
    ]);
    if (lifetimeRef.current?.signal.aborted) return;
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
    if (lifetimeRef.current?.signal.aborted) return;
    await onUpdate(updatedUser);
    if (lifetimeRef.current?.signal.aborted) return;
    await Promise.all([
      fetchMfaStatus(),
      ...(canManageSessions ? [fetchSessions()] : []),
    ]);
    if (lifetimeRef.current?.signal.aborted) return;
    setShowRecoveryCodesDialog(false);
  };

  const currentSession = sessions.find((session) => session.isCurrent);
  const otherSessions = sessions.filter((session) => !session.isCurrent);
  const passwordChangedLabel = userData.passwordChangedAt
    ? formatRelativeAccountTime(userData.passwordChangedAt)
    : 'Jamais';
  const canViewPasswordSecurity = canViewSecurity || canChangePassword;
  const canViewMfaSecurity = canViewSecurity || canManageMfa;
  const mfaEnabledAt = mfaStatus
    ? mfaStatus.enabledAt
    : userData.mfaEnabledAt
      ? new Date(userData.mfaEnabledAt).toISOString()
      : null;
  const isMfaEnabled = !!mfaEnabledAt;
  const isMfaRequired = mfaStatus?.required ?? true;

  return (
    <>
      <section aria-labelledby="account-security-heading" className="space-y-3">
        <header className="space-y-1 px-1">
          <h2
            id="account-security-heading"
            className="text-foreground text-base leading-6 font-semibold"
          >
            Sécurité
          </h2>
          <p className="text-muted-foreground text-sm">
            Protégez votre accès et contrôlez les appareils connectés.
          </p>
        </header>
        {canViewPasswordSecurity && (
          <Card aria-labelledby="account-password-heading" className="min-w-0">
            <CardHeader className="p-4 sm:p-5">
              <SectionTitle
                icon={<KeyRound className="size-3.5" />}
                id="account-password-heading"
              >
                Mot de passe
              </SectionTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 sm:p-5">
              <div className="border-border/60 bg-surface-inset space-y-3 rounded-md border p-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground text-sm">État</span>
                  {userData.mustChangePassword ? (
                    <StatusBadge label="À changer" tone="warning" />
                  ) : (
                    <StatusBadge label="À jour" tone="success" />
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
                {userData.failedLoginAttempts > 0 && (
                  <>
                    <Separator className="bg-border/60" />
                    <div className="flex items-start justify-between gap-4">
                      <span className="text-muted-foreground text-sm">
                        Connexions refusées
                      </span>
                      <span className="text-warning text-right text-sm font-medium">
                        {userData.failedLoginAttempts}{' '}
                        {userData.failedLoginAttempts > 1
                          ? 'tentatives échouées actuellement comptabilisées'
                          : 'tentative échouée actuellement comptabilisée'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
            {canChangePassword && (
              <CardFooter className="justify-end p-4 sm:p-5">
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
          <Card
            aria-busy={loadingMfaStatus}
            aria-labelledby="account-mfa-heading"
            className="min-w-0"
          >
            <CardHeader className="p-4 sm:p-5">
              <SectionTitle
                icon={<QrCode className="size-3.5" />}
                id="account-mfa-heading"
              >
                Application d’authentification
              </SectionTitle>
            </CardHeader>
            <CardContent className="space-y-3 p-4 sm:p-5">
              {loadingMfaStatus ? (
                <div aria-live="polite" role="status">
                  <span className="sr-only">
                    Chargement de la double authentification
                  </span>
                  <Skeleton className="h-32 rounded-md" />
                </div>
              ) : mfaStatusError ? (
                <div
                  className="border-destructive/35 bg-destructive/10 text-destructive flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
                  role="alert"
                >
                  <span>{mfaStatusError}</span>
                  <Button
                    onClick={() => {
                      mfaFocusRef.current = true;
                      void fetchMfaStatus();
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Réessayer
                  </Button>
                </div>
              ) : (
                <>
                  <div className="border-border/60 bg-surface-inset space-y-3 rounded-md border p-3">
                    <div className="flex items-center justify-between gap-4">
                      <span className="text-muted-foreground text-sm">
                        État
                      </span>
                      {isMfaEnabled ? (
                        <StatusBadge label="Active" tone="success" />
                      ) : (
                        <StatusBadge label="À activer" tone="warning" />
                      )}
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
                      {isMfaEnabled
                        ? 'Cette protection est obligatoire pour tous les comptes et ne peut pas être désactivée.'
                        : 'Cette protection doit être configurée avant de pouvoir accéder au site.'}
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
                      id="account-mfa-recovery"
                      onClick={() => setShowRecoveryCodesDialog(true)}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <RefreshCw className="size-4" />
                      Nouveaux codes de secours
                    </Button>
                    <Button
                      className="gap-2"
                      id="account-mfa-configure"
                      onClick={() => setMfaSetupMode('replace')}
                      size="sm"
                      type="button"
                      variant="outline"
                    >
                      <QrCode className="size-4" />
                      Changer d’application
                    </Button>
                  </>
                ) : (
                  <Button
                    className="gap-2"
                    id="account-mfa-configure"
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
          <Card
            aria-busy={loadingSessions}
            aria-labelledby="account-sessions-heading"
            className="min-w-0"
          >
            <CardHeader className="p-4 sm:p-5">
              <SectionTitle
                icon={<Monitor className="size-3.5" />}
                id="account-sessions-heading"
              >
                Sessions actives
              </SectionTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-3 sm:p-4">
              {sessionsNotice && (
                <p
                  className="border-warning/30 bg-warning/10 text-warning rounded-md border p-3 text-sm leading-6"
                  role="status"
                >
                  {sessionsNotice}
                </p>
              )}
              {loadingSessions ? (
                <div aria-live="polite" className="space-y-2" role="status">
                  <span className="sr-only">
                    Chargement des sessions actives
                  </span>
                  <Skeleton className="h-24 rounded-md" />
                  <Skeleton className="h-24 rounded-md" />
                </div>
              ) : sessionsError ? (
                <div
                  className="border-destructive/35 bg-destructive/10 text-destructive flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
                  role="alert"
                >
                  <span>{sessionsError}</span>
                  <Button
                    onClick={() => {
                      sessionsFocusRef.current = true;
                      void fetchSessions();
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                  >
                    Réessayer
                  </Button>
                </div>
              ) : sessions.length === 0 ? (
                <div className="border-border/60 bg-surface-inset rounded-md border p-3">
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
                            disabled={revokingAll || revokingId !== null}
                            onRevoke={setSessionToRevoke}
                          />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="border-border/60 bg-surface-inset rounded-md border p-3">
                      <p className="text-muted-foreground text-sm">
                        Aucune autre session active.
                      </p>
                    </div>
                  )}
                </>
              )}
            </CardContent>
            {!loadingSessions && !sessionsError && otherSessions.length > 0 && (
              <CardFooter className="justify-end p-4 sm:p-5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={() => setShowRevokeDialog(true)}
                  disabled={revokingAll || revokingId !== null}
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
      </section>
      <ChangePasswordDialog
        open={showPasswordDialog}
        onCancel={() => setShowPasswordDialog(false)}
        onSuccess={async () => {
          if (lifetimeRef.current?.signal.aborted) return;
          await onUpdate();
          if (lifetimeRef.current?.signal.aborted) return;
          if (canManageSessions) await fetchSessions();
          if (lifetimeRef.current?.signal.aborted) return;
          setShowPasswordDialog(false);
          toast.success('Mot de passe modifié avec succès');
        }}
      />
      {mfaSetupMode && (
        <MfaSetupDialog
          mode={mfaSetupMode}
          onCancel={() => setMfaSetupMode(null)}
          onCloseAutoFocus={(event) => {
            if (lifetimeRef.current?.signal.aborted) return;
            const target =
              document.getElementById('account-mfa-configure') ??
              document.getElementById('account-mfa-heading');
            if (target) {
              event.preventDefault();
              target.focus();
            }
          }}
          onComplete={handleMfaSetupComplete}
          open
        />
      )}
      {showRecoveryCodesDialog && (
        <MfaActionDialog
          onCancel={() => setShowRecoveryCodesDialog(false)}
          onCloseAutoFocus={(event) => {
            if (lifetimeRef.current?.signal.aborted) return;
            const target =
              document.getElementById('account-mfa-recovery') ??
              document.getElementById('account-mfa-heading');
            if (target) {
              event.preventDefault();
              target.focus();
            }
          }}
          onComplete={handleMfaActionComplete}
          open
        />
      )}
      <AlertDialog
        open={sessionToRevoke !== null}
        onOpenChange={(open) => {
          if (!open && !revokingId) setSessionToRevoke(null);
        }}
      >
        <AlertDialogContent
          className="overflow-y-auto p-0"
          onCloseAutoFocus={(event) => {
            if (sessionMutationRef.current) {
              event.preventDefault();
              sessionMutationRef.current = false;
              focusSecurityHeading('account-sessions-heading');
            }
          }}
        >
          <div className="p-6">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-foreground flex items-center gap-2">
                <div className="bg-destructive/10 flex h-8 w-8 items-center justify-center rounded-lg">
                  <AlertTriangle size={16} className="text-destructive" />
                </div>
                Déconnecter cet appareil ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                {sessionToRevoke
                  ? `${getSessionTitle(sessionToRevoke)} ne pourra plus utiliser cette session.`
                  : 'Cette session sera immédiatement déconnectée.'}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="mt-4">
              <AlertDialogCancel disabled={!!revokingId}>
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  if (sessionToRevoke) {
                    void handleRevokeSession(sessionToRevoke.id);
                  }
                }}
                disabled={!sessionToRevoke || !!revokingId}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {revokingId && <Loader2 className="size-4 animate-spin" />}
                Déconnecter
              </AlertDialogAction>
            </AlertDialogFooter>
          </div>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={showRevokeDialog}
        onOpenChange={(open) => {
          if (!revokingRef.current) setShowRevokeDialog(open);
        }}
      >
        <AlertDialogContent
          className="overflow-y-auto p-0"
          onCloseAutoFocus={(event) => {
            if (sessionMutationRef.current) {
              event.preventDefault();
              sessionMutationRef.current = false;
              focusSecurityHeading('account-sessions-heading');
            }
          }}
        >
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
              <AlertDialogCancel disabled={revokingAll}>
                Annuler
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(event) => {
                  event.preventDefault();
                  void handleRevokeSession();
                }}
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
