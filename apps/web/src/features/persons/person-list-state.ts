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

export const haveSamePersonsListRequest = (
  first: PersonsListRequest,
  second: PersonsListRequest,
): boolean =>
  first.contacts === second.contacts &&
  first.cursor === second.cursor &&
  first.q === second.q &&
  first.sort === second.sort &&
  first.structureStatus === second.structureStatus;
