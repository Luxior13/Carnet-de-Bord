'use client';

import {
  type RefObject,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import { ApiClientError, apiFetchJson } from '$utils/api.utils';

import type { useAdminStepUpController } from './useAdminStepUpController';

const TEMPORARY_PASSWORD_DISPLAY_MS = 2 * 60 * 1000;
type PasswordResetController = {
  acknowledged: boolean;
  announcementRef: RefObject<HTMLDivElement | null>;
  check: (load: () => Promise<boolean>) => Promise<void>;
  clearPassword: () => void;
  error: string | null;
  expired: boolean;
  hasUnacknowledgedPassword: boolean;
  isChecking: boolean;
  isResetting: boolean;
  outcomeUnknown: boolean;
  password: string | null;
  reset: () => Promise<void>;
  setAcknowledged: (value: boolean) => void;
  verification: string | null;
  verified: boolean;
};
export const useUserPasswordReset = ({
  beginMutation,
  canReset,
  finishMutation,
  onClose,
  onSuccess,
  requestStepUp,
  userId,
}: {
  beginMutation: () => boolean;
  canReset: boolean;
  finishMutation: () => void;
  onClose: () => void;
  onSuccess: () => void;
  requestStepUp: ReturnType<
    typeof useAdminStepUpController
  >['requestStepUpForResponse'];
  userId: string;
}): PasswordResetController => {
  const [isResetting, setIsResetting] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [expired, setExpired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outcomeUnknown, setOutcomeUnknown] = useState(false);
  const [verified, setVerified] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [verification, setVerification] = useState<string | null>(null);
  const active = useRef<AbortController | null>(null);
  const busy = useRef(false);
  const mounted = useRef(true);
  const canResetRef = useRef(canReset);
  canResetRef.current = canReset;
  const announcementRef = useRef<HTMLDivElement>(null);
  const clearPassword = useCallback((): void => {
    setPassword(null);
    setAcknowledged(false);
  }, []);

  useEffect(() => {
    mounted.current = true;

    return (): void => {
      mounted.current = false;
      active.current?.abort();
    };
  }, []);
  useEffect(() => {
    clearPassword();
    setExpired(false);
    setError(null);
    setOutcomeUnknown(false);
    setVerified(false);
    setVerification(null);
  }, [clearPassword, userId]);
  useEffect(() => {
    if (!canReset) {
      active.current?.abort();
      clearPassword();
    }
  }, [canReset, clearPassword]);
  useEffect(() => {
    if (!password) return;
    const timeout = setTimeout(() => {
      clearPassword();
      setExpired(true);
    }, TEMPORARY_PASSWORD_DISPLAY_MS);

    return (): void => clearTimeout(timeout);
  }, [clearPassword, password]);
  const focus = (): void => {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => announcementRef.current?.focus()),
    );
  };
  const reset = async (): Promise<void> => {
    if (
      !mounted.current ||
      !canResetRef.current ||
      busy.current ||
      (outcomeUnknown && !verified) ||
      !beginMutation()
    )
      return;
    busy.current = true;
    setIsResetting(true);
    setError(null);
    setVerification(null);
    const controller = new AbortController();
    active.current = controller;
    const timeout = setTimeout(() => controller.abort(), 30_000);
    try {
      const data = await apiFetchJson<{ temporaryPassword: string }>(
        `/api/users/${userId}/reset-password`,
        { method: 'POST', signal: controller.signal },
      );
      if (!mounted.current || !canResetRef.current) return;
      if (controller.signal.aborted) throw new Error('Reset response expired');
      if (typeof data.temporaryPassword !== 'string' || !data.temporaryPassword)
        throw new Error('Missing temporary password');
      setPassword(data.temporaryPassword);
      setAcknowledged(false);
      setExpired(false);
      setOutcomeUnknown(false);
      setVerified(false);
      toast.success('Mot de passe réinitialisé');
      onSuccess();
      focus();
    } catch (failure) {
      if (!mounted.current || !canResetRef.current) return;
      if (
        failure instanceof ApiClientError &&
        requestStepUp(
          { error: { code: failure.code } },
          {
            description:
              'Un nouveau secret temporaire sera créé et toutes les sessions de l’utilisateur seront fermées.',
            execute: reset,
            title: 'Confirmer la réinitialisation du mot de passe',
          },
        )
      )
        return;
      const uncertain =
        !(failure instanceof ApiClientError) ||
        failure.status >= 500 ||
        failure.code === 'INVALID_RESPONSE';
      setOutcomeUnknown(uncertain);
      setVerified(false);
      setError(
        uncertain
          ? 'La réponse du serveur n’a pas été reçue correctement. Le mot de passe a peut-être été réinitialisé et les sessions fermées. Vérifiez le compte avant d’émettre un nouveau mot de passe.'
          : failure.message,
      );
      clearPassword();
      focus();
    } finally {
      clearTimeout(timeout);
      active.current = null;
      busy.current = false;
      finishMutation();
      if (mounted.current) {
        setIsResetting(false);
        onClose();
      }
    }
  };
  const check = async (load: () => Promise<boolean>): Promise<void> => {
    if (busy.current) return;
    busy.current = true;
    setIsChecking(true);
    try {
      const success = await load();
      if (!mounted.current) return;
      setVerified(success);
      setVerification(
        success
          ? 'L’état du compte est actualisé. Le secret précédent ne peut pas être récupéré. Si vous ne l’avez pas reçu, confirmez l’émission d’un nouveau mot de passe ; il remplacera le précédent.'
          : 'Vérification impossible. Réessayez lorsque le compte est accessible.',
      );
    } finally {
      busy.current = false;
      if (mounted.current) setIsChecking(false);
    }
  };

  return {
    acknowledged,
    announcementRef,
    check,
    clearPassword,
    error,
    expired,
    hasUnacknowledgedPassword: !!password && !acknowledged,
    isChecking,
    isResetting,
    outcomeUnknown,
    password,
    reset,
    setAcknowledged,
    verification,
    verified,
  };
};
