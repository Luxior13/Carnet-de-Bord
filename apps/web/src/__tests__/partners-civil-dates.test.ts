import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  createPartnerSchema,
  updatePartnerContactSchema,
  updatePartnerStatusSchema,
} from '$features/partners/schemas/partner.schemas';
import {
  fromCivilDate,
  toCivilDate,
} from '$features/partners/server/partner-normalization';

const validPartner = {
  categories: ['SPONSOR'],
  channels: [],
  contact: null,
  description: null,
  endedOn: null,
  name: 'Exemple',
  startedOn: null,
  status: 'PROSPECT',
  website: null,
} as const;

describe('partner civil dates', () => {
  it.each(['2024-2-29', '24-02-29', '2024/02/29', '2024-02-029', 'not-a-date'])(
    'rejects the invalid civil-date format %s',
    (startedOn) => {
      expect(
        createPartnerSchema.safeParse({ ...validPartner, startedOn }).success,
      ).toBe(false);
    },
  );

  it.each([
    '0000-01-01',
    '2023-02-29',
    '1900-02-29',
    '2024-04-31',
    '2024-13-01',
    '2024-00-10',
    '2024-01-00',
  ])('rejects the impossible civil date %s', (startedOn) => {
    expect(
      createPartnerSchema.safeParse({ ...validPartner, startedOn }).success,
    ).toBe(false);
    expect(() => toCivilDate(startedOn)).toThrow(RangeError);
  });

  it.each(['0001-01-01', '0099-12-31', '0100-02-28', '0400-02-29'])(
    'preserves the low year in a UTC round trip for %s',
    (value) => {
      const date = toCivilDate(value);

      expect(date).not.toBeNull();
      expect(date?.getUTCFullYear()).toBe(Number(value.slice(0, 4)));
      expect(fromCivilDate(date)).toBe(value);
      expect(
        createPartnerSchema.safeParse({
          ...validPartner,
          startedOn: value,
        }).success,
      ).toBe(true);
    },
  );

  it('preserves nullable and optional date semantics', () => {
    const created = createPartnerSchema.parse({
      ...validPartner,
      endedOn: undefined,
      startedOn: undefined,
    });
    const omittedUpdate = updatePartnerContactSchema.parse({
      contactVersion: 1,
      isPrimary: true,
      version: 1,
    });
    const nullableUpdate = updatePartnerContactSchema.parse({
      close: true,
      contactVersion: 1,
      endedOn: null,
      startedOn: null,
      version: 1,
    });

    expect(created.startedOn).toBeNull();
    expect(created.endedOn).toBeNull();
    expect(omittedUpdate).not.toHaveProperty('startedOn');
    expect(omittedUpdate).not.toHaveProperty('endedOn');
    expect(nullableUpdate).toMatchObject({
      endedOn: null,
      startedOn: null,
    });
    expect(toCivilDate('')).toBeNull();
    expect(toCivilDate(null)).toBeNull();
    expect(toCivilDate(undefined)).toBeNull();
    expect(fromCivilDate(null)).toBeNull();
  });

  it('rejects a relationship end before its start', () => {
    expect(
      createPartnerSchema.safeParse({
        ...validPartner,
        endedOn: '2025-05-31',
        startedOn: '2025-06-01',
      }).success,
    ).toBe(false);
    expect(
      updatePartnerStatusSchema.safeParse({
        closingNote: null,
        endedOn: '2025-05-31',
        startedOn: '2025-06-01',
        status: 'ENDED',
        version: 1,
      }).success,
    ).toBe(false);
    expect(
      updatePartnerContactSchema.safeParse({
        close: true,
        contactVersion: 1,
        endedOn: '2025-05-31',
        startedOn: '2025-06-01',
        version: 1,
      }).success,
    ).toBe(false);
  });

  it('refuses to serialize a date outside the supported civil-year range', () => {
    const yearZero = new Date(0);
    yearZero.setUTCFullYear(0, 0, 1);

    expect(() => fromCivilDate(yearZero)).toThrow(RangeError);
    expect(() => fromCivilDate(new Date(Number.NaN))).toThrow(RangeError);
  });
});
