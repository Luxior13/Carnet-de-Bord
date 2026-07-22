import 'server-only';

import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import type { z } from 'zod';

import { apiError, apiErrors } from '$server/api-response';
import { ErrorCode } from '$types/api.types';

import { PersonDomainError } from './person-errors';

export const zodErrorDetails = (
  error: z.ZodError,
): Record<string, string[]> => {
  const details: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    details[key] = [...(details[key] ?? []), issue.message];
  }

  return details;
};

export const withPrivateNoStore = <T extends NextResponse>(response: T): T => {
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Pragma', 'no-cache');

  return response;
};

export const handlePersonApiError = async (
  action: string,
  error: unknown,
  request?: Request,
): Promise<NextResponse> => {
  const correlated = <T extends NextResponse>(response: T): T => {
    const requestId = request?.headers.get('x-request-id');
    if (requestId) response.headers.set('x-request-id', requestId);

    return withPrivateNoStore(response);
  };
  if (error instanceof PersonDomainError) {
    switch (error.code) {
      case 'PERSON_NOT_FOUND':
        return correlated(apiErrors.notFound(error.message));
      case 'PERSON_VERSION_CONFLICT':
        return correlated(
          apiError(ErrorCode.PERSON_VERSION_CONFLICT, error.message, 409),
        );
      case 'PRIMARY_CONFLICT':
        return correlated(
          apiError(ErrorCode.PRIMARY_CONFLICT, error.message, 409),
        );
      case 'PERSON_FEATURE_NOT_CONFIGURED':
        return correlated(
          apiError(ErrorCode.PERSON_FEATURE_NOT_CONFIGURED, error.message, 503),
        );
    }
  }
  if (error instanceof RangeError) {
    const messages: Record<string, string> = {
      INVALID_CURSOR: 'Curseur de pagination invalide',
      INVALID_PERSON_HISTORY_FIELD: "Champ d'historique invalide",
      PERSON_EMAIL_LIMIT: 'La fiche contient déjà 10 emails',
      PERSON_PHONE_LIMIT: 'La fiche contient déjà 10 téléphones',
      PERSON_SOCIAL_NETWORK_DEPRECATED:
        "Ce réseau n'accepte plus de nouveaux profils",
      PERSON_SOCIAL_PROFILE_LIMIT:
        'La fiche contient déjà 20 profils de réseaux sociaux',
    };

    return correlated(
      apiErrors.badRequest(messages[error.message] ?? 'Données invalides'),
    );
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return correlated(
      apiError(
        ErrorCode.CONFLICT,
        'Cette information existe déjà sur cette fiche',
        409,
      ),
    );
  }

  return withPrivateNoStore(await apiErrors.internal(action, error, request));
};
