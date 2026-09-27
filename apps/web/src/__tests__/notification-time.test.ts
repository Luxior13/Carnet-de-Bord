import { describe, expect, it } from 'vitest';

import { formatNotificationTime } from '$features/notifications/notification-time';

const now = Date.parse('2026-09-27T12:00:00Z');
const ago = (milliseconds: number): string =>
  new Date(now - milliseconds).toISOString();

describe('notification time', () => {
  it('distinguishes recent arrivals while keeping the full instant accessible', () => {
    expect(formatNotificationTime(ago(59_000), now).label).toBe('À l’instant');
    expect(formatNotificationTime(ago(60_000), now).label).toMatch(/1\smin/);
    expect(formatNotificationTime(ago(3_600_000), now).label).toMatch(/1\sh/);
    expect(formatNotificationTime(ago(86_400_000), now).label).toBe('hier');
    const time = formatNotificationTime(ago(600_000), now);
    expect(time.dateTime).toBe('2026-09-27T11:50:00.000Z');
    expect(time.full).toContain('2026');
    expect(time.full).toMatch(/\d{2}:50/);
  });

  it('uses a dated label for older or unexpectedly future notifications', () => {
    expect(formatNotificationTime(ago(7 * 86_400_000), now).label).toContain(
      '2026',
    );
    expect(formatNotificationTime(ago(-3_600_000), now).label).toContain(
      '2026',
    );
  });

  it('does not render invalid dates as recent events', () => {
    expect(formatNotificationTime('invalid', now)).toEqual({
      dateTime: undefined,
      full: 'Date inconnue',
      label: 'Date inconnue',
    });
  });
});
