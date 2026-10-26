'use client';

import React, { type FC, type ReactNode, useMemo } from 'react';

import { AccessDeniedState } from '$components/layout/PageState';
import {
  type AuthorizationView,
  AuthorizationViewContext,
} from '$components/users/AuthorizationsHeader';

/**
 * Autorisations section of a user record: administrative access and personal
 * account. When the actor may read both, each view shows the switch in its
 * own card header (owner request of 26 October 2026: no standalone bar). The
 * requested view falls back to the one the actor may read.
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
  const selectedView: AuthorizationView =
    requestedView === 'access' && canViewAccess
      ? 'access'
      : requestedView === 'account' && canViewPersonalAccount
        ? 'account'
        : canViewAccess
          ? 'access'
          : 'account';
  const viewState = useMemo(
    () =>
      canViewAccess && canViewPersonalAccount
        ? { hasAccessChanges, hasAccountChanges, onSelectView, selectedView }
        : null,
    [
      canViewAccess,
      canViewPersonalAccount,
      hasAccessChanges,
      hasAccountChanges,
      onSelectView,
      selectedView,
    ],
  );

  if (!canViewAccess && !canViewPersonalAccount) {
    return (
      <AccessDeniedState description="Vous n'avez pas la permission de consulter les autorisations de cet utilisateur." />
    );
  }

  return (
    <section aria-labelledby="user-authorizations-title">
      <h2 id="user-authorizations-title" className="sr-only">
        Autorisations
      </h2>
      <AuthorizationViewContext.Provider value={viewState}>
        {selectedView === 'access' ? accessContent : accountContent}
      </AuthorizationViewContext.Provider>
    </section>
  );
};
