import 'server-only';

import type { PrismaClient } from '@prisma/client';

import { prisma } from '$server/prisma';

import { partnerErrors } from './partner-errors';

type SchemaRow = { ready: boolean };

const SUCCESS_CACHE_MS = 5_000;
let cachedReadyUntil = 0;
let pendingReadiness: Promise<boolean> | undefined;

const queryPartnerSchemaReadiness = async (
  client: PrismaClient,
): Promise<boolean> => {
  try {
    const rows = await client.$queryRaw<SchemaRow[]>`
      SELECT (
        bool_and(
          to_regclass(format('%I.%I', current_schema(), required_table.name))
          IS NOT NULL
        )
        AND (
          SELECT count(*) = 2
          FROM information_schema.columns
          WHERE table_schema = current_schema()
            AND table_name = 'PartnerContact'
            AND column_name IN ('selectedEmailId', 'selectedPhoneId')
        )
        AND (
          SELECT count(*) = 2
          FROM pg_constraint
          WHERE conrelid = to_regclass(
            format('%I.%I', current_schema(), 'PartnerContact')
          )
            AND conname IN (
              'PartnerContact_selectedEmailId_fkey',
              'PartnerContact_selectedPhoneId_fkey'
            )
        )
        AND EXISTS (
          SELECT 1
          FROM pg_trigger
          WHERE tgrelid = to_regclass(
            format('%I.%I', current_schema(), 'PartnerContact')
          )
            AND tgname = 'PartnerContact_selected_coordinates_guard'
            AND tgenabled IN ('O', 'A')
            AND NOT tgisinternal
        )
      ) AS "ready"
      FROM (VALUES
        ('PartnerOrganization'),
        ('PartnerOrganizationCategory'),
        ('PartnerOrganizationContactChannel'),
        ('PartnerRelationshipPeriod'),
        ('PartnerContact'),
        ('PartnerFollowUpEntry'),
        ('PartnerFollowUpAction'),
        ('PartnerTimelineEvent'),
        ('PartnerOrganizationDeletionTombstone'),
        ('PartnerOrganizationMergeRedirect')
      ) AS required_table(name)
    `;

    return rows[0]?.ready === true;
  } catch {
    return false;
  }
};

export const isPartnerSchemaReady = async (
  client: PrismaClient = prisma,
): Promise<boolean> => {
  const cacheable = client === prisma && process.env.NODE_ENV !== 'test';
  if (!cacheable) return queryPartnerSchemaReadiness(client);
  if (cachedReadyUntil > Date.now()) return true;
  if (pendingReadiness) return pendingReadiness;

  pendingReadiness = queryPartnerSchemaReadiness(client).then((ready) => {
    if (ready) cachedReadyUntil = Date.now() + SUCCESS_CACHE_MS;

    return ready;
  });

  try {
    return await pendingReadiness;
  } finally {
    pendingReadiness = undefined;
  }
};

export const assertPartnerFeatureReady = async (): Promise<void> => {
  if (!(await isPartnerSchemaReady()))
    throw partnerErrors.featureNotConfigured();
};
