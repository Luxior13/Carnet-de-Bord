'use client';

import { Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import React, { type FC, type ReactNode, useEffect, useState } from 'react';

import { ChangePasswordDialog } from '$components/ChangePasswordDialog';
import { Header } from '$components/layout/Header';
import Sidebar from '$components/Sidebar';
import { useUser } from '$context/UserContext';
import { type BreadcrumbItem } from '$ui/breadcrumb';
import { SidebarInset, SidebarProvider } from '$ui/sidebar';
import { cn } from '$utils/css.utils';

type AuthenticatedLayoutProps = {
  breadcrumbs?: BreadcrumbItem[];
  children: ReactNode;
  fullHeight?: boolean;
};

const AuthenticatedLayout: FC<AuthenticatedLayoutProps> = ({
  breadcrumbs = [],
  children,
  fullHeight = false,
}) => {
  const router = useRouter();
  const { isLoading, refreshUser, userData } = useUser();
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);

  useEffect(() => {
    if (!isLoading && !userData) {
      router.push('/login');
    }
  }, [isLoading, userData, router]);

  useEffect(() => {
    if (userData?.mustChangePassword) {
      setShowPasswordDialog(true);
    }
  }, [userData?.mustChangePassword]);

  const handlePasswordChanged = async (): Promise<void> => {
    await refreshUser();
    setShowPasswordDialog(false);
  };

  if (isLoading) {
    return (
      <div
        className="bg-background flex min-h-svh items-center justify-center"
        role="status"
        aria-label="Chargement"
      >
        <Loader2 className="text-primary h-8 w-8 animate-spin" aria-hidden />
        <span className="sr-only">Chargement en cours...</span>
      </div>
    );
  }

  if (!userData) {
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
      <Sidebar />
      <SidebarInset className="bg-background h-full rounded-lg border shadow-sm max-md:rounded-none max-md:border-0">
        <Header breadcrumbs={breadcrumbs} />
        <main
          id="main-content"
          className={cn(
            'min-h-0 flex-1',
            fullHeight
              ? 'overflow-hidden'
              : 'overflow-x-hidden overflow-y-auto',
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
