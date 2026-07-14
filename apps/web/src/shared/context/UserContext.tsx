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
  type ApiSuccessResponse,
  ErrorCode,
  RoutesApi,
} from '$types/api.types';
import { type LoginCredentials, type UserType } from '$types/auth.types';
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

type SessionResponse = {
  expiresAt: string;
  idleExpiresAt: string;
  lastSeenAt: string;
  rememberMe: boolean;
};

type ContextType = {
  error: string | null;
  extendSession: () => Promise<void>;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<boolean>;
  logout: () => Promise<void>;
  mustChangePassword: boolean;
  refreshUser: () => Promise<void>;
  showSessionWarning: boolean;
  userData: UserType | null;
};

const UserContext = createContext<ContextType>({
  error: null,
  extendSession: async () => {},
  isLoading: true,
  login: async () => false,
  logout: async () => {},
  mustChangePassword: false,
  refreshUser: async () => {},
  showSessionWarning: false,
  userData: null,
});

type UserProviderProps = {
  children: ReactNode;
};

export const UserProvider: FC<UserProviderProps> = ({ children }) => {
  const router = useRouter();
  const [userData, setUserData] = useState<UserType | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [mustChangePassword, setMustChangePassword] = useState<boolean>(false);
  const [sessionRememberMe, setSessionRememberMe] = useState<boolean>(false);
  const [showSessionWarning, setShowSessionWarning] = useState<boolean>(false);
  const lastActivityRef = useRef<number>(Date.now());
  const lastServerActivitySyncRef = useRef<number>(Date.now());
  const showSessionWarningRef = useRef(false);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const resetSessionTimersRef = useRef<() => void>(() => {});

  const fetchUser = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(RoutesApi.me);
      const data: ApiSuccessResponse<{
        session: SessionResponse | null;
        user: UserType;
      }> = await response.json();

      if (!response.ok && response.status !== 401 && response.status !== 403) {
        throw new Error('Session check failed');
      }

      if (data.success && data.data.user) {
        const activityAt = Date.now();
        setUserData(data.data.user);
        setMustChangePassword(data.data.user.mustChangePassword);
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
      setUserData(null);
      setMustChangePassword(false);
      setSessionRememberMe(false);
      setError('Impossible de vérifier votre session');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      await apiFetch(RoutesApi.logout, { method: 'POST' });
      setUserData(null);
      setMustChangePassword(false);
      setSessionRememberMe(false);
      toast.success('Déconnexion réussie');
      router.push('/login');
    } catch {
      toast.error('Erreur lors de la déconnexion');
      setUserData(null);
      setMustChangePassword(false);
      setSessionRememberMe(false);
      router.push('/login');
    } finally {
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

      const activityAt = Date.now();
      lastActivityRef.current = activityAt;
      lastServerActivitySyncRef.current = activityAt;
      publishSessionActivity(activityAt);

      return true;
    } catch {
      return false;
    }
  }, [router]);

  const login = useCallback(
    async (credentials: LoginCredentials): Promise<boolean> => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await apiFetch(RoutesApi.login, {
          body: JSON.stringify(credentials),
          headers: { 'Content-Type': 'application/json' },
          method: 'POST',
        });
        const data: ApiSuccessResponse<{
          mustChangePassword: boolean;
          session: SessionResponse;
          user: UserType;
        }> = await response.json();

        if (data.success) {
          const activityAt = Date.now();
          setUserData(data.data.user);
          setMustChangePassword(data.data.mustChangePassword);
          setSessionRememberMe(data.data.session.rememberMe);
          lastActivityRef.current = activityAt;
          lastServerActivitySyncRef.current = activityAt;
          publishSessionActivity(activityAt);
          toast.success('Connexion réussie');

          return true;
        }

        const errorData = data as unknown as {
          error?: { code?: string; message?: string };
        };
        const errorCode = errorData.error?.code;
        const errorMessage = errorData.error?.message || 'Erreur de connexion';

        setError(errorMessage);

        if (errorCode === ErrorCode.INVALID_CREDENTIALS) {
          toast.error('Identifiant ou mot de passe incorrect');
        } else if (errorCode === ErrorCode.ACCOUNT_DISABLED) {
          toast.error('Ce compte est désactivé');
        } else {
          toast.error(errorMessage);
        }

        return false;
      } catch {
        const errorMessage = 'Erreur de connexion';
        setError(errorMessage);
        toast.error(errorMessage);

        return false;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

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
        error,
        extendSession,
        isLoading,
        login,
        logout,
        mustChangePassword,
        refreshUser: fetchUser,
        showSessionWarning,
        userData,
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
