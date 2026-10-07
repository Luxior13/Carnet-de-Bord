import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const readSourceFile = (relativePath: string): string => {
  // Test-owned paths only; the helper never receives external input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
};

const sidebarSource = readSourceFile('../components/Sidebar.tsx');
const poleNavigationSource = readSourceFile(
  '../components/layout/PoleNavigation.tsx',
);
const sidebarPrimitiveSource = readSourceFile('../components/ui/sidebar.tsx');
const authenticatedLayoutSource = readSourceFile(
  '../components/AuthenticatedLayout.tsx',
);
const headerSource = readSourceFile('../components/layout/Header.tsx');
const navigationSource = readSourceFile('../shared/constants/app.constants.ts');
const globalStylesSource = readSourceFile('../app/globals.css');

describe('sidebar UX contracts', () => {
  it('keeps the shared desktop sidebar open regardless of old preferences', () => {
    expect(authenticatedLayoutSource).toContain('<SidebarProvider open>');
    expect(sidebarPrimitiveSource).toContain('if (isControlled) return;');
    expect(headerSource).toMatch(
      /<SidebarTrigger[\s\S]*?className="[^"]*lg:hidden/,
    );
  });

  it('keeps mobile controls usable without leaking the desktop state', () => {
    expect(sidebarSource).toContain(
      "const isCollapsed = !isMobile && sidebarState === 'collapsed'",
    );
    expect(sidebarSource).toContain('flex h-11 w-full min-w-0 items-center');
    expect(sidebarSource).toContain('h-11 w-full min-w-0 items-center gap-2.5');
    expect(sidebarSource).not.toContain('lg:h-14');
    expect(sidebarPrimitiveSource).toContain('[&>button]:size-11');
    expect(sidebarPrimitiveSource).not.toContain('[&>button]:hidden');
    expect(sidebarPrimitiveSource).toContain("'Basculer la navigation'");
  });

  it('keeps nested destinations available in expanded and icon modes', () => {
    expect(sidebarSource).toContain('<SidebarMenuAction');
    expect(sidebarSource).toContain('<CollapsibleTrigger asChild>');
    expect(sidebarSource).toContain('children.map(renderSubNavItem)');
    expect(poleNavigationSource).toContain('if (isCollapsed)');
    expect(poleNavigationSource).toContain('setOpen(true)');
    expect(poleNavigationSource).toContain(
      'if (isActive) event.preventDefault()',
    );
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
    expect(sidebarSource).toContain('<PoleNavigation');
    expect(sidebarSource).toContain('href="/mon-compte"');
    expect(sidebarSource).toContain('Déconnexion');
    expect(sidebarSource).toContain('@{userData.loginName}');
    expect(sidebarSource).toContain('aria-label="Accès au compte"');
    expect(sidebarSource).toContain('Profil, sécurité et activité');
    expect(navigationSource).not.toMatch(
      /href:\s*['"]\/mon-compte['"][\s\S]{0,160}label:\s*['"]Mon compte['"]/,
    );
  });

  it('gives the switcher and account menu visible current and open states', () => {
    expect(poleNavigationSource).toContain('ChevronDown');
    expect(poleNavigationSource).toContain(
      'group-data-[state=open]/rubriques:rotate-180',
    );
    expect(poleNavigationSource).toContain('bg-surface-navigation-active');
    expect(sidebarSource).toContain(
      'group-data-[state=open]/account-menu:rotate-180',
    );
    expect(sidebarSource).toContain(
      'data-[state=open]:bg-surface-navigation-active',
    );
    expect(sidebarSource).toContain(
      'bg-surface-navigation-active text-foreground',
    );
    expect(poleNavigationSource).toContain(
      "aria-current={isActive ? 'location' : undefined}",
    );
    expect(sidebarPrimitiveSource).not.toContain('before:bg-primary');
    expect(sidebarPrimitiveSource).toContain(
      'data-[active=true]:bg-surface-navigation-active',
    );
  });

  it('keeps section switching above the full-width destinations', () => {
    expect(poleNavigationSource).not.toContain('Collapsible');
    expect(poleNavigationSource).toContain('<DropdownMenuTrigger asChild>');
    expect(poleNavigationSource).toContain('<DropdownMenuContent');
    expect(poleNavigationSource).toContain('data-sidebar="space-switcher"');
    expect(poleNavigationSource).toContain('overflow-y-auto');
    expect(poleNavigationSource).not.toContain('ResizeObserver');
    expect(poleNavigationSource).not.toContain(
      'team-control:sidebar:poles-open:',
    );
    expect(sidebarSource).toContain('data-sidebar="space-pages"');
    expect(sidebarSource).toContain(
      'pendingMobileSpaceHref.current !== pathname',
    );
    expect(poleNavigationSource).not.toContain('setOpenMobile(false)');
    expect(poleNavigationSource).toContain('event.metaKey');
  });

  it('keeps pole placement stable with restrained color hierarchy', () => {
    expect(poleNavigationSource).toContain('spaces.map((space) =>');
    expect(poleNavigationSource).not.toContain('Autres pôles');
    expect(sidebarSource).not.toContain('bg-surface-floating');
    expect(poleNavigationSource).toContain('aria-label="Rubriques"');
    expect(poleNavigationSource).toContain('tone.iconForeground');
    expect(poleNavigationSource).toContain('aria-label={space.label}');
    expect(poleNavigationSource).toContain(
      "side={isCollapsed ? 'right' : 'bottom'}",
    );
    expect(sidebarSource).toContain(
      "const SIDEBAR_POPOVER_SECTION_CLASS = 'space-y-0.5'",
    );
    expect(sidebarSource).toContain('hover:bg-surface-navigation-hover');
    expect(sidebarSource).toContain('text-muted-foreground');
    expect(sidebarSource).toContain('text-muted-foreground');
    expect(sidebarSource).not.toContain('text-sidebar-foreground/45');
  });

  it('keeps the account popover on one surface with inset separators', () => {
    expect(sidebarSource).toContain('w-[min(16rem,calc(100vw-2rem))]');
    expect(sidebarSource).not.toContain('bg-gradient-to-br');
    expect(sidebarSource).not.toContain('from-surface-muted');
    expect(sidebarSource).toContain('shadow-[var(--shadow-account-popover)]');
    expect(sidebarSource).toContain('bg-surface-panel text-popover-foreground');
    expect(sidebarSource).toContain('bg-border-content mx-2.5 my-1.5');
    expect(sidebarSource).not.toContain('bg-surface-panel-header border-b');
    expect(sidebarSource).not.toContain('bg-surface-inset border-t');
    expect(sidebarSource).toContain(
      'bg-surface-navigation-active text-foreground',
    );
    expect(sidebarSource).toContain('hover:bg-destructive/10');
    expect(sidebarSource).toContain('text-muted-foreground');
    expect(globalStylesSource).toContain('--shadow-account-popover:');
  });

  it('keeps compact proportions without decorative texture or nested cards', () => {
    expect(sidebarSource).toContain('rounded-sm border p-1.5');
    expect(sidebarSource).toContain('size-9');
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
