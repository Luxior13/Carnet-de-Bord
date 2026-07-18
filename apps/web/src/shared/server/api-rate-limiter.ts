import 'server-only';

// Per-instance limiter. It intentionally has a hard memory bound; deployments
// with several instances still need an external store for a global limit.

const requests = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60 * 1000; // 1 minute window
const MAX_REQUESTS = 100; // 100 requests per minute per IP
const MAX_TRACKED_CLIENTS = 10_000;
const MAX_IDENTIFIER_LENGTH = 128;
const CLEANUP_INTERVAL_MS = 15 * 1000;

let nextCleanupAt = 0;

const cleanupExpiredEntries = (now: number, force = false): void => {
  if (!force && now < nextCleanupAt) return;

  nextCleanupAt = now + CLEANUP_INTERVAL_MS;
  for (const [key, entry] of requests.entries()) {
    if (entry.resetAt <= now) requests.delete(key);
  }
};

const ensureCapacity = (now: number): void => {
  if (requests.size < MAX_TRACKED_CLIENTS) return;

  cleanupExpiredEntries(now, true);

  // The map is insertion ordered. Evicting the oldest remaining window keeps
  // memory bounded under identifier churn while preserving recent clients.
  while (requests.size >= MAX_TRACKED_CLIENTS) {
    const oldestKey = requests.keys().next().value as string | undefined;
    if (!oldestKey) break;
    requests.delete(oldestKey);
  }
};

const normalizeIdentifier = (identifier: string): string => {
  const normalized = identifier.trim().slice(0, MAX_IDENTIFIER_LENGTH);

  return normalized || 'unknown';
};

export function checkRateLimit(
  ip: string,
  options: { bucket?: string; maxRequests?: number; windowMs?: number } = {},
): {
  allowed: boolean;
  remaining: number;
  resetAt: number;
} {
  const now = Date.now();
  const maxRequests = options.maxRequests ?? MAX_REQUESTS;
  const windowMs = options.windowMs ?? WINDOW_MS;
  const key = `${options.bucket ?? 'api'}:${normalizeIdentifier(ip)}`;

  let entry = requests.get(key);

  cleanupExpiredEntries(now);

  if (!entry || entry.resetAt <= now) {
    if (!entry) ensureCapacity(now);
    entry = { count: 0, resetAt: now + windowMs };
    requests.set(key, entry);
  }

  entry.count++;
  // Refresh insertion order so capacity eviction approximates LRU.
  requests.delete(key);
  requests.set(key, entry);

  return {
    allowed: entry.count <= maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}
