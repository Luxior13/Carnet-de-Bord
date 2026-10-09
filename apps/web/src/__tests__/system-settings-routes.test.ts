import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '$constants/permissions.constants';
import { ErrorCode } from '$types/api.types';

const mocks = vi.hoisted(() => {
  const transaction = {
    $queryRaw: vi.fn(),
    systemSetting: {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  };

  return {
    createAuditLogWithHeaders: vi.fn(),
    prisma: {
      $transaction: vi.fn(
        async (callback: (client: typeof transaction) => Promise<unknown>) =>
          callback(transaction),
      ),
      systemSetting: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
      },
    },
    requireAuth: vi.fn(),
    requirePermission: vi.fn(),
    requireRecentPasswordReauthentication: vi.fn(),
    transaction,
  };
});

vi.mock('server-only', () => ({}));
vi.mock('$server/api-auth', () => ({
  requireAuth: mocks.requireAuth,
  requirePermission: mocks.requirePermission,
}));
vi.mock('$server/auth', () => ({
  createAuditLogWithHeaders: mocks.createAuditLogWithHeaders,
}));
vi.mock('$server/logger', () => ({
  logger: { error: vi.fn(), warn: vi.fn() },
}));
vi.mock('$server/prisma', () => ({ prisma: mocks.prisma }));
vi.mock('$server/sensitive-action', () => ({
  requireRecentPasswordReauthentication:
    mocks.requireRecentPasswordReauthentication,
}));

const UPDATED_AT = new Date('2026-07-18T12:00:00.000Z');
const actor = {
  id: 'admin-1',
  isProtected: false,
  loginName: 'admin.test',
  permissions: null,
  role: 'ADMIN',
};

const createPutRequest = (
  key: string,
  body: Record<string, unknown>,
): NextRequest =>
  new NextRequest(`http://localhost/api/systeme/parametres/${key}`, {
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    method: 'PUT',
  });

const routeParams = (key: string): { params: Promise<{ key: string }> } => ({
  params: Promise.resolve({ key }),
});

describe('system settings routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.requireAuth.mockResolvedValue({
      session: { passwordReauthenticatedAt: UPDATED_AT },
      success: true,
      user: actor,
    });
    mocks.requirePermission.mockReturnValue({ success: true });
    mocks.requireRecentPasswordReauthentication.mockReturnValue({
      success: true,
    });
    mocks.prisma.systemSetting.findMany.mockResolvedValue([]);
    mocks.prisma.systemSetting.findUnique.mockResolvedValue(null);
    mocks.transaction.systemSetting.create.mockImplementation(
      ({
        data,
      }: {
        data: { description: string; key: string; value: number };
      }) =>
        Promise.resolve({
          description: data.description,
          key: data.key,
          updatedAt: UPDATED_AT,
          value: data.value,
          version: 1,
        }),
    );
    mocks.transaction.$queryRaw.mockResolvedValue([]);
    mocks.transaction.systemSetting.updateMany.mockResolvedValue({ count: 1 });
    mocks.transaction.systemSetting.findUnique.mockResolvedValue({
      description: "Durée de conservation du journal d'activité en jours",
      key: 'audit.retentionDays',
      updatedAt: UPDATED_AT,
      value: 1_095,
      version: 3,
    });
    mocks.createAuditLogWithHeaders.mockResolvedValue(undefined);
  });

  it('returns only the closed setting and ignores retired or unknown keys', async () => {
    mocks.prisma.systemSetting.findMany.mockResolvedValue([
      {
        key: 'audit.retentionDays',
        updatedAt: UPDATED_AT,
        value: 1_460,
        version: 2,
      },
      {
        key: 'notifications.retentionDays',
        updatedAt: UPDATED_AT,
        value: 365,
        version: 7,
      },
      {
        key: 'ui.defaultPageSize',
        updatedAt: UPDATED_AT,
        value: 100,
        version: 4,
      },
      {
        key: 'unknown.setting',
        updatedAt: UPDATED_AT,
        value: 'unsafe',
        version: 99,
      },
    ]);
    const { GET } = await import('$app/api/systeme/parametres/route');

    const response = await GET(
      new NextRequest('http://localhost/api/systeme/parametres'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      actor,
      PERMISSIONS.SETTINGS.VIEW,
    );
    expect(mocks.prisma.systemSetting.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: { in: ['audit.retentionDays'] } },
      }),
    );
    expect(body.data).toHaveLength(1);
    expect(body.data).toContainEqual(
      expect.objectContaining({
        description: "Durée de conservation du journal d'activité en jours",
        key: 'audit.retentionDays',
        value: 1_460,
        version: 2,
      }),
    );
    expect(
      body.data.some(({ key }: { key: string }) => key === 'unknown.setting'),
    ).toBe(false);
    expect(
      body.data.some(
        ({ key }: { key: string }) => key === 'notifications.retentionDays',
      ),
    ).toBe(false);
  });

  it('returns the permission response before reading settings', async () => {
    mocks.requirePermission.mockReturnValueOnce({
      response: NextResponse.json(
        {
          error: { code: ErrorCode.FORBIDDEN, message: 'Accès refusé' },
          success: false,
        },
        { status: 403 },
      ),
      success: false,
    });
    const { GET } = await import('$app/api/systeme/parametres/route');

    const response = await GET(
      new NextRequest('http://localhost/api/systeme/parametres'),
    );

    expect(response.status).toBe(403);
    expect(mocks.prisma.systemSetting.findMany).not.toHaveBeenCalled();
  });

  it('rejects the retired page-size setting before reading or writing it', async () => {
    const { PUT } = await import('$app/api/systeme/parametres/[key]/route');

    const response = await PUT(
      createPutRequest('ui.defaultPageSize', {
        expectedVersion: 2,
        value: 50,
      }),
      routeParams('ui.defaultPageSize'),
    );

    expect(response.status).toBe(404);
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      actor,
      PERMISSIONS.SETTINGS.UPDATE,
    );
    expect(mocks.requireRecentPasswordReauthentication).not.toHaveBeenCalled();
    expect(mocks.prisma.systemSetting.findUnique).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.createAuditLogWithHeaders).not.toHaveBeenCalled();
  });

  it('rejects a retired notification-retention key as unknown', async () => {
    const { PUT } = await import('$app/api/systeme/parametres/[key]/route');

    const response = await PUT(
      createPutRequest('notifications.retentionDays', {
        expectedVersion: 0,
        value: 180,
      }),
      routeParams('notifications.retentionDays'),
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.systemSetting.findUnique).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns the existing value without a version or audit change for a no-op', async () => {
    mocks.prisma.systemSetting.findUnique.mockResolvedValueOnce({
      updatedAt: UPDATED_AT,
      value: 1_095,
      version: 2,
    });
    const { PUT } = await import('$app/api/systeme/parametres/[key]/route');

    const response = await PUT(
      createPutRequest('audit.retentionDays', {
        expectedVersion: 2,
        value: 1_095,
      }),
      routeParams('audit.retentionDays'),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.version).toBe(2);
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.createAuditLogWithHeaders).not.toHaveBeenCalled();
    expect(mocks.requireRecentPasswordReauthentication).not.toHaveBeenCalled();
  });

  it('returns the permission response before validating or updating a setting', async () => {
    mocks.requirePermission.mockReturnValueOnce({
      response: NextResponse.json(
        {
          error: { code: ErrorCode.FORBIDDEN, message: 'Accès refusé' },
          success: false,
        },
        { status: 403 },
      ),
      success: false,
    });
    const { PUT } = await import('$app/api/systeme/parametres/[key]/route');

    const response = await PUT(
      createPutRequest('audit.retentionDays', {
        expectedVersion: 0,
        value: 730,
      }),
      routeParams('audit.retentionDays'),
    );

    expect(response.status).toBe(403);
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      actor,
      PERMISSIONS.SETTINGS.UPDATE,
    );
    expect(mocks.prisma.systemSetting.findUnique).not.toHaveBeenCalled();
  });

  it('increases retention without requesting a password', async () => {
    mocks.prisma.systemSetting.findUnique.mockResolvedValueOnce({
      value: 1_095,
      version: 2,
    });
    mocks.transaction.systemSetting.findUnique.mockResolvedValueOnce({
      description: "Durée de conservation du journal d'activité en jours",
      key: 'audit.retentionDays',
      updatedAt: UPDATED_AT,
      value: 1_460,
      version: 3,
    });
    const { PUT } = await import('$app/api/systeme/parametres/[key]/route');

    const response = await PUT(
      createPutRequest('audit.retentionDays', {
        expectedVersion: 2,
        value: 1_460,
      }),
      routeParams('audit.retentionDays'),
    );

    expect(response.status).toBe(200);
    expect(mocks.requireRecentPasswordReauthentication).not.toHaveBeenCalled();
  });

  it('requires only a recent password before reducing retention', async () => {
    mocks.prisma.systemSetting.findUnique.mockResolvedValueOnce({
      value: 1_095,
      version: 2,
    });
    mocks.requireRecentPasswordReauthentication.mockReturnValueOnce({
      response: NextResponse.json(
        {
          error: {
            code: ErrorCode.PASSWORD_REAUTHENTICATION_REQUIRED,
            message: 'Confirmez votre mot de passe',
          },
          success: false,
        },
        { status: 403 },
      ),
      success: false,
    });
    const { PUT } = await import('$app/api/systeme/parametres/[key]/route');

    const response = await PUT(
      createPutRequest('audit.retentionDays', {
        expectedVersion: 2,
        value: 730,
      }),
      routeParams('audit.retentionDays'),
    );
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error.code).toBe(ErrorCode.PASSWORD_REAUTHENTICATION_REQUIRED);
    expect(mocks.requireRecentPasswordReauthentication).toHaveBeenCalledTimes(
      1,
    );
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('protects an audit-retention reduction with the password rule', async () => {
    mocks.prisma.systemSetting.findUnique.mockResolvedValueOnce({
      value: 1_460,
      version: 2,
    });
    mocks.transaction.systemSetting.findUnique.mockResolvedValueOnce({
      description: "Durée de conservation du journal d'activité en jours",
      key: 'audit.retentionDays',
      updatedAt: UPDATED_AT,
      value: 730,
      version: 3,
    });
    const { PUT } = await import('$app/api/systeme/parametres/[key]/route');

    const response = await PUT(
      createPutRequest('audit.retentionDays', {
        expectedVersion: 2,
        value: 730,
      }),
      routeParams('audit.retentionDays'),
    );

    expect(response.status).toBe(200);
    expect(mocks.requireRecentPasswordReauthentication).toHaveBeenCalledTimes(
      1,
    );
    expect(String(mocks.transaction.$queryRaw.mock.calls[0]?.[0])).toContain(
      'system-setting:audit.retentionDays',
    );
    expect(
      mocks.transaction.$queryRaw.mock.invocationCallOrder[0],
    ).toBeLessThan(
      mocks.transaction.systemSetting.updateMany.mock
        .invocationCallOrder[0] as number,
    );
  });

  it('compares a missing retention row with its reviewed default', async () => {
    mocks.prisma.systemSetting.findUnique.mockResolvedValueOnce(null);
    const { PUT } = await import('$app/api/systeme/parametres/[key]/route');

    const response = await PUT(
      createPutRequest('audit.retentionDays', {
        expectedVersion: 0,
        value: 730,
      }),
      routeParams('audit.retentionDays'),
    );

    expect(response.status).toBe(200);
    expect(mocks.requireRecentPasswordReauthentication).toHaveBeenCalledTimes(
      1,
    );
    expect(mocks.transaction.systemSetting.create).toHaveBeenCalled();
    expect(String(mocks.transaction.$queryRaw.mock.calls[0]?.[0])).toContain(
      'system-setting:audit.retentionDays',
    );
  });

  it('audits the old and new values with the canonical page location', async () => {
    mocks.prisma.systemSetting.findUnique.mockResolvedValueOnce({
      value: 1_095,
      version: 2,
    });
    mocks.transaction.systemSetting.findUnique.mockResolvedValueOnce({
      description: "Durée de conservation du journal d'activité en jours",
      key: 'audit.retentionDays',
      updatedAt: UPDATED_AT,
      value: 730,
      version: 3,
    });
    const { PUT } = await import('$app/api/systeme/parametres/[key]/route');

    const response = await PUT(
      createPutRequest('audit.retentionDays', {
        expectedVersion: 2,
        value: 730,
      }),
      routeParams('audit.retentionDays'),
    );

    expect(response.status).toBe(200);
    expect(mocks.createAuditLogWithHeaders).toHaveBeenCalledWith(
      expect.objectContaining({
        description: "Paramètre système mis à jour : Journal d'activité",
        metadata: expect.objectContaining({
          after: { value: 730, version: 3 },
          before: { value: 1_095, version: 2 },
          pageKey: 'system-settings',
          pageLabel: 'Paramètres système',
          poleKey: 'system',
          poleLabel: 'Système',
          settingKey: 'audit.retentionDays',
        }),
      }),
      { client: mocks.transaction, required: true },
    );
  });

  it('rejects a stale version before requesting a password', async () => {
    mocks.prisma.systemSetting.findUnique.mockResolvedValueOnce({
      value: 1_095,
      version: 3,
    });
    const { PUT } = await import('$app/api/systeme/parametres/[key]/route');

    const response = await PUT(
      createPutRequest('audit.retentionDays', {
        expectedVersion: 2,
        value: 730,
      }),
      routeParams('audit.retentionDays'),
    );

    expect(response.status).toBe(409);
    expect(mocks.requireRecentPasswordReauthentication).not.toHaveBeenCalled();
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns a conflict when the compare-and-swap update loses a race', async () => {
    mocks.prisma.systemSetting.findUnique.mockResolvedValueOnce({
      value: 1_095,
      version: 2,
    });
    mocks.transaction.systemSetting.updateMany.mockResolvedValueOnce({
      count: 0,
    });
    const { PUT } = await import('$app/api/systeme/parametres/[key]/route');

    const response = await PUT(
      createPutRequest('audit.retentionDays', {
        expectedVersion: 2,
        value: 1_460,
      }),
      routeParams('audit.retentionDays'),
    );

    expect(response.status).toBe(409);
    expect(mocks.createAuditLogWithHeaders).not.toHaveBeenCalled();
  });

  it('returns a conflict when two administrators create the same setting', async () => {
    mocks.transaction.systemSetting.create.mockRejectedValueOnce({
      code: 'P2002',
    });
    const { PUT } = await import('$app/api/systeme/parametres/[key]/route');

    const response = await PUT(
      createPutRequest('audit.retentionDays', {
        expectedVersion: 0,
        value: 730,
      }),
      routeParams('audit.retentionDays'),
    );

    expect(response.status).toBe(409);
  });

  it('does not disguise an audit unique error as a setting conflict', async () => {
    mocks.prisma.systemSetting.findUnique.mockResolvedValueOnce({
      value: 1_095,
      version: 2,
    });
    mocks.createAuditLogWithHeaders.mockRejectedValueOnce({ code: 'P2002' });
    const { PUT } = await import('$app/api/systeme/parametres/[key]/route');

    const response = await PUT(
      createPutRequest('audit.retentionDays', {
        expectedVersion: 2,
        value: 1_460,
      }),
      routeParams('audit.retentionDays'),
    );

    expect(response.status).toBe(500);
  });

  it.each([
    ['audit.retentionDays', 3651],
    ['audit.retentionDays', 364],
  ])('rejects the out-of-range value for %s', async (key, value) => {
    const { PUT } = await import('$app/api/systeme/parametres/[key]/route');

    const response = await PUT(
      createPutRequest(key, { expectedVersion: 0, value }),
      routeParams(key),
    );

    expect(response.status).toBe(400);
    expect(mocks.prisma.systemSetting.findUnique).not.toHaveBeenCalled();
  });

  it('returns 404 for an unknown setting key', async () => {
    const { PUT } = await import('$app/api/systeme/parametres/[key]/route');

    const response = await PUT(
      createPutRequest('unknown.setting', {
        expectedVersion: 0,
        value: 10,
      }),
      routeParams('unknown.setting'),
    );

    expect(response.status).toBe(404);
    expect(mocks.prisma.systemSetting.findUnique).not.toHaveBeenCalled();
  });
});
