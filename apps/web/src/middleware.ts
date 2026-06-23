import { NextRequest, NextResponse } from 'next/server';

import { checkRateLimit } from '$server/api-rate-limiter';

const CSRF_COOKIE = 'csrf-token';
const CSRF_HEADER = 'x-csrf-token';
const SESSION_COOKIE = 'session';
const ADMINISTRATION_PATH_PREFIX = '/administration';
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function isAdministrationPath(pathname: string): boolean {
  return (
    pathname === ADMINISTRATION_PATH_PREFIX ||
    pathname.startsWith(`${ADMINISTRATION_PATH_PREFIX}/`)
  );
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

function addSecurityHeaders(response: NextResponse): void {
  // Security headers
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
    "img-src 'self' data: blob: https:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
  ].join('; ');
  response.headers.set('Content-Security-Policy', csp);
}

export function middleware(request: NextRequest): NextResponse {
  // Rate limiting for API routes
  if (request.nextUrl.pathname.startsWith('/api/')) {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip') ||
      'unknown';

    const rateLimit = checkRateLimit(ip);

    if (!rateLimit.allowed) {
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
      addSecurityHeaders(errorResponse);

      return errorResponse;
    }

    // Continue with request processing, will add rate limit headers to response later
    const response = NextResponse.next();

    // Ensure CSRF cookie exists on every response
    const existingToken = request.cookies.get(CSRF_COOKIE)?.value;
    if (!existingToken) {
      const token = generateToken();
      response.cookies.set(CSRF_COOKIE, token, {
        httpOnly: false, // Must be readable by JS to send in header
        path: '/',
        sameSite: 'strict',
        secure: process.env.NODE_ENV === 'production',
      });
    }

    // Validate CSRF on mutation API requests
    if (MUTATION_METHODS.has(request.method)) {
      // Skip CSRF for login (no cookie yet)
      if (request.nextUrl.pathname === '/api/auth/login') {
        response.headers.set(
          'X-RateLimit-Remaining',
          String(rateLimit.remaining),
        );
        addSecurityHeaders(response);

        return response;
      }

      const cookieToken = request.cookies.get(CSRF_COOKIE)?.value;
      const headerToken = request.headers.get(CSRF_HEADER);

      if (!cookieToken || !headerToken || cookieToken !== headerToken) {
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
        addSecurityHeaders(csrfErrorResponse);

        return csrfErrorResponse;
      }
    }

    // Add rate limit headers to response
    response.headers.set('X-RateLimit-Remaining', String(rateLimit.remaining));
    addSecurityHeaders(response);

    return response;
  }

  // Non-API routes
  if (
    isAdministrationPath(request.nextUrl.pathname) &&
    !request.cookies.get(SESSION_COOKIE)?.value
  ) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = '/login';
    loginUrl.search = '';

    const redirectResponse = NextResponse.redirect(loginUrl);
    addSecurityHeaders(redirectResponse);

    return redirectResponse;
  }

  const response = NextResponse.next();

  // Ensure CSRF cookie exists on every response
  const existingToken = request.cookies.get(CSRF_COOKIE)?.value;
  if (!existingToken) {
    const token = generateToken();
    response.cookies.set(CSRF_COOKIE, token, {
      httpOnly: false, // Must be readable by JS to send in header
      path: '/',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });
  }

  addSecurityHeaders(response);

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
