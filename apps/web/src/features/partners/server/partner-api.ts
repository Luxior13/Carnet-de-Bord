import 'server-only';

import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import { type z, ZodError } from 'zod';

import { apiError, apiErrors } from '$server/api-response';
import { ErrorCode } from '$types/api.types';

import { PartnerDomainError } from './partner-errors';

export const partnerZodErrorDetails = (
  error: z.ZodError,
): Record<string, string[]> => {
  const details = new Map<string, string[]>();
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    details.set(key, [...(details.get(key) ?? []), issue.message]);
  }

  return Object.fromEntries(details);
};

export const withPartnerNoStore = <T extends NextResponse>(response: T): T => {
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Pragma', 'no-cache');

  return response;
};

export const handlePartnerApiError = async (
  action: string,
  error: unknown,
  request?: Request,
): Promise<NextResponse> => {
  const wrap = <T extends NextResponse>(response: T): T => {
    const requestId = request?.headers.get('x-request-id');
    if (requestId) response.headers.set('x-request-id', requestId);

    return withPartnerNoStore(response);
  };
  if (error instanceof PartnerDomainError) {
    switch (error.code) {
      case 'PARTNER_CHANNEL_NOT_FOUND':
        return wrap(apiErrors.notFound(error.message));
      case 'PARTNER_FOLLOW_UP_FORBIDDEN':
        return wrap(apiErrors.forbidden(error.message));
      case 'PARTNER_NOT_FOUND':
        return wrap(apiErrors.notFound(error.message));
      case 'PARTNER_FOLLOW_UP_LOCKED':
      case 'PARTNER_FOLLOW_UP_VERSION_CONFLICT':
      case 'PARTNER_INVALID_TRANSITION':
        return wrap(apiError(ErrorCode.CONFLICT, error.message, 409));
      case 'PARTNER_CHANNEL_ALREADY_EXISTS':
        return wrap(
          apiError(
            ErrorCode.PARTNER_CHANNEL_ALREADY_EXISTS,
            error.message,
            409,
          ),
        );
      case 'PARTNER_CHANNEL_LIMIT_REACHED':
        return wrap(
          apiError(ErrorCode.PARTNER_CHANNEL_LIMIT_REACHED, error.message, 409),
        );
      case 'PARTNER_CHANNEL_VERSION_CONFLICT':
        return wrap(
          apiError(
            ErrorCode.PARTNER_CHANNEL_VERSION_CONFLICT,
            error.message,
            409,
          ),
        );
      case 'PARTNER_CONTACT_ALREADY_ACTIVE':
        return wrap(
          apiError(
            ErrorCode.PARTNER_CONTACT_ALREADY_ACTIVE,
            error.message,
            409,
          ),
        );
      case 'PARTNER_CONTACT_LIMIT_REACHED':
        return wrap(
          apiError(ErrorCode.PARTNER_CONTACT_LIMIT_REACHED, error.message, 409),
        );
      case 'PARTNER_CONTACT_REOPEN_FORBIDDEN':
        return wrap(
          apiError(
            ErrorCode.PARTNER_CONTACT_REOPEN_FORBIDDEN,
            error.message,
            409,
          ),
        );
      case 'PARTNER_CONTACT_VERSION_CONFLICT':
        return wrap(
          apiError(
            ErrorCode.PARTNER_CONTACT_VERSION_CONFLICT,
            error.message,
            409,
          ),
        );
      case 'PARTNER_DEPENDENCY_CONFLICT':
        return wrap(
          apiError(ErrorCode.PARTNER_DEPENDENCY_CONFLICT, error.message, 409),
        );
      case 'PARTNER_VERSION_CONFLICT':
        return wrap(
          apiError(ErrorCode.PARTNER_VERSION_CONFLICT, error.message, 409),
        );
      case 'PARTNER_FEATURE_NOT_CONFIGURED':
        return wrap(
          apiError(
            ErrorCode.PARTNER_FEATURE_NOT_CONFIGURED,
            error.message,
            503,
          ),
        );
    }
  }
  if (error instanceof RangeError && error.message === 'INVALID_CURSOR') {
    return wrap(apiErrors.badRequest('Curseur de pagination invalide'));
  }
  if (error instanceof ZodError) {
    return wrap(
      apiErrors.validation(
        'Coordonnée invalide',
        partnerZodErrorDetails(error),
      ),
    );
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002'
  ) {
    return wrap(
      apiError(
        ErrorCode.CONFLICT,
        'Cette information existe déjà sur la fiche',
        409,
      ),
    );
  }

  return withPartnerNoStore(await apiErrors.internal(action, error, request));
};
