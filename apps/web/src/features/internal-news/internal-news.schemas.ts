import { z } from 'zod';

import { INTERNAL_NEWS_FILTERS } from './internal-news.types';

export const internalNewsListQuerySchema = z
  .object({
    cursor: z.string().trim().min(1).max(2_048).optional(),
    filter: z.enum(INTERNAL_NEWS_FILTERS).default('all'),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export const publishInternalAnnouncementSchema = z
  .object({
    body: z
      .string()
      .trim()
      .min(1, 'Le contenu est obligatoire')
      .max(2_000, 'Le contenu est limité à 2 000 caractères'),
    isPinned: z.boolean().default(false),
    title: z
      .string()
      .trim()
      .min(1, 'Le titre est obligatoire')
      .max(160, 'Le titre est limité à 160 caractères'),
  })
  .strict();

export const updateInternalAnnouncementPinSchema = z
  .object({ isPinned: z.boolean() })
  .strict();
