import { PAGE_PATHS } from '$constants/routes.constants';

import {
  PERSON_LIST_SORTS,
  PERSON_STRUCTURE_STATUSES,
} from './person.constants';
import type {
  PersonListSort,
  PersonStructureStatus,
} from './types/person.types';

export type PersonsListRequest = {
  contacts?: 'missing';
  cursor?: string;
  q: string;
  sort: PersonListSort;
  structureStatus?: PersonStructureStatus;
};

// This is a display position, never an allocation size or a SQL offset.
export const MAX_PERSONS_PAGE = 1_000_000;

export const normalizePersonsPageIndex = (value: string | null): number => {
  if (!value || !/^[1-9]\d{0,6}$/.test(value)) return 0;
  const page = Number(value);

  return page <= MAX_PERSONS_PAGE ? page - 1 : 0;
};

export const normalizePersonsQuery = (value: string | null): string =>
  value?.trim().slice(0, 100) ?? '';

export const readPersonsListLocation = (
  params: URLSearchParams,
): { pageIndex: number; request: PersonsListRequest } => {
  const requestedPage = normalizePersonsPageIndex(params.get('page'));
  const rawCursor = params.get('cursor');
  const cursor =
    requestedPage > 0 && rawCursor && rawCursor.length <= 2_048
      ? rawCursor
      : undefined;
  const status = params.get('structureStatus') as PersonStructureStatus;
  const sort = params.get('sort') as PersonListSort;

  return {
    pageIndex: cursor ? requestedPage : 0,
    request: {
      ...(params.get('contacts') === 'missing' ? { contacts: 'missing' } : {}),
      cursor,
      q: normalizePersonsQuery(params.get('q')),
      sort: PERSON_LIST_SORTS.includes(sort) ? sort : 'name',
      ...(PERSON_STRUCTURE_STATUSES.includes(status)
        ? { structureStatus: status }
        : {}),
    },
  };
};

export const personsListHref = (
  request: PersonsListRequest,
  pageIndex: number,
): string => {
  const params = new URLSearchParams();
  if (request.contacts) params.set('contacts', request.contacts);
  if (request.q) params.set('q', request.q);
  if (request.structureStatus)
    params.set('structureStatus', request.structureStatus);
  if (request.sort !== 'name') params.set('sort', request.sort);
  if (request.cursor && pageIndex > 0) {
    params.set('cursor', request.cursor);
    params.set('page', String(pageIndex + 1));
  }

  return `${PAGE_PATHS.persons}${params.size ? `?${params}` : ''}`;
};

export const haveSamePersonsListRequest = (
  first: PersonsListRequest,
  second: PersonsListRequest,
): boolean =>
  first.contacts === second.contacts &&
  first.cursor === second.cursor &&
  first.q === second.q &&
  first.sort === second.sort &&
  first.structureStatus === second.structureStatus;
