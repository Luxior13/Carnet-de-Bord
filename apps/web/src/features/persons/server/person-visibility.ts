import 'server-only';

import { PROTECTED_USER_PUBLIC_DISPLAY_NAME } from '$constants/protected-user.constants';
import { UserActionAuthorizationError } from '$server/user-action-authorization';
import { ErrorCode } from '$types/api.types';
import type { UserType } from '$types/auth.types';

import { getPersonCapabilities } from '../person.permissions';
import type { PersonAuditActor } from '../types/person.types';

export type PersonReader = Pick<
  UserType,
  'id' | 'isProtected' | 'permissions' | 'role'
>;

export const requirePersonRead = (
  actor: PersonReader,
  contacts = false,
): void => {
  const capabilities = getPersonCapabilities(actor);
  if (!capabilities.canView || (contacts && !capabilities.canViewContact)) {
    throw new UserActionAuthorizationError(
      ErrorCode.FORBIDDEN,
      contacts
        ? 'Vous ne pouvez pas consulter les coordonnées.'
        : 'Vous ne pouvez pas consulter le répertoire.',
      403,
    );
  }
};

/** Stored audit identity remains intact; only its projection depends on the reader. */
export const projectPersonAuditActor = (
  audit: {
    actorDisplayNameSnapshot: string | null;
    actorLoginNameSnapshot: string | null;
    user: { id: string; isProtected: boolean } | null;
  },
  reader: PersonReader,
): PersonAuditActor => {
  if (audit.user?.isProtected && audit.user.id !== reader.id) {
    return { displayName: PROTECTED_USER_PUBLIC_DISPLAY_NAME, loginName: null };
  }

  return {
    displayName:
      audit.actorDisplayNameSnapshot ??
      audit.actorLoginNameSnapshot ??
      'Compte indisponible',
    loginName: audit.actorLoginNameSnapshot,
  };
};
