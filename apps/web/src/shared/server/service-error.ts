import 'server-only';

import type { NextResponse } from 'next/server';

import { apiError, apiErrors } from '$server/api-response';
import { isSecurityVersionMismatchError } from '$server/auth-errors';
import { UserActionAuthorizationError } from '$server/user-action-authorization';
import { type ApiErrorResponse, ErrorCode } from '$types/api.types';

/**
 * A refusal decided by a server service. The route turns it into the
 * standard error envelope; the service never builds an HTTP response itself.
 */
export class ServiceError extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
    readonly status: number,
    readonly extra: {
      details?: Record<string, string[]>;
      retryAfter?: number;
    } = {},
  ) {
    super(message);
    this.name = 'ServiceError';
  }
}

export const serviceErrors = {
  conflict: (message: string): ServiceError =>
    new ServiceError(ErrorCode.CONFLICT, message, 409),
  forbidden: (message: string): ServiceError =>
    new ServiceError(ErrorCode.FORBIDDEN, message, 403),
  invalidCredentials: (message: string): ServiceError =>
    new ServiceError(ErrorCode.INVALID_CREDENTIALS, message, 400),
  notFound: (message: string): ServiceError =>
    new ServiceError(ErrorCode.NOT_FOUND, message, 404),
  rateLimited: (retryAfter = 1800): ServiceError =>
    new ServiceError(
      ErrorCode.RATE_LIMITED,
      `Trop de tentatives. Réessayez dans ${Math.ceil(retryAfter / 60)} minutes.`,
      429,
      { retryAfter },
    ),
  unauthorized: (message: string): ServiceError =>
    new ServiceError(ErrorCode.UNAUTHORIZED, message, 401),
  validation: (message: string): ServiceError =>
    new ServiceError(ErrorCode.VALIDATION_ERROR, message, 400),
};

export type ServiceErrorContext = {
  action: string;
  request: Request;
  /** Answer for a security state that changed meanwhile (401). */
  sessionExpiredMessage?: string;
};

/**
 * Maps any error raised by a server service to its
 * response. MFA flows add their challenge-specific cases through
 * `mfaFlowErrorResponse`.
 */
export const serviceErrorResponse = async (
  error: unknown,
  context: ServiceErrorContext,
): Promise<NextResponse<ApiErrorResponse>> => {
  if (error instanceof ServiceError) {
    const response = apiError(error.code, error.message, error.status, {
      details: error.extra.details,
    });
    if (error.extra.retryAfter !== undefined)
      response.headers.set('Retry-After', String(error.extra.retryAfter));

    return response;
  }
  if (error instanceof UserActionAuthorizationError)
    return apiError(error.code, error.message, error.status);
  if (context.sessionExpiredMessage && isSecurityVersionMismatchError(error))
    return apiError(ErrorCode.UNAUTHORIZED, context.sessionExpiredMessage, 401);

  return apiErrors.internal(context.action, error, context.request);
};
