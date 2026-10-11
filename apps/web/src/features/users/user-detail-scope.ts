import type { UserType } from '$types/auth.types';

/** A detail snapshot and its drafts belong to one actor and authorization scope. */
export const getUserDetailScope = (
  actor: Pick<UserType, 'id' | 'isProtected' | 'permissions' | 'role'> | null,
): string =>
  actor
    ? JSON.stringify([
        actor.id,
        actor.role,
        actor.isProtected === true,
        Object.entries(actor.permissions ?? {}).sort(([first], [second]) =>
          first.localeCompare(second),
        ),
      ])
    : '';
