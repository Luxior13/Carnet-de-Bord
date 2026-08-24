import type {
  PersonListSort,
  PersonStructureStatus,
} from './types/person.types';

export type PersonsListRequest = {
  cursor?: string;
  q: string;
  sort: PersonListSort;
  structureStatus?: PersonStructureStatus;
};

export const haveSamePersonsListRequest = (
  first: PersonsListRequest,
  second: PersonsListRequest,
): boolean =>
  first.cursor === second.cursor &&
  first.q === second.q &&
  first.sort === second.sort &&
  first.structureStatus === second.structureStatus;
