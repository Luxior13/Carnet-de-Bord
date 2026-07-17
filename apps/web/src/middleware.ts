import { NextRequest, NextResponse } from 'next/server';

import { isPublicPagePath } from '$constants/security.constants';
import { checkRateLimit } from '$server/api-rate-limiter';
import {
  getClientIp,
  REQUEST_ID_HEADER,
  REQUEST_METHOD_HEADER,
  REQUEST_PATH_HEADER,
  REQUEST_TARGET_HEADER,
} from '$utils/request-context.utils';

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';
const SESSION_COOKIE = 'session';
const CSRF_TOKEN_PATTERN = /^[0-9a-f]{64}$/;
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const HEALTH_API_PATHS = new Set([
  '/api/health',
  '/api/health/live',
  '/api/health/ready',
]);
const API_CACHE_CONTROL = 'private, no-store, max-age=0, must-revalidate';

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function isValidToken(token: string | null | undefined): token is string {
  return typeof token === 'string' && CSRF_TOKEN_PATTERN.test(token);
}

function tokensMatch(first: string, second: string): boolean {
  if (first.length !== second.length) return false;

  let difference = 0;

  for (let index = 0; index < first.length; index++) {
    difference |= first.charCodeAt(index) ^ second.charCodeAt(index);
  }

  return difference === 0;
}

function createDownstreamResponse(
  request: NextRequest,
  requestId: string,
): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);
  requestHeaders.set(REQUEST_METHOD_HEADER, request.method);
  requestHeaders.set(REQUEST_PATH_HEADER, request.nextUrl.pathname);
  requestHeaders.set(
    REQUEST_TARGET_HEADER,
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );

  return NextResponse.next({ request: { headers: requestHeaders } });
}

function addResponseHeaders(
  response: NextResponse,
  requestId: string,
  isApi = false,
): void {
  // Security headers
  response.headers.set(REQUEST_ID_HEADER, requestId);
  if (isApi) {
    response.headers.set('Cache-Control', API_CACHE_CONTROL);
    response.headers.set('Pragma', 'no-cache');
  }
  response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('X-DNS-Prefetch-Control', 'off');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()',
  );

  // CSP - conditional based on environment
  const isDev = process.env.NODE_ENV !== 'production';

  const csp = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'", // Required for Tailwind CSS
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    ...(!isDev ? ['upgrade-insecure-requests'] : []),
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);

  if (!isDev) {
    response.headers.set(
      'Strict-Transport-Security',
      'max-age=63072000; includeSubDomains; preload',
    );
  }
}

export function middleware(request: NextRequest): NextResponse {
  // Always replace a client-provided identifier with a server-generated UUID.
  const requestId = crypto.randomUUID();

  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const isHealthEndpoint = HEALTH_API_PATHS.has(request.nextUrl.pathname);
    const rateLimit = isHealthEndpoint
      ? null
      : checkRateLimit(getClientIp(request.headers) ?? 'unknown');

    if (rateLimit && !rateLimit.allowed) {
      const errorResponse = NextResponse.json(
        {
          error: {
            code: 'RATE_LIMITED',
            message: 'Trop de requêtes. Réessayez dans une minute.',
          },
          success: false,
        },
        {
          headers: {
            'Retry-After': String(
              Math.ceil((rateLimit.resetAt - Date.now()) / 1000),
            ),
            'X-RateLimit-Remaining': '0',
          },
          status: 429,
        },
      );
      addResponseHeaders(errorResponse, requestId, true);

      return errorResponse;
    }

    // Continue with request processing, will add rate limit headers to response later
    const response = createDownstreamResponse(request, requestId);

    // Ensure CSRF cookie exists on every response
    const existingToken = request.cookies.get(CSRF_COOKIE)?.value;
    if (!isHealthEndpoint && !isValidToken(existingToken)) {
      const token = generateToken();
      response.cookies.set(CSRF_COOKIE, token, {
        httpOnly: false, // Must be readable by JS to send in header
        path: '/',
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    // Validate CSRF on mutation API requests
    if (!isHealthEndpoint && MUTATION_METHODS.has(request.method)) {
      const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
      const headerToken = request.headers.get(CSRF_HEADER);

      if (
        !isValidToken(cookieToken) ||
        !isValidToken(headerToken) ||
        !tokensMatch(cookieToken, headerToken)
      ) {
        const csrfErrorResponse = NextResponse.json(
          {
            error: {
              code: 'CSRF_VALIDATION_FAILED',
              message: 'Requête invalide (CSRF)',
            },
            success: false,
          },
          { status: 403 },
        );
        addResponseHeaders(csrfErrorResponse, requestId, true);

        return csrfErrorResponse;
      }
    }

    // Add rate limit headers to response
    if (rateLimit) {
      response.headers.set(
        'X-RateLimit-Remaining',
        String(rateLimit.remaining),
      );
    }
    addResponseHeaders(response, requestId, true);

    return response;
  }

  // Non-API routes
  if (
    !isPublicPagePath(request.nextUrl.pathname) &&
    !request.cookies.get(SESSION_COOKIE)?.value
  ) {
    const loginUrl = request.nextUrl.clone();
    const requestedPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
    loginUrl.pathname = '/login';
    loginUrl.search = '';
    loginUrl.searchParams.set('next', requestedPath);

    const redirectResponse = NextResponse.redirect(loginUrl);
    addResponseHeaders(redirectResponse, requestId);

    return redirectResponse;
  }

  const response = createDownstreamResponse(request, requestId);

  // Ensure CSRF cookie exists on every response
  const existingToken = request.cookies.get(CSRF_COOKIE)?.value;
  if (!isValidToken(existingToken)) {
    const token = generateToken();
    response.cookies.set(CSRF_COOKIE, token, {
      httpOnly: false, // Must be readable by JS to send in header
      path: '/',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  addResponseHeaders(response, requestId);

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/((?!_next/|favicon.ico|assets/.*|.*\\..*).*)'],
};
