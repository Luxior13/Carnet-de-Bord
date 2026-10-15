import React, { type ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PERMISSIONS } from '$constants/permissions.constants';
import type { PersonsListRequest } from '$features/persons/person-list-state';
import type { PersonsListResponse } from '$features/persons/types/person.types';

const mocks = vi.hoisted(() => ({
  getPageAuthSession: vi.fn(),
  listPersons: vi.fn(),
  ready: vi.fn(),
}));
vi.mock('$server/auth', () => ({
  getPageAuthSession: mocks.getPageAuthSession,
}));
vi.mock('$features/persons/server/person.service', () => ({
  listPersons: mocks.listPersons,
}));
vi.mock('$features/persons/server/person-deletion', () => ({
  assertPersonFeatureReady: mocks.ready,
}));
vi.mock('$features/persons/components/PersonsPageClient', () => ({
  PersonsPageClient: (): null => null,
}));

import PersonsPage from '$app/membres/repertoire/page';

type PageElement = ReactElement<{
  initialState?: {
    data: PersonsListResponse;
    request: PersonsListRequest;
    scope: string;
  };
}>;
const reader = {
  id: 'reader-one',
  isProtected: false,
  mustChangePassword: false,
  permissions: {
    [PERMISSIONS.PERSONS.VIEW]: true,
    [PERMISSIONS.PERSONS.VIEW_CONTACT]: true,
  },
  role: 'USER',
};
const data: PersonsListResponse = {
  items: [],
  overview: { inStructure: 0, noContacts: 0, outsideStructure: 0, total: 0 },
  pagination: {
    hasMore: false,
    limit: 25,
    nextCursor: null,
    snapshotAt: '2026-01-01T00:00:00.000Z',
    total: 0,
  },
};

describe('directory server preload boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    // The test compiler uses classic JSX; Next uses the automatic runtime.
    vi.stubGlobal('React', React);
    mocks.getPageAuthSession.mockResolvedValue({ session: {}, user: reader });
    mocks.listPersons.mockResolvedValue(data);
    mocks.ready.mockResolvedValue(undefined);
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ['anonymous', null],
    [
      'revoked view permission',
      { ...reader, permissions: { [PERMISSIONS.PERSONS.VIEW]: false } },
    ],
    ['temporary password', { ...reader, mustChangePassword: true }],
  ])('does not preload data for %s', async (_label, user) => {
    mocks.getPageAuthSession.mockResolvedValue({ session: null, user });
    const result = (await PersonsPage({})) as PageElement;
    expect(result.props.initialState).toBeUndefined();
    expect(mocks.listPersons).not.toHaveBeenCalled();
    expect(mocks.ready).not.toHaveBeenCalled();
  });

  it('associates the validated snapshot with the authenticated account', async () => {
    const result = (await PersonsPage({
      searchParams: Promise.resolve({
        contacts: 'missing',
        q: ['  Élodie  ', 'ignored'],
        sort: 'updated',
        structureStatus: 'IN_STRUCTURE',
      }),
    })) as PageElement;
    expect(mocks.listPersons).toHaveBeenCalledWith(
      {
        contacts: 'missing',
        limit: 25,
        q: 'Élodie',
        sort: 'updated',
        structureStatus: 'IN_STRUCTURE',
      },
      reader,
    );
    expect(result.props.initialState).toEqual({
      data,
      request: {
        contacts: 'missing',
        q: 'Élodie',
        sort: 'updated',
        structureStatus: 'IN_STRUCTURE',
      },
      scope: 'reader-one',
    });
  });

  it.each([
    { q: 'x'.repeat(101) },
    { cursor: 'x'.repeat(2049) },
    { sort: 'invalid' },
  ])('does not preload an invalid query', async (query) => {
    const result = (await PersonsPage({
      searchParams: Promise.resolve(query),
    })) as PageElement;
    expect(result.props.initialState).toBeUndefined();
    expect(mocks.listPersons).not.toHaveBeenCalled();
  });

  it('leaves unavailable schema recovery to the client without attempting the list', async () => {
    mocks.ready.mockRejectedValue(new Error('unavailable'));
    const result = (await PersonsPage({})) as PageElement;
    expect(result.props.initialState).toBeUndefined();
    expect(mocks.listPersons).not.toHaveBeenCalled();
  });

  it('does not serialize a failed preload or its technical error', async () => {
    mocks.listPersons.mockRejectedValue(new Error('database details'));
    const result = (await PersonsPage({})) as PageElement;
    expect(result.props.initialState).toBeUndefined();
  });
});
