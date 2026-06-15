import 'server-only';

// Simple in-memory rate limiter for API routes
// In production, use Redis for distributed rate limiting

const requests = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 100; // 100 requests per minute per IP

export function checkRateLimit(ip: string): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const key = ip;

  let entry = requests.get(key);

  // Clean up old entries periodically
  if (requests.size > 10000) {
    for (const [k, v] of requests.entries()) {
      if (v.resetAt < now) requests.delete(k);
    }
  }

  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + WINDOW_MS };
    requests.set(key, entry);
  }

  entry.count++;

  return {
    allowed: entry.count <= MAX_REQUESTS,
    remaining: Math.max(0, MAX_REQUESTS - entry.count),
    resetAt: entry.resetAt,
  };
}
