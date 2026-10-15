import 'server-only';

import type { Prisma } from '@prisma/client';

import { PERMISSIONS } from '$constants/permissions.constants';
import {
  authorizeUserAction,
  type UserActionAuthority,
} from '$server/user-action-authorization';
import type { UserType } from '$types/auth.types';

export type PersonMutationActor = UserType & {
  session: UserActionAuthority['session'];
};

/** Recheck authority after the target wait, before reading mutation inputs. */
export const authorizePersonMutation = async (
  transaction: Prisma.TransactionClient,
  actor: PersonMutationActor,
  permission:
    | typeof PERMISSIONS.PERSONS.CREATE
    | typeof PERMISSIONS.PERSONS.DELETE
    | typeof PERMISSIONS.PERSONS.UPDATE_CONTACT
    | typeof PERMISSIONS.PERSONS.UPDATE,
  personId?: string,
): Promise<void> => {
  if (personId) {
    await transaction.$queryRaw`
      SELECT "id" FROM "Person" WHERE "id" = ${personId} FOR UPDATE
    `;
  }
  // Keep the actor and source stable until commit; expiry is evaluated only
  // after any wait on Person, User or Session has completed.
  await authorizeUserAction(
    transaction,
    { actorId: actor.id, authorization: actor, session: actor.session },
    permission,
  );
};
