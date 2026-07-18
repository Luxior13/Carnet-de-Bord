'use client';

import {
  AlertTriangle,
  ChevronDown,
  Clipboard,
  KeyRound,
  Laptop,
  Loader2,
  LogOut,
  Monitor,
  Power,
  QrCode,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import React, { type FC, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

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
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '$ui/card';
import { Label } from '$ui/label';
import { Skeleton } from '$ui/skeleton';
import { Switch } from '$ui/switch';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';

type UserSecurityTabProps = {
  canDeleteUser: boolean;
  canEditStatus: boolean;
  canResetMfa: boolean;
  canResetPassword: boolean;
  canRevokeSessions: boolean;
  canSaveStatus: boolean;
  canViewSessions: boolean;
  currentUserId: string | undefined;
  hasStatusChanges: boolean;
  isActive: boolean;
  isLoadingSessions: boolean;
  isRevokingSessionId: string | null;
  isRevokingSessions: boolean;
  isSaving: boolean;
  onCancelStatus: () => void;
  onClearTempPassword: () => void;
  onDeleteUser: () => void;
  onResetMfa: () => void;
  onResetPassword: () => void;
  onRetrySessions: () => void;
  onRevokeSession: (sessionId: string) => void;
  onRevokeSessions: () => void;
  onSaveStatus: () => void;
  sessions: UserSessionInfo[];
  sessionsError: string | null;
  setIsActive: (isActive: boolean) => void;
  tempPassword: string | null;
  user: UserType;
};

type ParsedUserAgent = {
  browser: string;
  device: string;
  isMobile: boolean;
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

const formatSessionDateTime = (date: Date | string | null): string => {
  const parsedDate = toValidDate(date);

  if (!parsedDate) return 'Date inconnue';

  return parsedDate.toLocaleDateString('fr-FR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const formatRelativeTime = (date: Date | string | null): string => {
  const then = toValidDate(date);

  if (!then) return 'Jamais';

  const now = new Date();
  const diffMs = then.getTime() - now.getTime();
  const isFuture = diffMs > 0;
  const absDiffMs = Math.abs(diffMs);
  const diffMins = Math.floor(absDiffMs / 60000);
  const diffHours = Math.floor(absDiffMs / 3600000);
  const diffDays = Math.floor(absDiffMs / 86400000);

  if (isFuture) {
    if (diffMins < 1) return "Dans moins d'une minute";
    if (diffMins < 60) return `Dans ${diffMins} min`;
    if (diffHours < 24) return `Dans ${diffHours}h`;
    if (diffDays < 7) return `Dans ${diffDays}j`;
  } else {
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
  }

  return then.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

const parseUserAgent = (userAgent: string | null): ParsedUserAgent => {
  if (!userAgent) {
    return {
      browser: 'Navigateur inconnu',
      device: 'Appareil inconnu',
      isMobile: false,
    };
  }

  let browser = 'Navigateur';
  let device = 'Ordinateur';
  let isMobile = false;

  if (userAgent.includes('iPhone') || userAgent.includes('iPad')) {
    device = 'iPhone/iPad';
    isMobile = true;
  } else if (userAgent.includes('Android')) {
    device = 'Android';
    isMobile = true;
  } else if (userAgent.includes('Windows')) {
    device = 'Windows';
  } else if (userAgent.includes('Mac')) {
    device = 'Mac';
  } else if (userAgent.includes('Linux')) {
    device = 'Linux';
  }

  if (userAgent.includes('Edg')) browser = 'Edge';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Safari')) browser = 'Safari';

  return { browser, device, isMobile };
};

const SectionTitle: FC<{
  children: React.ReactNode;
  icon: React.ReactNode;
  id: string;
}> = ({ children, icon, id }) => (
  <h3
    id={id}
    className="text-foreground flex items-center gap-2 text-sm font-semibold"
  >
    <span className="border-primary/35 bg-primary/15 text-primary-emphasis flex size-7 items-center justify-center rounded-lg border">
      {icon}
    </span>
    {children}
  </h3>
);

const SecurityInfoBlock: FC<{
  children?: React.ReactNode;
  icon: React.ReactNode;
  label: string;
  tone?: 'danger' | 'neutral' | 'primary' | 'warning';
  value: React.ReactNode;
}> = ({ children, icon, label, tone = 'neutral', value }) => {
  const toneClassName =
    tone === 'danger'
      ? 'border-destructive/35 bg-destructive/10 text-destructive'
      : tone === 'warning'
        ? 'border-warning/35 bg-warning/10 text-warning'
        : tone === 'primary'
          ? 'border-primary/35 bg-primary/15 text-primary-emphasis'
          : 'border-border/70 bg-background/45 text-muted-foreground';

  return (
    <div className="border-border/60 bg-surface-inset rounded-md border p-3">
      <div className="flex items-start gap-3">
        <span
          className={`${toneClassName} flex size-8 shrink-0 items-center justify-center rounded-lg border`}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-muted-foreground text-xs">{label}</p>
          <div className="text-foreground mt-0.5 text-sm font-medium">
            {value}
          </div>
          {children && (
            <div className="text-muted-foreground mt-1 text-xs">{children}</div>
          )}
        </div>
      </div>
    </div>
  );
};

const SessionRow: FC<{
  disabled: boolean;
  isRevoking: boolean;
  onRequestRevoke: (session: UserSessionInfo) => void;
  session: UserSessionInfo;
  showRevokeAction: boolean;
}> = ({ disabled, isRevoking, onRequestRevoke, session, showRevokeAction }) => {
  const { browser, device, isMobile } = parseUserAgent(session.userAgent);
  const DeviceIcon = isMobile ? Smartphone : Monitor;

  return (
    <div className="border-border/60 bg-surface-inset flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center">
      <span className="border-primary/35 bg-primary/15 text-primary-emphasis flex size-9 shrink-0 items-center justify-center rounded-lg border">
        <DeviceIcon className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <p className="text-foreground truncate text-sm font-medium">
            {device} - {browser}
          </p>
          {session.rememberMe && (
            <Badge variant="outline" className="rounded-full">
              Longue session
            </Badge>
          )}
        </div>
        <div className="text-muted-foreground mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs">
          <span>Active {formatRelativeTime(session.lastSeenAt)}</span>
          <span>Ouverte {formatRelativeTime(session.createdAt)}</span>
          <span>
            {session.ipAddress ? `IP ${session.ipAddress}` : 'IP inconnue'}
          </span>
        </div>
        <details className="group/session mt-1.5 w-fit max-w-full">
          <summary className="text-muted-foreground hover:text-foreground inline-flex cursor-pointer list-none items-center gap-1 text-xs transition-colors [&::-webkit-details-marker]:hidden">
            Voir les limites de session
            <ChevronDown className="size-3.5 transition-transform group-open/session:rotate-180" />
          </summary>
          <div className="text-muted-foreground mt-1 flex flex-col gap-1 text-xs">
            <span>
              Inactivité jusqu’au {formatSessionDateTime(session.idleExpiresAt)}
            </span>
            <span>
              Limite absolue {formatSessionDateTime(session.expiresAt)}
            </span>
          </div>
        </details>
      </div>
      {showRevokeAction && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="self-end rounded-lg sm:self-auto"
          onClick={() => onRequestRevoke(session)}
          disabled={disabled}
          aria-label={`Révoquer la session ${device} ${browser}`}
        >
          {isRevoking ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          {isRevoking ? 'Révocation…' : 'Révoquer'}
        </Button>
      )}
    </div>
  );
};

export const UserSecurityTab: FC<UserSecurityTabProps> = ({
  canDeleteUser,
  canEditStatus,
  canResetMfa,
  canResetPassword,
  canRevokeSessions,
  canSaveStatus,
  canViewSessions,
  currentUserId,
  hasStatusChanges,
  isActive,
  isLoadingSessions,
  isRevokingSessionId,
  isRevokingSessions,
  isSaving,
  onCancelStatus,
  onClearTempPassword,
  onDeleteUser,
  onResetMfa,
  onResetPassword,
  onRetrySessions,
  onRevokeSession,
  onRevokeSessions,
  onSaveStatus,
  sessions,
  sessionsError,
  setIsActive,
  tempPassword,
  user,
}) => {
  const isSelf = currentUserId === user.id;
  const lockedUntil = toValidDate(user.lockedUntil);
  const isLocked = !!lockedUntil && lockedUntil > new Date();
  const passwordChangedLabel = user.passwordChangedAt
    ? formatDate(user.passwordChangedAt)
    : 'Jamais';
  const isAnySessionRevoking =
    isRevokingSessions || isRevokingSessionId !== null;
  const isMfaEnabled = user.mfaEnabledAt !== null;
  const [sessionPendingRevocation, setSessionPendingRevocation] =
    useState<UserSessionInfo | null>(null);
  const tempPasswordAnnouncementRef = useRef<HTMLDivElement>(null);
  const pendingSessionAgent = sessionPendingRevocation
    ? parseUserAgent(sessionPendingRevocation.userAgent)
    : null;

  useEffect(() => {
    if (tempPassword) tempPasswordAnnouncementRef.current?.focus();
  }, [tempPassword]);

  const handleCopyTempPassword = async (): Promise<void> => {
    if (!tempPassword) return;

    try {
      await navigator.clipboard.writeText(tempPassword);
      toast.success('Mot de passe copié');
    } catch {
      toast.error('Copie impossible');
    }
  };

  return (
    <section
      aria-busy={isLoadingSessions || isAnySessionRevoking}
      aria-labelledby="user-security-heading"
      className="space-y-3"
    >
      <h2 id="user-security-heading" className="sr-only">
        Sécurité du compte
      </h2>
      {tempPassword && (
        <Card
          aria-live="assertive"
          className="border-warning/25 bg-warning/10 overflow-hidden rounded-lg py-0 outline-none focus-visible:ring-2"
          ref={tempPasswordAnnouncementRef}
          role="status"
          tabIndex={-1}
        >
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="text-warning size-4" />
                  <p className="text-warning text-sm font-semibold">
                    Nouveau mot de passe temporaire
                  </p>
                </div>
                <code className="text-foreground bg-surface-inset block rounded-md border px-3 py-2 font-mono text-sm">
                  {tempPassword}
                </code>
                <p className="text-muted-foreground text-xs">
                  À transmettre une seule fois. Les sessions actives ont été
                  invalidées.
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="rounded-lg"
                      onClick={handleCopyTempPassword}
                      aria-label="Copier le mot de passe temporaire"
                    >
                      <Clipboard className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copier</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="rounded-lg"
                      onClick={onClearTempPassword}
                      aria-label="Masquer le mot de passe temporaire"
                    >
                      <X className="size-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Masquer</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      <Card
        aria-labelledby="user-security-status-heading"
        className="border-border/70 overflow-hidden rounded-lg py-0"
      >
        <CardHeader className="border-border/65 bg-surface-muted border-b p-3 sm:p-4">
          <SectionTitle
            id="user-security-status-heading"
            icon={<Power className="size-3.5" />}
          >
            État du compte
          </SectionTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div
            className={cn(
              'border-border/60 bg-surface-inset flex items-center justify-between gap-4 rounded-md border p-3',
              !isActive && 'border-destructive/30 bg-destructive/5',
            )}
          >
            <div>
              <Label
                htmlFor="user-active-switch"
                className="text-foreground text-sm font-medium"
              >
                Compte actif
              </Label>
              <p
                id="user-active-switch-description"
                className="text-muted-foreground text-xs"
              >
                Les comptes inactifs ne peuvent pas se connecter.
              </p>
            </div>
            <Switch
              id="user-active-switch"
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={!canEditStatus || isSelf}
              aria-describedby="user-active-switch-description"
            />
          </div>
          {isSelf && (
            <div className="text-muted-foreground border-warning/25 bg-warning/10 flex items-start gap-2 rounded-md border px-3 py-2 text-xs">
              <AlertTriangle className="text-warning mt-0.5 size-3.5 shrink-0" />
              Vous ne pouvez pas désactiver votre propre compte depuis cette
              fiche.
            </div>
          )}
        </CardContent>
        {canEditStatus && !isSelf && (
          <CardFooter className="border-border/65 bg-surface-muted flex-col items-stretch justify-between gap-3 border-t p-3 sm:flex-row sm:items-center sm:p-4">
            <p className="text-muted-foreground text-xs">
              {hasStatusChanges ? 'Modification non enregistrée' : 'À jour'}
            </p>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onCancelStatus}
                disabled={!hasStatusChanges || isSaving}
              >
                Annuler
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={onSaveStatus}
                disabled={isSaving || !canSaveStatus}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isSaving ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-1.5 h-4 w-4" />
                )}
                Enregistrer
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
      <Card
        aria-labelledby="user-security-password-heading"
        className="border-border/70 overflow-hidden rounded-lg py-0"
      >
        <CardHeader className="border-border/65 bg-surface-muted border-b p-3 sm:p-4">
          <SectionTitle
            id="user-security-password-heading"
            icon={<KeyRound className="size-3.5" />}
          >
            Mot de passe & verrouillage
          </SectionTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
          <SecurityInfoBlock
            icon={<KeyRound className="size-4" />}
            label="État du mot de passe"
            value={
              user.mustChangePassword ? (
                <Badge
                  variant="outline"
                  className="border-warning/40 text-warning"
                >
                  À changer
                </Badge>
              ) : (
                <Badge variant="secondary">À jour</Badge>
              )
            }
            tone={user.mustChangePassword ? 'warning' : 'primary'}
          >
            Dernier changement : {passwordChangedLabel}
          </SecurityInfoBlock>
          <SecurityInfoBlock
            icon={
              isLocked ? (
                <ShieldAlert className="size-4" />
              ) : (
                <ShieldCheck className="size-4" />
              )
            }
            label="Verrouillage"
            value={
              isLocked ? (
                <Badge variant="destructive">Verrouillé</Badge>
              ) : (
                <Badge variant="secondary">Aucun</Badge>
              )
            }
            tone={isLocked ? 'danger' : 'primary'}
          >
            {isLocked
              ? `Jusqu'au ${formatDate(lockedUntil)}`
              : user.failedLoginAttempts > 0
                ? `${user.failedLoginAttempts} tentative(s) échouée(s)`
                : 'Aucun verrouillage en cours'}
          </SecurityInfoBlock>
          {user.failedLoginAttempts > 0 && (
            <SecurityInfoBlock
              icon={<AlertTriangle className="size-4" />}
              label="Tentatives échouées"
              value={String(user.failedLoginAttempts)}
              tone="warning"
            >
              Compteur utilisé pour détecter les blocages de connexion.
            </SecurityInfoBlock>
          )}
          <SecurityInfoBlock
            icon={<Laptop className="size-4" />}
            label="Impact d'une réinitialisation"
            value="Mot de passe temporaire"
            tone="neutral"
          >
            La réinitialisation invalide les sessions existantes.
          </SecurityInfoBlock>
        </CardContent>
        {canResetPassword && (
          <CardFooter className="border-border/65 bg-surface-muted justify-end border-t p-3 sm:p-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetPassword}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Réinitialiser le mot de passe
            </Button>
          </CardFooter>
        )}
      </Card>
      <Card
        aria-labelledby="user-security-mfa-heading"
        className="border-border/70 overflow-hidden rounded-lg py-0"
      >
        <CardHeader className="border-border/65 bg-surface-muted border-b p-3 sm:p-4">
          <SectionTitle
            id="user-security-mfa-heading"
            icon={<QrCode className="size-3.5" />}
          >
            Double authentification
          </SectionTitle>
        </CardHeader>
        <CardContent className="grid gap-3 p-3 sm:grid-cols-2 sm:p-4">
          <SecurityInfoBlock
            icon={<QrCode className="size-4" />}
            label="État MFA"
            value={
              isMfaEnabled ? (
                <Badge variant="secondary">Active</Badge>
              ) : (
                <Badge
                  className="border-warning/40 text-warning"
                  variant="outline"
                >
                  Configuration obligatoire
                </Badge>
              )
            }
            tone={isMfaEnabled ? 'primary' : 'warning'}
          >
            {isMfaEnabled
              ? `Activée le ${formatDate(user.mfaEnabledAt)}`
              : 'L’accès au site reste bloqué jusqu’à la configuration d’une application d’authentification.'}
          </SecurityInfoBlock>
          <SecurityInfoBlock
            icon={<ShieldAlert className="size-4" />}
            label="Récupération superadmin"
            value={
              canResetMfa
                ? 'Disponible'
                : isMfaEnabled
                  ? 'Réservée au compte racine'
                  : 'En attente de configuration'
            }
            tone={canResetMfa ? 'warning' : 'neutral'}
          >
            Réservée au compte racine lorsque l&apos;appareil
            d&apos;authentification et tous les codes de secours sont perdus.
          </SecurityInfoBlock>
        </CardContent>
        {canResetMfa && (
          <CardFooter className="border-border/65 bg-surface-muted justify-end border-t p-3 sm:p-4">
            <Button
              className="border-warning/40 text-warning hover:bg-warning/10 hover:text-warning gap-2"
              onClick={onResetMfa}
              size="sm"
              type="button"
              variant="outline"
            >
              <RotateCcw className="size-4" />
              Réinitialiser la double authentification
            </Button>
          </CardFooter>
        )}
      </Card>
      <Card
        aria-labelledby="user-security-sessions-heading"
        className="border-border/70 overflow-hidden rounded-lg py-0"
      >
        <CardHeader className="border-border/65 bg-surface-muted border-b p-3 sm:p-4">
          <SectionTitle
            id="user-security-sessions-heading"
            icon={<Monitor className="size-3.5" />}
          >
            Sessions actives
          </SectionTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3 sm:p-4">
          {!canViewSessions ? (
            <div className="border-border/60 bg-surface-inset rounded-md border p-3">
              <p className="text-muted-foreground text-sm">
                Vous n&apos;avez pas la permission de consulter ou révoquer les
                sessions de cet utilisateur.
              </p>
            </div>
          ) : isLoadingSessions && sessions.length === 0 ? (
            <div className="space-y-2">
              <Skeleton className="h-16 rounded-md" />
              <Skeleton className="h-16 rounded-md" />
            </div>
          ) : sessionsError && sessions.length === 0 ? (
            <div
              className="border-destructive/35 bg-destructive/10 text-destructive flex flex-wrap items-center justify-between gap-3 rounded-md border p-3 text-sm"
              role="alert"
            >
              <span>{sessionsError}</span>
              <Button onClick={onRetrySessions} size="sm" variant="outline">
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
                  <Button onClick={onRetrySessions} size="sm" variant="outline">
                    <RotateCcw className="size-4" />
                    Réessayer
                  </Button>
                </div>
              )}
              {sessions.map((session) => (
                <SessionRow
                  key={session.id}
                  session={session}
                  isRevoking={isRevokingSessionId === session.id}
                  disabled={isAnySessionRevoking}
                  onRequestRevoke={setSessionPendingRevocation}
                  showRevokeAction={canRevokeSessions}
                />
              ))}
            </div>
          )}
        </CardContent>
        {canRevokeSessions && sessions.length > 0 && (
          <CardFooter className="border-border/65 bg-surface-muted justify-end border-t p-3 sm:p-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRevokeSessions}
              disabled={isAnySessionRevoking}
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
      {canDeleteUser && (
        <Card
          aria-labelledby="user-security-danger-heading"
          className="border-destructive/30 bg-destructive/5 overflow-hidden rounded-lg py-0"
        >
          <CardHeader className="border-destructive/20 bg-destructive/10 border-b p-3 sm:p-4">
            <h3
              id="user-security-danger-heading"
              className="text-destructive flex items-center gap-2 text-sm font-semibold"
            >
              <Trash2 className="size-4" />
              Zone danger
            </h3>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div>
              <p className="text-sm font-medium">Archiver cet utilisateur</p>
              <p className="text-muted-foreground text-xs">
                Le compte sera désactivé, masqué de l&apos;annuaire et ses
                sessions seront invalidées.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={onDeleteUser}
              className="shrink-0"
            >
              Archiver
            </Button>
          </CardContent>
        </Card>
      )}
      <AlertDialog
        open={sessionPendingRevocation !== null}
        onOpenChange={(open) => {
          if (!open) setSessionPendingRevocation(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Révoquer cette session ?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingSessionAgent
                ? `${pendingSessionAgent.device} — ${pendingSessionAgent.browser}`
                : 'Cette session'}{' '}
              sera immédiatement déconnectée. L&apos;utilisateur devra saisir de
              nouveau ses identifiants.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Conserver la session</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                const sessionId = sessionPendingRevocation?.id;

                setSessionPendingRevocation(null);
                if (sessionId) onRevokeSession(sessionId);
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
