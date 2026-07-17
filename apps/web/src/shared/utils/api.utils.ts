import type {
  ApiErrorResponse,
  ApiSuccessResponse,
  ErrorCode,
} from '$types/api.types';

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export class ApiClientError extends Error {
  readonly code: ErrorCode | 'INVALID_RESPONSE';
  readonly details?: Record<string, string[]>;
  readonly requestId: string | null;
  readonly retryAfter: number | null;
  readonly status: number;

  constructor({
    code,
    details,
    message,
    requestId,
    retryAfter,
    status,
  }: {
    code: ErrorCode | 'INVALID_RESPONSE';
    details?: Record<string, string[]>;
    message: string;
    requestId: string | null;
    retryAfter: number | null;
    status: number;
  }) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.details = details;
    this.requestId = requestId;
    this.retryAfter = retryAfter;
    this.status = status;
  }
}

function getCsrfToken(): string | null {
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${CSRF_COOKIE}=`));

  return match ? (match.split('=')[1] ?? null) : null;
}

/**
 * Wrapper around fetch that automatically injects the CSRF token
 * for mutation requests (POST, PUT, PATCH, DELETE).
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const method = (init?.method ?? 'GET').toUpperCase();

  if (MUTATION_METHODS.has(method)) {
    const token = getCsrfToken();
    if (token) {
      const headers = new Headers(init?.headers);
      headers.set(CSRF_HEADER, token);

      return fetch(input, { ...init, headers });
    }
  }

  return fetch(input, init);
}

const parseRetryAfter = (response: Response): number | null => {
  const value = response.headers.get('Retry-After');
  if (!value) return null;

  const seconds = Number.parseInt(value, 10);

  return Number.isFinite(seconds) && seconds >= 0 ? seconds : null;
};

/**
 * Typed JSON client for every new feature. It preserves the server error
 * contract, request correlation identifier and retry information.
 */
export async function apiFetchJson<TData>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<TData> {
  const response = await apiFetch(input, init);
  const requestId = response.headers.get('x-request-id');
  let payload: ApiSuccessResponse<TData> | ApiErrorResponse | null = null;

  try {
    payload = (await response.json()) as
      ApiSuccessResponse<TData> | ApiErrorResponse;
  } catch {
    throw new ApiClientError({
      code: 'INVALID_RESPONSE',
      message: 'Réponse serveur invalide',
      requestId,
      retryAfter: parseRetryAfter(response),
      status: response.status,
    });
  }

  if (!response.ok || !payload.success) {
    const error = !payload.success ? payload.error : null;

    throw new ApiClientError({
      code: error?.code ?? 'INVALID_RESPONSE',
      ...(error?.details ? { details: error.details } : {}),
      message: error?.message ?? 'La requête a échoué',
      requestId,
      retryAfter: parseRetryAfter(response),
      status: response.status,
    });
  }

  return payload.data;
}

export const jsonRequest = (
  method: 'DELETE' | 'PATCH' | 'POST' | 'PUT',
  body?: unknown,
  init: RequestInit = {},
): RequestInit => {
  const headers = new Headers(init.headers);
  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return {
    ...init,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    headers,
    method,
  };
};
