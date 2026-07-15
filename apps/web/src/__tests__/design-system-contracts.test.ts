import { globSync, readFileSync } from 'node:fs';

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
const navigationThemeSource = readSourceFile(
  '../shared/constants/navigation-theme.constants.ts',
);
const tabsSource = readSourceFile('../components/ui/tabs.tsx');
const userDetailSectionRailSource = readSourceFile(
  '../components/users/user-detail/UserDetailSectionRail.tsx',
);

const sourceRootUrl = new URL('../', import.meta.url);
const sidebarTokenOwners = new Set([
  'components/Sidebar.tsx',
  'components/ui/sidebar.tsx',
  'shared/constants/navigation-theme.constants.ts',
]);
const themeIndependentSourcePaths = globSync('**/*.{ts,tsx}', {
  cwd: sourceRootUrl,
})
  .map((path) => path.replaceAll('\\', '/'))
  .filter(
    (path) => !path.startsWith('__tests__/') && !sidebarTokenOwners.has(path),
  );

const getGlobalColorToken = (token: string): string | undefined => {
  const declaration = globalStylesSource
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.startsWith(`${token}:`));

  return declaration?.slice(token.length + 1, -1).trim();
};

const getRequiredGlobalColorToken = (token: string): string => {
  const value = getGlobalColorToken(token);

  expect(value, `${token} must be declared`).toBeTruthy();

  return value ?? '';
};

const getRelativeLuminance = (hexColor: string): number => {
  expect(hexColor).toMatch(/^#[\da-f]{6}$/i);

  const getLinearChannel = (start: number): number => {
    const channel = Number.parseInt(hexColor.slice(start, start + 2), 16);
    const normalizedChannel = channel / 255;

    return normalizedChannel <= 0.04045
      ? normalizedChannel / 12.92
      : ((normalizedChannel + 0.055) / 1.055) ** 2.4;
  };

  return (
    getLinearChannel(1) * 0.2126 +
    getLinearChannel(3) * 0.7152 +
    getLinearChannel(5) * 0.0722
  );
};

const getContrastRatio = (firstColor: string, secondColor: string): number => {
  const firstLuminance = getRelativeLuminance(firstColor);
  const secondLuminance = getRelativeLuminance(secondColor);

  return (
    (Math.max(firstLuminance, secondLuminance) + 0.05) /
    (Math.min(firstLuminance, secondLuminance) + 0.05)
  );
};

const compositeHexColors = (
  foreground: string,
  background: string,
  opacity: number,
): string => {
  const getChannel = (color: string, start: number): number =>
    Number.parseInt(color.slice(start, start + 2), 16);
  const compositeChannel = (start: number): string =>
    Math.round(
      getChannel(foreground, start) * opacity +
        getChannel(background, start) * (1 - opacity),
    )
      .toString(16)
      .padStart(2, '0');

  return `#${compositeChannel(1)}${compositeChannel(3)}${compositeChannel(5)}`;
};

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

  it('keeps the brand primary distinct from statuses and navigation spaces', () => {
    const primary = getGlobalColorToken('--primary');

    expect(primary).toBeTruthy();

    for (const token of [
      '--success',
      '--warning',
      '--info',
      '--destructive',
      '--nav-dashboard',
      '--nav-internal',
      '--nav-legal',
      '--nav-sport',
      '--nav-system',
      '--nav-treasury',
    ]) {
      expect(getGlobalColorToken(token)).not.toBe(primary);
    }
  });

  it('keeps dark surfaces ordered by elevation with visible separation', () => {
    const background = getRequiredGlobalColorToken('--background');
    const surfaceSubtle = getRequiredGlobalColorToken('--surface-subtle');
    const surface = getRequiredGlobalColorToken('--surface');
    const surfaceMuted = getRequiredGlobalColorToken('--surface-muted');
    const surfaceRaised = getRequiredGlobalColorToken('--surface-raised');

    expect(getRelativeLuminance(surfaceSubtle)).toBeGreaterThan(
      getRelativeLuminance(background),
    );
    expect(getRelativeLuminance(surface)).toBeGreaterThan(
      getRelativeLuminance(surfaceSubtle),
    );
    expect(getRelativeLuminance(surfaceMuted)).toBeGreaterThan(
      getRelativeLuminance(surface),
    );
    expect(getRelativeLuminance(surfaceRaised)).toBeGreaterThan(
      getRelativeLuminance(surfaceMuted),
    );
    expect(getContrastRatio(background, surface)).toBeGreaterThan(1.2);
    expect(getContrastRatio(background, surfaceRaised)).toBeGreaterThan(1.6);
  });

  it('keeps secondary text and control borders legible on their surfaces', () => {
    expect(
      getContrastRatio(
        getRequiredGlobalColorToken('--muted-foreground'),
        getRequiredGlobalColorToken('--surface'),
      ),
    ).toBeGreaterThanOrEqual(4.5);
    expect(
      getContrastRatio(
        getRequiredGlobalColorToken('--border-control'),
        getRequiredGlobalColorToken('--surface-subtle'),
      ),
    ).toBeGreaterThanOrEqual(3);
  });

  it.each([
    ['--primary', '--primary-emphasis'],
    ['--destructive', '--destructive'],
    ['--success', '--success'],
    ['--warning', '--warning'],
    ['--info', '--info'],
  ])(
    'keeps %s text legible over its elevated tinted surface',
    (tintToken, textToken) => {
      const tintColor = getRequiredGlobalColorToken(tintToken);
      const textColor = getRequiredGlobalColorToken(textToken);
      const elevatedSurface = getRequiredGlobalColorToken('--surface-raised');
      const tintedSurface = compositeHexColors(tintColor, elevatedSurface, 0.1);

      expect(getContrastRatio(textColor, tintedSurface)).toBeGreaterThanOrEqual(
        4.5,
      );
    },
  );

  it('keeps sidebar-specific tokens out of theme-independent content', () => {
    for (const sourcePath of themeIndependentSourcePaths) {
      // The paths come exclusively from the repository-owned source glob above.
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const source = readFileSync(new URL(sourcePath, sourceRootUrl), 'utf8');

      expect(source, sourcePath).not.toMatch(
        /(?:bg|border|divide|fill|from|outline|ring|shadow|stroke|text|to|via)-sidebar(?:[-/]|(?=['"\s]))/,
      );
    }
  });

  it('uses the accessible emphasis token for primary text and icons', () => {
    for (const sourcePath of themeIndependentSourcePaths) {
      // The paths come exclusively from the repository-owned source glob above.
      // eslint-disable-next-line security/detect-non-literal-fs-filename
      const source = readFileSync(new URL(sourcePath, sourceRootUrl), 'utf8');

      expect(source, sourcePath).not.toMatch(
        /text-primary(?!-(?:emphasis|foreground))/,
      );
    }
  });

  it('keeps the shared navigation hero independent from sidebar colors', () => {
    const heroStart = navigationThemeSource.indexOf('const baseHero');
    const heroEnd = navigationThemeSource.indexOf(';', heroStart);
    const heroDeclaration = navigationThemeSource.slice(heroStart, heroEnd + 1);

    expect(heroStart).toBeGreaterThanOrEqual(0);
    expect(heroEnd).toBeGreaterThan(heroStart);
    expect(heroDeclaration).not.toContain('-sidebar-');
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
