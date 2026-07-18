import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { config, middleware } from '../middleware';

vi.mock('server-only', () => ({}));

const mockCheckRateLimit = vi.hoisted(() => vi.fn());

vi.mock('$server/api-rate-limiter', () => ({
  checkRateLimit: mockCheckRateLimit,
}));

const VALID_CSRF_TOKEN = 'a'.repeat(64);

describe('middleware security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      remaining: 99,
      resetAt: Date.now() + 60_000,
    });
  });

  it('preserves a protected deep link when redirecting to login', () => {
    const response = middleware(
      new NextRequest(
        'http://localhost/administration/utilisateurs?page=2&status=active',
      ),
    );
    const location = new URL(response.headers.get('location') ?? '');

    expect(response.status).toBe(307);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('next')).toBe(
      '/administration/utilisateurs?page=2&status=active',
    );
  });

  it('protects an unknown future page by default', () => {
    const response = middleware(
      new NextRequest('http://localhost/nouveau-module/rapport?year=2027'),
    );
    const location = new URL(response.headers.get('location') ?? '');

    expect(response.status).toBe(307);
    expect(location.pathname).toBe('/login');
    expect(location.searchParams.get('next')).toBe(
      '/nouveau-module/rapport?year=2027',
    );
  });

  it('keeps only the explicit login page public', () => {
    const response = middleware(new NextRequest('http://localhost/login'));

    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(response.headers.get('set-cookie')).toContain('csrf-token=');
  });

  it('does not make nested paths public through the login allowlist', () => {
    const response = middleware(
      new NextRequest('http://localhost/login/administration'),
    );

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/login?next=');
  });

  it('rejects mutation API requests without a CSRF token', () => {
    const response = middleware(
      new NextRequest('http://localhost/api/auth/login', {
        method: 'POST',
      }),
    );

    expect(response.status).toBe(403);
  });

  it('rejects mutation API requests with malformed matching CSRF tokens', () => {
    const response = middleware(
      new NextRequest('http://localhost/api/auth/login', {
        headers: {
          cookie: 'csrf-token=not-a-valid-token',
          'x-csrf-token': 'not-a-valid-token',
        },
        method: 'POST',
      }),
    );

    expect(response.status).toBe(403);
  });

  it('allows mutation API requests with valid matching CSRF tokens', () => {
    const response = middleware(
      new NextRequest('http://localhost/api/auth/login', {
        headers: {
          cookie: `csrf-token=${VALID_CSRF_TOKEN}`,
          'x-csrf-token': VALID_CSRF_TOKEN,
        },
        method: 'POST',
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('X-RateLimit-Remaining')).toBeTruthy();
    expect(response.headers.get('Cache-Control')).toContain('no-store');
  });

  it('uses the closest valid proxy hop instead of a forged forwarded prefix', () => {
    middleware(
      new NextRequest('http://localhost/api/dashboard', {
        headers: {
          'x-forwarded-for': '198.51.100.200, 203.0.113.9',
        },
      }),
    );

    expect(mockCheckRateLimit).toHaveBeenCalledWith('203.0.113.9');
  });

  it('rejects oversized forwarded hops and falls back to a valid real-ip header', () => {
    middleware(
      new NextRequest('http://localhost/api/dashboard', {
        headers: {
          'x-forwarded-for': `198.51.100.200, ${'a'.repeat(65)}`,
          'x-real-ip': '192.0.2.44',
        },
      }),
    );

    expect(mockCheckRateLimit).toHaveBeenCalledWith('192.0.2.44');
  });

  it('replaces client request ids with a server-generated UUID', () => {
    const response = middleware(
      new NextRequest('http://localhost/api/dashboard', {
        headers: { 'x-request-id': 'client-controlled' },
      }),
    );
    const requestId = response.headers.get('x-request-id');

    expect(requestId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(requestId).not.toBe('client-controlled');
    expect(response.headers.get('x-middleware-request-x-request-id')).toBe(
      requestId,
    );
  });

  it('rate-limits readiness without adding a CSRF cookie', () => {
    const response = middleware(
      new NextRequest('http://localhost/api/health/ready'),
    );

    expect(response.status).toBe(200);
    expect(mockCheckRateLimit).toHaveBeenCalledWith('unknown', {
      bucket: 'health-readiness',
      maxRequests: 12,
    });
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('x-ratelimit-remaining')).toBe('99');
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('keeps the lightweight liveness endpoint exempt from rate limiting', () => {
    const response = middleware(
      new NextRequest('http://localhost/api/health/live'),
    );

    expect(response.status).toBe(200);
    expect(mockCheckRateLimit).not.toHaveBeenCalled();
    expect(response.headers.get('set-cookie')).toBeNull();
    expect(response.headers.get('x-ratelimit-remaining')).toBeNull();
  });

  it('keeps API paths with file extensions inside middleware coverage', () => {
    const response = middleware(
      new NextRequest('http://localhost/api/export.csv'),
    );

    expect(config.matcher).toContain('/api/:path*');
    expect(mockCheckRateLimit).toHaveBeenCalledTimes(1);
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('excludes every Next.js internal path from page middleware coverage', () => {
    expect(config.matcher).toContain(
      '/((?!_next/|favicon.ico|assets/.*|.*\\..*).*)',
    );
  });
});
