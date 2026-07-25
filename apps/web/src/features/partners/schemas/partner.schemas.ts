import {
  type CountryCode,
  isSupportedCountry,
  parsePhoneNumberFromString,
} from 'libphonenumber-js';
import { z } from 'zod';

import {
  PARTNER_CATEGORIES,
  PARTNER_LIMITS,
  PARTNER_LIST_SORTS,
  PARTNER_STATUSES,
} from '../partner.constants';

const optionalTrimmed = (max: number) =>
  z
    .string()
    .max(max)
    .nullable()
    .optional()
    .transform((value) => value?.trim() || null);

const CIVIL_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

const isLeapYear = (year: number): boolean =>
  year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);

const isValidCivilDate = (value: string): boolean => {
  const match = CIVIL_DATE_PATTERN.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (year === 0 || month < 1 || month > 12 || day < 1) return false;

  const daysInMonth = [
    31,
    isLeapYear(year) ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];

  return day <= (daysInMonth[month - 1] ?? 0);
};

const civilDateString = z
  .string()
  .regex(CIVIL_DATE_PATTERN, 'Date invalide')
  .refine(isValidCivilDate, 'Date invalide');

const civilDate = civilDateString
  .nullable()
  .optional()
  .transform((value) => value || null);

const optionalCivilDate = civilDateString
  .nullable()
  .optional()
  .transform((value) => (value === undefined ? undefined : value || null));

const website = optionalTrimmed(2048).superRefine((value, context) => {
  if (!value) return;
  try {
    const url = new URL(value);
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      throw new Error('invalid');
    }
  } catch {
    context.addIssue({ code: 'custom', message: 'Site internet invalide' });
  }
});

const channelSchema = z
  .object({
    countryCode: z.string().length(2).optional().default('FR'),
    isPrimary: z.boolean().optional().default(false),
    label: z.string().trim().min(1).max(40),
    type: z.enum(['EMAIL', 'PHONE']),
    value: z.string().trim().min(1).max(320),
  })
  .strict()
  .transform((value, context) => {
    if (value.type === 'EMAIL') {
      const result = z.email().safeParse(value.value);
      if (!result.success) {
        context.addIssue({
          code: 'custom',
          message: 'Email invalide',
          path: ['value'],
        });

        return z.NEVER;
      }

      return value;
    }
    const countryCode = value.countryCode.toUpperCase();
    if (!isSupportedCountry(countryCode as CountryCode)) {
      context.addIssue({
        code: 'custom',
        message: 'Pays invalide',
        path: ['countryCode'],
      });

      return z.NEVER;
    }
    const phone = parsePhoneNumberFromString(
      value.value,
      countryCode as CountryCode,
    );
    if (!phone?.isValid()) {
      context.addIssue({
        code: 'custom',
        message: 'Téléphone invalide',
        path: ['value'],
      });

      return z.NEVER;
    }

    return { ...value, countryCode, normalizedValue: phone.number };
  });

const commonOrganizationShape = {
  categories: z.array(z.enum(PARTNER_CATEGORIES)).min(1).max(2),
  channels: z.array(channelSchema).max(PARTNER_LIMITS.channels).default([]),
  description: optionalTrimmed(500),
  name: z.string().trim().min(1, 'Nom requis').max(200),
  website,
};

const validatePrimaries = (
  value: { channels: Array<{ isPrimary: boolean; type: string }> },
  context: z.RefinementCtx,
): void => {
  for (const type of ['EMAIL', 'PHONE']) {
    if (
      value.channels.filter(
        (channel) => channel.type === type && channel.isPrimary,
      ).length > 1
    ) {
      context.addIssue({
        code: 'custom',
        message: `Un seul ${type === 'EMAIL' ? 'email' : 'téléphone'} peut être principal`,
        path: ['channels'],
      });
    }
  }
};

const validateDateOrder = (
  value: { endedOn?: string | null; startedOn?: string | null },
  context: z.RefinementCtx,
): void => {
  if (value.startedOn && value.endedOn && value.endedOn < value.startedOn) {
    context.addIssue({
      code: 'custom',
      message: 'La date de fin ne peut pas précéder la date de début',
      path: ['endedOn'],
    });
  }
};

export const createPartnerSchema = z
  .object({
    ...commonOrganizationShape,
    contact: z
      .object({
        label: z.string().trim().min(1).max(80),
        personId: z.string().trim().min(1).max(128),
      })
      .strict()
      .nullable()
      .optional()
      .default(null),
    endedOn: civilDate,
    startedOn: civilDate,
    status: z.enum(PARTNER_STATUSES),
  })
  .strict()
  .superRefine(validatePrimaries)
  .superRefine(validateDateOrder);

export const updatePartnerSchema = z
  .object({
    ...commonOrganizationShape,
    version: z.number().int().positive(),
  })
  .strict()
  .superRefine(validatePrimaries);

export const updatePartnerStatusSchema = z
  .object({
    closingNote: optionalTrimmed(300),
    endedOn: civilDate,
    startedOn: civilDate,
    status: z.enum(PARTNER_STATUSES),
    version: z.number().int().positive(),
  })
  .strict()
  .superRefine(validateDateOrder);

export const partnersListQuerySchema = z
  .object({
    category: z.enum(PARTNER_CATEGORIES).optional(),
    cursor: z.string().max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    q: z.string().trim().max(100).default(''),
    sort: z.enum(PARTNER_LIST_SORTS).default('name'),
    status: z.enum(PARTNER_STATUSES).optional(),
  })
  .strict();

export const partnerTimelineQuerySchema = z
  .object({
    cursor: z.string().max(2048).optional(),
    limit: z.coerce.number().int().min(1).max(50).default(25),
  })
  .strict();

export const createPartnerContactSchema = z
  .object({
    isPrimary: z.boolean().default(false),
    label: z.string().trim().min(1).max(80),
    personId: z.string().trim().min(1).max(128),
    startedOn: civilDate,
    version: z.number().int().positive(),
  })
  .strict();

export const updatePartnerContactSchema = z
  .object({
    close: z.boolean().optional(),
    endedOn: optionalCivilDate,
    isPrimary: z.boolean().optional(),
    label: z.string().trim().min(1).max(80).optional(),
    startedOn: optionalCivilDate,
    version: z.number().int().positive(),
  })
  .strict()
  .superRefine(validateDateOrder);

export const createPartnerFollowUpSchema = z
  .object({
    action: z
      .object({
        description: z.string().trim().min(1).max(300),
        dueOn: civilDate,
      })
      .strict()
      .nullable()
      .optional()
      .default(null),
    occurredAt: z.iso.datetime().optional(),
    partnerContactId: z.string().trim().min(1).max(128).nullable().optional(),
    text: z.string().trim().min(1).max(4000),
    // Kept optional for backward compatibility with clients that still send
    // the fiche version. Creating an independent note must not conflict with
    // another administrator changing the fiche at the same time.
    version: z.number().int().positive().optional(),
  })
  .strict();

export const updatePartnerFollowUpSchema = z
  .object({
    entryVersion: z.number().int().positive(),
    partnerContactId: z.string().trim().min(1).max(128).nullable().optional(),
    text: z.string().trim().min(1).max(4000),
  })
  .strict();

export const updatePartnerActionSchema = z
  .object({
    actionVersion: z.number().int().positive(),
    completed: z.boolean(),
  })
  .strict();

export const deletePartnerChildSchema = z
  .object({ version: z.number().int().positive() })
  .strict();

export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;
export type UpdatePartnerStatusInput = z.infer<
  typeof updatePartnerStatusSchema
>;
export type CreatePartnerContactInput = z.infer<
  typeof createPartnerContactSchema
>;
export type UpdatePartnerContactInput = z.infer<
  typeof updatePartnerContactSchema
>;
export type CreatePartnerFollowUpInput = z.infer<
  typeof createPartnerFollowUpSchema
>;
export type UpdatePartnerFollowUpInput = z.infer<
  typeof updatePartnerFollowUpSchema
>;
