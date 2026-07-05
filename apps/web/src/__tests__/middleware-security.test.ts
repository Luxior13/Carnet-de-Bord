import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

import { middleware } from '../middleware';

vi.mock('server-only', () => ({}));

const VALID_CSRF_TOKEN = 'a'.repeat(64);

describe('middleware security', () => {
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
  });
});
