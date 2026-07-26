'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import React, {
  createContext,
  type FC,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ChangePasswordDialog } from '$components/ChangePasswordDialog';
import { Header } from '$components/layout/Header';
import Sidebar from '$components/Sidebar';
import { isPublicPagePath } from '$constants/security.constants';
import { useUser } from '$context/UserContext';
import { MfaSetupDialog } from '$features/auth/components/MfaSetupDialog';
import { type BreadcrumbEntry } from '$ui/breadcrumb';
import { Button } from '$ui/button';
import { SidebarInset, SidebarProvider } from '$ui/sidebar';
import { cn } from '$utils/css.utils';
import { getSafeReturnPath } from '$utils/navigation.utils';

type AuthenticatedLayoutProps = {
  breadcrumbs?: BreadcrumbEntry[];
  children: ReactNode;
  fullHeight?: boolean;
};

type AuthenticatedPageConfig = {
  breadcrumbs: BreadcrumbEntry[];
  fullHeight: boolean;
};

type AuthenticatedShellContextValue = {
  registerPageConfig: (
    ownerId: string,
    config: AuthenticatedPageConfig,
  ) => () => void;
};

type AuthenticatedShellProps = {
  children: ReactNode;
  initialPageConfig?: AuthenticatedPageConfig;
};

type RegisteredPageConfig = AuthenticatedPageConfig & {
  ownerId: string | null;
};

const EMPTY_BREADCRUMBS: BreadcrumbEntry[] = [];
const DEFAULT_PAGE_CONFIG: RegisteredPageConfig = {
  breadcrumbs: EMPTY_BREADCRUMBS,
  fullHeight: false,
  ownerId: null,
};

const AuthenticatedShellContext =
  createContext<AuthenticatedShellContextValue | null>(null);

function areBreadcrumbsEqual(
  first: readonly BreadcrumbEntry[],
  second: readonly BreadcrumbEntry[],
): boolean {
  return (
    first.length === second.length &&
    first.every((entry, index) => {
      const secondEntry = second.at(index);

      return (
        entry.href === secondEntry?.href && entry.label === secondEntry?.label
      );
    })
  );
}

export const PersistentAuthenticatedShell: FC<AuthenticatedShellProps> = ({
  children,
  initialPageConfig,
}) => {
  const pathname = usePathname();
  const router = useRouter();
  const { applyUserUpdate, error, isLoading, refreshUser, userData } =
    useUser();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [registeredPageConfig, setRegisteredPageConfig] =
    useState<RegisteredPageConfig>(() => ({
      ...(initialPageConfig ?? DEFAULT_PAGE_CONFIG),
      ownerId: null,
    }));
  const requiresMfaSetup = !!userData && userData.mfaEnabledAt === null;
  const isPublicPage = isPublicPagePath(pathname);
  const registerPageConfig = useCallback(
    (ownerId: string, config: AuthenticatedPageConfig): (() => void) => {
      setRegisteredPageConfig((currentConfig) => {
        if (
          currentConfig.ownerId === ownerId &&
          currentConfig.fullHeight === config.fullHeight &&
          areBreadcrumbsEqual(currentConfig.breadcrumbs, config.breadcrumbs)
        ) {
          return currentConfig;
        }

        return { ...config, ownerId };
      });

      return (): void => {
        setRegisteredPageConfig((currentConfig) =>
          currentConfig.ownerId === ownerId
            ? DEFAULT_PAGE_CONFIG
            : currentConfig,
        );
      };
    },
    [],
  );
  const shellContextValue = useMemo<AuthenticatedShellContextValue>(
    () => ({ registerPageConfig }),
    [registerPageConfig],
  );

  useEffect(() => {
    if (!isPublicPage && !isLoading && !userData && !error) {
      const returnPath = getSafeReturnPath(
        `${window.location.pathname}${window.location.search}`,
      );
      router.push(`/login?next=${encodeURIComponent(returnPath)}`);
    }
  }, [error, isLoading, isPublicPage, userData, router]);

  useEffect(() => {
    if (requiresMfaSetup) {
      setShowPasswordDialog(false);
    } else if (userData?.mustChangePassword) {
      setShowPasswordDialog(true);
    }
  }, [requiresMfaSetup, userData?.mustChangePassword]);

  const handlePasswordChanged = async (): Promise<void> => {
    await refreshUser();
    setShowPasswordDialog(false);
  };

  if (isPublicPage) return children;

  // Keep the authenticated shell mounted during a silent user refresh. This
  // prevents full-page flashes after profile, contact or password updates.
  if (isLoading && !userData) {
    return (
      <div
        className="relative isolate flex min-h-svh items-center justify-center overflow-hidden"
        role="status"
        aria-label="Chargement"
      >
        <div aria-hidden="true" className="site-background-column" />
        <Loader2
          className="text-primary-emphasis h-8 w-8 animate-spin"
          aria-hidden
        />
        <span className="sr-only">Chargement en cours...</span>
      </div>
    );
  }

  if (!userData) {
    if (error) {
      return (
        <main className="relative isolate flex min-h-svh items-center justify-center overflow-hidden p-4">
          <div aria-hidden="true" className="site-background-column" />
          <div
            className="border-border-default bg-surface-panel relative z-10 max-w-md rounded-xl border p-6 text-center shadow-[var(--shadow-panel)]"
            role="alert"
          >
            <AlertTriangle className="text-destructive mx-auto size-8" />
            <h1 className="mt-4 text-lg font-semibold">Session indisponible</h1>
            <p className="text-muted-foreground mt-2 text-sm">{error}</p>
            <Button
              className="mt-4"
              onClick={() => void refreshUser()}
              type="button"
              variant="outline"
            >
              Réessayer
            </Button>
          </div>
        </main>
      );
    }

    return null;
  }

  return (
    <AuthenticatedShellContext.Provider value={shellContextValue}>
      <SidebarProvider>
        {/* Skip to main content link for accessibility */}
        <a
          href="#main-content"
          className="focus:bg-primary focus:text-primary-foreground focus:ring-ring/50 sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-lg focus:px-4 focus:py-2 focus:ring-2 focus:outline-none"
        >
          Aller au contenu principal
        </a>
        <ChangePasswordDialog
          open={showPasswordDialog}
          onSuccess={handlePasswordChanged}
        />
        <MfaSetupDialog
          allowCancel={false}
          loginName={userData.loginName}
          mode="activate"
          onComplete={(data) => applyUserUpdate(data.user)}
          open={requiresMfaSetup}
        />
        <Sidebar />
        <SidebarInset className="relative isolate h-full bg-transparent">
          <div
            aria-hidden="true"
            className="site-background-column site-background-column--local private-background-column"
          />
          <Header breadcrumbs={registeredPageConfig.breadcrumbs} />
          <main
            id="main-content"
            className={cn(
              'relative z-10 min-h-0 flex-1',
              registeredPageConfig.fullHeight
                ? 'overflow-hidden'
                : 'scrollbar-gutter-both-edges overflow-y-auto',
            )}
            tabIndex={-1}
          >
            {children}
          </main>
        </SidebarInset>
      </SidebarProvider>
    </AuthenticatedShellContext.Provider>
  );
};

const AuthenticatedLayout: FC<AuthenticatedLayoutProps> = ({
  breadcrumbs = EMPTY_BREADCRUMBS,
  children,
  fullHeight = false,
}) => {
  const shellContext = useContext(AuthenticatedShellContext);
  const ownerId = useId();
  const breadcrumbsRef = useRef(breadcrumbs);
  breadcrumbsRef.current = breadcrumbs;
  const breadcrumbsKey = JSON.stringify(breadcrumbs);

  useLayoutEffect(() => {
    if (!shellContext) return;

    return shellContext.registerPageConfig(ownerId, {
      breadcrumbs: breadcrumbsRef.current,
      fullHeight,
    });
  }, [breadcrumbsKey, fullHeight, ownerId, shellContext]);

  if (shellContext) return children;

  return (
    <PersistentAuthenticatedShell
      initialPageConfig={{ breadcrumbs, fullHeight }}
    >
      {children}
    </PersistentAuthenticatedShell>
  );
};

export default AuthenticatedLayout;
