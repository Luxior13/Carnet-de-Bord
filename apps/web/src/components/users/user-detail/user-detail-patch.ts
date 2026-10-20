import type { UserType } from '$types/auth.types';

import type { SubmittedUserDraft, UserDetailForm } from './user-detail-draft';
import { requestUserDetailMutation } from './user-detail-request';

type StepUpAction = {
  description: string;
  execute: () => Promise<void> | void;
  title: string;
};

export type UserDetailPatchContext = {
  isMounted: () => boolean;
  /** Mutation lifetime, replaced when the record changes or unmounts. */
  lifetime: { current: AbortController };
  mutation: {
    finish: () => void;
    report: (
      section: SubmittedUserDraft['section'],
      message: string,
      status?: number,
      details?: Record<string, string[]>,
      form?: UserDetailForm,
    ) => void;
    start: () => boolean;
  };
  syncUserState: (user: UserType, submitted?: SubmittedUserDraft) => void;
  userId: string;
};

/**
 * Shared lifecycle of the PATCH saves of a user record (profile, access,
 * personal account, account state): one mutation at a time, response bound to
 * the record lifetime, step-up or password confirmation when the server asks,
 * and an explicit uncertain state when the answer cannot be confirmed.
 */
export const runUserDetailPatch = async (
  context: UserDetailPatchContext,
  {
    body,
    confirm,
    onSuccess,
    setPending,
    submitted,
  }: {
    body: Record<string, unknown>;
    confirm: {
      action: StepUpAction;
      request: (data: unknown, action: StepUpAction) => boolean;
    };
    onSuccess: (user: UserType, signal: AbortSignal) => void;
    setPending: (pending: boolean) => void;
    submitted: SubmittedUserDraft;
  },
): Promise<void> => {
  const { isMounted, lifetime, mutation, syncUserState, userId } = context;
  if (!mutation.start()) return;
  const requestController = lifetime.current;
  setPending(true);
  try {
    const { data, response } = await requestUserDetailMutation<{
      user: UserType;
    }>(`/api/users/${userId}`, requestController.signal, {
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
      method: 'PATCH',
      signal: requestController.signal,
    });
    if (!isMounted() || requestController.signal.aborted) return;

    if (response.ok && data.success) {
      syncUserState(data.data.user, submitted);
      onSuccess(data.data.user, requestController.signal);
    } else {
      if (confirm.request(data, confirm.action)) return;
      mutation.report(
        submitted.section,
        data.error?.message || 'Erreur lors de la mise à jour',
        response.status,
        data.error?.details,
        submitted.form,
      );
    }
  } catch {
    if (!isMounted() || requestController.signal.aborted) return;
    mutation.report(
      submitted.section,
      'La réponse du serveur n’a pas pu être confirmée. Actualisez la fiche avant de réessayer ; votre saisie sera conservée.',
    );
  } finally {
    if (requestController === lifetime.current) {
      mutation.finish();
      if (isMounted()) setPending(false);
    }
  }
};
