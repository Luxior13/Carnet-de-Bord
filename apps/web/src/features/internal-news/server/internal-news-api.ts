import 'server-only';

import { Prisma } from '@prisma/client';
import { NextResponse } from 'next/server';
import type { z } from 'zod';

import { apiError, apiErrors } from '$server/api-response';
import { ErrorCode } from '$types/api.types';

import { InternalNewsFeatureUnavailableError } from './internal-news-readiness';

export const internalNewsZodErrorDetails = (
  error: z.ZodError,
): Record<string, string[]> => {
  const details = new Map<string, string[]>();
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form';
    details.set(key, [...(details.get(key) ?? []), issue.message]);
  }

  return Object.fromEntries(details);
};

export const withInternalNewsNoStore = <T extends NextResponse>(
  response: T,
): T => {
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Pragma', 'no-cache');

  return response;
};

export const handleInternalNewsApiError = async (
  action: string,
  error: unknown,
  request?: Request,
): Promise<NextResponse> => {
  if (error instanceof InternalNewsFeatureUnavailableError) {
    return withInternalNewsNoStore(
      apiError(
        ErrorCode.INTERNAL_NEWS_FEATURE_NOT_CONFIGURED,
        error.message,
        503,
      ),
    );
  }
  if (error instanceof RangeError && error.message === 'INVALID_CURSOR') {
    return withInternalNewsNoStore(
      apiErrors.badRequest('Curseur de pagination invalide'),
    );
  }
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  ) {
    return withInternalNewsNoStore(
      apiErrors.notFound('Cette actualité interne est introuvable'),
    );
  }

  return withInternalNewsNoStore(
    await apiErrors.internal(action, error, request),
  );
};
