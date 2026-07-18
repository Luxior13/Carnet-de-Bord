'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import type {
  AdminStepUpKind,
  AdminStepUpResult,
} from '$components/users/user-detail/AdminStepUpDialog';
import { type ApiResponse, ErrorCode } from '$types/api.types';
import type { UserType } from '$types/auth.types';
import { apiFetch } from '$utils/api.utils';

type PendingStepUpAction = {
  description: string;
  execute: () => Promise<void> | void;
  proofKind: AdminStepUpKind;
  title: string;
};

type PendingStepUpActionInput = Omit<PendingStepUpAction, 'proofKind'>;

type AdminModeStatus = {
  criticalMfaExpiresAt: string | null;
  passwordExpiresAt: string | null;
};

type UseAdminStepUpControllerInput = {
  currentUser: UserType | null;
};

type UseAdminStepUpControllerResult = {
  adminModeExpiresAt: string | null;
  adminModeRemainingLabel: string | null;
  cancelPendingStepUpAction: () => void;
  handleLockAdminMode: () => Promise<void>;
  handleStepUpComplete: (result: AdminStepUpResult) => Promise<void>;
  handleUnlockAdminMode: () => void;
  isAdminModeActive: boolean;
  isAdminModeStatusLoading: boolean;
  isCriticalMfaActive: boolean;
  isLockingAdminMode: boolean;
  pendingStepUpAction: PendingStepUpAction | null;
  refreshAdminModeStatus: (showLoading?: boolean) => Promise<void>;
  requestStepUpForResponse: (
    data: unknown,
    action: PendingStepUpActionInput,
  ) => boolean;
  setPendingStepUpProofKind: (proofKind: AdminStepUpKind) => void;
};

const EMPTY_ADMIN_MODE_STATUS: AdminModeStatus = {
  criticalMfaExpiresAt: null,
  passwordExpiresAt: null,
};

const getFutureTimestamp = (
  value: string | null,
  now: number,
): number | null => {
  if (!value) return null;

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp) && timestamp > now ? timestamp : null;
};

const formatAdminModeRemaining = (
  expiresAt: string | null,
  now: number,
): string | null => {
  const timestamp = getFutureTimestamp(expiresAt, now);
  if (!timestamp) return null;

  const minutes = Math.max(1, Math.ceil((timestamp - now) / 60_000));

  return `${minutes} min restante${minutes > 1 ? 's' : ''}`;
};

export const useAdminStepUpController = ({
  currentUser,
}: UseAdminStepUpControllerInput): UseAdminStepUpControllerResult => {
  const [pendingStepUpAction, setPendingStepUpAction] =
    useState<PendingStepUpAction | null>(null);
  const [adminModeStatus, setAdminModeStatus] = useState<AdminModeStatus>(
    EMPTY_ADMIN_MODE_STATUS,
  );
  const [adminModeClock, setAdminModeClock] = useState(() => Date.now());
  const [isAdminModeStatusLoading, setIsAdminModeStatusLoading] =
    useState(false);
  const [isLockingAdminMode, setIsLockingAdminMode] = useState(false);

  const refreshAdminModeStatus = useCallback(
    async (showLoading = true): Promise<void> => {
      if (showLoading) setIsAdminModeStatusLoading(true);

      try {
        const response = await apiFetch('/api/auth/step-up', {
          cache: 'no-store',
        });
        const data = (await response.json()) as ApiResponse<AdminModeStatus>;

        if (response.ok && data.success) {
          setAdminModeStatus(data.data);
          setAdminModeClock(Date.now());
        } else {
          setAdminModeStatus(EMPTY_ADMIN_MODE_STATUS);
        }
      } catch {
        setAdminModeStatus(EMPTY_ADMIN_MODE_STATUS);
      } finally {
        if (showLoading) setIsAdminModeStatusLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (!currentUser) {
      setAdminModeStatus(EMPTY_ADMIN_MODE_STATUS);

      return;
    }

    void refreshAdminModeStatus();
  }, [currentUser, refreshAdminModeStatus]);

  useEffect(() => {
    if (
      !adminModeStatus.passwordExpiresAt &&
      !adminModeStatus.criticalMfaExpiresAt
    ) {
      return;
    }

    setAdminModeClock(Date.now());
    const interval = window.setInterval(
      (): void => setAdminModeClock(Date.now()),
      15_000,
    );

    return (): void => window.clearInterval(interval);
  }, [adminModeStatus.criticalMfaExpiresAt, adminModeStatus.passwordExpiresAt]);

  const isAdminModeActive =
    getFutureTimestamp(adminModeStatus.passwordExpiresAt, adminModeClock) !==
    null;
  const isCriticalMfaActive =
    isAdminModeActive &&
    getFutureTimestamp(adminModeStatus.criticalMfaExpiresAt, adminModeClock) !==
      null;
  const adminModeRemainingLabel = formatAdminModeRemaining(
    adminModeStatus.passwordExpiresAt,
    adminModeClock,
  );

  const handleUnlockAdminMode = useCallback((): void => {
    setPendingStepUpAction({
      description:
        'Confirmez votre mot de passe une seule fois pour modifier plusieurs utilisateurs sans nouvelle demande.',
      execute: () => refreshAdminModeStatus(false),
      proofKind: 'password',
      title: 'Déverrouiller les modifications',
    });
  }, [refreshAdminModeStatus]);

  const handleLockAdminMode = useCallback(async (): Promise<void> => {
    if (isLockingAdminMode) return;

    try {
      setIsLockingAdminMode(true);
      const response = await apiFetch('/api/auth/step-up', {
        method: 'DELETE',
      });
      const data = (await response.json()) as ApiResponse<AdminModeStatus>;

      if (!response.ok || !data.success) {
        toast.error(
          data.success
            ? 'Impossible de verrouiller le mode administration'
            : data.error.message,
        );

        return;
      }

      setAdminModeStatus(data.data);
      setAdminModeClock(Date.now());
      toast.success('Mode administration verrouillé');
    } catch {
      toast.error('Impossible de verrouiller le mode administration');
    } finally {
      setIsLockingAdminMode(false);
    }
  }, [isLockingAdminMode]);

  const requestStepUpForResponse = useCallback(
    (data: unknown, action: PendingStepUpActionInput): boolean => {
      const errorCode = (
        data as { error?: { code?: string } } | null | undefined
      )?.error?.code;

      const proofKind: AdminStepUpKind | null =
        errorCode === ErrorCode.ADMIN_MODE_REQUIRED
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

  const handleStepUpComplete = useCallback(
    async (result: AdminStepUpResult): Promise<void> => {
      const action = pendingStepUpAction;

      setAdminModeStatus({
        criticalMfaExpiresAt: result.criticalMfaExpiresAt,
        passwordExpiresAt: result.passwordExpiresAt,
      });
      setAdminModeClock(Date.now());
      setPendingStepUpAction(null);
      if (action) await action.execute();
    },
    [pendingStepUpAction],
  );

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
    adminModeExpiresAt: adminModeStatus.passwordExpiresAt,
    adminModeRemainingLabel,
    cancelPendingStepUpAction,
    handleLockAdminMode,
    handleStepUpComplete,
    handleUnlockAdminMode,
    isAdminModeActive,
    isAdminModeStatusLoading,
    isCriticalMfaActive,
    isLockingAdminMode,
    pendingStepUpAction,
    refreshAdminModeStatus,
    requestStepUpForResponse,
    setPendingStepUpProofKind,
  };
};
