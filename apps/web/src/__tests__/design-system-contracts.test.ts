import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  getNavigationSpaceBadgeClasses,
  NAVIGATION_SPACE_TONE_CLASSES,
} from '$constants/navigation-theme.constants';
import { badgeVariants } from '$ui/badge';
import { buttonVariants } from '$ui/button';

const readSourceFile = (relativePath: string): string => {
  // Test-owned paths only; the helper never receives external input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
};

const authenticatedLayoutSource = readSourceFile(
  '../components/AuthenticatedLayout.tsx',
);
const rootLayoutSource = readSourceFile('../app/layout.tsx');
const globalStylesSource = readSourceFile('../app/globals.css');
const tabsSource = readSourceFile('../components/ui/tabs.tsx');
const userDetailSectionRailSource = readSourceFile(
  '../components/users/user-detail/UserDetailSectionRail.tsx',
);

describe('design system contracts', () => {
  it('uses the accessible destructive fill for filled actions', () => {
    const buttonClasses = buttonVariants({ variant: 'destructive' });
    const badgeClasses = badgeVariants({ variant: 'destructive' });

    expect(buttonClasses).toContain('bg-destructive-fill');
    expect(buttonClasses).toContain('text-destructive-foreground');
    expect(buttonClasses).not.toContain('text-white');
    expect(badgeClasses).toContain('bg-destructive-fill');
    expect(badgeClasses).toContain('text-destructive-foreground');
    expect(badgeClasses).not.toContain('text-white');
  });

  it.each(['success', 'warning', 'info'] as const)(
    'uses semantic tokens for the accessible %s variant',
    (variant) => {
      const buttonClasses = buttonVariants({ variant });
      const badgeClasses = badgeVariants({ variant });

      expect(buttonClasses).toContain(`border-${variant}/80`);
      expect(buttonClasses).toContain(`bg-${variant}`);
      expect(buttonClasses).toContain(`text-${variant}-foreground`);
      expect(badgeClasses).toContain(`bg-${variant}`);
      expect(badgeClasses).toContain(`text-${variant}-foreground`);
      expect(buttonClasses).not.toMatch(/(?:amber|emerald|blue)-\d+/);
      expect(badgeClasses).not.toMatch(/(?:amber|emerald|blue)-\d+/);
    },
  );

  it('does not reinterpret raw palette classes in generic primitives', () => {
    expect(buttonVariants()).not.toContain('[&.bg-amber-');
    expect(badgeVariants()).not.toContain('[&.bg-amber-');
  });

  it('keeps navigation tones behind named design tokens', () => {
    for (const [tone, toneClasses] of Object.entries(
      NAVIGATION_SPACE_TONE_CLASSES,
    )) {
      const classes = Object.values(toneClasses).join(' ');

      expect(classes).toContain(`nav-${tone}`);
      expect(classes).not.toMatch(/(?:bg|border|text)-\[#[\da-f]{3,8}\]/i);
      expect(globalStylesSource).toContain(
        `--color-nav-${tone}: var(--nav-${tone})`,
      );
      expect(globalStylesSource).toContain(
        `--color-nav-${tone}-icon: var(--nav-${tone}-icon)`,
      );
      expect(globalStylesSource).toContain(
        `--color-nav-${tone}-foreground: var(--nav-${tone}-foreground)`,
      );
    }

    expect(getNavigationSpaceBadgeClasses('Plus tard')).not.toContain('[#');
    expect(getNavigationSpaceBadgeClasses('Restreint')).not.toContain('[#');
  });

  it('keeps generic actions touch-friendly below the desktop breakpoint', () => {
    expect(buttonVariants()).toContain('h-10');
    expect(buttonVariants({ size: 'icon' })).toContain('size-10');
    expect(buttonVariants({ size: 'sm' })).toContain('h-10');
  });

  it('does not replay a page entrance animation on every private navigation', () => {
    expect(authenticatedLayoutSource).not.toContain('animate-fade-in-up');
  });

  it('does not hide horizontal overflow globally or in the private shell', () => {
    expect(globalStylesSource).not.toContain('overflow-x-hidden');
    expect(authenticatedLayoutSource).not.toContain('overflow-x-hidden');
  });

  it('does not reserve vertical scrollbar gutters in horizontal navigation', () => {
    expect(tabsSource).not.toContain('scrollbar-gutter');
    expect(userDetailSectionRailSource).not.toContain('scrollbar-gutter');
  });

  it('does not keep the ineffective page overlay gradient', () => {
    const bodyRule = globalStylesSource.match(/\bbody\s*\{[^}]*\}/)?.[0];

    expect(globalStylesSource).not.toContain('--page-overlay-');
    expect(bodyRule).not.toContain('background-image');
  });

  it('preserves visible focus indicators in forced-colors mode', () => {
    expect(globalStylesSource).toMatch(
      /@media \(forced-colors: active\)[\s\S]*\*:focus-visible\s*\{[\s\S]*outline:\s*2px solid CanvasText !important;/,
    );
    expect(globalStylesSource).toMatch(
      /@media \(forced-colors: active\)[\s\S]*outline-offset:\s*2px !important;/,
    );
  });

  it('removes animation and transition delays for reduced motion', () => {
    expect(globalStylesSource).toMatch(
      /@media \(prefers-reduced-motion: reduce\)[\s\S]*animation-duration:\s*0\.01ms !important;[\s\S]*animation-delay:\s*0s !important;[\s\S]*transition-duration:\s*0\.01ms !important;[\s\S]*transition-delay:\s*0s !important;/,
    );
  });

  it('installs the Next font variables on the root element', () => {
    const htmlOpeningTag = rootLayoutSource.match(/<html\b[\s\S]*?>/)?.[0];
    const bodyOpeningTag = rootLayoutSource.match(/<body\b[\s\S]*?>/)?.[0];

    expect(htmlOpeningTag).toContain('geistSans.variable');
    expect(htmlOpeningTag).toContain('geistMono.variable');
    expect(bodyOpeningTag).not.toContain('geistSans.variable');
    expect(bodyOpeningTag).not.toContain('geistMono.variable');
  });
});
