import 'server-only';

import { PARTNER_FOLLOW_UP_EDIT_WINDOW_MINUTES } from '../partner.constants';

export type PartnerDomainErrorCode =
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
