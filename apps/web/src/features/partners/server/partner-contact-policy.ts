import 'server-only';

import { PARTNER_LIMITS } from '../partner.constants';
import { partnerErrors } from './partner-errors';

export const assertPartnerContactCanBeAdded = (input: {
  activeContacts: ReadonlyArray<{ personId: string | null }>;
  personId: string;
}): void => {
  if (
    input.activeContacts.some(({ personId }) => personId === input.personId)
  ) {
    throw partnerErrors.contactAlreadyActive();
  }
  if (input.activeContacts.length >= PARTNER_LIMITS.contacts) {
    throw partnerErrors.contactLimitReached();
  }
};

export const assertPartnerContactCanBeUpdated = (input: {
  close?: boolean;
  isClosed: boolean;
  isPrimary?: boolean;
  updatesSelectedCoordinates?: boolean;
}): void => {
  if (
    input.close === false ||
    (input.isClosed && (input.close !== undefined || input.isPrimary === true))
  ) {
    throw partnerErrors.contactReopenForbidden();
  }
  if (input.close === true && input.isPrimary === true) {
    throw partnerErrors.dependencyConflict(
      'Une liaison terminée ne peut pas être définie comme interlocuteur principal',
    );
  }
  if (
    (input.isClosed || input.close === true) &&
    input.updatesSelectedCoordinates
  ) {
    throw partnerErrors.dependencyConflict(
      'Les coordonnées d’une ancienne liaison ne peuvent plus être modifiées',
    );
  }
};

export const assertPartnerContactDateOrder = (input: {
  endedOn: Date | null;
  startedOn: Date | null;
}): void => {
  if (
    input.startedOn &&
    input.endedOn &&
    input.endedOn.getTime() < input.startedOn.getTime()
  ) {
    throw partnerErrors.dependencyConflict(
      'La date de fin de la liaison ne peut pas précéder sa date de début',
    );
  }
};
