import 'server-only';

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';

import { PAGINATION } from '$constants/pagination.constants';
import { logger } from '$server/logger';
import {
  type ApiErrorResponse,
  type ApiSuccessResponse,
  ErrorCode,
  type PaginationMeta,
} from '$types/api.types';
import {
  getRequestId,
  REQUEST_ID_HEADER,
  REQUEST_METHOD_HEADER,
  REQUEST_PATH_HEADER,
} from '$utils/request-context.utils';

type ApiPaginatedSuccessResponse<T> = {
  data: T;
  pagination: PaginationMeta;
  success: true;
};

type JsonBodyResult =
  | { data: unknown; success: true }
  | { response: NextResponse<ApiErrorResponse>; success: false };

export const MAX_JSON_BODY_BYTES = 256 * 1024;

const payloadTooLargeResponse = (): NextResponse<ApiErrorResponse> =>
  apiError(
    ErrorCode.PAYLOAD_TOO_LARGE,
    'Corps de requête trop volumineux',
    413,
  );

export function isPrismaUniqueConstraintError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'P2002'
  );
}

/**
 * Reads a JSON request body without leaking SyntaxError as a 500 response.
 * Schema validation deliberately stays in each route so field-level errors
 * remain specific to that endpoint.
 */
export async function parseJsonBody(request: Request): Promise<JsonBodyResult> {
  const contentLength = request.headers.get('content-length');
  if (
    contentLength &&
    /^\d+$/.test(contentLength) &&
    Number(contentLength) > MAX_JSON_BODY_BYTES
  ) {
    return { response: payloadTooLargeResponse(), success: false };
  }

  try {
    if (!request.body) throw new SyntaxError('Missing JSON body');
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      receivedBytes += value.byteLength;
      if (receivedBytes > MAX_JSON_BODY_BYTES) {
        await reader.cancel().catch(() => undefined);

        return { response: payloadTooLargeResponse(), success: false };
      }
      chunks.push(value);
    }

    const bytes = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const source = new TextDecoder('utf-8', { fatal: true }).decode(bytes);

    return { data: JSON.parse(source) as unknown, success: true };
  } catch {
    return {
      response: apiError(
        ErrorCode.VALIDATION_ERROR,
        'Corps JSON invalide',
        400,
      ),
      success: false,
    };
  }
}

/**
 * Standard success response for API routes.
 */
export function apiSuccess<T>(
  data: T,
  status = 200,
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json({ data, success: true as const }, { status });
}

/**
 * Standard success response with pagination metadata.
 */
export function apiPaginatedSuccess<T>(
  data: T,
  pagination: PaginationMeta,
  status = 200,
): NextResponse<ApiPaginatedSuccessResponse<T>> {
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
    method?: string;
    path?: string;
    requestId?: string;
  },
): NextResponse<ApiErrorResponse> {
  if (context?.error) {
    logger.error(message, {
      action: context.action,
      error: context.error,
      method: context.method,
      path: context.path,
      requestId: context.requestId,
      status,
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

const getInternalErrorRequestContext = async (
  request?: Request,
): Promise<{
  method?: string;
  path?: string;
  requestId?: string;
}> => {
  try {
    const requestHeaders = request?.headers ?? (await headers());
    const requestId = getRequestId(requestHeaders) ?? undefined;
    const method =
      request?.method ??
      requestHeaders.get(REQUEST_METHOD_HEADER)?.slice(0, 16) ??
      undefined;
    const path = request
      ? new URL(request.url).pathname.slice(0, 2048)
      : (requestHeaders.get(REQUEST_PATH_HEADER)?.slice(0, 2048) ?? undefined);

    return { method, path, requestId };
  } catch {
    // Unit calls and startup failures may execute without a Next request scope.
    return {};
  }
};

/**
 * Shorthand for common error types.
 */
export const apiErrors = {
  badRequest: (
    message: string,
    details?: Record<string, string[]>,
  ): NextResponse<ApiErrorResponse> =>
    apiError(ErrorCode.VALIDATION_ERROR, message, 400, { details }),

  forbidden: (message = 'Accès interdit'): NextResponse<ApiErrorResponse> =>
    apiError(ErrorCode.FORBIDDEN, message, 403),

  internal: async (
    action: string,
    error: unknown,
    request?: Request,
  ): Promise<NextResponse<ApiErrorResponse>> => {
    const requestContext = await getInternalErrorRequestContext(request);
    const response = apiError(ErrorCode.INTERNAL_ERROR, 'Erreur serveur', 500, {
      action,
      error,
      ...requestContext,
    });

    if (requestContext.requestId) {
      response.headers.set(REQUEST_ID_HEADER, requestContext.requestId);
    }

    return response;
  },

  notFound: (
    message = 'Ressource non trouvée',
  ): NextResponse<ApiErrorResponse> =>
    apiError(ErrorCode.NOT_FOUND, message, 404),

  validation: (
    message: string,
    details?: Record<string, string[]>,
  ): NextResponse<ApiErrorResponse> =>
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
