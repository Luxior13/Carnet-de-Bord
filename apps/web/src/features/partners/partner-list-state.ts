import type {
  PartnerCategory,
  PartnerListSort,
  PartnerStatus,
} from './types/partner.types';

export type PartnersListFilters = {
  category?: PartnerCategory;
  q: string;
  sort: PartnerListSort;
  status?: PartnerStatus;
};

export const haveSamePartnerListFilters = (
  first: PartnersListFilters,
  second: PartnersListFilters,
): boolean =>
  first.category === second.category &&
  first.q === second.q &&
  first.sort === second.sort &&
  first.status === second.status;
