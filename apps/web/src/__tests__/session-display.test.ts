import { describe, expect, it } from 'vitest';

import {
  describeUserAgent,
  formatIpAddress,
  formatSessionActivity,
} from '$utils/session-display.utils';

describe('session display (27 October 2026)', () => {
  it('shortens IPv6 addresses for display only', () => {
    expect(formatIpAddress('2001:db8:0000:0000:0000:0000:0000:1234')).toBe(
      '2001:db8::1234',
    );
    expect(formatIpAddress('2001:0DB8:0:0:1:0:0:1')).toBe('2001:db8::1:0:0:1');
    expect(formatIpAddress('0:0:0:0:0:0:0:1')).toBe('::1');
    expect(formatIpAddress('2001:db8:1:2:3:4:5:6')).toBe(
      '2001:db8:1:2:3:4:5:6',
    );
    // A single zero group stays as is (RFC 5952).
    expect(formatIpAddress('2001:db8:0:1:1:1:1:1')).toBe(
      '2001:db8:0:1:1:1:1:1',
    );
  });

  it('keeps IPv4 and unusual forms as received', () => {
    expect(formatIpAddress('203.0.113.7')).toBe('203.0.113.7');
    expect(formatIpAddress('::ffff:203.0.113.7')).toBe('::ffff:203.0.113.7');
    expect(formatIpAddress('fe80::1%eth0')).toBe('fe80::1%eth0');
    expect(formatIpAddress('not-an-ip')).toBe('not-an-ip');
  });

  it('names the device and browser, or says it is not identified', () => {
    expect(
      describeUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
      ),
    ).toMatchObject({ isMobile: false, label: 'Windows · Chrome' });
    expect(describeUserAgent(null).label).toBe('Appareil non identifié');
  });

  it('reads the last activity in plain words', () => {
    const minutesAgo = (minutes: number): Date =>
      new Date(Date.now() - minutes * 60_000);

    expect(formatSessionActivity(minutesAgo(0))).toBe('à l’instant');
    expect(formatSessionActivity(minutesAgo(5))).toBe('il y a 5 min');
    expect(formatSessionActivity(minutesAgo(180))).toBe('il y a 3 h');
    expect(formatSessionActivity(null)).toBe('inconnue');
  });
});
