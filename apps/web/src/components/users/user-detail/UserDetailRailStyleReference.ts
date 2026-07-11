export const USER_DETAIL_RAIL_STYLE_REFERENCE = {
  activeIcon: 'text-primary',
  avatar:
    'bg-primary text-primary-foreground flex size-12 shrink-0 items-center justify-center rounded-lg text-sm font-semibold',
  badgeRow: 'flex flex-wrap gap-1.5',
  card: 'border-border bg-card overflow-hidden rounded-lg border shadow-[var(--shadow-panel)]',
  cardAccent: 'bg-primary h-1 w-full',
  cardHeader: 'border-border space-y-4 border-b p-4',
  identity: 'flex items-start gap-3',
  inactiveNavItem:
    'text-muted-foreground hover:bg-accent hover:text-foreground',
  nav: 'space-y-1 p-3',
  navItem: 'h-9 w-full justify-start gap-2.5 rounded-md px-3',
  protectedIcon: 'shrink-0 text-amber-500',
  returnButton: 'w-full justify-start',
  subtitle: 'text-muted-foreground truncate text-xs',
  title: 'truncate text-base font-semibold',
} as const;
