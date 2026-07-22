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

describe('readiness without a background worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryRaw.mockResolvedValue([{ ready: true }]);
    mocks.isPersonSchemaCatalogReady.mockResolvedValue(true);
    mocks.auditEncryptionKeyVersion.findMany.mockResolvedValue([
      { version: 1 },
    ]);
    mocks.isPersonEnvironmentConfigured.mockReturnValue(true);
  });

  it('reports only database, schema and persons checks', async () => {
    const response = await createReadinessResponse();

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      checks: { database: 'connected', persons: 'ready', schema: 'ready' },
      status: 'healthy',
    });
    expect(JSON.stringify(body)).not.toContain('worker');
    expect(JSON.stringify(body)).not.toContain('queue');
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

  it('returns 503 when the database check fails', async () => {
    mocks.queryRaw.mockRejectedValue(new Error('database unavailable'));

    const response = await createReadinessResponse();

    expect(response.status).toBe(503);
    expect(await response.json()).toMatchObject({
      checks: {
        database: 'disconnected',
        persons: 'unknown',
        schema: 'unknown',
      },
      status: 'unhealthy',
    });
  });
});
