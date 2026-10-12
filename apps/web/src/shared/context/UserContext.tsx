'use client';

import { useRouter } from 'next/navigation';
import React, {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { toast } from 'sonner';

import { Button } from '$components/ui/button';
import {
  type ApiResponse,
  type ApiSuccessResponse,
  RoutesApi,
} from '$types/api.types';
import {
  type AuthenticatedLoginData,
  type AuthSessionResponse,
  type LoginCredentials,
  type LoginResponseData,
  type LoginResult,
  type UserType,
} from '$types/auth.types';
import { Alert, AlertDescription, AlertTitle } from '$ui/alert';
import { apiFetch } from '$utils/api.utils';

// Auto-logout after 30 minutes of inactivity
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
// Show warning 5 minutes before timeout
const WARNING_BEFORE_MS = 5 * 60 * 1000;
const ACTIVITY_TIMER_RESET_THROTTLE_MS = 15 * 1000;
const SERVER_ACTIVITY_SYNC_INTERVAL_MS = 60 * 1000;
const SESSION_READ_TIMEOUT_MS = 15_000;
const SESSION_ACTIVITY_STORAGE_KEY = 'team-control:last-session-activity';
const ACTIVITY_EVENTS = [
  'mousedown',
  'keydown',
  'scroll',
  'touchstart',
] as const;
const ACTIVITY_LISTENER_OPTIONS: AddEventListenerOptions = { passive: true };
const ACTIVITY_REMOVE_LISTENER_OPTIONS: EventListenerOptions = {
  capture: false,
};

const publishSessionActivity = (activityAt: number): void => {
  try {
    window.localStorage.setItem(
      SESSION_ACTIVITY_STORAGE_KEY,
      activityAt.toString(),
    );
  } catch {
    // Storage can be unavailable in hardened browser contexts. The server-side
    // idle deadline remains authoritative in that case.
  }
};

type AuthenticationRequestOptions = { signal?: AbortSignal };

type ContextType = {
  applyUserUpdate: (user: UserType) => void;
  authorizationRevision: number;
  cancelMfaChallenge: (options?: AuthenticationRequestOptions) => Promise<void>;
  clearError: () => void;
  completeAuthentication: (data: AuthenticatedLoginData) => void;
  error: string | null;
  extendSession: () => Promise<void>;
  isLoading: boolean;
  login: (
    credentials: LoginCredentials,
    options?: AuthenticationRequestOptions,
  ) => Promise<LoginResult | null>;
  logout: () => Promise<void>;
  mustChangePassword: boolean;
  refreshUser: () => Promise<void>;
  showSessionWarning: boolean;
  userData: UserType | null;
  verifyMfa: (
    code: string,
    options?: AuthenticationRequestOptions,
  ) => Promise<boolean>;
};

const UserContext = createContext<ContextType>({
  applyUserUpdate: () => {},
  authorizationRevision: 0,
  cancelMfaChallenge: async () => {},
  clearError: () => {},
  completeAuthentication: () => {},
  error: null,
  extendSession: async () => {},
  isLoading: true,
  login: async () => null,
  logout: async () => {},
  mustChangePassword: false,
  refreshUser: async () => {},
  showSessionWarning: false,
  userData: null,
  verifyMfa: async () => false,
});

type UserProviderProps = {
  children: ReactNode;
  initialSessionRememberMe?: boolean;
  initialUser?: UserType | null;
};

export const UserProvider: FC<UserProviderProps> = ({
  children,
  initialSessionRememberMe = false,
  initialUser = null,
}) => {
  const router = useRouter();
  const [userData, setUserData] = useState<UserType | null>(initialUser);
  const [authorizationRevision, setAuthorizationRevision] = useState(0);
  const [isLoading, setIsLoading] = useState<boolean>(initialUser === null);
  const [error, setError] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(
    initialUser?.mustChangePassword ?? false,
  );
  const [sessionRememberMe, setSessionRememberMe] = useState<boolean>(
    initialUser ? initialSessionRememberMe : false,
  );
  const [showSessionWarning, setShowSessionWarning] = useState<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());
  const lastServerActivitySyncRef = useRef<number>(Date.now());
  const showSessionWarningRef = useRef(false);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resetSessionTimersRef = useRef<() => void>(() => {});
  const currentUserRef = useRef(initialUser);
  const sessionOperationRef = useRef(0);
  const logoutInProgressRef = useRef(false);
  const mountedRef = useRef(true);
  const sessionReadsRef = useRef(new Set<AbortController>());
  useEffect(() => {
    mountedRef.current = true;
    const sessionReads = sessionReadsRef.current;

    return (): void => {
      mountedRef.current = false;
      sessionOperationRef.current += 1;
      for (const controller of sessionReads) controller.abort();
      sessionReads.clear();
    };
  }, []);

  const acceptUserSnapshot = useCallback((nextUser: UserType): boolean => {
    if (!mountedRef.current || logoutInProgressRef.current) return false;
    const currentUser = currentUserRef.current;
    if (
      currentUser?.id === nextUser.id &&
      currentUser.updatedAt &&
      nextUser.updatedAt &&
      new Date(nextUser.updatedAt).getTime() <
        new Date(currentUser.updatedAt).getTime()
    )
      return false;
    sessionOperationRef.current += 1;
    currentUserRef.current = nextUser;
    setUserData(nextUser);
    // A fresh server snapshot may represent a new session, role or permission
    // revision. Consumers holding decrypted data must invalidate it even when
    // the visible user fields happen to be unchanged.
    setAuthorizationRevision((revision) => revision + 1);
    setMustChangePassword(nextUser.mustChangePassword);
    setIsLoading(false);
    setError(null);

    return true;
  }, []);

  const applyUserUpdate = useCallback(
    (nextUser: UserType): void => {
      // A mutation updates the mounted account; only authentication/session
      // reads may establish another identity.
      if (currentUserRef.current?.id !== nextUser.id) return;
      acceptUserSnapshot(nextUser);
    },
    [acceptUserSnapshot],
  );

  const clearAuthenticatedUser = useCallback((): void => {
    sessionOperationRef.current += 1;
    currentUserRef.current = null;
    setUserData(null);
    setAuthorizationRevision((revision) => revision + 1);
    setMustChangePassword(false);
    setSessionRememberMe(false);
    setIsLoading(false);
    showSessionWarningRef.current = false;
    setShowSessionWarning(false);
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const completeAuthentication = useCallback(
    (data: AuthenticatedLoginData): void => {
      const activityAt = Date.now();

      if (!acceptUserSnapshot(data.user)) return;
      setMustChangePassword(data.mustChangePassword);
      setSessionRememberMe(data.session.rememberMe);
      lastActivityRef.current = activityAt;
      lastServerActivitySyncRef.current = activityAt;
      publishSessionActivity(activityAt);
      toast.success('Connexion réussie');
    },
    [acceptUserSnapshot],
  );

  const fetchUser = useCallback(
    async (silent = false): Promise<void> => {
      // A refresh cannot supersede a logout while its cookie is still valid.
      if (!mountedRef.current || logoutInProgressRef.current) return;
      const operation = ++sessionOperationRef.current;
      const isCurrent = (): boolean =>
        mountedRef.current && operation === sessionOperationRef.current;
      const controller = new AbortController();
      sessionReadsRef.current.add(controller);
      const timeout = setTimeout(
        () => controller.abort(),
        SESSION_READ_TIMEOUT_MS,
      );
      try {
        if (!silent) setIsLoading(true);
        setError(null);

        const response = await fetch(RoutesApi.me, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!isCurrent()) return;
        if (controller.signal.aborted)
          throw new Error('Session check timed out');
        if (response.status === 401 || response.status === 403) {
          clearAuthenticatedUser();

          return;
        }
        const data: ApiSuccessResponse<{
          session: AuthSessionResponse | null;
          user: UserType;
        }> = await response.json();
        if (!isCurrent()) return;
        if (controller.signal.aborted)
          throw new Error('Session check timed out');

        if (
          !response.ok &&
          response.status !== 401 &&
          response.status !== 403
        ) {
          throw new Error('Session check failed');
        }

        if (data.success && data.data.user) {
          const activityAt = Date.now();
          if (!acceptUserSnapshot(data.data.user)) return;
          setSessionRememberMe(data.data.session?.rememberMe ?? false);
          lastActivityRef.current = activityAt;
          lastServerActivitySyncRef.current = activityAt;
          publishSessionActivity(activityAt);
        } else {
          clearAuthenticatedUser();
          setMustChangePassword(false);
          setSessionRememberMe(false);
        }
      } catch {
        if (!isCurrent()) return;
        if (!silent) {
          clearAuthenticatedUser();
          setMustChangePassword(false);
          setSessionRememberMe(false);
        }
        setError('Impossible de vérifier votre session');
      } finally {
        clearTimeout(timeout);
        sessionReadsRef.current.delete(controller);
        if (isCurrent()) setIsLoading(false);
      }
    },
    [acceptUserSnapshot, clearAuthenticatedUser],
  );

  const refreshUser = useCallback(async (): Promise<void> => {
    // Preserve an already mounted account, but use the normal loading state
    // when retrying an initial session failure so the layout cannot redirect
    // to /login while the retry is still pending.
    await fetchUser(userData !== null);
  }, [fetchUser, userData]);

  const logout = useCallback(async (): Promise<void> => {
    if (logoutInProgressRef.current) return;
    logoutInProgressRef.current = true;
    clearAuthenticatedUser();
    const operation = sessionOperationRef.current;
    const isCurrent = (): boolean =>
      mountedRef.current && operation === sessionOperationRef.current;
    setIsLoading(true);
    setMustChangePassword(false);
    setSessionRememberMe(false);
    setError(null);

    try {
      await apiFetch(RoutesApi.logout, { method: 'POST' });
      if (!isCurrent()) return;
      toast.success('Déconnexion réussie');
    } catch {
      if (!isCurrent()) return;
      toast.error('Erreur lors de la déconnexion');
    } finally {
      if (isCurrent()) {
        router.push('/login');
        setIsLoading(false);
      }
      logoutInProgressRef.current = false;
    }
  }, [clearAuthenticatedUser, router]);

  const syncSessionActivity = useCallback(async (): Promise<boolean> => {
    if (
      !mountedRef.current ||
      logoutInProgressRef.current ||
      !currentUserRef.current
    )
      return false;
    const operation = ++sessionOperationRef.current;
    const isCurrent = (): boolean =>
      mountedRef.current && operation === sessionOperationRef.current;
    lastServerActivitySyncRef.current = Date.now();
    const controller = new AbortController();
    sessionReadsRef.current.add(controller);
    const timeout = setTimeout(
      () => controller.abort(),
      SESSION_READ_TIMEOUT_MS,
    );

    try {
      const response = await fetch(RoutesApi.me, {
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!isCurrent() || controller.signal.aborted) return false;

      if (response.status === 401 || response.status === 403) {
        clearAuthenticatedUser();
        setMustChangePassword(false);
        setSessionRememberMe(false);
        router.push('/login');

        return false;
      }

      if (!response.ok) return false;

      const data = (await response.json()) as ApiResponse<{
        session: AuthSessionResponse | null;
        user: UserType;
      }>;
      if (!isCurrent() || controller.signal.aborted) return false;
      if (!data.success || !data.data.user) return false;

      const activityAt = Date.now();
      if (!acceptUserSnapshot(data.data.user)) return false;
      setSessionRememberMe(data.data.session?.rememberMe ?? false);
      lastActivityRef.current = activityAt;
      lastServerActivitySyncRef.current = activityAt;
      publishSessionActivity(activityAt);

      return true;
    } catch {
      return false;
    } finally {
      clearTimeout(timeout);
      sessionReadsRef.current.delete(controller);
    }
  }, [acceptUserSnapshot, clearAuthenticatedUser, router]);

  const login = useCallback(
    async (
      credentials: LoginCredentials,
      { signal }: AuthenticationRequestOptions = {},
    ): Promise<LoginResult | null> => {
      if (!mountedRef.current || logoutInProgressRef.current || signal?.aborted)
        return null;
      const operation = ++sessionOperationRef.current;
      const isCurrent = (): boolean =>
        mountedRef.current &&
        !logoutInProgressRef.current &&
        operation === sessionOperationRef.current &&
        !signal?.aborted;
      try {
        setError(null);

        const response = await apiFetch(RoutesApi.login, {
          body: JSON.stringify(credentials),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
          ...(signal ? { signal } : {}),
        });
        if (!isCurrent()) return null;
        const data = (await response.json()) as ApiResponse<LoginResponseData>;
        if (!isCurrent()) return null;

        if (response.ok && data.success) {
          if (
            !['mfa_required', 'mfa_setup_required'].includes(
              data.data.status,
            ) ||
            !Number.isFinite(Date.parse(data.data.challengeExpiresAt))
          )
            throw new Error('Invalid login response');

          return data.data;
        }

        const errorMessage = data.success
          ? 'Erreur de connexion'
          : data.error.message || 'Erreur de connexion';

        setError(errorMessage);

        return null;
      } catch {
        if (!isCurrent()) return null;
        const errorMessage = 'Impossible de confirmer la connexion. Réessayez.';
        setError(errorMessage);

        return null;
      }
    },
    [],
  );

  const verifyMfa = useCallback(
    async (
      code: string,
      { signal }: AuthenticationRequestOptions = {},
    ): Promise<boolean> => {
      if (!mountedRef.current || logoutInProgressRef.current || signal?.aborted)
        return false;
      const operation = ++sessionOperationRef.current;
      const isCurrent = (): boolean =>
        mountedRef.current &&
        !logoutInProgressRef.current &&
        operation === sessionOperationRef.current;
      try {
        setError(null);
        const response = await apiFetch(RoutesApi.mfaVerify, {
          body: JSON.stringify({ code }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
          ...(signal ? { signal } : {}),
        });
        if (!isCurrent()) return false;
        if (signal?.aborted) throw new Error('MFA response timed out');
        const data =
          (await response.json()) as ApiResponse<AuthenticatedLoginData>;
        if (!isCurrent()) return false;
        if (signal?.aborted || response.status >= 500)
          throw new Error('MFA result unknown');

        if (
          response.ok &&
          data.success &&
          data.data.status === 'authenticated' &&
          data.data.user?.id &&
          data.data.session &&
          typeof data.data.mustChangePassword === 'boolean'
        ) {
          completeAuthentication(data.data);

          return true;
        }

        if (response.ok || data.success || !data.error?.message)
          throw new Error('Invalid MFA response');
        setError(data.error.message);

        return false;
      } catch {
        if (!isCurrent()) return false;
        const message =
          'Le résultat de la connexion n’a pas pu être confirmé. Vérifiez la session ou recommencez la connexion.';
        if (!signal?.aborted) setError(message);
        // A TOTP/recovery proof may already be consumed: never invite a blind replay.
        throw new Error(message);
      }
    },
    [completeAuthentication],
  );

  const cancelMfaChallenge = useCallback(
    async ({ signal }: AuthenticationRequestOptions = {}): Promise<void> => {
      if (!mountedRef.current || signal?.aborted) return;
      sessionOperationRef.current += 1;
      setError(null);

      try {
        await apiFetch(RoutesApi.mfaChallenge, {
          method: 'DELETE',
          ...(signal ? { signal } : {}),
        });
      } catch {
        // The challenge is deliberately short-lived. Returning to the login
        // form must remain possible even if its best-effort deletion fails.
      }
    },
    [],
  );

  useEffect(() => {
    if (initialUser) return;

    void fetchUser();
  }, [fetchUser, initialUser]);

  // Function to extend session (reset timers)
  const extendSession = useCallback(async (): Promise<void> => {
    const didExtendSession = await syncSessionActivity();

    if (!didExtendSession) {
      toast.error('Impossible de prolonger la session');

      return;
    }

    showSessionWarningRef.current = false;
    setShowSessionWarning(false);
    lastActivityRef.current = Date.now();
    resetSessionTimersRef.current();
  }, [syncSessionActivity]);

  useEffect(() => {
    showSessionWarningRef.current = showSessionWarning;
  }, [showSessionWarning]);

  // Auto-logout after inactivity with warning
  useEffect(() => {
    const clearTimers = (): void => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
      }
    };

    if (!userData || sessionRememberMe) {
      clearTimers();
      showSessionWarningRef.current = false;
      setShowSessionWarning(false);

      return;
    }

    const resetTimers = (): void => {
      clearTimers();

      // Set warning timeout (5 minutes before logout)
      warningTimeoutRef.current = setTimeout((): void => {
        showSessionWarningRef.current = true;
        setShowSessionWarning(true);
      }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS);

      // Set logout timeout
      logoutTimeoutRef.current = setTimeout((): void => {
        toast.warning('Session expirée pour inactivité');
        void logout();
      }, INACTIVITY_TIMEOUT_MS);
    };

    resetSessionTimersRef.current = resetTimers;

    const handleActivity = (): void => {
      // Don't reset if warning is showing - user must click button
      if (showSessionWarningRef.current) return;

      const now = Date.now();
      if (now - lastActivityRef.current < ACTIVITY_TIMER_RESET_THROTTLE_MS) {
        return;
      }

      lastActivityRef.current = now;
      publishSessionActivity(now);
      resetTimers();

      if (
        now - lastServerActivitySyncRef.current >=
        SERVER_ACTIVITY_SYNC_INTERVAL_MS
      ) {
        void syncSessionActivity();
      }
    };

    const handleSharedActivity = (event: StorageEvent): void => {
      if (
        event.key !== SESSION_ACTIVITY_STORAGE_KEY ||
        event.newValue === null
      ) {
        return;
      }

      const activityAt = Number(event.newValue);
      if (
        !Number.isFinite(activityAt) ||
        activityAt <= lastActivityRef.current
      ) {
        return;
      }

      lastActivityRef.current = activityAt;
      showSessionWarningRef.current = false;
      setShowSessionWarning(false);
      resetTimers();
    };

    // Track user activity
    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(event, handleActivity, ACTIVITY_LISTENER_OPTIONS);
    });
    window.addEventListener('storage', handleSharedActivity);

    // Initialize timers
    resetTimers();

    return (): void => {
      ACTIVITY_EVENTS.forEach((event): void => {
        window.removeEventListener(
          event,
          handleActivity,
          ACTIVITY_REMOVE_LISTENER_OPTIONS,
        );
      });
      window.removeEventListener('storage', handleSharedActivity);
      clearTimers();
      resetSessionTimersRef.current = (): void => {};
    };
  }, [userData, sessionRememberMe, logout, syncSessionActivity]);

  useEffect(() => {
    if (!userData || !sessionRememberMe) return;

    const handleRememberedSessionActivity = (): void => {
      const now = Date.now();

      if (
        now - lastServerActivitySyncRef.current <
        SERVER_ACTIVITY_SYNC_INTERVAL_MS
      ) {
        return;
      }

      void syncSessionActivity();
    };

    ACTIVITY_EVENTS.forEach((event) => {
      window.addEventListener(
        event,
        handleRememberedSessionActivity,
        ACTIVITY_LISTENER_OPTIONS,
      );
    });

    return (): void => {
      ACTIVITY_EVENTS.forEach((event) => {
        window.removeEventListener(
          event,
          handleRememberedSessionActivity,
          ACTIVITY_REMOVE_LISTENER_OPTIONS,
        );
      });
    };
  }, [sessionRememberMe, syncSessionActivity, userData]);

  return (
    <UserContext.Provider
      value={{
        applyUserUpdate,
        authorizationRevision,
        cancelMfaChallenge,
        clearError,
        completeAuthentication,
        error,
        extendSession,
        isLoading,
        login,
        logout,
        mustChangePassword,
        refreshUser,
        showSessionWarning,
        userData,
        verifyMfa,
      }}
    >
      {children}
      {showSessionWarning && (
        <Alert
          aria-describedby="session-warning-description"
          aria-labelledby="session-warning-title"
          aria-live="assertive"
          className="fixed right-4 bottom-4 z-50 w-[calc(100%-2rem)] max-w-sm shadow-[var(--shadow-panel-strong)]"
          role="alert"
        >
          <AlertTitle id="session-warning-title" className="mb-2">
            Session bientôt expirée
          </AlertTitle>
          <AlertDescription
            id="session-warning-description"
            className="text-muted-foreground mb-3 text-sm"
          >
            Votre session va expirer dans quelques minutes pour inactivité.
          </AlertDescription>
          <div className="col-start-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void extendSession()}>
              Rester connecté
            </Button>
            <Button size="sm" variant="outline" onClick={logout}>
              Se déconnecter
            </Button>
          </div>
        </Alert>
      )}
    </UserContext.Provider>
  );
};

export const useUser = (): ContextType => useContext(UserContext);
