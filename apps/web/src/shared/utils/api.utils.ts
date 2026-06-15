const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

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
