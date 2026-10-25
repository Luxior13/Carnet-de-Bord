const MAX_IP_LENGTH = 64;
const MAX_USER_AGENT_LENGTH = 512;
const REQUEST_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const REQUEST_ID_HEADER = 'x-request-id';
export const REQUEST_METHOD_HEADER = 'x-request-method';
export const REQUEST_PATH_HEADER = 'x-request-path';
export const REQUEST_TARGET_HEADER = 'x-request-target';

type HeaderReader = Pick<Headers, 'get'>;

const isValidIpv4Address = (value: string): boolean => {
  const parts = value.split('.');

  return (
    parts.length === 4 &&
    parts.every(
      (part) =>
        /^\d{1,3}$/.test(part) && Number(part) >= 0 && Number(part) <= 255,
    )
  );
};

const isValidIpv6Address = (value: string): boolean => {
  if (!value.includes(':') || !/^[0-9a-f:.]+$/i.test(value)) return false;

  try {
    // URL parsing is part of the Edge runtime and validates compressed IPv6
    // forms without importing Node's `net` module.
    return new URL(`http://[${value}]/`).hostname.length > 0;
  } catch {
    return false;
  }
};

const normalizeIpAddress = (value: string | null): string | null => {
  const normalized = value?.trim();

  if (
    !normalized ||
    normalized.length > MAX_IP_LENGTH ||
    (!isValidIpv4Address(normalized) && !isValidIpv6Address(normalized))
  ) {
    return null;
  }

  return normalized;
};

const DEFAULT_TRUSTED_PROXY_HOPS = 1;
const MAX_TRUSTED_PROXY_HOPS = 10;

/**
 * Number of reverse proxies in front of the application that each append the
 * address they received to x-forwarded-for (`TRUSTED_PROXY_HOPS`, validated
 * at start-up by `env.ts`; read here directly because the Edge middleware
 * shares this module).
 */
export const parseTrustedProxyHops = (value: string | undefined): number => {
  if (value === undefined || value.trim() === '')
    return DEFAULT_TRUSTED_PROXY_HOPS;
  const hops = Number(value);

  return Number.isInteger(hops) && hops >= 1 && hops <= MAX_TRUSTED_PROXY_HOPS
    ? hops
    : DEFAULT_TRUSTED_PROXY_HOPS;
};

/**
 * The client is the entry written by the outermost trusted proxy: counting
 * `hops` entries from the end of x-forwarded-for. Every entry to its left
 * was supplied by the client itself and would let it choose its address.
 */
export function getClientIp(
  headers: HeaderReader,
  hops = parseTrustedProxyHops(process.env.TRUSTED_PROXY_HOPS),
): string | null {
  const forwardedHops = headers.get('x-forwarded-for')?.split(',') ?? [];
  const clientHop =
    forwardedHops.length >= hops ? (forwardedHops.at(-hops) ?? null) : null;

  return (
    normalizeIpAddress(clientHop) ??
    normalizeIpAddress(headers.get('x-real-ip'))
  );
}

export function getUserAgent(headers: HeaderReader): string | null {
  const userAgent = headers.get('user-agent')?.trim();

  if (!userAgent) return null;

  return userAgent.slice(0, MAX_USER_AGENT_LENGTH);
}

export function getRequestId(headers: HeaderReader): string | null {
  const requestId = headers.get(REQUEST_ID_HEADER)?.trim();

  return requestId && REQUEST_ID_PATTERN.test(requestId) ? requestId : null;
}
