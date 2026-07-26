import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const mocks = vi.hoisted(() => ({
  auditEncryptionKeyVersion: { findMany: vi.fn() },
  isInternalNewsSchemaReady: vi.fn(),
  isPartnerSchemaReady: vi.fn(),
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
vi.mock('$features/internal-news/server/internal-news-readiness', () => ({
  isInternalNewsSchemaReady: mocks.isInternalNewsSchemaReady,
}));
vi.mock('$features/partners/server/partner-readiness', () => ({
  isPartnerSchemaReady: mocks.isPartnerSchemaReady,
}));

import { createReadinessResponse } from '$server/health';

describe('readiness without a background worker', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.queryRaw.mockResolvedValue([{ ready: true }]);
    mocks.isInternalNewsSchemaReady.mockResolvedValue(true);
    mocks.isPartnerSchemaReady.mockResolvedValue(true);
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
        internalNews: 'ready',
        partners: 'ready',
        persons: 'ready',
        schema: 'ready',
      },
      status: 'healthy',
    });
    expect(JSON.stringify(body)).not.toContain('worker');
    expect(JSON.stringify(body)).not.toContain('queue');
  });

  it('keeps the site healthy while the internal news schema is not ready', async () => {
    mocks.isInternalNewsSchemaReady.mockResolvedValue(false);

    const response = await createReadinessResponse();

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      checks: { internalNews: 'schema_not_ready', schema: 'ready' },
      status: 'healthy',
    });
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
        internalNews: 'unknown',
        partners: 'unknown',
        persons: 'unknown',
        schema: 'unknown',
      },
      status: 'unhealthy',
    });
  });
});
