import 'server-only';

export type PartnerDomainErrorCode =
  | 'PARTNER_DEPENDENCY_CONFLICT'
  | 'PARTNER_FEATURE_NOT_CONFIGURED'
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
