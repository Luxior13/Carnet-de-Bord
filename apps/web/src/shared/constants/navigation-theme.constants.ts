export type NavigationSpaceTone =
  'dashboard' | 'internal' | 'legal' | 'sport' | 'system' | 'treasury';

export type NavigationSpaceToneClasses = {
  accent: string;
  activeItem: string;
  branchButton: string;
  dot: string;
  hero: string;
  icon: string;
  menuButton: string;
  row: string;
  soft: string;
  subButton: string;
};

const baseHero =
  'border-border/70 bg-surface text-foreground shadow-[var(--shadow-panel)]';
const baseRow =
  'hover:bg-sidebar-accent/45 focus:bg-sidebar-accent/55 focus:text-sidebar-foreground';
const baseActiveItem =
  'border-sidebar-ring/35 bg-sidebar-accent/55 text-sidebar-foreground';
const baseMenuButton =
  'data-[active=true]:border-sidebar-ring/45 data-[active=true]:bg-sidebar-accent/70 data-[active=true]:text-sidebar-accent-foreground data-[active=true]:[&>svg]:text-sidebar-ring';
const baseSubButton =
  'data-[active=true]:border-sidebar-ring/35 data-[active=true]:bg-sidebar-accent/60 data-[active=true]:text-sidebar-accent-foreground data-[active=true]:[&>svg]:text-sidebar-ring';

export const NAVIGATION_SPACE_TONE_CLASSES = {
  dashboard: {
    accent: 'bg-nav-dashboard',
    activeItem: baseActiveItem,
    branchButton:
      'border-nav-dashboard/30 bg-nav-dashboard/10 text-sidebar-foreground [&>svg]:text-nav-dashboard-icon',
    dot: 'bg-nav-dashboard',
    hero: baseHero,
    icon: 'border-nav-dashboard/30 bg-nav-dashboard/10 text-nav-dashboard-icon',
    menuButton: baseMenuButton,
    row: baseRow,
    soft: 'border-nav-dashboard/25 bg-nav-dashboard/10 text-nav-dashboard-foreground',
    subButton: baseSubButton,
  },
  internal: {
    accent: 'bg-nav-internal',
    activeItem: baseActiveItem,
    branchButton:
      'border-nav-internal/30 bg-nav-internal/10 text-sidebar-foreground [&>svg]:text-nav-internal-icon',
    dot: 'bg-nav-internal',
    hero: baseHero,
    icon: 'border-nav-internal/30 bg-nav-internal/10 text-nav-internal-icon',
    menuButton: baseMenuButton,
    row: baseRow,
    soft: 'border-nav-internal/25 bg-nav-internal/10 text-nav-internal-foreground',
    subButton: baseSubButton,
  },
  legal: {
    accent: 'bg-nav-legal',
    activeItem: baseActiveItem,
    branchButton:
      'border-nav-legal/30 bg-nav-legal/10 text-sidebar-foreground [&>svg]:text-nav-legal-icon',
    dot: 'bg-nav-legal',
    hero: baseHero,
    icon: 'border-nav-legal/30 bg-nav-legal/10 text-nav-legal-icon',
    menuButton: baseMenuButton,
    row: baseRow,
    soft: 'border-nav-legal/25 bg-nav-legal/10 text-nav-legal-foreground',
    subButton: baseSubButton,
  },
  sport: {
    accent: 'bg-nav-sport',
    activeItem: baseActiveItem,
    branchButton:
      'border-nav-sport/30 bg-nav-sport/10 text-sidebar-foreground [&>svg]:text-nav-sport-icon',
    dot: 'bg-nav-sport',
    hero: baseHero,
    icon: 'border-nav-sport/30 bg-nav-sport/10 text-nav-sport-icon',
    menuButton: baseMenuButton,
    row: baseRow,
    soft: 'border-nav-sport/25 bg-nav-sport/10 text-nav-sport-foreground',
    subButton: baseSubButton,
  },
  system: {
    accent: 'bg-nav-system',
    activeItem: baseActiveItem,
    branchButton:
      'border-nav-system/30 bg-nav-system/10 text-sidebar-foreground [&>svg]:text-nav-system-icon',
    dot: 'bg-nav-system',
    hero: baseHero,
    icon: 'border-nav-system/30 bg-nav-system/10 text-nav-system-icon',
    menuButton: baseMenuButton,
    row: baseRow,
    soft: 'border-nav-system/25 bg-nav-system/10 text-nav-system-foreground',
    subButton: baseSubButton,
  },
  treasury: {
    accent: 'bg-nav-treasury',
    activeItem: baseActiveItem,
    branchButton:
      'border-nav-treasury/30 bg-nav-treasury/10 text-sidebar-foreground [&>svg]:text-nav-treasury-icon',
    dot: 'bg-nav-treasury',
    hero: baseHero,
    icon: 'border-nav-treasury/30 bg-nav-treasury/10 text-nav-treasury-icon',
    menuButton: baseMenuButton,
    row: baseRow,
    soft: 'border-nav-treasury/25 bg-nav-treasury/10 text-nav-treasury-foreground',
    subButton: baseSubButton,
  },
} satisfies Record<NavigationSpaceTone, NavigationSpaceToneClasses>;

export function getNavigationSpaceToneClasses(
  tone: NavigationSpaceTone,
): NavigationSpaceToneClasses {
  switch (tone) {
    case 'dashboard':
      return NAVIGATION_SPACE_TONE_CLASSES.dashboard;
    case 'internal':
      return NAVIGATION_SPACE_TONE_CLASSES.internal;
    case 'legal':
      return NAVIGATION_SPACE_TONE_CLASSES.legal;
    case 'sport':
      return NAVIGATION_SPACE_TONE_CLASSES.sport;
    case 'system':
      return NAVIGATION_SPACE_TONE_CLASSES.system;
    case 'treasury':
      return NAVIGATION_SPACE_TONE_CLASSES.treasury;
  }
}

export function getNavigationSpaceBadgeClasses(badge: string): string {
  switch (badge) {
    case 'Plus tard':
      return 'border-nav-sport/30 bg-nav-sport/10 text-nav-sport-foreground';
    case 'Restreint':
      return 'border-nav-legal/30 bg-nav-legal/10 text-nav-legal-foreground';
    default:
      return 'border-sidebar-border/70 bg-sidebar-accent/35 text-sidebar-foreground/75';
  }
}
