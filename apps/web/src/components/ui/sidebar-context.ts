'use client';

import * as React from 'react';

export type SidebarContextProps = {
  desktopStateReady: boolean;
  isMobile: boolean;
  isMobileResolved: boolean;
  open: boolean;
  openMobile: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>;
  state: 'collapsed' | 'expanded';
  toggleSidebar: () => void;
};

export const SidebarContext = React.createContext<SidebarContextProps | null>(
  null,
);

export function useSidebar(): SidebarContextProps {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }

  return context;
}

const MOBILE_BREAKPOINT = 1024;
export const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

type MobileViewport = {
  isMobile: boolean;
  isResolved: boolean;
};

export function useMobileViewport(): MobileViewport {
  const [viewport, setViewport] = React.useState<MobileViewport>({
    isMobile: false,
    isResolved: false,
  });

  React.useEffect((): (() => void) => {
    const mediaQuery = window.matchMedia(MOBILE_MEDIA_QUERY);

    const updateIsMobile = (): void => {
      setViewport({
        isMobile: mediaQuery.matches,
        isResolved: true,
      });
    };

    mediaQuery.addEventListener('change', updateIsMobile);
    updateIsMobile();

    return () => mediaQuery.removeEventListener('change', updateIsMobile);
  }, []);

  return viewport;
}
