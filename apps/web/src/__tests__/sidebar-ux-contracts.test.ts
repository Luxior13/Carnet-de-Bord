import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const readSourceFile = (relativePath: string): string => {
  // Test-owned paths only; the helper never receives external input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
};

const sidebarSource = readSourceFile('../components/Sidebar.tsx');
const sidebarPrimitiveSource = readSourceFile('../components/ui/sidebar.tsx');
const navigationSource = readSourceFile('../shared/constants/app.constants.ts');
const globalStylesSource = readSourceFile('../app/globals.css');

describe('sidebar UX contracts', () => {
  it('keeps the desktop sidebar genuinely collapsible and remembers its state', () => {
    expect(sidebarPrimitiveSource).toContain(
      "const state = open ? 'expanded' : 'collapsed'",
    );
    expect(sidebarPrimitiveSource).toContain(
      "'team-control:sidebar:desktop-open'",
    );
    expect(sidebarPrimitiveSource).toContain('cachedDesktopOpen');
    expect(sidebarPrimitiveSource).toContain('React.useLayoutEffect');
    expect(sidebarPrimitiveSource).toContain('desktopStateReady &&');
    expect(sidebarPrimitiveSource).not.toContain("const state = 'expanded'");
    expect(sidebarPrimitiveSource).not.toContain('lg:hidden');
  });

  it('keeps mobile controls usable without leaking the desktop state', () => {
    expect(sidebarSource).toContain(
      "const isCollapsed = !isMobile && sidebarState === 'collapsed'",
    );
    expect(sidebarSource).toContain('flex h-11 w-full min-w-0 items-center');
    expect(sidebarSource).toContain('flex h-11 min-w-0 items-center');
    expect(sidebarPrimitiveSource).toContain('[&>button]:size-11');
    expect(sidebarPrimitiveSource).not.toContain('[&>button]:hidden');
    expect(sidebarPrimitiveSource).toContain("'Basculer la navigation'");
  });

  it('keeps nested destinations available in expanded and icon modes', () => {
    expect(sidebarSource).toContain('<SidebarMenuAction');
    expect(sidebarSource).toContain('if (isCollapsed)');
    expect(sidebarSource).toMatch(/aria-label=\{`Ouvrir \$\{item\.label\}`\}/);
    expect(sidebarSource).toContain('Vue d’ensemble');
    expect(sidebarSource).toContain('side="right"');
    expect(sidebarSource).toContain("? 'location'");
  });

  it('exposes clear navigation landmarks and visible current destinations', () => {
    expect(sidebarSource).toContain('aria-label="Navigation principale"');
    expect(sidebarSource).toContain('aria-label="Navigation secondaire"');
    expect(sidebarSource).toContain('aria-labelledby={sectionLabelId}');
    expect(sidebarPrimitiveSource).toContain('\'[aria-current="location"]\'');
    expect(sidebarPrimitiveSource).toContain('getClientRects().length > 0');
  });

  it('keeps identity and account actions compact without duplicate navigation', () => {
    expect(sidebarSource).not.toContain('SITE_CONFIG.subtitle');
    expect(sidebarSource).not.toContain('Pôle actif');
    expect(sidebarSource).toContain('Changer de pôle');
    expect(sidebarSource).toContain('href="/mon-compte"');
    expect(sidebarSource).toContain('Déconnexion');
    expect(sidebarSource).toContain('@{userData.loginName}');
    expect(sidebarSource).toContain('aria-label="Accès au compte"');
    expect(sidebarSource).toContain('Profil, sécurité et activité');
    expect(navigationSource).not.toMatch(
      /href:\s*['"]\/mon-compte['"][\s\S]{0,160}label:\s*['"]Mon compte['"]/,
    );
  });

  it('gives both menus a visible open and current state', () => {
    expect(sidebarSource).toContain(
      'group-data-[state=open]/space-switcher:rotate-180',
    );
    expect(sidebarSource).toContain(
      'group-data-[state=open]/account-menu:rotate-180',
    );
    expect(sidebarSource).toContain('data-[state=open]:bg-sidebar-accent/65');
    expect(sidebarSource).toContain('bg-primary/10 text-primary-emphasis');
    expect(sidebarSource).toContain('Actuel');
    expect(sidebarSource).toContain('aria-current={isActive');
    expect(sidebarPrimitiveSource).toContain('before:bg-primary');
    expect(sidebarPrimitiveSource).toContain(
      'data-[active=true]:before:opacity-100',
    );
  });

  it('keeps the pole switcher readable in expanded, collapsed and mobile layouts', () => {
    expect(sidebarSource).toContain('w-[min(20rem,calc(100vw-2rem))]');
    expect(sidebarSource).toContain('hover:bg-sidebar-accent/55');
    expect(sidebarSource).toContain('Changer de pôle — {activeSpace.label}');
    expect(sidebarSource).toContain('open={isTooltipOpen && !isMenuOpen}');
    expect(sidebarSource).not.toContain('Changer d’espace');
  });

  it('keeps pole placement stable with restrained color hierarchy', () => {
    expect(sidebarSource).toContain(
      'spaces.map((space) => renderSpaceItem(space))',
    );
    expect(sidebarSource).not.toContain('Autres pôles');
    expect(sidebarSource).toContain(
      'border-border-default bg-surface-floating',
    );
    expect(sidebarSource).toContain('aria-label="Pôles disponibles"');
    expect(sidebarSource).toContain(
      "const SIDEBAR_POPOVER_SECTION_CLASS = 'space-y-0.5'",
    );
    expect(sidebarSource).toContain('hover:bg-surface-tile-hover');
    expect(sidebarSource).toContain('text-muted-foreground');
    expect(sidebarSource).toContain('text-sidebar-foreground/60');
    expect(sidebarSource).not.toContain('text-sidebar-foreground/45');
  });

  it('gives the account popover controlled tonal depth', () => {
    expect(sidebarSource).toContain('w-[min(19rem,calc(100vw-2rem))]');
    expect(sidebarSource).not.toContain('bg-gradient');
    expect(sidebarSource).not.toContain('from-surface-muted');
    expect(sidebarSource).toContain('shadow-[var(--shadow-account-popover)]');
    expect(sidebarSource).toContain('bg-primary/5 relative border-b');
    expect(sidebarSource).toContain('bg-surface-panel-raised/55');
    expect(sidebarSource).toContain('bg-surface-page/65');
    expect(sidebarSource).toContain(
      'bg-primary/10 text-primary-emphasis ring-primary/15',
    );
    expect(sidebarSource).toContain('bg-primary/10 text-foreground');
    expect(sidebarSource).toContain('hover:bg-destructive/10');
    expect(sidebarSource).toContain('text-muted-foreground');
    expect(globalStylesSource).toContain('--shadow-account-popover:');
  });

  it('keeps compact proportions without decorative texture or nested cards', () => {
    expect(sidebarSource).toContain('rounded-lg border p-0');
    expect(sidebarSource).toContain('size-11');
    expect(sidebarSource).toContain('size-8');
    expect(sidebarSource).toContain('min-h-10');
    expect(sidebarSource).toContain('text-sm font-medium');
    expect(sidebarSource).not.toContain('tracking-[0.16em]');
    expect(sidebarSource).toContain('collisionPadding={8}');
    expect(sidebarSource).toContain('overflow-y-auto overscroll-contain');
    expect(sidebarSource).toContain(
      "requestGuardedNavigation('/login', logout)",
    );
    expect(sidebarSource).not.toContain('#121c2b');
    expect(sidebarSource).not.toContain('#18243a');
    expect(sidebarSource).not.toContain('#0e1622');
    expect(sidebarPrimitiveSource).not.toContain('sidebar-pattern');
    expect(globalStylesSource).not.toContain('repeating-linear-gradient');
  });
});
