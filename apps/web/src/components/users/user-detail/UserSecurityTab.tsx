'use client';

import {
  AlertTriangle,
  KeyRound,
  Laptop,
  Loader2,
  LogOut,
  Monitor,
  Power,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Trash2,
} from 'lucide-react';
import React, { type FC } from 'react';

import type { UserSessionInfo, UserType } from '$types/auth.types';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '$ui/card';
import { Label } from '$ui/label';
import { Separator } from '$ui/separator';
import { Skeleton } from '$ui/skeleton';
import { Switch } from '$ui/switch';

type UserSecurityTabProps = {
  canDeleteUser: boolean;
  canEditStatus: boolean;
  canManageSessions: boolean;
  canResetPassword: boolean;
  canSaveStatus: boolean;
  currentUserId: string | undefined;
  hasStatusChanges: boolean;
  isActive: boolean;
  isLoadingSessions: boolean;
  isRevokingSessions: boolean;
  isSaving: boolean;
  onCancelStatus: () => void;
  onDeleteUser: () => void;
  onResetPassword: () => void;
  onRevokeSessions: () => void;
  onSaveStatus: () => void;
  sessions: UserSessionInfo[];
  setIsActive: (isActive: boolean) => void;
  tempPassword: string | null;
  user: UserType;
};

type ParsedUserAgent = {
  browser: string;
  device: string;
  isMobile: boolean;
};

const formatDate = (date: Date | string | null): string => {
  if (!date) return 'Jamais';

  return new Date(date).toLocaleDateString('fr-FR', {
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    month: 'long',
    year: 'numeric',
  });
};

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

  return new Date(date).toLocaleDateString('fr-FR', {
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
}> = ({ children, icon }) => (
  <CardTitle className="text-foreground flex items-center gap-2 text-sm font-semibold">
    <span className="bg-primary/10 text-primary flex size-6 items-center justify-center rounded-md">
      {icon}
    </span>
    {children}
  </CardTitle>
);

const SecurityMetric: FC<{
  description: string;
  icon: React.ReactNode;
  label: string;
  tone?: 'danger' | 'neutral' | 'primary' | 'warning';
  value: string;
}> = ({ description, icon, label, tone = 'neutral', value }) => {
  const toneClassName =
    tone === 'danger'
      ? 'bg-destructive/10 text-destructive'
      : tone === 'warning'
        ? 'bg-amber-500/10 text-amber-400'
        : tone === 'primary'
          ? 'bg-primary/10 text-primary'
          : 'bg-secondary text-secondary-foreground';

  return (
    <Card className="border-border/70 bg-card overflow-hidden rounded-lg py-0">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start gap-3">
          <span
            className={`${toneClassName} flex size-9 shrink-0 items-center justify-center rounded-lg`}
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

export const UserSecurityTab: FC<UserSecurityTabProps> = ({
  canDeleteUser,
  canEditStatus,
  canManageSessions,
  canResetPassword,
  canSaveStatus,
  currentUserId,
  hasStatusChanges,
  isActive,
  isLoadingSessions,
  isRevokingSessions,
  isSaving,
  onCancelStatus,
  onDeleteUser,
  onResetPassword,
  onRevokeSessions,
  onSaveStatus,
  sessions,
  setIsActive,
  tempPassword,
  user,
}) => {
  const isSelf = currentUserId === user.id;
  const lockedUntil = user.lockedUntil ? new Date(user.lockedUntil) : null;
  const isLocked = !!lockedUntil && lockedUntil > new Date();
  const sessionCountLabel = isLoadingSessions
    ? 'Chargement'
    : canManageSessions
      ? String(sessions.length)
      : 'Restreint';

  return (
    <div className="space-y-3">
      {tempPassword && (
        <Card className="overflow-hidden rounded-lg border-amber-500/25 bg-amber-500/10 py-0">
          <CardHeader className="border-b border-amber-500/20 p-3 sm:p-4">
            <CardTitle className="text-sm text-amber-400">
              Nouveau mot de passe temporaire
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 p-3 sm:p-4">
            <code className="text-foreground bg-popover block rounded-md border px-3 py-2 font-mono text-sm">
              {tempPassword}
            </code>
            <p className="text-muted-foreground text-xs">
              Communiquez ce mot de passe a l&apos;utilisateur. Ses sessions
              actives ont ete invalidees.
            </p>
          </CardContent>
        </Card>
      )}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <SecurityMetric
          icon={<Power className="size-4" />}
          label="Compte"
          value={isActive ? 'Actif' : 'Inactif'}
          description={
            isActive ? 'Connexion autorisee' : 'Connexion impossible'
          }
          tone={isActive ? 'primary' : 'danger'}
        />
        <SecurityMetric
          icon={
            isLocked ? (
              <ShieldAlert className="size-4" />
            ) : (
              <ShieldCheck className="size-4" />
            )
          }
          label="Verrouillage"
          value={isLocked ? 'Verrouille' : 'OK'}
          description={
            isLocked
              ? `Jusqu'au ${formatDate(lockedUntil)}`
              : `${user.failedLoginAttempts} tentative(s) echouee(s)`
          }
          tone={
            isLocked
              ? 'danger'
              : user.failedLoginAttempts > 0
                ? 'warning'
                : 'primary'
          }
        />
        <SecurityMetric
          icon={<KeyRound className="size-4" />}
          label="Mot de passe"
          value={user.mustChangePassword ? 'A changer' : 'A jour'}
          description={`Dernier changement : ${formatDate(user.passwordChangedAt)}`}
          tone={user.mustChangePassword ? 'warning' : 'primary'}
        />
        <SecurityMetric
          icon={<Laptop className="size-4" />}
          label="Sessions"
          value={sessionCountLabel}
          description={
            canManageSessions
              ? 'Sessions actives detectees'
              : 'Gestion reservee aux roles autorises'
          }
          tone={sessions.length > 0 ? 'primary' : 'neutral'}
        />
      </div>
      <Card className="border-border/70 bg-card overflow-hidden rounded-lg py-0">
        <CardHeader className="border-border/60 bg-accent border-b p-3 sm:p-4">
          <SectionTitle icon={<Power className="size-3.5" />}>
            Etat du compte
          </SectionTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div className="border-border/60 bg-popover flex items-center justify-between gap-4 rounded-md border p-3">
            <div>
              <Label className="text-foreground text-sm font-medium">
                Compte actif
              </Label>
              <p className="text-muted-foreground text-xs">
                Les comptes inactifs ne peuvent pas se connecter.
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={setIsActive}
              disabled={!canEditStatus || isSelf}
            />
          </div>
          {isSelf && (
            <div className="text-muted-foreground flex items-start gap-2 rounded-md border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
              Vous ne pouvez pas desactiver votre propre compte depuis cette
              fiche.
            </div>
          )}
        </CardContent>
        <CardFooter className="border-border/60 bg-accent justify-between gap-3 border-t p-3 sm:p-4">
          <p className="text-muted-foreground text-xs">
            {hasStatusChanges ? 'Modification non enregistree' : 'A jour'}
          </p>
          <div className="flex gap-2">
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
      </Card>
      <Card className="border-border/70 bg-card overflow-hidden rounded-lg py-0">
        <CardHeader className="border-border/60 bg-accent border-b p-3 sm:p-4">
          <SectionTitle icon={<Monitor className="size-3.5" />}>
            Sessions actives
          </SectionTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3 sm:p-4">
          {!canManageSessions ? (
            <div className="border-border/60 bg-popover rounded-md border p-3">
              <p className="text-muted-foreground text-sm">
                Vous n&apos;avez pas la permission de consulter ou revoquer les
                sessions de cet utilisateur.
              </p>
            </div>
          ) : isLoadingSessions ? (
            <div className="space-y-2">
              <Skeleton className="h-14 rounded-md" />
              <Skeleton className="h-14 rounded-md" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="border-border/60 bg-popover rounded-md border p-3">
              <p className="text-muted-foreground text-sm">
                Aucune session active.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {sessions.map((session) => {
                const { browser, device, isMobile } = parseUserAgent(
                  session.userAgent,
                );
                const DeviceIcon = isMobile ? Smartphone : Monitor;

                return (
                  <div
                    key={session.id}
                    className="border-border/60 bg-popover flex items-center gap-3 rounded-md border p-3"
                  >
                    <span className="bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
                      <DeviceIcon className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <p className="text-foreground truncate text-sm font-medium">
                          {device} - {browser}
                        </p>
                        {session.rememberMe && (
                          <Badge variant="outline">Longue session</Badge>
                        )}
                      </div>
                      <p className="text-muted-foreground truncate text-xs">
                        {session.ipAddress || 'IP inconnue'} - ouverte{' '}
                        {formatRelativeTime(session.createdAt)} - expire{' '}
                        {formatRelativeTime(session.expiresAt)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
        {canManageSessions && sessions.length > 0 && (
          <CardFooter className="border-border/60 bg-accent justify-end border-t p-3 sm:p-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRevokeSessions}
              disabled={isRevokingSessions}
              className="gap-2"
            >
              {isRevokingSessions ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Revoquer les sessions
            </Button>
          </CardFooter>
        )}
      </Card>
      <Card className="border-border/70 bg-card overflow-hidden rounded-lg py-0">
        <CardHeader className="border-border/60 bg-accent border-b p-3 sm:p-4">
          <SectionTitle icon={<KeyRound className="size-3.5" />}>
            Mot de passe
          </SectionTitle>
        </CardHeader>
        <CardContent className="space-y-3 p-3 sm:p-4">
          <div className="border-border/60 bg-popover space-y-3 rounded-md border p-3">
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground text-sm">Etat</span>
              {user.mustChangePassword ? (
                <Badge
                  variant="outline"
                  className="border-amber-500/40 text-amber-400"
                >
                  A changer
                </Badge>
              ) : (
                <Badge variant="secondary">A jour</Badge>
              )}
            </div>
            <Separator className="bg-border/60" />
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground text-sm">
                Dernier changement
              </span>
              <span className="text-sm">
                {formatDate(user.passwordChangedAt)}
              </span>
            </div>
            <Separator className="bg-border/60" />
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground text-sm">
                Tentatives echouees
              </span>
              <span className="text-sm">{user.failedLoginAttempts}</span>
            </div>
            {isLocked && (
              <>
                <Separator className="bg-border/60" />
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground text-sm">
                    Verrouille jusqu&apos;a
                  </span>
                  <span className="text-destructive text-sm">
                    {formatDate(lockedUntil)}
                  </span>
                </div>
              </>
            )}
          </div>
        </CardContent>
        {canResetPassword && (
          <CardFooter className="border-border/60 bg-accent justify-end border-t p-3 sm:p-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onResetPassword}
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Reinitialiser le mot de passe
            </Button>
          </CardFooter>
        )}
      </Card>
      {canDeleteUser && (
        <Card className="border-destructive/30 bg-destructive/5 overflow-hidden rounded-lg py-0">
          <CardHeader className="border-destructive/20 border-b p-3 sm:p-4">
            <CardTitle className="text-destructive flex items-center gap-2 text-sm">
              <Trash2 className="size-4" />
              Zone danger
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div>
              <p className="text-sm font-medium">Supprimer cet utilisateur</p>
              <p className="text-muted-foreground text-xs">
                Cette action est definitive et invalide les sessions associees.
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              onClick={onDeleteUser}
              className="shrink-0"
            >
              Supprimer
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
