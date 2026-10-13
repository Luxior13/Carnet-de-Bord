import 'server-only';

import type { Prisma } from '@prisma/client';
import type { NextResponse } from 'next/server';

import { apiError } from '$server/api-response';
import {
  authorizeUserAction,
  UserActionAuthorizationError,
} from '$server/user-action-authorization';
import type { ApiErrorResponse } from '$types/api.types';
import type { SessionType, UserType } from '$types/auth.types';

/** HTTP adapter preserving the managed-session route's refusal contract. */
export async function authorizeManagedSessions(
  transaction: Prisma.TransactionClient,
  actor: UserType,
  source: SessionType | null,
  targetId: string,
  permission: string,
): Promise<
  | (Awaited<ReturnType<typeof authorizeUserAction>> & { success: true })
  | { response: NextResponse<ApiErrorResponse>; success: false }
> {
  try {
    const result = await authorizeUserAction(
      transaction,
      { actorId: actor.id, session: source },
      permission,
      targetId,
    );

    return { ...result, success: true as const };
  } catch (error) {
    if (!(error instanceof UserActionAuthorizationError)) throw error;

    return {
      response: apiError(error.code, error.message, error.status),
      success: false as const,
    };
  }
}
