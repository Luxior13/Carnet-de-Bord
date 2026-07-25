import 'server-only';

import { PARTNER_LIMITS } from '../partner.constants';
import { partnerErrors } from './partner-errors';

export const assertPartnerContactCanBeAdded = (input: {
  activeContactCount: number;
  hasActivePerson: boolean;
}): void => {
  if (input.hasActivePerson) throw partnerErrors.contactAlreadyActive();
  if (input.activeContactCount >= PARTNER_LIMITS.contacts) {
    throw partnerErrors.contactLimitReached();
  }
};

export const assertPartnerContactCanBeUpdated = (input: {
  close: boolean | undefined;
  isClosed: boolean;
}): void => {
  if (input.isClosed && input.close === false) {
    throw partnerErrors.contactReopenForbidden();
  }
};
