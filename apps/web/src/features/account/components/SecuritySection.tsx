'use client';

import { KeyRound, QrCode, RefreshCw, Shield, ShieldCheck } from 'lucide-react';
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
import { Button } from '$ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '$ui/card';
import { Skeleton } from '$ui/skeleton';
import { StatusBadge } from '$ui/status-badge';
import { ApiClientError } from '$utils/api.utils';
import { cn } from '$utils/css.utils';
import { securityRequest } from '$utils/security-request.utils';
import { formatSessionDateTime } from '$utils/session-display.utils';

import { formatRelativeAccountTime } from '../account.utils';
import {
  AccountSessionsCard,
  type AccountSessionsHandle,
} from './AccountSessionsCard';
import { focusSecurityHeading, SecurityCardTitle } from './SecurityCardTitle';

type SecuritySectionProps = {
  canChangePassword: boolean;
  canManageMfa: boolean;
  canManageSessions: boolean;
  canViewSecurity: boolean;
  onUpdate: (updatedUser?: UserType) => Promise<void>;
  userData: UserType;
};

/** Password, double authentication and sessions of the signed-in account. */
export const SecuritySection: FC<SecuritySectionProps> = ({
  canChangePassword,
  canManageMfa,
  canManageSessions,
  canViewSecurity,
  onUpdate,
  userData,
}) => {
  const lifetimeRef = useRef<AbortController | null>(null);
  const sessionsRef = useRef<AccountSessionsHandle>(null);
  const mfaRequestRef = useRef(0);
  const mfaFocusRef = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    lifetimeRef.current = controller;
    // A later user action owns the focus, even if an earlier retry finishes.
    const cancelFocus = (): void => {
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
        const data = await securityRequest<MfaStatus>(RoutesApi.mfa, signal, {
          cache: 'no-store',
        });
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

  const reloadSessions = async (): Promise<void> => {
    if (canManageSessions) await sessionsRef.current?.reload();
  };

  useEffect(() => {
    const controller = new AbortController();

    void fetchMfaStatus(controller.signal);

    return (): void => {
      controller.abort();
    };
  }, [fetchMfaStatus, userData.mfaEnabledAt]);

  useEffect(() => {
    if (!loadingMfaStatus && mfaFocusRef.current) {
      mfaFocusRef.current = false;
      focusSecurityHeading('account-mfa-heading');
    }
  }, [loadingMfaStatus, mfaStatusError]);

  const handleMfaSetupComplete = async (
    data: MfaSetupConfirmationData,
  ): Promise<void> => {
    if (lifetimeRef.current?.signal.aborted) return;
    await onUpdate(data.user);
    if (lifetimeRef.current?.signal.aborted) return;
    await Promise.all([fetchMfaStatus(), reloadSessions()]);
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
    await Promise.all([fetchMfaStatus(), reloadSessions()]);
    if (lifetimeRef.current?.signal.aborted) return;
    setShowRecoveryCodesDialog(false);
  };

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
        <h2 className="sr-only" id="account-security-heading">
          Sécurité
        </h2>
        {canViewPasswordSecurity && (
          <Card aria-labelledby="account-password-heading" className="min-w-0">
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 p-3.5 sm:p-4">
              <SecurityCardTitle
                icon={<KeyRound className="size-3.5" />}
                id="account-password-heading"
              >
                Mot de passe
              </SecurityCardTitle>
              {userData.mustChangePassword ? (
                <StatusBadge tone="warning">À changer</StatusBadge>
              ) : (
                <StatusBadge tone="success">À jour</StatusBadge>
              )}
            </CardHeader>
            <CardContent className="flex flex-col items-stretch gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <p className="text-foreground min-w-0 flex-1 text-sm">
                Dernier changement : {passwordChangedLabel}
              </p>
              {canChangePassword && (
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
              )}
            </CardContent>
          </Card>
        )}
        {canViewMfaSecurity && (
          <Card
            aria-busy={loadingMfaStatus}
            aria-labelledby="account-mfa-heading"
            className="min-w-0"
          >
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 p-3.5 sm:p-4">
              <SecurityCardTitle
                icon={<QrCode className="size-3.5" />}
                id="account-mfa-heading"
              >
                Double authentification
              </SecurityCardTitle>
              {!loadingMfaStatus &&
                !mfaStatusError &&
                (isMfaEnabled ? (
                  <StatusBadge tone="success">Activée</StatusBadge>
                ) : (
                  <StatusBadge tone="warning">À configurer</StatusBadge>
                ))}
            </CardHeader>
            <CardContent className="space-y-3 p-3 sm:p-4">
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
                  {mfaEnabledAt && (
                    <p className="text-foreground flex flex-wrap gap-x-4 gap-y-1 text-sm">
                      <span>
                        Activée le {formatSessionDateTime(mfaEnabledAt)}
                      </span>
                      <span>
                        Codes de secours disponibles :{' '}
                        <span className="font-semibold">
                          {mfaStatus?.recoveryCodesRemaining ?? '—'}
                        </span>
                      </span>
                    </p>
                  )}

                  <div
                    className={cn(
                      'flex items-start gap-2 text-sm leading-6',
                      isMfaRequired && !isMfaEnabled
                        ? 'border-warning/30 bg-warning/10 text-warning rounded-md border p-3'
                        : 'text-muted-foreground',
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
              <CardFooter className="border-border/65 bg-surface-muted flex-col items-stretch gap-2 border-t p-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:p-4">
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
          <AccountSessionsCard
            mfaEnabledAt={userData.mfaEnabledAt}
            ref={sessionsRef}
          />
        )}
      </section>
      <ChangePasswordDialog
        open={showPasswordDialog}
        onCancel={() => setShowPasswordDialog(false)}
        onSuccess={async () => {
          if (lifetimeRef.current?.signal.aborted) return;
          await onUpdate();
          if (lifetimeRef.current?.signal.aborted) return;
          await reloadSessions();
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
    </>
  );
};
