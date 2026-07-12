import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ErrorCode } from '$types/api.types';

const REQUEST_ID = '123e4567-e89b-42d3-a456-426614174000';

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({
  headers: mocks.headers,
}));

vi.mock('$server/logger', () => ({
  logger: { error: mocks.loggerError },
}));

import { apiErrors } from '$server/api-response';

describe('API error observability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(
      new Headers({
        'x-request-id': REQUEST_ID,
        'x-request-method': 'PATCH',
        'x-request-path': '/api/users/user-1',
      }),
    );
  });

  it('correlates internal logs and responses without leaking the error', async () => {
    const response = await apiErrors.internal(
      'USER_UPDATE',
      new Error('database secret'),
    );
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(response.headers.get('x-request-id')).toBe(REQUEST_ID);
    expect(body).toEqual({
      error: { code: ErrorCode.INTERNAL_ERROR, message: 'Erreur serveur' },
      success: false,
    });
    expect(JSON.stringify(body)).not.toContain('database secret');
    expect(mocks.loggerError).toHaveBeenCalledWith('Erreur serveur', {
      action: 'USER_UPDATE',
      error: expect.any(Error),
      method: 'PATCH',
      path: '/api/users/user-1',
      requestId: REQUEST_ID,
      status: 500,
    });
  });
});
