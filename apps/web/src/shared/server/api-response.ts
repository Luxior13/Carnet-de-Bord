import 'server-only';

import { NextResponse } from 'next/server';

import { PAGINATION } from '$constants/pagination.constants';
import { logger } from '$server/logger';
import type { ApiErrorResponse, PaginationMeta } from '$types/api.types';
import { ErrorCode } from '$types/api.types';

/**
 * Standard success response for API routes.
 */
export function apiSuccess<T>(data: T, status = 200) {
  return NextResponse.json({ data, success: true as const }, { status });
}

/**
 * Standard success response with pagination metadata.
 */
export function apiPaginatedSuccess<T>(
  data: T,
  pagination: PaginationMeta,
  status = 200,
) {
  return NextResponse.json(
    { data, pagination, success: true as const },
    { status },
  );
}

/**
 * Standard error response for API routes.
 * Logs the error automatically.
 */
export function apiError(
  code: ErrorCode,
  message: string,
  status: number,
  context?: {
    action?: string;
    details?: Record<string, string[]>;
    error?: unknown;
  },
): NextResponse<ApiErrorResponse> {
  if (context?.error) {
    logger.error(message, {
      action: context.action,
      error: context.error,
    });
  }

  const body: ApiErrorResponse = {
    error: {
      code,
      message,
      ...(context?.details && { details: context.details }),
    },
    success: false,
  };

  return NextResponse.json(body, { status });
}

/**
 * Shorthand for common error types.
 */
export const apiErrors = {
  badRequest: (message: string, details?: Record<string, string[]>) =>
    apiError(ErrorCode.VALIDATION_ERROR, message, 400, { details }),

  forbidden: (message = 'Acces interdit') =>
    apiError(ErrorCode.FORBIDDEN, message, 403),

  internal: (action: string, error: unknown) =>
    apiError(ErrorCode.INTERNAL_ERROR, 'Erreur serveur', 500, {
      action,
      error,
    }),

  notFound: (message = 'Ressource non trouvée') =>
    apiError(ErrorCode.NOT_FOUND, message, 404),

  validation: (message: string, details?: Record<string, string[]>) =>
    apiError(ErrorCode.VALIDATION_ERROR, message, 400, { details }),
};

/**
 * Parse pagination params from URL search params.
 * Returns { page, limit, skip } with safe defaults.
 */
export function parsePagination(
  searchParams: URLSearchParams,
  defaultLimit: number = PAGINATION.DEFAULT_LIMIT,
  options: {
    limitParam?: string;
    maxLimit?: number;
    pageParam?: string;
  } = {},
): { limit: number; page: number; skip: number } {
  const pageParam = options.pageParam ?? 'page';
  const limitParam = options.limitParam ?? 'limit';
  const maxLimit = options.maxLimit ?? PAGINATION.MAX_LIMIT;
  const page = Math.max(
    1,
    parseInt(searchParams.get(pageParam) || '1', 10) || 1,
  );
  const limit = Math.min(
    maxLimit,
    Math.max(
      PAGINATION.MIN_LIMIT,
      parseInt(searchParams.get(limitParam) || String(defaultLimit), 10) ||
        defaultLimit,
    ),
  );

  return { limit, page, skip: (page - 1) * limit };
}
