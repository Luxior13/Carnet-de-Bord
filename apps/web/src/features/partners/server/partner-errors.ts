import 'server-only';

import {
  PARTNER_FOLLOW_UP_EDIT_WINDOW_MINUTES,
  PARTNER_LIMITS,
} from '../partner.constants';

export type PartnerDomainErrorCode =
  | 'PARTNER_CHANNEL_ALREADY_EXISTS'
  | 'PARTNER_CHANNEL_LIMIT_REACHED'
  | 'PARTNER_CHANNEL_NOT_FOUND'
  | 'PARTNER_CHANNEL_VERSION_CONFLICT'
  | 'PARTNER_CONTACT_ALREADY_ACTIVE'
  | 'PARTNER_CONTACT_LIMIT_REACHED'
  | 'PARTNER_CONTACT_REOPEN_FORBIDDEN'
  | 'PARTNER_CONTACT_VERSION_CONFLICT'
  | 'PARTNER_DEPENDENCY_CONFLICT'
  | 'PARTNER_FEATURE_NOT_CONFIGURED'
  | 'PARTNER_FOLLOW_UP_FORBIDDEN'
  | 'PARTNER_FOLLOW_UP_LOCKED'
  | 'PARTNER_FOLLOW_UP_VERSION_CONFLICT'
  | 'PARTNER_INVALID_TRANSITION'
  | 'PARTNER_NOT_FOUND'
  | 'PARTNER_VERSION_CONFLICT';

export class PartnerDomainError extends Error {
  public constructor(
    public readonly code: PartnerDomainErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'PartnerDomainError';
  }
}

export const partnerErrors = {
  channelAlreadyExists: (): PartnerDomainError =>
    new PartnerDomainError(
      'PARTNER_CHANNEL_ALREADY_EXISTS',
      'Cette coordonnée existe déjà sur la fiche',
    ),
  channelLimitReached: (): PartnerDomainError =>
    new PartnerDomainError(
      'PARTNER_CHANNEL_LIMIT_REACHED',
      `Cette organisation a atteint la limite de ${PARTNER_LIMITS.channels} coordonnées`,
    ),
  channelNotFound: (): PartnerDomainError =>
    new PartnerDomainError(
      'PARTNER_CHANNEL_NOT_FOUND',
      'Coordonnée introuvable sur cette fiche',
    ),
  channelVersionConflict: (): PartnerDomainError =>
    new PartnerDomainError(
      'PARTNER_CHANNEL_VERSION_CONFLICT',
      'Cette coordonnée a été modifiée. Rechargez la fiche avant de réessayer.',
    ),
  contactAlreadyActive: (): PartnerDomainError =>
    new PartnerDomainError(
      'PARTNER_CONTACT_ALREADY_ACTIVE',
      'Cet interlocuteur est déjà lié activement à cette organisation',
    ),
  contactLimitReached: (): PartnerDomainError =>
    new PartnerDomainError(
      'PARTNER_CONTACT_LIMIT_REACHED',
      `Cette organisation a atteint la limite de ${PARTNER_LIMITS.contacts} interlocuteurs actifs`,
    ),
  contactReopenForbidden: (): PartnerDomainError =>
    new PartnerDomainError(
      'PARTNER_CONTACT_REOPEN_FORBIDDEN',
      'Une liaison terminée ne peut pas être réactivée ni modifiée comme active. Créez une nouvelle liaison afin de préserver son historique.',
    ),
  contactVersionConflict: (): PartnerDomainError =>
    new PartnerDomainError(
      'PARTNER_CONTACT_VERSION_CONFLICT',
      'Cette liaison avec un interlocuteur a été modifiée. Rechargez la fiche avant de réessayer.',
    ),
  dependencyConflict: (message: string): PartnerDomainError =>
    new PartnerDomainError('PARTNER_DEPENDENCY_CONFLICT', message),
  featureNotConfigured: (): PartnerDomainError =>
    new PartnerDomainError(
      'PARTNER_FEATURE_NOT_CONFIGURED',
      "Le module Sponsors & partenaires n'est pas encore configuré",
    ),
  followUpActionLocked: (): PartnerDomainError =>
    new PartnerDomainError(
      'PARTNER_FOLLOW_UP_LOCKED',
      'Cette note ne peut plus être modifiée : son action a déjà été terminée. Ajoutez une nouvelle note de correction.',
    ),
  followUpEditExpired: (): PartnerDomainError =>
    new PartnerDomainError(
      'PARTNER_FOLLOW_UP_LOCKED',
      `Cette note ne peut plus être modifiée : le délai de ${PARTNER_FOLLOW_UP_EDIT_WINDOW_MINUTES} minutes est expiré. Ajoutez une nouvelle note de correction.`,
    ),
  followUpForbidden: (): PartnerDomainError =>
    new PartnerDomainError(
      'PARTNER_FOLLOW_UP_FORBIDDEN',
      'Seul l’auteur de cette note peut la modifier.',
    ),
  followUpVersionConflict: (): PartnerDomainError =>
    new PartnerDomainError(
      'PARTNER_FOLLOW_UP_VERSION_CONFLICT',
      'Cette note a été modifiée. Rechargez le suivi avant de réessayer.',
    ),
  invalidTransition: (): PartnerDomainError =>
    new PartnerDomainError(
      'PARTNER_INVALID_TRANSITION',
      'Ce changement de statut ne respecte pas le cycle de la relation',
    ),
  notFound: (): PartnerDomainError =>
    new PartnerDomainError('PARTNER_NOT_FOUND', 'Partenaire introuvable'),
  versionConflict: (): PartnerDomainError =>
    new PartnerDomainError(
      'PARTNER_VERSION_CONFLICT',
      'Cette fiche a été modifiée. Rechargez-la avant de réessayer.',
    ),
} as const;
