'use client';

import { useCallback, useRef, useState } from 'react';

import type { UserSessionInfo } from '$types/auth.types';
import { ApiClientError } from '$utils/api.utils';
import { securityRequest } from '$utils/security-request.utils';

type UseUserDetailSessionsParams = {
  canViewTargetSessions: boolean;
  userId: string;
};

type UseUserDetailSessionsReturn = {
  fetchSecuritySessions: () => Promise<void>;
  hasLoadedSecuritySessions: boolean;
  isLoadingSecuritySessions: boolean;
  securitySessions: UserSessionInfo[];
  securitySessionsError: string | null;
  securitySessionsNotice: string | null;
  setSecuritySessions: React.Dispatch<React.SetStateAction<UserSessionInfo[]>>;
  setSecuritySessionsError: React.Dispatch<React.SetStateAction<string | null>>;
  setSecuritySessionsNotice: React.Dispatch<
    React.SetStateAction<string | null>
  >;
};

export function useUserDetailSessions({
  canViewTargetSessions,
  userId,
}: UseUserDetailSessionsParams): UseUserDetailSessionsReturn {
  const sessionsAbortControllerRef = useRef<AbortController | null>(null);

  const [securitySessions, setSecuritySessions] = useState<UserSessionInfo[]>(
    [],
  );
  const [isLoadingSecuritySessions, setIsLoadingSecuritySessions] =
    useState(false);
  const [hasLoadedSecuritySessions, setHasLoadedSecuritySessions] =
    useState(false);
  const [securitySessionsError, setSecuritySessionsError] = useState<
    string | null
  >(null);
  const [securitySessionsNotice, setSecuritySessionsNotice] = useState<
    string | null
  >(null);

  const fetchSecuritySessions = useCallback(async (): Promise<void> => {
    sessionsAbortControllerRef.current?.abort();
    sessionsAbortControllerRef.current = null;

    if (!canViewTargetSessions) {
      setSecuritySessions([]);
      setSecuritySessionsError(null);
      setIsLoadingSecuritySessions(false);
      setHasLoadedSecuritySessions(true);

      return;
    }

    const controller = new AbortController();
    sessionsAbortControllerRef.current = controller;

    try {
      setIsLoadingSecuritySessions(true);
      setSecuritySessionsError(null);
      const data = await securityRequest<{ sessions: UserSessionInfo[] }>(
        `/api/users/${userId}/sessions`,
        controller.signal,
        { cache: 'no-store' },
      );
      if (controller.signal.aborted) return;
      setSecuritySessions(data.sessions);
    } catch (failure) {
      if (controller.signal.aborted) return;
      if (
        failure instanceof ApiClientError &&
        [401, 403, 404].includes(failure.status)
      )
        setSecuritySessions([]);
      setSecuritySessionsError('Impossible de charger les sessions');
    } finally {
      if (sessionsAbortControllerRef.current !== controller) return;

      sessionsAbortControllerRef.current = null;
      setHasLoadedSecuritySessions(true);
      setIsLoadingSecuritySessions(false);
    }
  }, [canViewTargetSessions, userId]);

  return {
    fetchSecuritySessions,
    hasLoadedSecuritySessions,
    isLoadingSecuritySessions,
    securitySessions,
    securitySessionsError,
    securitySessionsNotice,
    setSecuritySessions,
    setSecuritySessionsError,
    setSecuritySessionsNotice,
  };
}
