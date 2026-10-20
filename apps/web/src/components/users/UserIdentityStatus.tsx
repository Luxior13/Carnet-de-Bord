import React, { type FC } from 'react';

import { UserStatusBadge } from '$features/users/user-badges';
import type { UserType } from '$types/auth.types';
import { StatusBadge } from '$ui/status-badge';

const formatHeroDate = (value: Date | string | undefined): string | null => {
  const date = value instanceof Date ? value : value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;

  return date.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

/**
 * Account states shown next to the name in the hero of a user record and of
 * Mon compte. They replace the former overview card; details and actions stay
 * in the Security section. Hidden security details are simply omitted.
 */
export const UserIdentityStatus: FC<{ user: UserType }> = ({ user }) => (
  <>
    <UserStatusBadge isActive={user.isActive} />
    {user.securityDetailsVisible !== false && (
      <>
        <StatusBadge tone={user.mustChangePassword ? 'warning' : 'success'}>
          {user.mustChangePassword
            ? 'Mot de passe à changer'
            : 'Mot de passe à jour'}
        </StatusBadge>
        <StatusBadge tone={user.mfaEnabledAt ? 'success' : 'warning'}>
          {user.mfaEnabledAt
            ? 'Double authentification activée'
            : 'Double authentification à configurer'}
        </StatusBadge>
      </>
    )}
  </>
);

/** « Identifiant : x · Créé le … · Modifié le … » under the hero title. */
export const formatUserIdentityLine = (
  user: Pick<UserType, 'createdAt' | 'updatedAt'>,
  login: string,
): string =>
  [
    `Identifiant : ${login}`,
    formatHeroDate(user.createdAt) &&
      `Créé le ${formatHeroDate(user.createdAt)}`,
    formatHeroDate(user.updatedAt) &&
      `Modifié le ${formatHeroDate(user.updatedAt)}`,
  ]
    .filter(Boolean)
    .join(' · ');
