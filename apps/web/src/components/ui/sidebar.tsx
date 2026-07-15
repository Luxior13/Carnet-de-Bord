'use client';

import { Slot } from '@radix-ui/react-slot';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import * as React from 'react';

import { Button } from '$ui/button';
import { Separator } from '$ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '$ui/sheet';
import { Skeleton } from '$ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';

const SIDEBAR_ID = 'app-sidebar';
const SIDEBAR_WIDTH = '16.5rem';
const SIDEBAR_WIDTH_ICON = '3.5rem';
const SIDEBAR_WIDTH_MOBILE = '18rem';
const SIDEBAR_DESKTOP_OPEN_STORAGE_KEY = 'team-control:sidebar:desktop-open';
const SIDEBAR_SCROLL_STORAGE_PREFIX = 'sidebar_scroll:';
const SIDEBAR_SCROLL_SAVE_DELAY_MS = 120;
const MOBILE_BREAKPOINT = 1024;
const MOBILE_MEDIA_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

type SidebarContextProps = {
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

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

let cachedDesktopOpen: boolean | null = null;

type MobileViewport = {
  isMobile: boolean;
  isResolved: boolean;
};

function useMobileViewport(): MobileViewport {
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

function useSidebar(): SidebarContextProps {
  const context = React.useContext(SidebarContext);

  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider.');
  }

  return context;
}

type SidebarProviderProps = React.ComponentProps<'div'> & {
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  open?: boolean;
};

function SidebarProvider({
  children,
  className,
  defaultOpen = true,
  onOpenChange,
  open: controlledOpen,
  style,
  ...props
}: SidebarProviderProps): React.ReactNode {
  const { isMobile, isResolved: isMobileResolved } = useMobileViewport();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
    () => cachedDesktopOpen ?? defaultOpen,
  );
  const [desktopStateReady, setDesktopStateReady] = React.useState(
    () => controlledOpen !== undefined || cachedDesktopOpen !== null,
  );
  const open = controlledOpen ?? uncontrolledOpen;
  const openRef = React.useRef(open);
  const isControlled = controlledOpen !== undefined;

  React.useEffect(() => {
    openRef.current = open;
  }, [open]);

  React.useLayoutEffect(() => {
    if (isControlled) return;

    let nextOpen = cachedDesktopOpen;

    try {
      if (nextOpen === null) {
        const storedOpen = window.localStorage.getItem(
          SIDEBAR_DESKTOP_OPEN_STORAGE_KEY,
        );

        if (storedOpen === 'true' || storedOpen === 'false') {
          nextOpen = storedOpen === 'true';
        }
      }
    } catch {
      // Keep the provided default when storage is unavailable.
    }

    nextOpen ??= defaultOpen;
    cachedDesktopOpen = nextOpen;
    openRef.current = nextOpen;
    setUncontrolledOpen(nextOpen);
  }, [defaultOpen, isControlled]);

  React.useEffect((): (() => void) => {
    if (desktopStateReady) return () => undefined;

    const frameId = window.requestAnimationFrame(() => {
      setDesktopStateReady(true);
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [desktopStateReady]);

  React.useEffect((): (() => void) | undefined => {
    if (isControlled) return undefined;

    const handleStorage = (event: StorageEvent): void => {
      if (
        event.key !== SIDEBAR_DESKTOP_OPEN_STORAGE_KEY ||
        (event.newValue !== 'true' && event.newValue !== 'false')
      ) {
        return;
      }

      const nextOpen = event.newValue === 'true';

      cachedDesktopOpen = nextOpen;
      openRef.current = nextOpen;
      setUncontrolledOpen(nextOpen);
    };

    window.addEventListener('storage', handleStorage);

    return () => window.removeEventListener('storage', handleStorage);
  }, [isControlled]);

  React.useEffect(() => {
    if (!isMobile) setOpenMobile(false);
  }, [isMobile]);

  const setOpen = React.useCallback<
    React.Dispatch<React.SetStateAction<boolean>>
  >(
    (value) => {
      const nextOpen =
        typeof value === 'function' ? value(openRef.current) : value;

      openRef.current = nextOpen;
      cachedDesktopOpen = nextOpen;

      if (!isControlled) setUncontrolledOpen(nextOpen);

      onOpenChange?.(nextOpen);

      try {
        window.localStorage.setItem(
          SIDEBAR_DESKTOP_OPEN_STORAGE_KEY,
          String(nextOpen),
        );
      } catch {
        // The interaction still works when storage is unavailable.
      }
    },
    [isControlled, onOpenChange],
  );

  const toggleSidebar = React.useCallback((): void => {
    const useMobileSidebar =
      typeof window === 'undefined'
        ? isMobile
        : window.matchMedia(MOBILE_MEDIA_QUERY).matches;

    if (useMobileSidebar) {
      setOpenMobile((value) => !value);

      return;
    }

    setOpen((value) => !value);
  }, [isMobile, setOpen]);

  const state = open ? 'expanded' : 'collapsed';

  const contextValue = React.useMemo<SidebarContextProps>(
    (): SidebarContextProps => ({
      desktopStateReady,
      isMobile,
      isMobileResolved,
      open,
      openMobile,
      setOpen,
      setOpenMobile,
      state,
      toggleSidebar,
    }),
    [
      desktopStateReady,
      isMobile,
      isMobileResolved,
      open,
      openMobile,
      setOpen,
      state,
      toggleSidebar,
    ],
  );

  return (
    <SidebarContext.Provider value={contextValue}>
      <div
        data-slot="sidebar-wrapper"
        style={
          {
            '--sidebar-width': SIDEBAR_WIDTH,
            '--sidebar-width-icon': SIDEBAR_WIDTH_ICON,
            '--sidebar-width-mobile': SIDEBAR_WIDTH_MOBILE,
            ...style,
          } as React.CSSProperties
        }
        className={cn(
          'box-border flex h-svh max-h-svh w-full overflow-hidden',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

type SidebarProps = React.ComponentProps<'div'> & {
  collapsible?: 'icon' | 'none' | 'offcanvas';
  side?: 'left' | 'right';
  variant?: 'floating' | 'inset' | 'sidebar';
};

function Sidebar({
  children,
  className,
  collapsible = 'offcanvas',
  id,
  side = 'left',
  variant = 'sidebar',
  ...props
}: SidebarProps): React.ReactNode {
  const { desktopStateReady, isMobile, openMobile, setOpenMobile, state } =
    useSidebar();

  if (collapsible === 'none') {
    return (
      <div
        data-slot="sidebar"
        data-sidebar="sidebar"
        id={id ?? SIDEBAR_ID}
        className={cn(
          'sidebar-pattern bg-sidebar text-sidebar-foreground relative flex h-full w-[var(--sidebar-width)] flex-col overflow-hidden',
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  }

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          data-sidebar="sidebar"
          data-slot="sidebar"
          id={id ?? SIDEBAR_ID}
          side={side}
          className={cn(
            'sidebar-pattern bg-sidebar text-sidebar-foreground w-[var(--sidebar-width-mobile)] overflow-hidden p-0 [&_[data-sidebar=header]]:pr-14 [&>button]:z-10 [&>button]:size-11 [&>button]:opacity-100',
          )}
        >
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Navigation principale
          </SheetDescription>
          <div className="flex h-full w-full flex-col">{children}</div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <div
      data-collapsible={state === 'collapsed' ? collapsible : ''}
      data-side={side}
      data-slot="sidebar"
      data-state={state}
      data-variant={variant}
      id={id ?? SIDEBAR_ID}
      className={cn(
        'sidebar-pattern group/sidebar bg-sidebar text-sidebar-foreground relative hidden h-full shrink-0 flex-col overflow-hidden border-r lg:flex',
        desktopStateReady &&
          'transition-[width] duration-200 ease-linear motion-reduce:transition-none',
        'border-sidebar-border',
        state === 'collapsed' && collapsible === 'icon'
          ? 'w-[var(--sidebar-width-icon)]'
          : 'w-[var(--sidebar-width)]',
        side === 'right' && 'border-r-0 border-l',
        variant === 'floating' && 'rounded-lg border',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function SidebarTrigger({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>): React.ReactNode {
  const { isMobile, isMobileResolved, open, openMobile, toggleSidebar } =
    useSidebar();
  const isExpanded = isMobileResolved
    ? isMobile
      ? openMobile
      : open
    : undefined;
  const actionLabel = !isMobileResolved
    ? 'Basculer la navigation'
    : isMobile
      ? isExpanded
        ? 'Fermer la navigation'
        : 'Ouvrir la navigation'
      : isExpanded
        ? 'Replier la barre latérale'
        : 'Déployer la barre latérale';
  const TriggerIcon = isExpanded ? PanelLeftClose : PanelLeftOpen;

  return (
    <Button
      aria-controls={SIDEBAR_ID}
      aria-expanded={isExpanded}
      aria-label={actionLabel}
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      type="button"
      variant="ghost"
      size="icon"
      className={cn('size-11 lg:size-10', className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <TriggerIcon className="size-4" />
      <span className="sr-only">{actionLabel}</span>
    </Button>
  );
}

function SidebarInset({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactNode {
  return (
    <div
      data-slot="sidebar-inset"
      className={cn(
        'relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden',
        className,
      )}
      {...props}
    />
  );
}

function SidebarHeader({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactNode {
  return (
    <div
      data-sidebar="header"
      data-slot="sidebar-header"
      className={cn('flex flex-col gap-2 p-3', className)}
      {...props}
    />
  );
}

function SidebarFooter({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactNode {
  return (
    <div
      data-sidebar="footer"
      data-slot="sidebar-footer"
      className={cn('flex flex-col gap-2 p-3', className)}
      {...props}
    />
  );
}

type SidebarContentProps = React.ComponentProps<'div'> & {
  scrollRestoreKey?: string;
  scrollStorageKey?: string;
};

function SidebarContent({
  children,
  className,
  onScroll,
  scrollRestoreKey,
  scrollStorageKey,
  ...props
}: SidebarContentProps): React.ReactNode {
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const pendingScrollTopRef = React.useRef<number | null>(null);
  const scrollSaveTimeoutRef = React.useRef<number | null>(null);
  const storageKey = scrollStorageKey
    ? `${SIDEBAR_SCROLL_STORAGE_PREFIX}${scrollStorageKey}`
    : null;

  React.useEffect((): (() => void) | undefined => {
    const viewport = viewportRef.current;

    if (!viewport) return undefined;

    let scrollTop = 0;

    if (storageKey) {
      try {
        scrollTop = Number(window.sessionStorage.getItem(storageKey) ?? 0);
      } catch {
        scrollTop = 0;
      }
    }

    const restoreScroll = (): void => {
      viewport.scrollTop = Number.isFinite(scrollTop) ? scrollTop : 0;

      const activeItem = [
        '[aria-current="page"]',
        '[aria-current="location"]',
        '[data-active="true"]',
      ]
        .map((selector) => viewport.querySelector<HTMLElement>(selector))
        .find(
          (candidate) => candidate && candidate.getClientRects().length > 0,
        );

      if (!activeItem) return;

      const viewportRect = viewport.getBoundingClientRect();
      const activeItemRect = activeItem.getBoundingClientRect();

      if (activeItemRect.top < viewportRect.top) {
        viewport.scrollTop -= viewportRect.top - activeItemRect.top;
      } else if (activeItemRect.bottom > viewportRect.bottom) {
        viewport.scrollTop += activeItemRect.bottom - viewportRect.bottom;
      }
    };
    const frameId = window.requestAnimationFrame(restoreScroll);

    restoreScroll();

    return (): void => {
      window.cancelAnimationFrame(frameId);
    };
  }, [scrollRestoreKey, storageKey]);

  React.useEffect((): (() => void) => {
    return (): void => {
      if (scrollSaveTimeoutRef.current !== null) {
        window.clearTimeout(scrollSaveTimeoutRef.current);
        scrollSaveTimeoutRef.current = null;
      }

      if (storageKey && pendingScrollTopRef.current !== null) {
        try {
          window.sessionStorage.setItem(
            storageKey,
            String(pendingScrollTopRef.current),
          );
        } catch {
          // Ignore storage errors in constrained environments.
        }
      }

      pendingScrollTopRef.current = null;
    };
  }, [storageKey]);

  const handleViewportScroll = React.useCallback<
    React.UIEventHandler<HTMLDivElement>
  >(
    (event) => {
      onScroll?.(event);

      if (!storageKey) return;

      pendingScrollTopRef.current = event.currentTarget.scrollTop;

      if (scrollSaveTimeoutRef.current !== null) return;

      scrollSaveTimeoutRef.current = window.setTimeout(() => {
        scrollSaveTimeoutRef.current = null;

        if (pendingScrollTopRef.current === null) return;

        try {
          window.sessionStorage.setItem(
            storageKey,
            String(pendingScrollTopRef.current),
          );
        } catch {
          // Ignore storage errors in constrained environments.
        }
      }, SIDEBAR_SCROLL_SAVE_DELAY_MS);
    },
    [onScroll, storageKey],
  );

  return (
    <div
      {...props}
      ref={viewportRef}
      data-sidebar="content"
      data-slot="sidebar-content"
      className={cn(
        'sidebar-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 py-2.5 group-data-[collapsible=icon]/sidebar:px-0',
        className,
      )}
      onScroll={handleViewportScroll}
    >
      <div data-sidebar="content-inner" className="flex min-w-0 flex-col gap-2">
        {children}
      </div>
    </div>
  );
}

function SidebarGroup({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactNode {
  return (
    <div
      data-sidebar="group"
      data-slot="sidebar-group"
      className={cn(
        'relative flex w-full max-w-full min-w-0 flex-col gap-1.5 py-1.5',
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroupLabel({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactNode {
  return (
    <div
      data-sidebar="group-label"
      data-slot="sidebar-group-label"
      className={cn(
        'text-sidebar-foreground/65 flex h-6 shrink-0 items-center overflow-hidden rounded-md px-2 text-xs font-semibold transition-opacity duration-150 group-data-[collapsible=icon]/sidebar:h-0 group-data-[collapsible=icon]/sidebar:px-0 group-data-[collapsible=icon]/sidebar:opacity-0 group-data-[collapsible=icon]/sidebar:delay-0 group-data-[state=expanded]/sidebar:delay-150',
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroupAction({
  className,
  ...props
}: React.ComponentProps<'button'>): React.ReactNode {
  return (
    <button
      data-sidebar="group-action"
      data-slot="sidebar-group-action"
      type="button"
      className={cn(
        'text-sidebar-foreground/65 hover:bg-sidebar-accent/45 hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring absolute top-1 right-1 flex size-11 items-center justify-center rounded-lg border border-transparent transition-colors outline-none group-data-[collapsible=icon]/sidebar:hidden focus-visible:ring-2 lg:top-3 lg:right-3 lg:size-7',
        className,
      )}
      {...props}
    />
  );
}

function SidebarGroupContent({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactNode {
  return (
    <div
      data-sidebar="group-content"
      data-slot="sidebar-group-content"
      className={cn('w-full max-w-full min-w-0 text-sm', className)}
      {...props}
    />
  );
}

function SidebarMenu({
  className,
  ...props
}: React.ComponentProps<'ul'>): React.ReactNode {
  return (
    <ul
      data-sidebar="menu"
      data-slot="sidebar-menu"
      className={cn(
        'flex w-full max-w-full min-w-0 flex-col gap-1.5',
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuItem({
  className,
  ...props
}: React.ComponentProps<'li'>): React.ReactNode {
  return (
    <li
      data-sidebar="menu-item"
      data-slot="sidebar-menu-item"
      className={cn(
        'group/menu-item relative w-full max-w-full min-w-0 group-data-[collapsible=icon]/sidebar:flex group-data-[collapsible=icon]/sidebar:justify-start group-data-[collapsible=icon]/sidebar:pl-2.5',
        className,
      )}
      {...props}
    />
  );
}

type SidebarMenuButtonProps = React.ComponentProps<'button'> & {
  asChild?: boolean;
  isActive?: boolean;
  size?: 'default' | 'lg' | 'sm';
  tooltip?: React.ReactNode;
};

function SidebarMenuButton({
  asChild = false,
  className,
  isActive = false,
  size = 'default',
  tooltip,
  ...props
}: SidebarMenuButtonProps): React.ReactNode {
  const { isMobile, state } = useSidebar();
  const Comp = asChild ? Slot : 'button';

  const button = (
    <Comp
      data-active={isActive}
      data-sidebar="menu-button"
      data-size={size}
      data-slot="sidebar-menu-button"
      className={cn(
        'hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring [&>svg]:text-sidebar-foreground/65 flex w-full max-w-full min-w-0 items-center gap-2.5 overflow-hidden rounded-md border border-transparent px-3 text-left text-sm font-medium transition-[background-color,color,border-color,box-shadow] outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 [&>span]:max-w-full [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate [&>span]:overflow-hidden [&>span]:whitespace-nowrap [&>span]:transition-opacity [&>span]:duration-100 [&>svg]:size-4 [&>svg]:shrink-0',
        'data-[active=true]:border-sidebar-ring/45 data-[active=true]:bg-sidebar-accent/70 data-[active=true]:text-sidebar-accent-foreground data-[active=true]:[&>svg]:text-sidebar-ring data-[active=true]:font-semibold',
        size === 'sm' && 'h-11 text-xs lg:h-9',
        size === 'default' && 'h-11 lg:h-10',
        size === 'lg' && 'h-12',
        'group-data-[collapsible=icon]/sidebar:h-10 group-data-[collapsible=icon]/sidebar:w-10 group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:border-transparent group-data-[collapsible=icon]/sidebar:p-0 lg:group-data-[collapsible=icon]/sidebar:h-9 lg:group-data-[collapsible=icon]/sidebar:w-9 group-data-[collapsible=icon]/sidebar:[&>span]:max-w-0 group-data-[collapsible=icon]/sidebar:[&>span]:opacity-0 group-data-[collapsible=icon]/sidebar:[&>span]:delay-0 group-data-[state=expanded]/sidebar:[&>span]:delay-150',
        className,
      )}
      {...props}
    />
  );

  if (!tooltip || isMobile || state !== 'collapsed') {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

function SidebarMenuAction({
  className,
  ...props
}: React.ComponentProps<'button'>): React.ReactNode {
  return (
    <button
      data-sidebar="menu-action"
      data-slot="sidebar-menu-action"
      type="button"
      className={cn(
        'text-sidebar-foreground/65 hover:bg-sidebar-accent/45 hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring absolute top-0 right-0 flex size-11 items-center justify-center rounded-md border border-transparent transition-colors outline-none group-data-[collapsible=icon]/sidebar:hidden focus-visible:ring-2 lg:top-1.5 lg:right-1 lg:size-6',
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuBadge({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactNode {
  return (
    <div
      data-sidebar="menu-badge"
      data-slot="sidebar-menu-badge"
      className={cn(
        'text-sidebar-foreground/95 border-sidebar-border/70 bg-sidebar-accent/30 pointer-events-none absolute right-1 flex h-5 min-w-5 items-center justify-center rounded-full border px-1 text-xs font-medium group-data-[collapsible=icon]/sidebar:hidden',
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuSkeleton({
  className,
  showIcon = false,
  ...props
}: React.ComponentProps<'div'> & {
  showIcon?: boolean;
}): React.ReactNode {
  return (
    <div
      data-sidebar="menu-skeleton"
      data-slot="sidebar-menu-skeleton"
      className={cn(
        'flex h-10 items-center gap-2.5 rounded-md px-3',
        className,
      )}
      {...props}
    >
      {showIcon && <Skeleton className="size-4 rounded-md" />}
      <Skeleton className="h-4 flex-1 rounded-full" />
    </div>
  );
}

function SidebarMenuSub({
  className,
  ...props
}: React.ComponentProps<'ul'>): React.ReactNode {
  return (
    <ul
      data-sidebar="menu-sub"
      data-slot="sidebar-menu-sub"
      className={cn(
        'border-sidebar-border/75 ml-3 flex min-w-0 translate-x-px flex-col gap-1 border-l py-1 pr-1 pl-2 group-data-[collapsible=icon]/sidebar:hidden',
        className,
      )}
      {...props}
    />
  );
}

function SidebarMenuSubItem({
  className,
  ...props
}: React.ComponentProps<'li'>): React.ReactNode {
  return (
    <li
      data-sidebar="menu-sub-item"
      data-slot="sidebar-menu-sub-item"
      className={cn('group/menu-sub-item relative', className)}
      {...props}
    />
  );
}

function SidebarMenuSubButton({
  asChild = false,
  className,
  isActive = false,
  ...props
}: React.ComponentProps<'button'> & {
  asChild?: boolean;
  isActive?: boolean;
}): React.ReactNode {
  const Comp = asChild ? Slot : 'button';

  return (
    <Comp
      data-active={isActive}
      data-sidebar="menu-sub-button"
      data-slot="sidebar-menu-sub-button"
      className={cn(
        'hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring [&>svg]:text-sidebar-foreground/60 flex h-11 w-full min-w-0 items-center gap-2 overflow-hidden rounded-md border border-transparent px-2.5 text-sm font-medium transition-[background-color,color,border-color,box-shadow] outline-none focus-visible:ring-2 lg:h-8 [&>span]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
        'data-[active=true]:bg-sidebar-accent/65 data-[active=true]:text-sidebar-accent-foreground data-[active=true]:[&>svg]:text-sidebar-ring data-[active=true]:border-sidebar-ring/30 data-[active=true]:border data-[active=true]:font-semibold',
        className,
      )}
      {...props}
    />
  );
}

function SidebarSeparator({
  className,
  ...props
}: React.ComponentProps<typeof Separator>): React.ReactNode {
  return (
    <Separator
      data-sidebar="separator"
      data-slot="sidebar-separator"
      className={cn('bg-sidebar-border/70 mx-3 w-auto', className)}
      {...props}
    />
  );
}

export {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
