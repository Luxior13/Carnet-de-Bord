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
  ErrorCode,
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
import { apiFetch } from '$utils/api.utils';

// Auto-logout after 30 minutes of inactivity
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000;
// Show warning 5 minutes before timeout
const WARNING_BEFORE_MS = 5 * 60 * 1000;
const ACTIVITY_TIMER_RESET_THROTTLE_MS = 15 * 1000;
const SERVER_ACTIVITY_SYNC_INTERVAL_MS = 60 * 1000;
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

type ContextType = {
  applyUserUpdate: (user: UserType) => void;
  cancelMfaChallenge: () => Promise<void>;
  clearError: () => void;
  completeAuthentication: (data: AuthenticatedLoginData) => void;
  error: string | null;
  extendSession: () => Promise<void>;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<LoginResult | null>;
  logout: () => Promise<void>;
  mustChangePassword: boolean;
  refreshUser: () => Promise<void>;
  showSessionWarning: boolean;
  userData: UserType | null;
  verifyMfa: (code: string) => Promise<boolean>;
};

const UserContext = createContext<ContextType>({
  applyUserUpdate: () => {},
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

  const applyUserUpdate = useCallback((nextUser: UserType): void => {
    setUserData(nextUser);
    setMustChangePassword(nextUser.mustChangePassword);
    setError(null);
  }, []);

  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  const completeAuthentication = useCallback(
    (data: AuthenticatedLoginData): void => {
      const activityAt = Date.now();

      applyUserUpdate(data.user);
      setMustChangePassword(data.mustChangePassword);
      setSessionRememberMe(data.session.rememberMe);
      lastActivityRef.current = activityAt;
      lastServerActivitySyncRef.current = activityAt;
      publishSessionActivity(activityAt);
      toast.success('Connexion réussie');
    },
    [applyUserUpdate],
  );

  const fetchUser = useCallback(
    async (silent = false): Promise<void> => {
      try {
        if (!silent) setIsLoading(true);
        setError(null);

        const response = await fetch(RoutesApi.me, { cache: 'no-store' });
        const data: ApiSuccessResponse<{
          session: AuthSessionResponse | null;
          user: UserType;
        }> = await response.json();

        if (
          !response.ok &&
          response.status !== 401 &&
          response.status !== 403
        ) {
          throw new Error('Session check failed');
        }

        if (data.success && data.data.user) {
          const activityAt = Date.now();
          applyUserUpdate(data.data.user);
          setSessionRememberMe(data.data.session?.rememberMe ?? false);
          lastActivityRef.current = activityAt;
          lastServerActivitySyncRef.current = activityAt;
          publishSessionActivity(activityAt);
        } else {
          setUserData(null);
          setMustChangePassword(false);
          setSessionRememberMe(false);
        }
      } catch {
        if (!silent) {
          setUserData(null);
          setMustChangePassword(false);
          setSessionRememberMe(false);
        }
        setError('Impossible de vérifier votre session');
      } finally {
        if (!silent) setIsLoading(false);
      }
    },
    [applyUserUpdate],
  );

  const refreshUser = useCallback(async (): Promise<void> => {
    // Preserve an already mounted account, but use the normal loading state
    // when retrying an initial session failure so the layout cannot redirect
    // to /login while the retry is still pending.
    await fetchUser(userData !== null);
  }, [fetchUser, userData]);

  const logout = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setUserData(null);
    setMustChangePassword(false);
    setSessionRememberMe(false);
    setError(null);

    try {
      await apiFetch(RoutesApi.logout, { method: 'POST' });
      toast.success('Déconnexion réussie');
    } catch {
      toast.error('Erreur lors de la déconnexion');
    } finally {
      router.push('/login');
      setIsLoading(false);
    }
  }, [router]);

  const syncSessionActivity = useCallback(async (): Promise<boolean> => {
    lastServerActivitySyncRef.current = Date.now();

    try {
      const response = await fetch(RoutesApi.me, { cache: 'no-store' });

      if (response.status === 401) {
        setUserData(null);
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
      if (!data.success || !data.data.user) return false;

      const activityAt = Date.now();
      applyUserUpdate(data.data.user);
      setSessionRememberMe(data.data.session?.rememberMe ?? false);
      lastActivityRef.current = activityAt;
      lastServerActivitySyncRef.current = activityAt;
      publishSessionActivity(activityAt);

      return true;
    } catch {
      return false;
    }
  }, [applyUserUpdate, router]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<LoginResult | null> => {
      try {
        setError(null);

        const response = await apiFetch(RoutesApi.login, {
          body: JSON.stringify(credentials),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        });
        const data = (await response.json()) as ApiResponse<LoginResponseData>;

        if (response.ok && data.success) {
          return data.data;
        }

        const errorCode = data.success ? undefined : data.error.code;
        const errorMessage = data.success
          ? 'Erreur de connexion'
          : data.error.message || 'Erreur de connexion';

        setError(errorMessage);

        if (errorCode === ErrorCode.INVALID_CREDENTIALS) {
          toast.error('Identifiant ou mot de passe incorrect');
        } else if (errorCode === ErrorCode.ACCOUNT_DISABLED) {
          toast.error('Ce compte est désactivé');
        } else {
          toast.error(errorMessage);
        }

        return null;
      } catch {
        const errorMessage = 'Erreur de connexion';
        setError(errorMessage);
        toast.error(errorMessage);

        return null;
      }
    },
    [],
  );

  const verifyMfa = useCallback(
    async (code: string): Promise<boolean> => {
      try {
        setError(null);
        const response = await apiFetch(RoutesApi.mfaVerify, {
          body: JSON.stringify({ code }),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        });
        const data =
          (await response.json()) as ApiResponse<AuthenticatedLoginData>;

        if (
          response.ok &&
          data.success &&
          data.data.status === 'authenticated'
        ) {
          completeAuthentication(data.data);

          return true;
        }

        setError(
          data.success
            ? 'Code incorrect ou expiré'
            : data.error.message || 'Code incorrect ou expiré',
        );

        return false;
      } catch {
        setError('Impossible de vérifier le code');

        return false;
      }
    },
    [completeAuthentication],
  );

  const cancelMfaChallenge = useCallback(async (): Promise<void> => {
    setError(null);

    try {
      await apiFetch(RoutesApi.mfaChallenge, { method: 'DELETE' });
    } catch {
      // The challenge is deliberately short-lived. Returning to the login
      // form must remain possible even if its best-effort deletion fails.
    }
  }, []);

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
        <div
          aria-describedby="session-warning-description"
          aria-labelledby="session-warning-title"
          aria-live="assertive"
          className="bg-card fixed right-4 bottom-4 z-50 max-w-sm rounded-md border p-4 shadow-[var(--shadow-panel)]"
          role="alert"
        >
          <p id="session-warning-title" className="mb-2 font-medium">
            Session bientôt expirée
          </p>
          <p
            id="session-warning-description"
            className="text-muted-foreground mb-3 text-sm"
          >
            Votre session va expirer dans quelques minutes pour inactivité.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void extendSession()}>
              Rester connecté
            </Button>
            <Button size="sm" variant="outline" onClick={logout}>
              Se déconnecter
            </Button>
          </div>
        </div>
      )}
    </UserContext.Provider>
  );
};

export const useUser = (): ContextType => useContext(UserContext);
