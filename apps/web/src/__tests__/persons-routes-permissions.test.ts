/* eslint-disable @typescript-eslint/explicit-function-return-type -- Route-case lambdas are inferred from each real handler. */
import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '$constants/permissions.constants';
import { ErrorCode } from '$types/api.types';

const mocks = vi.hoisted(() => ({
  addPersonEmail: vi.fn(),
  addPersonPhone: vi.fn(),
  addPersonSocialProfile: vi.fn(),
  assertPersonFeatureReady: vi.fn(),
  createPerson: vi.fn(),
  deletePerson: vi.fn(),
  deletePersonEmail: vi.fn(),
  deletePersonPhone: vi.fn(),
  deletePersonSocialProfile: vi.fn(),
  getPerson: vi.fn(),
  getPersonFieldHistory: vi.fn(),
  listPersons: vi.fn(),
  requireAuth: vi.fn(),
  requirePermission: vi.fn(),
  updatePerson: vi.fn(),
  updatePersonEmail: vi.fn(),
  updatePersonPhone: vi.fn(),
  updatePersonSocialProfile: vi.fn(),
}));

vi.mock('server-only', () => ({}));

vi.mock('$server/api-auth', () => ({
  requireAuth: mocks.requireAuth,
  requirePermission: mocks.requirePermission,
}));

vi.mock('$features/persons/server/person.service', () => ({
  addPersonEmail: mocks.addPersonEmail,
  addPersonPhone: mocks.addPersonPhone,
  addPersonSocialProfile: mocks.addPersonSocialProfile,
  createPerson: mocks.createPerson,
  deletePersonEmail: mocks.deletePersonEmail,
  deletePersonPhone: mocks.deletePersonPhone,
  deletePersonSocialProfile: mocks.deletePersonSocialProfile,
  getPerson: mocks.getPerson,
  getPersonFieldHistory: mocks.getPersonFieldHistory,
  listPersons: mocks.listPersons,
  updatePerson: mocks.updatePerson,
  updatePersonEmail: mocks.updatePersonEmail,
  updatePersonPhone: mocks.updatePersonPhone,
  updatePersonSocialProfile: mocks.updatePersonSocialProfile,
}));

vi.mock('$features/persons/server/person-deletion', () => ({
  assertPersonFeatureReady: mocks.assertPersonFeatureReady,
  deletePerson: mocks.deletePerson,
}));

const actor = {
  firstName: 'Admin',
  id: 'user-admin',
  isProtected: false,
  lastName: 'Test',
  loginName: 'admin.test',
  permissions: {},
  role: 'ADMIN',
};

const forbidden = () =>
  NextResponse.json(
    {
      error: { code: ErrorCode.FORBIDDEN, message: 'Accès refusé' },
      success: false,
    },
    { status: 403 },
  );

const detailContext = { params: Promise.resolve({ id: 'person-1' }) };
const emailContext = {
  params: Promise.resolve({ emailId: 'email-1', id: 'person-1' }),
};
const phoneContext = {
  params: Promise.resolve({ id: 'person-1', phoneId: 'phone-1' }),
};
const socialProfileContext = {
  params: Promise.resolve({ id: 'person-1', profileId: 'profile-1' }),
};

const request = (path: string, method = 'GET') =>
  new NextRequest(`http://localhost${path}`, { method });

describe('person API permission boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.assertPersonFeatureReady.mockResolvedValue(undefined);
    mocks.requireAuth.mockResolvedValue({
      session: {},
      success: true,
      user: actor,
    });
    mocks.requirePermission.mockImplementation(() => ({
      response: forbidden(),
      success: false,
    }));
  });

  it('does not evaluate permissions or services when authentication fails', async () => {
    mocks.requireAuth.mockResolvedValueOnce({
      response: NextResponse.json(
        {
          error: { code: ErrorCode.UNAUTHORIZED, message: 'Non authentifié' },
          success: false,
        },
        { status: 401 },
      ),
      success: false,
    });
    const { GET } = await import('$app/api/personnes/route');

    const response = await GET(request('/api/personnes'));

    expect(response.status).toBe(401);
    expect(mocks.requirePermission).not.toHaveBeenCalled();
    expect(mocks.listPersons).not.toHaveBeenCalled();
  });

  it.each([
    {
      expectedPermission: PERMISSIONS.PERSONS.VIEW,
      invoke: async () => {
        const { GET } = await import('$app/api/personnes/route');

        return GET(request('/api/personnes'));
      },
      service: mocks.listPersons,
      title: 'list',
    },
    {
      expectedPermission: PERMISSIONS.PERSONS.CREATE,
      invoke: async () => {
        const { POST } = await import('$app/api/personnes/route');

        return POST(request('/api/personnes', 'POST'));
      },
      service: mocks.createPerson,
      title: 'creation',
    },
    {
      expectedPermission: PERMISSIONS.PERSONS.VIEW,
      invoke: async () => {
        const { GET } = await import('$app/api/personnes/[id]/route');

        return GET(request('/api/personnes/person-1'), detailContext);
      },
      service: mocks.getPerson,
      title: 'detail',
    },
    {
      expectedPermission: PERMISSIONS.PERSONS.UPDATE,
      invoke: async () => {
        const { PATCH } = await import('$app/api/personnes/[id]/route');

        return PATCH(
          request('/api/personnes/person-1', 'PATCH'),
          detailContext,
        );
      },
      service: mocks.updatePerson,
      title: 'identity update',
    },
    {
      expectedPermission: PERMISSIONS.PERSONS.DELETE,
      invoke: async () => {
        const { DELETE } = await import('$app/api/personnes/[id]/route');

        return DELETE(
          request('/api/personnes/person-1', 'DELETE'),
          detailContext,
        );
      },
      service: mocks.deletePerson,
      title: 'irreversible deletion',
    },
  ])('requires the reviewed permission for $title', async (testCase) => {
    const response = await testCase.invoke();

    expect(response.status).toBe(403);
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      actor,
      testCase.expectedPermission,
    );
    expect(testCase.service).not.toHaveBeenCalled();
  });

  it.each([
    {
      invoke: async () => {
        const { POST } = await import('$app/api/personnes/[id]/emails/route');

        return POST(
          request('/api/personnes/person-1/emails', 'POST'),
          detailContext,
        );
      },
      service: mocks.addPersonEmail,
      title: 'add email',
    },
    {
      invoke: async () => {
        const { PATCH } =
          await import('$app/api/personnes/[id]/emails/[emailId]/route');

        return PATCH(
          request('/api/personnes/person-1/emails/email-1', 'PATCH'),
          emailContext,
        );
      },
      service: mocks.updatePersonEmail,
      title: 'update email',
    },
    {
      invoke: async () => {
        const { DELETE } =
          await import('$app/api/personnes/[id]/emails/[emailId]/route');

        return DELETE(
          request('/api/personnes/person-1/emails/email-1', 'DELETE'),
          emailContext,
        );
      },
      service: mocks.deletePersonEmail,
      title: 'delete email',
    },
    {
      invoke: async () => {
        const { POST } =
          await import('$app/api/personnes/[id]/telephones/route');

        return POST(
          request('/api/personnes/person-1/telephones', 'POST'),
          detailContext,
        );
      },
      service: mocks.addPersonPhone,
      title: 'add phone',
    },
    {
      invoke: async () => {
        const { PATCH } =
          await import('$app/api/personnes/[id]/telephones/[phoneId]/route');

        return PATCH(
          request('/api/personnes/person-1/telephones/phone-1', 'PATCH'),
          phoneContext,
        );
      },
      service: mocks.updatePersonPhone,
      title: 'update phone',
    },
    {
      invoke: async () => {
        const { DELETE } =
          await import('$app/api/personnes/[id]/telephones/[phoneId]/route');

        return DELETE(
          request('/api/personnes/person-1/telephones/phone-1', 'DELETE'),
          phoneContext,
        );
      },
      service: mocks.deletePersonPhone,
      title: 'delete phone',
    },
    {
      invoke: async () => {
        const { POST } =
          await import('$app/api/personnes/[id]/reseaux-sociaux/route');

        return POST(
          request('/api/personnes/person-1/reseaux-sociaux', 'POST'),
          detailContext,
        );
      },
      service: mocks.addPersonSocialProfile,
      title: 'add social profile',
    },
    {
      invoke: async () => {
        const { PATCH } =
          await import('$app/api/personnes/[id]/reseaux-sociaux/[profileId]/route');

        return PATCH(
          request('/api/personnes/person-1/reseaux-sociaux/profile-1', 'PATCH'),
          socialProfileContext,
        );
      },
      service: mocks.updatePersonSocialProfile,
      title: 'update social profile',
    },
    {
      invoke: async () => {
        const { DELETE } =
          await import('$app/api/personnes/[id]/reseaux-sociaux/[profileId]/route');

        return DELETE(
          request(
            '/api/personnes/person-1/reseaux-sociaux/profile-1',
            'DELETE',
          ),
          socialProfileContext,
        );
      },
      service: mocks.deletePersonSocialProfile,
      title: 'delete social profile',
    },
  ])('uses persons:update for child operation: $title', async (testCase) => {
    const response = await testCase.invoke();

    expect(response.status).toBe(403);
    expect(mocks.requirePermission).toHaveBeenCalledWith(
      actor,
      PERMISSIONS.PERSONS.UPDATE,
    );
    expect(testCase.service).not.toHaveBeenCalled();
  });

  it('requires both field-history and person visibility for field history', async () => {
    mocks.requirePermission
      .mockReturnValueOnce({ success: true })
      .mockImplementationOnce(() => ({
        response: forbidden(),
        success: false,
      }));
    const { GET } =
      await import('$app/api/personnes/[id]/historique-champ/route');

    const response = await GET(
      request(
        '/api/personnes/person-1/historique-champ?sectionKey=identity&fieldKey=nickname',
      ),
      detailContext,
    );

    expect(response.status).toBe(403);
    expect(mocks.requirePermission).toHaveBeenNthCalledWith(
      1,
      actor,
      PERMISSIONS.AUDIT.VIEW_FIELD_HISTORY,
    );
    expect(mocks.requirePermission).toHaveBeenNthCalledWith(
      2,
      actor,
      PERMISSIONS.PERSONS.VIEW,
    );
    expect(mocks.getPersonFieldHistory).not.toHaveBeenCalled();
  });

  it('marks successful list responses private and non-cacheable', async () => {
    mocks.requirePermission.mockReturnValueOnce({ success: true });
    mocks.listPersons.mockResolvedValueOnce({
      items: [],
      pagination: { hasMore: false, nextCursor: null },
    });
    const { GET } = await import('$app/api/personnes/route');

    const response = await GET(
      request('/api/personnes?limit=25&structureStatus=IN_STRUCTURE'),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Pragma')).toBe('no-cache');
    expect(mocks.listPersons).toHaveBeenCalledWith({
      cursor: undefined,
      limit: 25,
      q: '',
      sort: 'name',
      structureStatus: 'IN_STRUCTURE',
    });
  });

  it('loads a direct detail without preloading contextual field history', async () => {
    mocks.requirePermission.mockReturnValueOnce({ success: true });
    mocks.getPerson.mockResolvedValueOnce({ id: 'person-1' });
    const { GET } = await import('$app/api/personnes/[id]/route');

    const response = await GET(
      request('/api/personnes/person-1'),
      detailContext,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(mocks.getPerson).toHaveBeenCalledWith('person-1');
    expect(mocks.getPersonFieldHistory).not.toHaveBeenCalled();
  });

  it('keeps successful contextual history private and passes only validated filters', async () => {
    mocks.requirePermission.mockReturnValue({ success: true });
    mocks.getPersonFieldHistory.mockResolvedValueOnce({ items: [] });
    const { GET } =
      await import('$app/api/personnes/[id]/historique-champ/route');

    const response = await GET(
      request(
        '/api/personnes/person-1/historique-champ?sectionKey=identity&fieldKey=nickname',
      ),
      detailContext,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
    expect(response.headers.get('Pragma')).toBe('no-cache');
    expect(mocks.getPersonFieldHistory).toHaveBeenCalledWith('person-1', {
      fieldKey: 'nickname',
      sectionKey: 'identity',
    });
    expect(mocks.requirePermission).toHaveBeenNthCalledWith(
      1,
      actor,
      PERMISSIONS.AUDIT.VIEW_FIELD_HISTORY,
    );
    expect(mocks.requirePermission).toHaveBeenNthCalledWith(
      2,
      actor,
      PERMISSIONS.PERSONS.VIEW,
    );
  });

  it('re-evaluates field-history permissions on every request after a revocation', async () => {
    let granted = true;
    mocks.requirePermission.mockImplementation(() =>
      granted ? { success: true } : { response: forbidden(), success: false },
    );
    mocks.getPersonFieldHistory.mockResolvedValue({ items: [] });
    const { GET } =
      await import('$app/api/personnes/[id]/historique-champ/route');
    const buildRequest = () =>
      request(
        '/api/personnes/person-1/historique-champ?sectionKey=identity&fieldKey=nickname',
      );

    const beforeRevocation = await GET(buildRequest(), detailContext);
    granted = false;
    const afterRevocation = await GET(buildRequest(), detailContext);

    expect(beforeRevocation.status).toBe(200);
    expect(beforeRevocation.headers.get('Cache-Control')).toBe(
      'private, no-store',
    );
    expect(afterRevocation.status).toBe(403);
    expect(mocks.getPersonFieldHistory).toHaveBeenCalledOnce();
  });
});
