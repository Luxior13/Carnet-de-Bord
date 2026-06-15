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

type SessionResponse = {
  expiresAt: string;
  rememberMe: boolean;
};

type ContextType = {
  error: string | null;
  extendSession: () => void;
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
  extendSession: () => {},
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
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const logoutTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchUser = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(RoutesApi.me);
      const data: ApiSuccessResponse<{
        session: SessionResponse | null;
        user: UserType;
      }> = await response.json();

      if (data.success && data.data.user) {
        setUserData(data.data.user);
        setMustChangePassword(data.data.user.mustChangePassword);
        setSessionRememberMe(data.data.session?.rememberMe ?? false);
      } else {
        setUserData(null);
        setMustChangePassword(false);
        setSessionRememberMe(false);
      }
    } catch {
      setUserData(null);
      setMustChangePassword(false);
      setSessionRememberMe(false);
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
          setUserData(data.data.user);
          setMustChangePassword(data.data.mustChangePassword);
          setSessionRememberMe(data.data.session.rememberMe);
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
          toast.error('Email ou mot de passe incorrect');
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
  const extendSession = useCallback(() => {
    setShowSessionWarning(false);
    lastActivityRef.current = Date.now();
  }, []);

  // Auto-logout after inactivity with warning
  useEffect(() => {
    const clearTimers = () => {
      if (warningTimeoutRef.current) {
        clearTimeout(warningTimeoutRef.current);
      }
      if (logoutTimeoutRef.current) {
        clearTimeout(logoutTimeoutRef.current);
      }
    };

    if (!userData || sessionRememberMe) {
      clearTimers();
      setShowSessionWarning(false);

      return;
    }

    const resetTimers = () => {
      clearTimers();

      // Set warning timeout (5 minutes before logout)
      warningTimeoutRef.current = setTimeout(() => {
        setShowSessionWarning(true);
      }, INACTIVITY_TIMEOUT_MS - WARNING_BEFORE_MS);

      // Set logout timeout
      logoutTimeoutRef.current = setTimeout(() => {
        toast.warning('Session expiree pour inactivite');
        logout();
      }, INACTIVITY_TIMEOUT_MS);
    };

    const handleActivity = () => {
      // Don't reset if warning is showing - user must click button
      if (showSessionWarning) return;
      lastActivityRef.current = Date.now();
      resetTimers();
    };

    // Track user activity
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Initialize timers
    resetTimers();

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
      clearTimers();
    };
  }, [userData, sessionRememberMe, logout, showSessionWarning]);

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
        <div className="bg-card fixed right-4 bottom-4 z-50 max-w-sm rounded-lg border p-4 shadow-lg">
          <p className="mb-2 font-medium">Session bientot expiree</p>
          <p className="text-muted-foreground mb-3 text-sm">
            Votre session va expirer dans 5 minutes pour inactivite.
          </p>
          <div className="flex gap-2">
            <Button size="sm" onClick={extendSession}>
              Rester connecte
            </Button>
            <Button size="sm" variant="outline" onClick={logout}>
              Se deconnecter
            </Button>
          </div>
        </div>
      )}
    </UserContext.Provider>
  );
};

export const useUser = (): ContextType => useContext(UserContext);
