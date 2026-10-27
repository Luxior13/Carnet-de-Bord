'use client';

import {
  AlertTriangle,
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  Monitor,
  Power,
  QrCode,
  RotateCcw,
} from 'lucide-react';
import React, { type FC, useEffect, useRef, useState } from 'react';

import { RubricTitle } from '$components/layout/RubricCard';
import { SectionActionBar } from '$components/layout/SectionActionBar';
import { SessionRow } from '$components/users/SessionRow';
import { UserStatusBadge } from '$features/users/user-badges';
import type { UserSessionInfo, UserType } from '$types/auth.types';
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
import { Label } from '$ui/label';
import { Skeleton } from '$ui/skeleton';
import { StatusBadge } from '$ui/status-badge';
import { Switch } from '$ui/switch';
import { cn } from '$utils/css.utils';
import { describeUserAgent } from '$utils/session-display.utils';

import { focusUserSecurityElement } from './user-security-focus';
import { UserDeletionCard } from './UserDeletionCard';

type UserSecurityTabProps = {
  canEditStatus: boolean;
  canRequestDeleteUser: boolean;
  canResetMfa: boolean;
  canResetPassword: boolean;
  canRevokeSessions: boolean;
  canSaveStatus: boolean;
  canViewSessions: boolean;
  currentUserId: string | undefined;
  deletionBlocked?: boolean;
  hasStatusChanges: boolean;
  isActive: boolean;
  isLoadingSessions: boolean;
  isRefreshing?: boolean;
  isRevokingSessionId: string | null;
  isRevokingSessions: boolean;
  isSaving: boolean;
  onCancelStatus: () => void;
  onDeleteUser: () => void;
  onResetMfa: () => void;
  onResetPassword: () => void;
  onRetrySessions: () => Promise<void> | void;
  onRevokeSession: (sessionId: string) => Promise<void> | void;
  onRevokeSessions: () => void;
  onSaveStatus: () => void;
  /** Reset result shown in the Password card in place of its reset action. */
  passwordResetFeedback?: React.ReactNode;
  sessions: UserSessionInfo[];
  sessionsError: string | null;
  sessionsNotice?: string | null;
  setIsActive: (isActive: boolean) => void;
  user: UserType;
};

const toValidDate = (date: Date | string | null): Date | null => {
  if (!date) return null;

  const parsedDate = new Date(date);

  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
};

const formatDate = (date: Date | string | null): string => {
  const parsedDate = toValidDate(date);

  if (!parsedDate) return 'Jamais';

  return parsedDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

/** Rubric header with its state badge, and the row under it (27 October 2026). */
const RUBRIC_HEADER =
  'flex-row flex-wrap items-center justify-between gap-2 p-3.5 sm:p-4';
const RUBRIC_ROW =
  'flex flex-col items-stretch gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4';

export const UserSecurityTab: FC<UserSecurityTabProps> = ({
  canEditStatus,
  canRequestDeleteUser,
  canResetMfa,
  canResetPassword,
  canRevokeSessions,
  canSaveStatus,
  canViewSessions,
  currentUserId,
  deletionBlocked = false,
  hasStatusChanges,
  isActive,
  isLoadingSessions,
  isRefreshing = false,
  isRevokingSessionId,
  isRevokingSessions,
  isSaving,
  onCancelStatus,
  onDeleteUser,
  onResetMfa,
  onResetPassword,
  onRetrySessions,
  onRevokeSession,
  onRevokeSessions,
  onSaveStatus,
  passwordResetFeedback,
  sessions,
  sessionsError,
  sessionsNotice,
  setIsActive,
  user,
}) => {
  const sectionRef = useRef<HTMLElement>(null);
  const activeSwitchRef = useRef<HTMLButtonElement>(null);
  const wasStatusSaving = useRef(false);
  const focusIntentRef = useRef(0);
  const revocationRef = useRef(false);
  const revocationFocusRef = useRef(false);
  useEffect(() => {
    const finished = wasStatusSaving.current && !isSaving;
    wasStatusSaving.current =
      isSaving && (hasStatusChanges || wasStatusSaving.current);
    if (
      finished &&
      document.activeElement === document.body &&
      !activeSwitchRef.current?.disabled &&
      !document.querySelector(
        '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
      )
    )
      focusUserSecurityElement(activeSwitchRef.current);
  }, [hasStatusChanges, isSaving]);
  useEffect(() => {
    const cancel = (): void => {
      focusIntentRef.current += 1;
    };
    document.addEventListener('pointerdown', cancel, true);
    document.addEventListener('keydown', cancel, true);
    document.addEventListener('wheel', cancel, { passive: true });

    return (): void => {
      cancel();
      document.removeEventListener('pointerdown', cancel, true);
      document.removeEventListener('keydown', cancel, true);
      document.removeEventListener('wheel', cancel);
    };
  }, []);
  const handleCancelStatus = (): void => {
    onCancelStatus();
    requestAnimationFrame(() => activeSwitchRef.current?.focus());
  };
  const focusSessions = (): void => {
    const intent = focusIntentRef.current;
    requestAnimationFrame(() => {
      if (
        intent !== focusIntentRef.current ||
        document.querySelector('[role="dialog"][data-state="open"]')
      )
        return;
      const remainingButton =
        sectionRef.current?.querySelector<HTMLButtonElement>(
          '[data-retry-sessions]:not(:disabled)',
        );
      const heading = sectionRef.current?.querySelector<HTMLElement>(
        '#user-security-sessions-heading',
      );
      const target = remainingButton ?? heading;
      focusUserSecurityElement(target ?? null);
    });
  };
  const retrySessions = async (): Promise<void> => {
    const intent = ++focusIntentRef.current;
    await onRetrySessions();
    if (intent === focusIntentRef.current) focusSessions();
  };
  const isSelf = currentUserId === user.id;
  const passwordChangedLabel = user.passwordChangedAt
    ? formatDate(user.passwordChangedAt)
    : 'Jamais';
  const isAnySessionRevoking =
    isRevokingSessions || isRevokingSessionId !== null;
  const sessionsUnavailable =
    isAnySessionRevoking || isLoadingSessions || !!sessionsError;
  const isMfaEnabled = user.mfaEnabledAt !== null;
  const [sessionPendingRevocation, setSessionPendingRevocation] =
    useState<UserSessionInfo | null>(null);
  const pendingSessionAgent = sessionPendingRevocation
    ? describeUserAgent(sessionPendingRevocation.userAgent)
    : null;

  return (
    <section
      ref={sectionRef}
      aria-busy={isLoadingSessions || isAnySessionRevoking}
      aria-labelledby="user-security-heading"
      className="space-y-3"
    >
      <h2 id="user-security-heading" className="sr-only">
        Sécurité du compte
      </h2>
      <Card aria-labelledby="user-security-status-heading">
        <CardHeader className="p-3.5 sm:p-4">
          <RubricTitle
            id="user-security-status-heading"
            icon={<Power className="size-3.5" />}
          >
            État du compte
          </RubricTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1">
            <Label
              htmlFor="user-active-switch"
              className="text-foreground text-sm font-medium"
            >
              Compte actif
            </Label>
            <div className="flex items-center gap-2">
              <UserStatusBadge isActive={isActive} />
              <Switch
                id="user-active-switch"
                ref={activeSwitchRef}
                checked={isActive}
                onCheckedChange={setIsActive}
                disabled={!canEditStatus || isSelf || isSaving}
                aria-describedby="user-active-switch-description"
              />
            </div>
            <p
              id="user-active-switch-description"
              className={cn(
                'col-span-2 text-xs',
                isActive ? 'text-muted-foreground' : 'text-destructive',
              )}
            >
              {!isActive
                ? 'L’utilisateur ne pourra plus se connecter et toutes ses sessions seront fermées.'
                : user.isActive
                  ? 'L’utilisateur peut se connecter normalement.'
                  : 'L’utilisateur pourra de nouveau se connecter. Les anciennes sessions resteront fermées.'}
            </p>
          </div>
          {isSelf && (
            <div className="text-muted-foreground border-warning/25 bg-warning/10 flex items-start gap-2 rounded-md border px-3 py-2 text-xs">
              <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" />
              Vous ne pouvez pas désactiver votre propre compte depuis cette
              fiche.
            </div>
          )}
          {!canEditStatus && !isSelf && (
            <div className="text-muted-foreground border-border/60 bg-surface-muted flex items-start gap-2 rounded-md border px-3 py-2 text-xs">
              <LockKeyhole className="mt-0.5 size-3.5 shrink-0" />
              Vous n’avez pas l’autorisation de modifier l’état de ce compte.
            </div>
          )}
        </CardContent>
      </Card>
      {user.securityDetailsVisible === false ? (
        <Card>
          <CardContent className="text-muted-foreground p-4 text-sm">
            Informations de sécurité masquées — permission requise.
          </CardContent>
        </Card>
      ) : (
        <>
          <Card aria-labelledby="user-security-password-heading">
            <CardHeader className={RUBRIC_HEADER}>
              <RubricTitle
                id="user-security-password-heading"
                icon={<KeyRound className="size-3.5" />}
              >
                Mot de passe
              </RubricTitle>
              {user.mustChangePassword ? (
                <StatusBadge tone="warning">À changer</StatusBadge>
              ) : (
                <StatusBadge tone="success">À jour</StatusBadge>
              )}
            </CardHeader>
            <CardContent className={RUBRIC_ROW}>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-foreground text-sm">
                  Dernier changement : {passwordChangedLabel}
                </p>
                {!passwordResetFeedback && canResetPassword && (
                  <p
                    id="user-reset-password-description"
                    className="text-muted-foreground text-xs"
                  >
                    Génère un mot de passe temporaire et ferme toutes les
                    sessions.
                  </p>
                )}
              </div>
              {!passwordResetFeedback && canResetPassword && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onResetPassword}
                  id="user-reset-password"
                  aria-describedby="user-reset-password-description"
                  disabled={isSaving}
                  className="h-auto min-h-10 w-full shrink-0 gap-2 whitespace-normal sm:w-auto"
                >
                  <RotateCcw className="h-4 w-4" />
                  Réinitialiser le mot de passe
                </Button>
              )}
            </CardContent>
            {passwordResetFeedback}
          </Card>
          <Card aria-labelledby="user-security-mfa-heading">
            <CardHeader className={RUBRIC_HEADER}>
              <RubricTitle
                id="user-security-mfa-heading"
                icon={<QrCode className="size-3.5" />}
              >
                Double authentification
              </RubricTitle>
              {isMfaEnabled ? (
                <StatusBadge tone="success">Activée</StatusBadge>
              ) : (
                <StatusBadge tone="warning">
                  Configuration obligatoire
                </StatusBadge>
              )}
            </CardHeader>
            <CardContent className={RUBRIC_ROW}>
              <div className="min-w-0 flex-1 space-y-1">
                <p className="text-foreground text-sm">
                  {isMfaEnabled
                    ? `Activée le ${formatDate(user.mfaEnabledAt)}`
                    : 'L’accès au site reste bloqué jusqu’à la configuration d’une application d’authentification.'}
                </p>
                {isMfaEnabled && (
                  <p
                    id="user-reset-mfa-description"
                    className="text-muted-foreground text-xs"
                  >
                    À utiliser seulement si l&apos;utilisateur a perdu son
                    application d&apos;authentification et tous ses codes de
                    secours : il la reconfigurera à sa prochaine connexion.
                  </p>
                )}
              </div>
              {canResetMfa && (
                <Button
                  className="border-warning/40 text-warning hover:bg-warning/10 hover:text-warning h-auto min-h-10 w-full min-w-0 shrink-0 gap-2 whitespace-normal sm:w-auto"
                  onClick={onResetMfa}
                  id="user-reset-mfa"
                  aria-describedby="user-reset-mfa-description"
                  disabled={isSaving}
                  size="sm"
                  type="button"
                  variant="outline"
                >
                  <RotateCcw className="size-4" />
                  Réinitialiser la double authentification
                </Button>
              )}
            </CardContent>
          </Card>
        </>
      )}
      <Card aria-labelledby="user-security-sessions-heading">
        <CardHeader className="p-3.5 sm:p-4">
          <RubricTitle
            id="user-security-sessions-heading"
            icon={<Monitor className="size-3.5" />}
          >
            Sessions actives
          </RubricTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3 sm:p-4">
          {sessionsNotice && (
            <p
              role="status"
              className="border-warning/30 bg-warning/10 text-warning rounded-md border p-3 text-sm leading-6"
            >
              {sessionsNotice}
            </p>
          )}
          {!canViewSessions ? (
            <div className="border-border/60 bg-surface-inset rounded-md border p-3">
              <p className="text-muted-foreground text-sm">
                Vous n&apos;avez pas la permission de consulter ou révoquer les
                sessions de cet utilisateur.
              </p>
            </div>
          ) : isLoadingSessions && sessions.length === 0 ? (
            <div className="space-y-2" role="status">
              <span className="sr-only">Chargement des sessions actives</span>
              <Skeleton className="h-16 rounded-md" />
              <Skeleton className="h-16 rounded-md" />
            </div>
          ) : sessionsError && sessions.length === 0 ? (
            <div
              className="border-destructive/35 bg-destructive/10 text-destructive flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
              role="alert"
            >
              <span>{sessionsError}</span>
              <Button
                data-retry-sessions
                loading={isLoadingSessions}
                onClick={() => void retrySessions()}
                size="sm"
                variant="outline"
              >
                <RotateCcw className="size-4" />
                Réessayer
              </Button>
            </div>
          ) : sessions.length === 0 ? (
            <div className="border-border/60 bg-surface-inset rounded-md border p-3">
              <p className="text-muted-foreground text-sm">
                Aucune session active.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessionsError && (
                <div
                  className="border-destructive/35 bg-destructive/10 text-destructive flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
                  role="alert"
                >
                  <span>{sessionsError}</span>
                  <Button
                    data-retry-sessions
                    loading={isLoadingSessions}
                    onClick={() => void retrySessions()}
                    size="sm"
                    variant="outline"
                  >
                    <RotateCcw className="size-4" />
                    Réessayer
                  </Button>
                </div>
              )}
              {sessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  action={
                    canRevokeSessions
                      ? {
                          ariaLabel: `Révoquer la session ${describeUserAgent(session.userAgent).label}`,
                          disabled: sessionsUnavailable,
                          label:
                            isRevokingSessionId === session.id
                              ? 'Révocation…'
                              : 'Révoquer',
                          onClick: () => setSessionPendingRevocation(session),
                          pending: isRevokingSessionId === session.id,
                        }
                      : undefined
                  }
                />
              ))}
            </div>
          )}
        </CardContent>
        {canRevokeSessions && sessions.length > 0 && (
          <CardFooter className="justify-end p-3 sm:p-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRevokeSessions}
              disabled={sessionsUnavailable}
              className="gap-2"
            >
              {isRevokingSessions ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Révoquer toutes les sessions
            </Button>
          </CardFooter>
        )}
      </Card>
      {canRequestDeleteUser && (
        <UserDeletionCard
          canEditStatus={canEditStatus}
          blocked={deletionBlocked}
          hasStatusChanges={hasStatusChanges}
          isSaving={isSaving}
          onDeleteUser={onDeleteUser}
          userIsActive={user.isActive}
        />
      )}
      {canEditStatus && !isSelf && hasStatusChanges && (
        <SectionActionBar
          hasChanges={hasStatusChanges}
          isResolvingConflict={isRefreshing}
          isSaving={isSaving && !isRefreshing}
          label="Enregistrement de l’état du compte"
          onCancel={handleCancelStatus}
          onSave={onSaveStatus}
          saveDisabled={!canSaveStatus}
          saveLabel={isActive ? 'Réactiver le compte' : 'Désactiver le compte'}
        />
      )}
      <AlertDialog
        open={sessionPendingRevocation !== null}
        onOpenChange={(open) => {
          if (!open && !revocationRef.current)
            setSessionPendingRevocation(null);
        }}
      >
        <AlertDialogContent
          onCloseAutoFocus={(event) => {
            if (!revocationFocusRef.current) return;
            revocationFocusRef.current = false;
            event.preventDefault();
            focusSessions();
          }}
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Révoquer cette session ?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSessionAgent
                ? pendingSessionAgent.label
                : 'Cette session'}{' '}
              sera immédiatement déconnectée. L&apos;utilisateur devra saisir de
              nouveau ses identifiants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isAnySessionRevoking}>
              Conserver la session
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isAnySessionRevoking}
              onClick={(event) => {
                event.preventDefault();
                const sessionId = sessionPendingRevocation?.id;
                if (!sessionId || revocationRef.current) return;
                revocationRef.current = true;
                revocationFocusRef.current = true;
                void Promise.resolve(onRevokeSession(sessionId)).finally(() => {
                  revocationRef.current = false;
                  setSessionPendingRevocation(null);
                });
              }}
            >
              Révoquer la session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
