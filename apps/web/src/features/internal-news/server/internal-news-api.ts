import 'server-only';

import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';

import { apiError, apiErrors, withPrivateNoStore } from '$server/api-response';
import { ErrorCode } from '$types/api.types';

import { InternalNewsFeatureUnavailableError } from './internal-news-readiness';

export const handleInternalNewsApiError = async (
  action: string,
  error: unknown,
  request?: Request,
): Promise<NextResponse> => {
  if (error instanceof InternalNewsFeatureUnavailableError) {
    return withPrivateNoStore(
      apiError(
        ErrorCode.INTERNAL_NEWS_FEATURE_NOT_CONFIGURED,
        error.message,
        503,
      ),
    );
  }
  if (error instanceof RangeError && error.message === 'INVALID_CURSOR') {
    return withPrivateNoStore(
      apiErrors.badRequest('Curseur de pagination invalide'),
    );
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  ) {
    return withPrivateNoStore(
      apiErrors.notFound('Cette actualité interne est introuvable'),
    );
  }

  return withPrivateNoStore(await apiErrors.internal(action, error, request));
};
