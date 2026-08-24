import { readFileSync } from 'node:fs';

import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  info: vi.fn(),
  parseJsonBody: vi.fn(),
  requireAuth: vi.fn(),
}));

vi.mock('server-only', () => ({}));
vi.mock('$server/api-auth', () => ({ requireAuth: mocks.requireAuth }));
vi.mock('$server/api-response', () => ({
  parseJsonBody: mocks.parseJsonBody,
}));
vi.mock('$server/logger', () => ({ logger: { info: mocks.info } }));

import { POST } from '$app/api/observability/web-vitals/route';

// Test-owned path only; the URL never receives external input.
// eslint-disable-next-line security/detect-non-literal-fs-filename
const reporterSource = readFileSync(
  new URL('../components/observability/WebVitalsReporter.tsx', import.meta.url),
  'utf8',
);

const metric = {
  delta: 12,
  id: 'v4-1',
  name: 'LCP',
  navigationType: 'navigate',
  rating: 'good',
  value: 1200,
};

describe('Web Vitals observability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      success: true,
      user: { id: 'user-1' },
    });
    mocks.parseJsonBody.mockResolvedValue({
      data: { metrics: [metric] },
      success: true,
    });
  });

  it('batches same-origin reports without attaching a page URL', () => {
    expect(reporterSource).toContain('useReportWebVitals(reportWebVital)');
    expect(reporterSource).toContain('keepalive: true');
    expect(reporterSource).toContain(
      "apiFetch('/api/observability/web-vitals'",
    );
    expect(reporterSource).not.toContain('window.location');
    expect(reporterSource).not.toContain('pathname');
  });

  it('accepts a bounded authenticated metric batch', async () => {
    const response = await POST(
      new Request('http://localhost/api/observability/web-vitals', {
        method: 'POST',
      }),
    );

    expect(response.status).toBe(204);
    expect(mocks.info).toHaveBeenCalledWith('Client Web Vitals', {
      action: 'WEB_VITALS_REPORT',
      metadata: { metrics: [metric] },
      userId: 'user-1',
    });
  });

  it('rejects invalid or oversized client data', async () => {
    mocks.parseJsonBody.mockResolvedValue({
      data: { metrics: [{ ...metric, name: 'SECRET' }] },
      success: true,
    });

    const response = await POST(
      new Request('http://localhost/api/observability/web-vitals', {
        method: 'POST',
      }),
    );

    expect(response.status).toBe(400);
    expect(mocks.info).not.toHaveBeenCalled();
  });
});
