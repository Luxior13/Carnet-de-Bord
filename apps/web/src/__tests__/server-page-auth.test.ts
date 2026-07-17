import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

// Test-owned static paths only; neither URL can contain external input.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const rootLayoutSource = readFileSync(
  new URL('../app/layout.tsx', import.meta.url),
  'utf8',
);
// eslint-disable-next-line security/detect-non-literal-fs-filename
const middlewareSource = readFileSync(
  new URL('../middleware.ts', import.meta.url),
  'utf8',
);

describe('server page authentication', () => {
  it('shares the exact public-page policy between middleware and layout', () => {
    expect(middlewareSource).toContain("from '$constants/security.constants'");
    expect(rootLayoutSource).toContain("from '$constants/security.constants'");
    expect(middlewareSource).toContain('!isPublicPagePath');
    expect(rootLayoutSource).toContain('!isPublicPagePath');
  });

  it('validates private sessions before rendering page content', () => {
    expect(rootLayoutSource).toContain(
      "export const dynamic = 'force-dynamic'",
    );
    expect(rootLayoutSource).toContain('await getPageAuthSession()');
    expect(rootLayoutSource).toContain('encodeURIComponent(requestTarget)');
    expect(rootLayoutSource).toContain('redirect(`/login?next=');
    expect(rootLayoutSource).toContain('initialUser={initialUser}');
  });
});
