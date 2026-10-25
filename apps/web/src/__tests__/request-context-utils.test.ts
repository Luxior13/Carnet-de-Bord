import { describe, expect, it } from 'vitest';

import {
  getClientIp,
  parseTrustedProxyHops,
} from '$utils/request-context.utils';

const headers = (values: Record<string, string>): Headers =>
  new Headers(values);

describe('client address behind trusted proxies', () => {
  it('reads the entry written by the outermost of N trusted proxies', () => {
    const forwarded = headers({
      'x-forwarded-for': '198.51.100.1, 203.0.113.9, 10.0.0.2',
    });

    // One proxy: the last entry. Two proxies (e.g. CDN then nginx): the one
    // before it. The client-written prefix is never trusted.
    expect(getClientIp(forwarded, 1)).toBe('10.0.0.2');
    expect(getClientIp(forwarded, 2)).toBe('203.0.113.9');
  });

  it('falls back to x-real-ip when fewer hops are present than configured', () => {
    expect(
      getClientIp(
        headers({ 'x-forwarded-for': '203.0.113.9', 'x-real-ip': '192.0.2.4' }),
        2,
      ),
    ).toBe('192.0.2.4');
    expect(getClientIp(headers({ 'x-forwarded-for': '203.0.113.9' }), 2)).toBe(
      null,
    );
  });

  it('accepts only an integer between 1 and 10, defaulting to one proxy', () => {
    expect(parseTrustedProxyHops(undefined)).toBe(1);
    expect(parseTrustedProxyHops('')).toBe(1);
    expect(parseTrustedProxyHops('2')).toBe(2);
    expect(parseTrustedProxyHops('10')).toBe(10);
    for (const invalid of ['0', '11', '1.5', 'two', '-1'])
      expect(parseTrustedProxyHops(invalid)).toBe(1);
  });
});
