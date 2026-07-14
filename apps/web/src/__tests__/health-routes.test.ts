import { beforeEach, describe, expect, it, vi } from 'vitest';

const REQUEST_ID = '123e4567-e89b-42d3-a456-426614174000';

const mocks = vi.hoisted(() => ({
  headers: vi.fn(),
  loggerError: vi.fn(),
  prisma: { $transaction: vi.fn() },
  transaction: { $queryRaw: vi.fn() },
}));

vi.mock('server-only', () => ({}));

vi.mock('next/headers', () => ({
  headers: mocks.headers,
}));

vi.mock('$server/logger', () => ({
  logger: { error: mocks.loggerError },
}));

vi.mock('$server/prisma', () => ({
  prisma: mocks.prisma,
}));

const readySchema = {
  auditLogColumns: 6,
  loginNameReservationColumns: 3,
  rateLimitColumns: 4,
  sessionColumns: 8,
  userColumns: 14,
};

describe('operational health routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.headers.mockResolvedValue(
      new Headers({ 'x-request-id': REQUEST_ID }),
    );
    mocks.transaction.$queryRaw.mockResolvedValue([readySchema]);
    mocks.prisma.$transaction.mockImplementation(
      async (
        callback: (client: typeof mocks.transaction) => Promise<unknown>,
      ) => callback(mocks.transaction),
    );
  });

  it('serves liveness without touching the database', async () => {
    const { GET } = await import('$app/api/health/live/route');
    const response = GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.status).toBe('healthy');
    expect(body).not.toHaveProperty('uptime');
    expect(response.headers.get('cache-control')).toContain('no-store');
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('checks the current schema with a short bounded transaction', async () => {
    const { GET } = await import('$app/api/health/ready/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      checks: { database: 'connected', schema: 'ready' },
      status: 'healthy',
    });
    expect(mocks.prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      { maxWait: 500, timeout: 1_500 },
    );
    const query = String(mocks.transaction.$queryRaw.mock.calls[0]?.[0]);
    expect(query).toContain('current_schema()');
    expect(query).toContain("'idleExpiresAt'");
    expect(query).toContain("'lastSeenAt'");
    expect(query).toContain("'securityVersion'");
    expect(query).toContain("'LoginNameReservation'");
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('keeps /api/health as a backward-compatible readiness alias', async () => {
    const { GET } = await import('$app/api/health/route');
    const response = await GET();

    expect(response.status).toBe(200);
    expect(mocks.prisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('returns a safe 503 and correlated structured log for schema drift', async () => {
    mocks.transaction.$queryRaw.mockResolvedValueOnce([
      { ...readySchema, userColumns: 10 },
    ]);
    const { GET } = await import('$app/api/health/ready/route');
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body).toMatchObject({
      checks: { database: 'connected', schema: 'not_ready' },
      status: 'unhealthy',
    });
    expect(JSON.stringify(body)).not.toContain('Required database schema');
    expect(mocks.loggerError).toHaveBeenCalledWith(
      'Readiness check failed',
      expect.objectContaining({
        metadata: expect.objectContaining({
          component: 'schema',
          reasonCode: 'SCHEMA_NOT_READY',
        }),
        requestId: REQUEST_ID,
        status: 503,
      }),
    );
  });

  it('does not leak database errors and throttles repeated failure logs', async () => {
    mocks.prisma.$transaction.mockRejectedValue(
      new Error('postgres://secret-user:secret-password@private-host/db'),
    );
    const { GET } = await import('$app/api/health/ready/route');
    const firstResponse = await GET();
    const secondResponse = await GET();
    const firstBody = await firstResponse.json();

    expect(firstResponse.status).toBe(503);
    expect(secondResponse.status).toBe(503);
    expect(JSON.stringify(firstBody)).not.toContain('secret-password');
    expect(firstBody).not.toHaveProperty('error');
    expect(firstBody).not.toHaveProperty('uptime');
    expect(mocks.loggerError).toHaveBeenCalledTimes(1);
    expect(mocks.loggerError).toHaveBeenCalledWith(
      'Readiness check failed',
      expect.objectContaining({
        metadata: expect.objectContaining({
          component: 'database',
          reasonCode: 'DATABASE_NOT_READY',
        }),
        requestId: REQUEST_ID,
      }),
    );
  });
});
