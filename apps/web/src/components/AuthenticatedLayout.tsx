'use client';

import { AlertTriangle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { type FC, type ReactNode, useEffect, useState } from 'react';

import { ChangePasswordDialog } from '$components/ChangePasswordDialog';
import { Header } from '$components/layout/Header';
import Sidebar from '$components/Sidebar';
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

const AuthenticatedLayout: FC<AuthenticatedLayoutProps> = ({
  breadcrumbs = [],
  children,
  fullHeight = false,
}) => {
  const router = useRouter();
  const { applyUserUpdate, error, isLoading, refreshUser, userData } =
    useUser();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const requiresMfaSetup =
    !!userData?.isProtected && userData.mfaEnabledAt === null;

  useEffect(() => {
    if (!isLoading && !userData && !error) {
      const returnPath = getSafeReturnPath(
        `${window.location.pathname}${window.location.search}`,
      );
      router.push(`/login?next=${encodeURIComponent(returnPath)}`);
    }
  }, [error, isLoading, userData, router]);

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
        <Loader2 className="text-primary h-8 w-8 animate-spin" aria-hidden />
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
            className="bg-card relative z-10 max-w-md rounded-md border p-6 text-center shadow-[var(--shadow-panel)]"
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
    <SidebarProvider>
      {/* Skip to main content link for accessibility */}
      <a
        href="#main-content"
        className="focus:bg-primary focus:text-primary-foreground focus:ring-ring/50 sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:rounded-md focus:px-4 focus:py-2 focus:ring-2 focus:outline-none"
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
        <Header breadcrumbs={breadcrumbs} />
        <main
          id="main-content"
          className={cn(
            'relative z-10 min-h-0 flex-1',
            fullHeight
              ? 'overflow-hidden'
              : 'scrollbar-gutter-both-edges overflow-x-hidden overflow-y-auto',
          )}
          tabIndex={-1}
        >
          {fullHeight ? (
            children
          ) : (
            <div className="animate-fade-in-up">{children}</div>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default AuthenticatedLayout;
