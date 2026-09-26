export type NavigationSpaceTone =
  | 'activity'
  | 'dashboard'
  | 'internal'
  | 'legal'
  | 'sport'
  | 'system'
  | 'treasury';

export type NavigationSpaceToneClasses = {
  accent: string;
  activeItem: string;
  branchButton: string;
  dot: string;
  icon: string;
  iconForeground: string;
  menuButton: string;
  row: string;
  soft: string;
  subButton: string;
};

const baseRow =
  'hover:bg-surface-navigation-hover focus:bg-surface-navigation-hover focus:text-foreground';
const baseActiveItem =
  'bg-surface-navigation-active text-sidebar-foreground [&>svg]:text-sidebar-foreground';
const baseBranchButton =
  'text-sidebar-accent-foreground font-semibold [&>svg]:text-sidebar-accent-foreground';
const baseMenuButton =
  'data-[active=true]:bg-surface-navigation-active data-[active=true]:text-sidebar-accent-foreground data-[active=true]:[&>svg]:text-sidebar-accent-foreground';
const baseSubButton =
  'data-[active=true]:bg-surface-navigation-active data-[active=true]:text-sidebar-accent-foreground data-[active=true]:[&>svg]:text-sidebar-accent-foreground';

export const NAVIGATION_SPACE_TONE_CLASSES = {
  activity: {
    accent: 'bg-nav-activity',
    activeItem: baseActiveItem,
    branchButton: baseBranchButton,
    dot: 'bg-nav-activity',
    icon: 'border-nav-activity/30 bg-nav-activity/10 text-nav-activity-icon',
    iconForeground: 'text-nav-activity-icon',
    menuButton: baseMenuButton,
    row: baseRow,
    soft: 'border-nav-activity/25 bg-nav-activity/10 text-nav-activity-foreground',
    subButton: baseSubButton,
  },
  dashboard: {
    accent: 'bg-nav-dashboard',
    activeItem: baseActiveItem,
    branchButton: baseBranchButton,
    dot: 'bg-nav-dashboard',
    icon: 'border-nav-dashboard/30 bg-nav-dashboard/10 text-nav-dashboard-icon',
    iconForeground: 'text-nav-dashboard-icon',
    menuButton: baseMenuButton,
    row: baseRow,
    soft: 'border-nav-dashboard/25 bg-nav-dashboard/10 text-nav-dashboard-foreground',
    subButton: baseSubButton,
  },
  internal: {
    accent: 'bg-nav-internal',
    activeItem: baseActiveItem,
    branchButton: baseBranchButton,
    dot: 'bg-nav-internal',
    icon: 'border-nav-internal/30 bg-nav-internal/10 text-nav-internal-icon',
    iconForeground: 'text-nav-internal-icon',
    menuButton: baseMenuButton,
    row: baseRow,
    soft: 'border-nav-internal/25 bg-nav-internal/10 text-nav-internal-foreground',
    subButton: baseSubButton,
  },
  legal: {
    accent: 'bg-nav-legal',
    activeItem: baseActiveItem,
    branchButton: baseBranchButton,
    dot: 'bg-nav-legal',
    icon: 'border-nav-legal/30 bg-nav-legal/10 text-nav-legal-icon',
    iconForeground: 'text-nav-legal-icon',
    menuButton: baseMenuButton,
    row: baseRow,
    soft: 'border-nav-legal/25 bg-nav-legal/10 text-nav-legal-foreground',
    subButton: baseSubButton,
  },
  sport: {
    accent: 'bg-nav-sport',
    activeItem: baseActiveItem,
    branchButton: baseBranchButton,
    dot: 'bg-nav-sport',
    icon: 'border-nav-sport/30 bg-nav-sport/10 text-nav-sport-icon',
    iconForeground: 'text-nav-sport-icon',
    menuButton: baseMenuButton,
    row: baseRow,
    soft: 'border-nav-sport/25 bg-nav-sport/10 text-nav-sport-foreground',
    subButton: baseSubButton,
  },
  system: {
    accent: 'bg-nav-system',
    activeItem: baseActiveItem,
    branchButton: baseBranchButton,
    dot: 'bg-nav-system',
    icon: 'border-nav-system/30 bg-nav-system/10 text-nav-system-icon',
    iconForeground: 'text-nav-system-icon',
    menuButton: baseMenuButton,
    row: baseRow,
    soft: 'border-nav-system/25 bg-nav-system/10 text-nav-system-foreground',
    subButton: baseSubButton,
  },
  treasury: {
    accent: 'bg-nav-treasury',
    activeItem: baseActiveItem,
    branchButton: baseBranchButton,
    dot: 'bg-nav-treasury',
    icon: 'border-nav-treasury/30 bg-nav-treasury/10 text-nav-treasury-icon',
    iconForeground: 'text-nav-treasury-icon',
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
    case 'activity':
      return NAVIGATION_SPACE_TONE_CLASSES.activity;
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
