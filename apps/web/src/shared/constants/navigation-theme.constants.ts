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

export const NAVIGATION_SPACE_TONE_CLASSES = {
  dashboard: {
    accent: 'bg-[#7aa7e8]',
    activeItem: 'bg-[#7aa7e8]/15 text-[#dceaff]',
    branchButton:
      'border-[#7aa7e8]/25 bg-[#7aa7e8]/12 text-[#dceaff] [&>svg]:text-[#9ec3ff] shadow-[inset_0_0_0_1px_rgba(122,167,232,0.18)]',
    dot: 'bg-[#7aa7e8]',
    hero: 'border-[#5174ae]/55 bg-[#162234]/90',
    icon: 'border-[#7aa7e8]/35 bg-[#7aa7e8]/12 text-[#9ec3ff]',
    menuButton:
      'data-[active=true]:border-[#7aa7e8]/45 data-[active=true]:bg-[#7aa7e8]/15 data-[active=true]:text-[#dceaff] data-[active=true]:[&>svg]:text-[#9ec3ff] data-[active=true]:shadow-[inset_0_0_0_1px_rgba(122,167,232,0.32)]',
    row: 'hover:bg-[#7aa7e8]/10 focus:bg-[#7aa7e8]/12',
    soft: 'border-[#7aa7e8]/25 bg-[#7aa7e8]/10 text-[#cfe2ff]',
    subButton:
      'data-[active=true]:border-[#7aa7e8]/30 data-[active=true]:bg-[#7aa7e8]/15 data-[active=true]:text-[#dceaff] data-[active=true]:[&>svg]:text-[#9ec3ff] data-[active=true]:shadow-[inset_0_0_0_1px_rgba(122,167,232,0.22)]',
  },
  internal: {
    accent: 'bg-[#26c6da]',
    activeItem: 'bg-[#26c6da]/15 text-[#d7fbff]',
    branchButton:
      'border-[#26c6da]/25 bg-[#26c6da]/12 text-[#d7fbff] [&>svg]:text-[#8eefff] shadow-[inset_0_0_0_1px_rgba(38,198,218,0.18)]',
    dot: 'bg-[#26c6da]',
    hero: 'border-[#1d91a1]/50 bg-[#10262d]/90',
    icon: 'border-[#26c6da]/35 bg-[#26c6da]/12 text-[#8eefff]',
    menuButton:
      'data-[active=true]:border-[#26c6da]/45 data-[active=true]:bg-[#26c6da]/15 data-[active=true]:text-[#d7fbff] data-[active=true]:[&>svg]:text-[#8eefff] data-[active=true]:shadow-[inset_0_0_0_1px_rgba(38,198,218,0.32)]',
    row: 'hover:bg-[#26c6da]/10 focus:bg-[#26c6da]/12',
    soft: 'border-[#26c6da]/25 bg-[#26c6da]/10 text-[#d7fbff]',
    subButton:
      'data-[active=true]:border-[#26c6da]/30 data-[active=true]:bg-[#26c6da]/15 data-[active=true]:text-[#d7fbff] data-[active=true]:[&>svg]:text-[#8eefff] data-[active=true]:shadow-[inset_0_0_0_1px_rgba(38,198,218,0.22)]',
  },
  legal: {
    accent: 'bg-[#d2a85b]',
    activeItem: 'bg-[#d2a85b]/15 text-[#ffe9bd]',
    branchButton:
      'border-[#d2a85b]/25 bg-[#d2a85b]/12 text-[#ffe9bd] [&>svg]:text-[#f0ca7c] shadow-[inset_0_0_0_1px_rgba(210,168,91,0.18)]',
    dot: 'bg-[#d2a85b]',
    hero: 'border-[#a98242]/55 bg-[#2b2418]/90',
    icon: 'border-[#d2a85b]/35 bg-[#d2a85b]/12 text-[#f0ca7c]',
    menuButton:
      'data-[active=true]:border-[#d2a85b]/45 data-[active=true]:bg-[#d2a85b]/15 data-[active=true]:text-[#ffe9bd] data-[active=true]:[&>svg]:text-[#f0ca7c] data-[active=true]:shadow-[inset_0_0_0_1px_rgba(210,168,91,0.32)]',
    row: 'hover:bg-[#d2a85b]/10 focus:bg-[#d2a85b]/12',
    soft: 'border-[#d2a85b]/25 bg-[#d2a85b]/10 text-[#f7e2b4]',
    subButton:
      'data-[active=true]:border-[#d2a85b]/30 data-[active=true]:bg-[#d2a85b]/15 data-[active=true]:text-[#ffe9bd] data-[active=true]:[&>svg]:text-[#f0ca7c] data-[active=true]:shadow-[inset_0_0_0_1px_rgba(210,168,91,0.22)]',
  },
  sport: {
    accent: 'bg-[#e06f8f]',
    activeItem: 'bg-[#e06f8f]/15 text-[#ffd8e1]',
    branchButton:
      'border-[#e06f8f]/25 bg-[#e06f8f]/12 text-[#ffd8e1] [&>svg]:text-[#ffadc0] shadow-[inset_0_0_0_1px_rgba(224,111,143,0.18)]',
    dot: 'bg-[#e06f8f]',
    hero: 'border-[#b65973]/50 bg-[#2b1b25]/90',
    icon: 'border-[#e06f8f]/35 bg-[#e06f8f]/12 text-[#ffadc0]',
    menuButton:
      'data-[active=true]:border-[#e06f8f]/45 data-[active=true]:bg-[#e06f8f]/15 data-[active=true]:text-[#ffd8e1] data-[active=true]:[&>svg]:text-[#ffadc0] data-[active=true]:shadow-[inset_0_0_0_1px_rgba(224,111,143,0.32)]',
    row: 'hover:bg-[#e06f8f]/10 focus:bg-[#e06f8f]/12',
    soft: 'border-[#e06f8f]/25 bg-[#e06f8f]/10 text-[#ffd2dc]',
    subButton:
      'data-[active=true]:border-[#e06f8f]/30 data-[active=true]:bg-[#e06f8f]/15 data-[active=true]:text-[#ffd8e1] data-[active=true]:[&>svg]:text-[#ffadc0] data-[active=true]:shadow-[inset_0_0_0_1px_rgba(224,111,143,0.22)]',
  },
  system: {
    accent: 'bg-[#a78bfa]',
    activeItem: 'bg-[#a78bfa]/15 text-[#e8e0ff]',
    branchButton:
      'border-[#a78bfa]/25 bg-[#a78bfa]/12 text-[#e8e0ff] [&>svg]:text-[#c7b7ff] shadow-[inset_0_0_0_1px_rgba(167,139,250,0.18)]',
    dot: 'bg-[#a78bfa]',
    hero: 'border-[#8066cc]/50 bg-[#211d32]/90',
    icon: 'border-[#a78bfa]/35 bg-[#a78bfa]/12 text-[#c7b7ff]',
    menuButton:
      'data-[active=true]:border-[#a78bfa]/45 data-[active=true]:bg-[#a78bfa]/15 data-[active=true]:text-[#e8e0ff] data-[active=true]:[&>svg]:text-[#c7b7ff] data-[active=true]:shadow-[inset_0_0_0_1px_rgba(167,139,250,0.32)]',
    row: 'hover:bg-[#a78bfa]/10 focus:bg-[#a78bfa]/12',
    soft: 'border-[#a78bfa]/25 bg-[#a78bfa]/10 text-[#e3dcff]',
    subButton:
      'data-[active=true]:border-[#a78bfa]/30 data-[active=true]:bg-[#a78bfa]/15 data-[active=true]:text-[#e8e0ff] data-[active=true]:[&>svg]:text-[#c7b7ff] data-[active=true]:shadow-[inset_0_0_0_1px_rgba(167,139,250,0.22)]',
  },
  treasury: {
    accent: 'bg-[#5fbd7b]',
    activeItem: 'bg-[#5fbd7b]/15 text-[#d9fce2]',
    branchButton:
      'border-[#5fbd7b]/25 bg-[#5fbd7b]/12 text-[#d9fce2] [&>svg]:text-[#97e6ad] shadow-[inset_0_0_0_1px_rgba(95,189,123,0.18)]',
    dot: 'bg-[#5fbd7b]',
    hero: 'border-[#4b965f]/50 bg-[#172719]/90',
    icon: 'border-[#5fbd7b]/35 bg-[#5fbd7b]/12 text-[#97e6ad]',
    menuButton:
      'data-[active=true]:border-[#5fbd7b]/45 data-[active=true]:bg-[#5fbd7b]/15 data-[active=true]:text-[#d9fce2] data-[active=true]:[&>svg]:text-[#97e6ad] data-[active=true]:shadow-[inset_0_0_0_1px_rgba(95,189,123,0.32)]',
    row: 'hover:bg-[#5fbd7b]/10 focus:bg-[#5fbd7b]/12',
    soft: 'border-[#5fbd7b]/25 bg-[#5fbd7b]/10 text-[#d0f7da]',
    subButton:
      'data-[active=true]:border-[#5fbd7b]/30 data-[active=true]:bg-[#5fbd7b]/15 data-[active=true]:text-[#d9fce2] data-[active=true]:[&>svg]:text-[#97e6ad] data-[active=true]:shadow-[inset_0_0_0_1px_rgba(95,189,123,0.22)]',
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
      return 'border-[#e06f8f]/35 bg-[#e06f8f]/12 text-[#ffd8e1]';
    case 'Restreint':
      return 'border-[#d2a85b]/35 bg-[#d2a85b]/12 text-[#ffe9bd]';
    default:
      return 'border-sidebar-border/70 bg-sidebar-accent/25 text-sidebar-foreground/70';
  }
}
