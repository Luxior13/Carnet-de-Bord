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

const civilDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide')
  .nullable()
  .optional()
  .transform((value) => value || null);

const optionalCivilDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date invalide')
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
  status: z.enum(PARTNER_STATUSES),
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
  })
  .strict()
  .superRefine(validatePrimaries);

export const updatePartnerSchema = z
  .object({
    ...commonOrganizationShape,
    closingNote: optionalTrimmed(300),
    endedOn: civilDate,
    startedOn: civilDate,
    version: z.number().int().positive(),
  })
  .strict()
  .superRefine(validatePrimaries);

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
  .strict();

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
    version: z.number().int().positive(),
  })
  .strict();

export const updatePartnerFollowUpSchema = z
  .object({
    occurredAt: z.iso.datetime(),
    partnerContactId: z.string().trim().min(1).max(128).nullable(),
    text: z.string().trim().min(1).max(4000),
    version: z.number().int().positive(),
  })
  .strict();

export const updatePartnerActionSchema = z
  .object({
    completed: z.boolean(),
    version: z.number().int().positive(),
  })
  .strict();

export const deletePartnerChildSchema = z
  .object({ version: z.number().int().positive() })
  .strict();

export type CreatePartnerInput = z.infer<typeof createPartnerSchema>;
export type UpdatePartnerInput = z.infer<typeof updatePartnerSchema>;
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
