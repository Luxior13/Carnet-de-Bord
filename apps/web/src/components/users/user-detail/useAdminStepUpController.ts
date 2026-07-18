'use client';

import { useCallback, useState } from 'react';

import type { AdminStepUpKind } from '$components/users/user-detail/AdminStepUpDialog';
import { ErrorCode } from '$types/api.types';

type PendingStepUpAction = {
  description: string;
  execute: () => Promise<void> | void;
  proofKind: AdminStepUpKind;
  title: string;
};

type PendingStepUpActionInput = Omit<PendingStepUpAction, 'proofKind'>;

type UseAdminStepUpControllerResult = {
  cancelPendingStepUpAction: () => void;
  handleStepUpComplete: () => Promise<void>;
  pendingStepUpAction: PendingStepUpAction | null;
  requestPasswordReauthenticationForResponse: (
    data: unknown,
    action: PendingStepUpActionInput,
  ) => boolean;
  requestStepUpForResponse: (
    data: unknown,
    action: PendingStepUpActionInput,
  ) => boolean;
  setPendingStepUpProofKind: (proofKind: AdminStepUpKind) => void;
};

const getResponseErrorCode = (data: unknown): string | undefined =>
  (data as { error?: { code?: string } } | null | undefined)?.error?.code;

export const useAdminStepUpController = (): UseAdminStepUpControllerResult => {
  const [pendingStepUpAction, setPendingStepUpAction] =
    useState<PendingStepUpAction | null>(null);

  const requestStepUpForResponse = useCallback(
    (data: unknown, action: PendingStepUpActionInput): boolean => {
      const errorCode = getResponseErrorCode(data);

      const proofKind: AdminStepUpKind | null =
        errorCode === ErrorCode.PASSWORD_REAUTHENTICATION_REQUIRED
          ? 'password'
          : errorCode === ErrorCode.CRITICAL_REAUTHENTICATION_REQUIRED
            ? 'critical-mfa'
            : errorCode === ErrorCode.REAUTHENTICATION_REQUIRED
              ? 'full'
              : null;

      if (!proofKind) return false;

      setPendingStepUpAction({ ...action, proofKind });

      return true;
    },
    [],
  );

  const requestPasswordReauthenticationForResponse = useCallback(
    (data: unknown, action: PendingStepUpActionInput): boolean => {
      if (
        getResponseErrorCode(data) !==
        ErrorCode.PASSWORD_REAUTHENTICATION_REQUIRED
      ) {
        return false;
      }

      setPendingStepUpAction({ ...action, proofKind: 'password' });

      return true;
    },
    [],
  );

  const handleStepUpComplete = useCallback(async (): Promise<void> => {
    const action = pendingStepUpAction;

    setPendingStepUpAction(null);
    if (action) await action.execute();
  }, [pendingStepUpAction]);

  const cancelPendingStepUpAction = useCallback((): void => {
    setPendingStepUpAction(null);
  }, []);

  const setPendingStepUpProofKind = useCallback(
    (proofKind: AdminStepUpKind): void => {
      setPendingStepUpAction((currentAction) =>
        currentAction ? { ...currentAction, proofKind } : currentAction,
      );
    },
    [],
  );

  return {
    cancelPendingStepUpAction,
    handleStepUpComplete,
    pendingStepUpAction,
    requestPasswordReauthenticationForResponse,
    requestStepUpForResponse,
    setPendingStepUpProofKind,
  };
};
