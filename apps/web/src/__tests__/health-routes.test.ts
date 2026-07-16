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
  auditEventKinds: 2,
  auditLogColumns: 18,
  auditOutcomes: 3,
  auditScaleIndexes: 5,
  auditSeverities: 3,
  auditSnapshotTriggers: 1,
  auditStreams: 5,
  durableAuditActions: 4,
  loginNameReservationColumns: 3,
  mfaAuditActions: 5,
  mfaAuthenticationMethods: 2,
  mfaChallengePurposes: 2,
  mfaLoginChallengeColumns: 11,
  mfaRecoveryCodeColumns: 6,
  protectedAccounts: 1,
  rateLimitColumns: 4,
  sessionColumns: 10,
  totpCredentialColumns: 9,
  totpEnrollmentColumns: 8,
  userColumns: 15,
  validProtectedRootAccounts: 1,
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
    expect(query).toContain("'mfaEnabledAt'");
    expect(query).toContain("'mfaVerifiedAt'");
    expect(query).toContain("'mfaMethod'");
    expect(query).toContain("'TotpCredential'");
    expect(query).toContain("'TotpEnrollment'");
    expect(query).toContain("'MfaRecoveryCode'");
    expect(query).toContain("'MfaLoginChallenge'");
    expect(query).toContain("'MFA_RECOVERY_CODES_REGENERATED'");
    expect(query).toContain("'MFA_RESET'");
    expect(query).toContain("'AUDIT_EXPORT'");
    expect(query).toContain("'STEP_UP_SUCCESS'");
    expect(query).toContain("'STEP_UP_FAILED'");
    expect(query).toContain("'actorDisplayNameSnapshot'");
    expect(query).toContain("'AuditEventKind'");
    expect(query).toContain("'AuditStream'");
    expect(query).toContain("'AuditOutcome'");
    expect(query).toContain("'AuditSeverity'");
    expect(query).toContain("'AuditLog_actorDisplayNameSnapshot_trgm_idx'");
    expect(query).toContain("'AuditLog_targetUserId_action_idx'");
    expect(query).toContain('audit_index_state.indisvalid');
    expect(query).toContain('audit_index_state.indisready');
    expect(query).toContain("'AuditLog_immutable_identity_snapshots'");
    expect(query).toContain("'LoginNameReservation'");
    expect(query).toContain('"isProtected" = true');
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

  it.each([
    'auditEventKinds',
    'auditLogColumns',
    'auditOutcomes',
    'auditSeverities',
    'auditScaleIndexes',
    'auditSnapshotTriggers',
    'auditStreams',
    'durableAuditActions',
    'mfaAuditActions',
    'mfaAuthenticationMethods',
    'mfaChallengePurposes',
    'mfaLoginChallengeColumns',
    'mfaRecoveryCodeColumns',
    'totpCredentialColumns',
    'totpEnrollmentColumns',
  ] as const)('is not ready when %s are missing', async (field) => {
    mocks.transaction.$queryRaw.mockResolvedValueOnce([
      { ...readySchema, [field]: 0 },
    ]);
    const { GET } = await import('$app/api/health/ready/route');
    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      checks: { database: 'connected', schema: 'not_ready' },
      status: 'unhealthy',
    });
  });

  it('is not ready without exactly one protected account', async () => {
    mocks.transaction.$queryRaw.mockResolvedValueOnce([
      { ...readySchema, protectedAccounts: 0 },
    ]);
    const { GET } = await import('$app/api/health/ready/route');
    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      checks: { database: 'connected', schema: 'not_ready' },
      status: 'unhealthy',
    });
  });

  it('is not ready when the protected account is not a valid root', async () => {
    mocks.transaction.$queryRaw.mockResolvedValueOnce([
      { ...readySchema, validProtectedRootAccounts: 0 },
    ]);
    const { GET } = await import('$app/api/health/ready/route');
    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      checks: { database: 'connected', schema: 'not_ready' },
      status: 'unhealthy',
    });
  });

  it('is not ready when another protected account exists', async () => {
    mocks.transaction.$queryRaw.mockResolvedValueOnce([
      { ...readySchema, protectedAccounts: 2 },
    ]);
    const { GET } = await import('$app/api/health/ready/route');
    const response = await GET();

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      checks: { database: 'connected', schema: 'not_ready' },
      status: 'unhealthy',
    });
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
