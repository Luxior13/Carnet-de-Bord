'use client';

import React, { type FC, type ReactNode } from 'react';

import { AccessDeniedState } from '$components/layout/PageState';
import { Button } from '$ui/button';

type AuthorizationView = 'access' | 'account';

const ViewToggle: FC<{
  hasChanges: boolean;
  label: string;
  onSelect: () => void;
  selected: boolean;
}> = ({ hasChanges, label, onSelect, selected }) => (
  <Button
    aria-pressed={selected}
    className="h-auto min-h-10 min-w-0 whitespace-normal"
    onClick={onSelect}
    size="sm"
    type="button"
    variant={selected ? 'secondary' : 'ghost'}
  >
    {label}
    {hasChanges && (
      <span
        aria-label="Modifications non enregistrées"
        className="bg-warning size-1.5 rounded-full"
      />
    )}
  </Button>
);

/**
 * Autorisations section of a user record: administrative access and personal
 * account, with a switch when the actor may read both. The requested view
 * falls back to the one the actor may read.
 */
export const UserAuthorizationsSection: FC<{
  accessContent: ReactNode;
  accountContent: ReactNode;
  canViewAccess: boolean;
  canViewPersonalAccount: boolean;
  hasAccessChanges: boolean;
  hasAccountChanges: boolean;
  onSelectView: (view: AuthorizationView) => void;
  requestedView: AuthorizationView;
}> = ({
  accessContent,
  accountContent,
  canViewAccess,
  canViewPersonalAccount,
  hasAccessChanges,
  hasAccountChanges,
  onSelectView,
  requestedView,
}) => {
  if (!canViewAccess && !canViewPersonalAccount) {
    return (
      <AccessDeniedState description="Vous n'avez pas la permission de consulter les autorisations de cet utilisateur." />
    );
  }

  const selectedView: AuthorizationView =
    requestedView === 'access' && canViewAccess
      ? 'access'
      : requestedView === 'account' && canViewPersonalAccount
        ? 'account'
        : canViewAccess
          ? 'access'
          : 'account';

  return (
    <section aria-labelledby="user-authorizations-title" className="space-y-3">
      <h2 id="user-authorizations-title" className="sr-only">
        Autorisations
      </h2>
      {canViewAccess && canViewPersonalAccount && (
        <div
          aria-label="Catégorie d'autorisations"
          className="border-border/70 bg-surface-muted/75 grid min-h-11 w-full gap-1 rounded-lg border p-1 @min-[32rem]/page:inline-flex @min-[32rem]/page:w-auto"
          role="group"
        >
          <ViewToggle
            hasChanges={hasAccessChanges}
            label="Autorisations administratives"
            onSelect={() => onSelectView('access')}
            selected={selectedView === 'access'}
          />
          <ViewToggle
            hasChanges={hasAccountChanges}
            label="Compte personnel"
            onSelect={() => onSelectView('account')}
            selected={selectedView === 'account'}
          />
        </div>
      )}
      {selectedView === 'access' ? accessContent : accountContent}
    </section>
  );
};
