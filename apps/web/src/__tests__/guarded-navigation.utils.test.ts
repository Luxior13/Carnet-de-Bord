import { readFileSync } from 'node:fs';

import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  getGuardedNavigationRequest,
  GUARDED_NAVIGATION_REQUEST_EVENT,
  requestGuardedNavigation,
} from '$utils/guarded-navigation.utils';

const readSourceFile = (relativePath: string): string => {
  // Test-owned paths only; the helper never receives external input.
  // eslint-disable-next-line security/detect-non-literal-fs-filename
  return readFileSync(new URL(relativePath, import.meta.url), 'utf8');
};

const sharedGuardSource = readSourceFile(
  '../shared/hooks/useUnsavedNavigationGuard.ts',
);
const accountSource = readSourceFile(
  '../features/account/AccountPageContent.tsx',
);
const userDetailSource = readSourceFile(
  '../components/users/UserDetailPage.tsx',
);
const quickNavigationSource = readSourceFile(
  '../components/layout/GlobalSearch.tsx',
);
const sidebarSource = readSourceFile('../components/Sidebar.tsx');

describe('guarded programmatic navigation', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('allows navigation when no dirty-form guard is mounted', () => {
    vi.stubGlobal('window', new EventTarget());

    expect(requestGuardedNavigation('/recherche')).toBe(true);
  });

  it('lets a dirty-form guard delay navigation and retain its action', () => {
    const browserWindow = new EventTarget();
    const action = vi.fn();
    let capturedHref: string | null = null;
    let capturedAction: (() => Promise<void> | void) | undefined;

    browserWindow.addEventListener(
      GUARDED_NAVIGATION_REQUEST_EVENT,
      (event) => {
        const request = getGuardedNavigationRequest(event);
        capturedHref = request?.href ?? null;
        capturedAction = request?.action;
        event.preventDefault();
      },
    );
    vi.stubGlobal('window', browserWindow);

    expect(requestGuardedNavigation('/login', action)).toBe(false);
    expect(capturedHref).toBe('/login');
    expect(capturedAction).toBe(action);
  });

  it('connects quick navigation and logout to every dirty-form guard family', () => {
    expect(quickNavigationSource).toContain('requestGuardedNavigation(href)');
    expect(sidebarSource).toContain(
      "requestGuardedNavigation('/login', logout)",
    );
    for (const guardSource of [
      sharedGuardSource,
      accountSource,
      userDetailSource,
    ]) {
      expect(guardSource).toContain('GUARDED_NAVIGATION_REQUEST_EVENT');
      expect(guardSource).toContain('event.defaultPrevented');
    }
  });
});
