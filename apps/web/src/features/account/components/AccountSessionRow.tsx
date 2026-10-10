'use client';
import { Loader2, LogOut, Monitor, Smartphone } from 'lucide-react';
import React, { type FC } from 'react';

import { Disclosure } from '$components/layout/Disclosure';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { ServiceIcon } from '$ui/service-icon';
import { cn } from '$utils/css.utils';

import { formatRelativeAccountTime, parseUserAgent } from '../account.utils';

export type SessionInfo = {
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

export const formatSessionDateTime = (date: string | null): string => {
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

export const getSessionTitle = (session: SessionInfo): string => {
  const { browser, device } = parseUserAgent(session.userAgent);

  return `${device} - ${browser}`;
};

type SessionRowProps = {
  isRevoking?: boolean;
  onRevoke?: (session: SessionInfo) => void;
  session: SessionInfo;
};

export const SessionRow: FC<SessionRowProps> = ({
  isRevoking,
  onRevoke,
  session,
}) => {
  const { browser, device } = parseUserAgent(session.userAgent);
  const DeviceIcon = getSessionDeviceIcon(device);
  const canRevoke = !!onRevoke && !session.isCurrent;

  return (
    <div
      className={cn(
        'border-border/60 bg-surface-inset flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-start',
        session.isCurrent && 'border-primary/35 bg-accent/[0.1]',
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <ServiceIcon className="size-9">
          <DeviceIcon className="size-4" />
        </ServiceIcon>
        <div className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="text-foreground truncate text-sm font-medium">
              {device} · {browser}
            </p>
            {session.isCurrent && (
              <Badge variant="secondary" className="rounded-full">
                Session actuelle
              </Badge>
            )}
            {session.rememberMe && (
              <Badge variant="outline" className="rounded-full">
                Appareil de confiance
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-xs">
            Dernière activité {formatRelativeAccountTime(session.lastSeenAt)}
          </p>
          <Disclosure
            label="Détails techniques"
            className="border-border/60 mt-2 border-t pt-2 text-xs"
          >
            <dl className="mt-2 grid gap-x-4 gap-y-2 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">Adresse IP</dt>
                <dd className="text-foreground mt-0.5 break-all">
                  {session.ipAddress ?? 'Inconnue'}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Créée le</dt>
                <dd className="text-foreground mt-0.5">
                  {formatSessionDateTime(session.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">
                  Expiration après inactivité
                </dt>
                <dd className="text-foreground mt-0.5">
                  {formatSessionDateTime(session.idleExpiresAt)}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Expiration maximale</dt>
                <dd className="text-foreground mt-0.5">
                  {formatSessionDateTime(session.expiresAt)}
                </dd>
              </div>
            </dl>
          </Disclosure>
        </div>
      </div>
      {canRevoke && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="text-destructive hover:text-destructive w-full shrink-0 gap-2 sm:w-auto"
          onClick={() => onRevoke(session)}
          disabled={isRevoking}
        >
          {isRevoking ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <LogOut className="size-4" />
          )}
          Déconnecter
        </Button>
      )}
    </div>
  );
};
