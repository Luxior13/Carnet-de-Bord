import { z } from 'zod';

/**
 * Zod schema for email with automatic sanitization.
 * - Trims whitespace first
 * - Validates email format
 * - Transforms to lowercase
 */
export const emailSchema = z
  .string()
  .transform((val) => val.trim())
  .pipe(z.string().email('Email invalide'))
  .transform((val) => val.toLowerCase());

/**
 * Zod schema for optional email with sanitization.
 */
export const optionalEmailSchema = z
  .string()
  .optional()
  .nullable()
  .transform((val) => (val ? val.trim() : val))
  .pipe(z.string().email('Email invalide').optional().nullable())
  .transform((val) => (val ? val.toLowerCase() : val));

/**
 * Zod schema for required trimmed string.
 * Automatically trims whitespace from both ends.
 */
export const trimmedString = z.string().transform((val) => val.trim());

/**
 * Zod schema for optional/nullable trimmed string.
 * Returns null/undefined as-is, trims strings.
 */
export const optionalTrimmedString = z
  .string()
  .optional()
  .nullable()
  .transform((val) => (val ? val.trim() : val));

/**
 * Optional/nullable trimmed string with maximum length validation.
 */
export function optionalTrimmedStringMax(
  max: number,
  message?: string,
): z.ZodType<string | null | undefined> {
  return optionalTrimmedString.refine(
    (val) => val === undefined || val === null || val.length <= max,
    {
      message: message ?? `Maximum ${max} caractères autorisés`,
    },
  );
}

/**
 * Optional profile field: trims values and stores empty strings as null.
 */
export function optionalProfileString(
  max: number,
  message?: string,
): z.ZodType<string | null | undefined> {
  return optionalTrimmedStringMax(max, message).transform((val) =>
    val === '' ? null : val,
  );
}

/**
 * Zod schema for required trimmed string with minimum length.
 * Validates after trimming.
 */
export function trimmedStringMin(
  min: number,
  message?: string,
): z.ZodType<string> {
  return z
    .string()
    .transform((val) => val.trim())
    .refine((val) => val.length >= min, {
      message: message ?? `Minimum ${min} caractères requis`,
    });
}

/**
 * Zod schema for required trimmed string with min and max length.
 */
export function trimmedStringMinMax(
  min: number,
  max: number,
  minMessage?: string,
  maxMessage?: string,
): z.ZodType<string> {
  return z
    .string()
    .transform((val) => val.trim())
    .refine((val) => val.length >= min, {
      message: minMessage ?? `Minimum ${min} caractères requis`,
    })
    .refine((val) => val.length <= max, {
      message: maxMessage ?? `Maximum ${max} caractères autorisés`,
    });
}

/**
 * Zod schema for phone number with basic sanitization.
 * Removes extra spaces but keeps the number format.
 */
export const phoneSchema = z
  .string()
  .optional()
  .nullable()
  .transform((val) => (val ? val.trim().replace(/\s+/g, ' ') : val));
