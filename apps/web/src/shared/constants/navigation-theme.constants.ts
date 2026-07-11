export type NavigationSpaceTone =
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
  hero: string;
  icon: string;
  menuButton: string;
  row: string;
  soft: string;
  subButton: string;
};

const baseHero =
  'border-sidebar-border/70 bg-surface text-foreground shadow-[var(--shadow-panel)]';
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
    accent: 'bg-[#6db8b1]',
    activeItem: baseActiveItem,
    branchButton:
      'border-[#6db8b1]/30 bg-[#6db8b1]/10 text-sidebar-foreground [&>svg]:text-[#8ed5ce]',
    dot: 'bg-[#6db8b1]',
    hero: baseHero,
    icon: 'border-[#6db8b1]/30 bg-[#6db8b1]/10 text-[#9bded8]',
    menuButton: baseMenuButton,
    row: baseRow,
    soft: 'border-[#6db8b1]/25 bg-[#6db8b1]/10 text-[#c6f2ee]',
    subButton: baseSubButton,
  },
  internal: {
    accent: 'bg-[#65a9c8]',
    activeItem: baseActiveItem,
    branchButton:
      'border-[#65a9c8]/30 bg-[#65a9c8]/10 text-sidebar-foreground [&>svg]:text-[#96cee5]',
    dot: 'bg-[#65a9c8]',
    hero: baseHero,
    icon: 'border-[#65a9c8]/30 bg-[#65a9c8]/10 text-[#a8d8ec]',
    menuButton: baseMenuButton,
    row: baseRow,
    soft: 'border-[#65a9c8]/25 bg-[#65a9c8]/10 text-[#d0eef8]',
    subButton: baseSubButton,
  },
  legal: {
    accent: 'bg-[#d0aa5f]',
    activeItem: baseActiveItem,
    branchButton:
      'border-[#d0aa5f]/30 bg-[#d0aa5f]/10 text-sidebar-foreground [&>svg]:text-[#e5c987]',
    dot: 'bg-[#d0aa5f]',
    hero: baseHero,
    icon: 'border-[#d0aa5f]/30 bg-[#d0aa5f]/10 text-[#ecd294]',
    menuButton: baseMenuButton,
    row: baseRow,
    soft: 'border-[#d0aa5f]/25 bg-[#d0aa5f]/10 text-[#f3dfb3]',
    subButton: baseSubButton,
  },
  sport: {
    accent: 'bg-[#d9798e]',
    activeItem: baseActiveItem,
    branchButton:
      'border-[#d9798e]/30 bg-[#d9798e]/10 text-sidebar-foreground [&>svg]:text-[#efa7b6]',
    dot: 'bg-[#d9798e]',
    hero: baseHero,
    icon: 'border-[#d9798e]/30 bg-[#d9798e]/10 text-[#f2b4c1]',
    menuButton: baseMenuButton,
    row: baseRow,
    soft: 'border-[#d9798e]/25 bg-[#d9798e]/10 text-[#f6d0d8]',
    subButton: baseSubButton,
  },
  system: {
    accent: 'bg-[#8ea0bb]',
    activeItem: baseActiveItem,
    branchButton:
      'border-[#8ea0bb]/30 bg-[#8ea0bb]/10 text-sidebar-foreground [&>svg]:text-[#b5c2d4]',
    dot: 'bg-[#8ea0bb]',
    hero: baseHero,
    icon: 'border-[#8ea0bb]/30 bg-[#8ea0bb]/10 text-[#c5cfdd]',
    menuButton: baseMenuButton,
    row: baseRow,
    soft: 'border-[#8ea0bb]/25 bg-[#8ea0bb]/10 text-[#d9e1eb]',
    subButton: baseSubButton,
  },
  treasury: {
    accent: 'bg-[#79bd70]',
    activeItem: baseActiveItem,
    branchButton:
      'border-[#79bd70]/30 bg-[#79bd70]/10 text-sidebar-foreground [&>svg]:text-[#a7dc9f]',
    dot: 'bg-[#79bd70]',
    hero: baseHero,
    icon: 'border-[#79bd70]/30 bg-[#79bd70]/10 text-[#b4e5ad]',
    menuButton: baseMenuButton,
    row: baseRow,
    soft: 'border-[#79bd70]/25 bg-[#79bd70]/10 text-[#d8f2d3]',
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
      return 'border-[#d9798e]/30 bg-[#d9798e]/10 text-[#f6d0d8]';
    case 'Restreint':
      return 'border-[#d0aa5f]/30 bg-[#d0aa5f]/10 text-[#f3dfb3]';
    default:
      return 'border-sidebar-border/70 bg-sidebar-accent/35 text-sidebar-foreground/75';
  }
}
