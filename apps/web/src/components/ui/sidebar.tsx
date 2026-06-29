'use client';

import { Slot } from '@radix-ui/react-slot';
import { PanelLeft } from 'lucide-react';
import * as React from 'react';

import { Button } from '$ui/button';
import { Separator } from '$ui/separator';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '$ui/sheet';
import { Skeleton } from '$ui/skeleton';
import { Tooltip, TooltipContent, TooltipTrigger } from '$ui/tooltip';
import { cn } from '$utils/css.utils';

const SIDEBAR_STORAGE_KEY = 'sidebar_state';
const SIDEBAR_ID = 'app-sidebar';
const SIDEBAR_WIDTH = '16rem';
const SIDEBAR_WIDTH_ICON = '3.5rem';
const SIDEBAR_WIDTH_MOBILE = '18rem';
const SIDEBAR_KEYBOARD_SHORTCUT = 'b';
const MOBILE_BREAKPOINT = 768;

type SidebarContextProps = {
  isMobile: boolean;
  open: boolean;
  openMobile: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setOpenMobile: React.Dispatch<React.SetStateAction<boolean>>;
  state: 'collapsed' | 'expanded';
  toggleSidebar: () => void;
};

const SidebarContext = React.createContext<SidebarContextProps | null>(null);

function getSidebarStoredValue(): boolean | null {
  if (typeof window === 'undefined') return null;

  try {
    const storedValue = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);

    if (storedValue === 'true') return true;
    if (storedValue === 'false') return false;
  } catch {
    return null;
  }

  return null;
}

function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = React.useState(false);

  React.useEffect((): (() => void) => {
    const mediaQuery = window.matchMedia(
      `(max-width: ${MOBILE_BREAKPOINT - 1}px)`,
    );

    const updateIsMobile = (): void => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    mediaQuery.addEventListener('change', updateIsMobile);
    updateIsMobile();

    return () => mediaQuery.removeEventListener('change', updateIsMobile);
  }, []);

  return isMobile;
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
  open: openProp,
  style,
  ...props
}: SidebarProviderProps): React.ReactNode {
  const isMobile = useIsMobile();
  const [openMobile, setOpenMobile] = React.useState(false);
  const [_open, _setOpen] = React.useState(
    () => getSidebarStoredValue() ?? defaultOpen,
  );
  const open = openProp ?? _open;

  const setOpen = React.useCallback<
    React.Dispatch<React.SetStateAction<boolean>>
  >(
    (value) => {
      const openState = value instanceof Function ? value(open) : value;

      if (onOpenChange) {
        onOpenChange(openState);
      } else {
        _setOpen(openState);
      }

      try {
        window.localStorage.setItem(SIDEBAR_STORAGE_KEY, String(openState));
      } catch {
        // Ignore storage errors in constrained environments.
      }
    },
    [onOpenChange, open],
  );

  const toggleSidebar = React.useCallback((): void => {
    if (isMobile) {
      setOpenMobile((value) => !value);
    } else {
      setOpen((value) => !value);
    }
  }, [isMobile, setOpen]);

  React.useEffect((): (() => void) => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (
        event.key.toLowerCase() === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return (): void => window.removeEventListener('keydown', handleKeyDown);
  }, [toggleSidebar]);

  const state = open ? 'expanded' : 'collapsed';

  const contextValue = React.useMemo<SidebarContextProps>(
    (): SidebarContextProps => ({
      isMobile,
      open,
      openMobile,
      setOpen,
      setOpenMobile,
      state,
      toggleSidebar,
    }),
    [isMobile, open, openMobile, setOpen, state, toggleSidebar],
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
  const { isMobile, openMobile, setOpenMobile, state } = useSidebar();

  if (collapsible === 'none') {
    return (
      <div
        data-slot="sidebar"
        data-sidebar="sidebar"
        id={id ?? SIDEBAR_ID}
        className={cn(
          'bg-sidebar/92 text-sidebar-foreground flex h-full w-[var(--sidebar-width)] flex-col backdrop-blur-md',
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
          className="bg-sidebar/95 text-sidebar-foreground w-[var(--sidebar-width-mobile)] p-0 backdrop-blur-md [&>button]:hidden"
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
        'group/sidebar bg-sidebar/92 text-sidebar-foreground relative hidden h-full shrink-0 flex-col overflow-hidden border-r backdrop-blur-md transition-[width] duration-200 ease-linear md:flex',
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
  const { isMobile, open, openMobile, toggleSidebar } = useSidebar();

  return (
    <Button
      aria-controls={SIDEBAR_ID}
      aria-expanded={isMobile ? openMobile : open}
      data-sidebar="trigger"
      data-slot="sidebar-trigger"
      type="button"
      variant="ghost"
      size="icon"
      className={cn('size-9', className)}
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft className="size-4" />
      <span className="sr-only">Basculer la barre latérale</span>
    </Button>
  );
}

function SidebarRail({
  className,
  ...props
}: React.ComponentProps<'button'>): React.ReactNode {
  const { open, toggleSidebar } = useSidebar();

  return (
    <button
      aria-controls={SIDEBAR_ID}
      aria-expanded={open}
      data-sidebar="rail"
      data-slot="sidebar-rail"
      type="button"
      aria-label="Basculer la barre latérale"
      tabIndex={-1}
      onClick={toggleSidebar}
      className={cn(
        'hover:after:bg-sidebar-ring/70 after:bg-sidebar-border/80 absolute inset-y-0 right-0 hidden w-3 translate-x-1/2 cursor-ew-resize transition-all after:absolute after:inset-y-0 after:left-1/2 after:w-px md:block',
        className,
      )}
      {...props}
    />
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

function SidebarContent({
  className,
  ...props
}: React.ComponentProps<'div'>): React.ReactNode {
  return (
    <div
      data-sidebar="content"
      data-slot="sidebar-content"
      className={cn(
        'flex min-h-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto p-3 group-data-[collapsible=icon]/sidebar:px-0',
        className,
      )}
      {...props}
    />
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
        'relative flex w-full min-w-0 flex-col gap-1.5 px-3 py-2.5 group-data-[collapsible=icon]/sidebar:px-0',
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
        'text-sidebar-foreground/48 flex h-7 shrink-0 items-center overflow-hidden rounded-lg px-2.5 text-[11px] font-semibold tracking-[0.14em] uppercase transition-opacity duration-150 group-data-[collapsible=icon]/sidebar:h-0 group-data-[collapsible=icon]/sidebar:px-0 group-data-[collapsible=icon]/sidebar:opacity-0 group-data-[collapsible=icon]/sidebar:delay-0 group-data-[state=expanded]/sidebar:delay-150',
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
        'text-sidebar-foreground/65 hover:bg-sidebar-accent/45 hover:text-sidebar-accent-foreground absolute top-3 right-3 flex size-7 items-center justify-center rounded-lg border border-transparent transition-colors group-data-[collapsible=icon]/sidebar:hidden',
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
      className={cn('w-full text-sm', className)}
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
      className={cn('flex w-full min-w-0 flex-col gap-1.5', className)}
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
        'group/menu-item relative group-data-[collapsible=icon]/sidebar:flex group-data-[collapsible=icon]/sidebar:justify-start group-data-[collapsible=icon]/sidebar:pl-2.5',
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
        'hover:bg-sidebar-accent/55 hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring [&>svg]:text-sidebar-foreground/65 flex w-full items-center gap-2.5 overflow-hidden rounded-md border border-transparent px-3 text-left text-sm font-medium transition-[background-color,color,border-color,box-shadow] outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 [&>span]:max-w-full [&>span]:min-w-0 [&>span]:flex-1 [&>span]:truncate [&>span]:overflow-hidden [&>span]:whitespace-nowrap [&>span]:transition-opacity [&>span]:duration-100 [&>svg]:size-4 [&>svg]:shrink-0',
        'data-[active=true]:text-sidebar-accent-foreground data-[active=true]:[&>svg]:text-sidebar-ring data-[active=true]:border-sidebar-ring/45 data-[active=true]:bg-[linear-gradient(180deg,rgba(95,132,200,0.16),rgba(34,49,74,0.92))] data-[active=true]:font-semibold data-[active=true]:shadow-[inset_0_0_0_1px_rgba(108,146,214,0.34)]',
        size === 'sm' && 'h-9 text-xs',
        size === 'default' && 'h-10',
        size === 'lg' && 'h-12',
        'group-data-[collapsible=icon]/sidebar:h-9 group-data-[collapsible=icon]/sidebar:w-9 group-data-[collapsible=icon]/sidebar:justify-center group-data-[collapsible=icon]/sidebar:gap-0 group-data-[collapsible=icon]/sidebar:border-transparent group-data-[collapsible=icon]/sidebar:p-0 group-data-[collapsible=icon]/sidebar:[&>span]:max-w-0 group-data-[collapsible=icon]/sidebar:[&>span]:opacity-0 group-data-[collapsible=icon]/sidebar:[&>span]:delay-0 group-data-[state=expanded]/sidebar:[&>span]:delay-150',
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
        'text-sidebar-foreground/65 hover:bg-sidebar-accent/45 hover:text-sidebar-accent-foreground absolute top-1.5 right-1 flex size-6 items-center justify-center rounded-md border border-transparent transition-colors group-data-[collapsible=icon]/sidebar:hidden',
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
        'flex h-10 items-center gap-2.5 rounded-xl px-3',
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
        'border-sidebar-border/80 mx-3 flex min-w-0 translate-x-px flex-col gap-1.5 border-l px-2.5 py-1 group-data-[collapsible=icon]/sidebar:hidden',
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
        'hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground focus-visible:ring-sidebar-ring [&>svg]:text-sidebar-foreground/60 flex h-8 min-w-0 items-center gap-2 overflow-hidden rounded-md px-2.5 text-sm font-medium transition-[background-color,color,border-color,box-shadow] outline-none focus-visible:ring-2 [&>span]:truncate [&>svg]:size-4 [&>svg]:shrink-0',
        'data-[active=true]:bg-sidebar-accent/65 data-[active=true]:text-sidebar-accent-foreground data-[active=true]:[&>svg]:text-sidebar-ring data-[active=true]:border-sidebar-ring/30 data-[active=true]:border data-[active=true]:font-semibold data-[active=true]:shadow-[inset_0_0_0_1px_rgba(108,146,214,0.22)]',
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
  SidebarRail,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
