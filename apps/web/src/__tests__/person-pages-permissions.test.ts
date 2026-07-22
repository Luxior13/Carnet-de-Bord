import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { FEATURES } from '$constants/feature-registry.constants';
import { PERMISSIONS } from '$constants/permissions.constants';
import { getPersonCapabilities } from '$features/persons/person.permissions';

const mocks = vi.hoisted(() => ({
  createForm: vi.fn(() => null),
  featureAvailability: vi.fn(),
  personsList: vi.fn(() => null),
  useUser: vi.fn(),
}));

vi.mock('$components/AuthenticatedLayout', () => ({
  default: ({ children }: { children: ReactNode }): ReactNode => children,
}));

vi.mock('$context/UserContext', () => ({ useUser: mocks.useUser }));

vi.mock('$context/FeatureAvailabilityContext', () => ({
  useFeatureAvailability: mocks.featureAvailability,
}));

vi.mock('$features/persons/components/PersonsList', () => ({
  PersonsList: mocks.personsList,
}));

vi.mock('$features/persons/components/PersonCreateForm', () => ({
  PersonCreateForm: mocks.createForm,
}));

import PersonPage from '$app/vie-interne/repertoire/[id]/page';
import NewPersonPage from '$app/vie-interne/repertoire/nouveau/page';
import PersonsPage from '$app/vie-interne/repertoire/page';

const user = (
  permissions: Record<string, boolean>,
): {
  id: string;
  isProtected: boolean;
  permissions: Record<string, boolean>;
  role: 'USER';
} => ({
  id: 'user-1',
  isProtected: false,
  permissions,
  role: 'USER',
});

describe('direct Person page permission boundaries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.featureAvailability.mockReturnValue({
      featureAvailabilityLoaded: true,
      operationalFeatureIds: new Set([FEATURES.persons.id]),
      refreshFeatureAvailability: vi.fn(),
    });
  });

  it('resolves every page action independently while keeping history dependent on view', () => {
    expect(
      getPersonCapabilities(
        user({
          [PERMISSIONS.AUDIT.VIEW]: true,
          [PERMISSIONS.AUDIT.VIEW_FIELD_HISTORY]: true,
          [PERMISSIONS.PERSONS.CREATE]: true,
          [PERMISSIONS.PERSONS.DELETE]: true,
          [PERMISSIONS.PERSONS.UPDATE]: true,
          [PERMISSIONS.PERSONS.VIEW]: true,
        }) as never,
      ),
    ).toEqual({
      canCreate: true,
      canDelete: true,
      canUpdate: true,
      canView: true,
      canViewAudit: true,
      canViewHistory: true,
    });
    expect(
      getPersonCapabilities(
        user({ [PERMISSIONS.AUDIT.VIEW_FIELD_HISTORY]: true }) as never,
      ).canViewHistory,
    ).toBe(false);
  });

  it('denies a direct list-page visit without persons:view before rendering data', () => {
    mocks.useUser.mockReturnValue({ userData: user({}) });

    const html = renderToStaticMarkup(createElement(PersonsPage));

    expect(html).toContain('permission de consulter le répertoire');
    expect(mocks.personsList).not.toHaveBeenCalled();
  });

  it('passes the create capability to the visible list', () => {
    mocks.useUser.mockReturnValue({
      userData: user({
        [PERMISSIONS.PERSONS.CREATE]: true,
        [PERMISSIONS.PERSONS.DELETE]: false,
        [PERMISSIONS.PERSONS.VIEW]: true,
      }),
    });

    renderToStaticMarkup(createElement(PersonsPage));

    expect(mocks.personsList).toHaveBeenCalledWith(
      { canCreate: true },
      undefined,
    );
  });

  it('denies /vie-interne/repertoire/nouveau without persons:create and never mounts its form', () => {
    mocks.useUser.mockReturnValue({
      userData: user({ [PERMISSIONS.PERSONS.VIEW]: true }),
    });

    const html = renderToStaticMarkup(createElement(NewPersonPage));

    expect(html).toContain('permission de créer une fiche personne');
    expect(mocks.createForm).not.toHaveBeenCalled();
  });

  it('mounts the creation form only with persons:create', () => {
    mocks.useUser.mockReturnValue({
      userData: user({
        [PERMISSIONS.PERSONS.CREATE]: true,
        [PERMISSIONS.PERSONS.VIEW]: true,
      }),
    });

    renderToStaticMarkup(createElement(NewPersonPage));

    expect(mocks.createForm).toHaveBeenCalledOnce();
  });

  it('denies a direct detail-page visit without persons:view', async () => {
    mocks.useUser.mockReturnValue({ userData: user({}) });
    const element = await PersonPage({
      params: Promise.resolve({ id: 'person-1' }),
    });

    const html = renderToStaticMarkup(element);

    expect(html).toContain('permission de consulter cette fiche');
  });
});
