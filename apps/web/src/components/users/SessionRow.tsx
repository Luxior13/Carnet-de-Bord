'use client';

import { LogOut, Monitor, Smartphone } from 'lucide-react';
import React, { type FC } from 'react';

import { Disclosure } from '$components/layout/Disclosure';
import { Badge } from '$ui/badge';
import { Button } from '$ui/button';
import { ServiceIcon } from '$ui/service-icon';
import { cn } from '$utils/css.utils';
import {
  describeUserAgent,
  formatIpAddress,
  formatSessionActivity,
  formatSessionDateTime,
} from '$utils/session-display.utils';

export type SessionRowSession = {
  createdAt: Date | string;
  expiresAt: Date | string;
  id: string;
  idleExpiresAt: Date | string;
  ipAddress: string | null;
  isCurrent?: boolean;
  lastSeenAt: Date | string;
  rememberMe: boolean;
  userAgent: string | null;
};

type SessionRowAction = {
  ariaLabel: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
  pending?: boolean;
  /** Mon compte: closing one of one’s own sessions reads as a sign-out. */
  tone?: 'default' | 'destructive';
};

/**
 * One active session (owner decision of 27 October 2026): the same row on a
 * user record and in Mon compte, only the action differs.
 */
export const SessionRow: FC<{
  action?: SessionRowAction;
  session: SessionRowSession;
}> = ({ action, session }) => {
  const agent = describeUserAgent(session.userAgent);
  const DeviceIcon = agent.isMobile ? Smartphone : Monitor;

  return (
    <div
      className={cn(
        'border-border/60 bg-surface-inset flex flex-col gap-3 rounded-md border p-3 sm:flex-row sm:items-center',
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
              {agent.label}
            </p>
            {session.isCurrent && (
              <Badge variant="secondary" className="rounded-full">
                Session actuelle
              </Badge>
            )}
            {session.rememberMe && (
              <Badge variant="outline" className="rounded-full">
                Connexion maintenue
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 flex min-w-0 flex-wrap gap-x-3 gap-y-1 text-xs">
            <span>
              Dernière activité : {formatSessionActivity(session.lastSeenAt)}
            </span>
            <span className="break-all">
              {session.ipAddress
                ? `IP ${formatIpAddress(session.ipAddress)}`
                : 'IP inconnue'}
            </span>
          </p>
          <Disclosure
            label="Détails de la session"
            className="mt-1.5 w-fit max-w-full"
          >
            <dl className="text-muted-foreground mt-1 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[auto_1fr]">
              <dt>Ouverte le</dt>
              <dd className="text-foreground">
                {formatSessionDateTime(session.createdAt)}
              </dd>
              <dt>Se ferme si inactive le</dt>
              <dd className="text-foreground">
                {formatSessionDateTime(session.idleExpiresAt)}
              </dd>
              <dt>Fermeture au plus tard le</dt>
              <dd className="text-foreground">
                {formatSessionDateTime(session.expiresAt)}
              </dd>
            </dl>
          </Disclosure>
        </div>
      </div>
      {action && (
        <Button
          aria-label={action.ariaLabel}
          className={cn(
            'w-full shrink-0 gap-2 sm:w-auto',
            action.tone === 'destructive' &&
              'text-destructive hover:text-destructive',
          )}
          data-session-id={session.id}
          disabled={action.disabled}
          loading={action.pending}
          onClick={action.onClick}
          size="sm"
          type="button"
          variant="outline"
        >
          {!action.pending && <LogOut className="size-4" />}
          {action.label}
        </Button>
      )}
    </div>
  );
};
