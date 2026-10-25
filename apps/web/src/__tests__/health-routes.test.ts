import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  auditEncryptionKeyVersion: { findMany: vi.fn() },
  isPersonEnvironmentConfigured: vi.fn(),
  isPersonSchemaCatalogReady: vi.fn(),
  queryRaw: vi.fn(),
}));

vi.mock('next/headers', () => ({ headers: vi.fn(async () => new Headers()) }));
vi.mock('$server/prisma', () => ({
  prisma: {
    $queryRaw: mocks.queryRaw,
    auditEncryptionKeyVersion: mocks.auditEncryptionKeyVersion,
  },
}));
vi.mock('$features/persons/server/person-schema-readiness', () => ({
  isPersonSchemaCatalogReady: mocks.isPersonSchemaCatalogReady,
}));
vi.mock('$features/persons/server/person-readiness', () => ({
  isPersonEnvironmentConfigured: mocks.isPersonEnvironmentConfigured,
  isPersonReady: (status: string): boolean => status === 'ready',
}));
import { createReadinessResponse } from '$server/health';

const MFA_KEY = Buffer.alloc(32, 3).toString('base64');
let storedMfaKeyVersions: number[] = [];

describe('readiness without a background worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.stubEnv('MFA_ENCRYPTION_KEY_V1', MFA_KEY);
    storedMfaKeyVersions = [1];
    mocks.queryRaw.mockImplementation(async (query: TemplateStringsArray) =>
      query.join('').includes('secretKeyVersion')
        ? storedMfaKeyVersions.map((version) => ({ version }))
        : [{ ready: true }],
    );
    mocks.isPersonSchemaCatalogReady.mockResolvedValue(true);
    mocks.auditEncryptionKeyVersion.findMany.mockResolvedValue([
      { version: 1 },
    ]);
    mocks.isPersonEnvironmentConfigured.mockReturnValue(true);
  });

  it('reports the core and live feature schema checks', async () => {
    const response = await createReadinessResponse();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      checks: {
        database: 'connected',
        mfa: 'ready',
        persons: 'ready',
        schema: 'ready',
      },
      status: 'healthy',
    });
    expect(JSON.stringify(body)).not.toContain('worker');
    expect(JSON.stringify(body)).not.toContain('queue');
    expect(body.checks).not.toHaveProperty('internalNews');
  });

  it('keeps the site healthy while the Persons schema is not ready', async () => {
    mocks.isPersonSchemaCatalogReady.mockResolvedValue(false);

    const response = await createReadinessResponse();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      checks: { persons: 'schema_not_ready', schema: 'ready' },
      status: 'healthy',
    });
  });

  it('distinguishes a missing Person environment configuration', async () => {
    mocks.isPersonEnvironmentConfigured.mockReturnValue(false);

    const response = await createReadinessResponse();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      checks: { persons: 'not_configured', schema: 'ready' },
      status: 'healthy',
    });
  });

  it('is unhealthy without the current MFA key, since no login can finish', async () => {
    vi.stubEnv('MFA_ENCRYPTION_KEY_V1', '');

    const response = await createReadinessResponse();

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      checks: { mfa: 'not_configured', schema: 'ready' },
      status: 'unhealthy',
    });
  });

  it('requires the key of every version still stored after a rotation', async () => {
    vi.stubEnv('MFA_ENCRYPTION_CURRENT_VERSION', '2');
    vi.stubEnv('MFA_ENCRYPTION_KEY_V2', Buffer.alloc(32, 4).toString('base64'));
    storedMfaKeyVersions = [1, 2];
    expect((await createReadinessResponse()).status).toBe(200);

    vi.stubEnv('MFA_ENCRYPTION_KEY_V1', '');
    const response = await createReadinessResponse();
    expect(response.status).toBe(503);
    expect((await response.json()).checks.mfa).toBe('not_configured');

    // Once every secret is re-encrypted, V1 can go.
    storedMfaKeyVersions = [2];
    expect((await createReadinessResponse()).status).toBe(200);
  });

  it('returns 503 when the database check fails', async () => {
    mocks.queryRaw.mockRejectedValue(new Error('database unavailable'));

    const response = await createReadinessResponse();

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      checks: {
        database: 'disconnected',
        mfa: 'unknown',
        persons: 'unknown',
        schema: 'unknown',
      },
      status: 'unhealthy',
    });
  });
});
