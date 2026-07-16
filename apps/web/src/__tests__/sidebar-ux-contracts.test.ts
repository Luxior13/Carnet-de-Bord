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
    expect(sidebarSource).toContain('className="text-sidebar-ring');
    expect(sidebarSource).toContain('aria-current={isActive');
  });

  it('keeps the pole switcher readable in expanded, collapsed and mobile layouts', () => {
    expect(sidebarSource).toContain('w-[min(20rem,calc(100vw-2rem))]');
    expect(sidebarSource).toContain('isActive && tone.soft');
    expect(sidebarSource).toContain('Changer de pôle — {activeSpace.label}');
    expect(sidebarSource).toContain('open={isTooltipOpen && !isMenuOpen}');
    expect(sidebarSource).not.toContain('Changer d’espace');
  });
});
