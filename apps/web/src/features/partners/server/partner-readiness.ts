import 'server-only';

import type { PrismaClient } from '@prisma/client';

import { prisma } from '$server/prisma';

import { partnerErrors } from './partner-errors';

type SchemaRow = { ready: boolean };

export const isPartnerSchemaReady = async (
  client: PrismaClient = prisma,
): Promise<boolean> => {
  try {
    const rows = await client.$queryRaw<SchemaRow[]>`
      SELECT bool_and(
        to_regclass(format('%I.%I', current_schema(), required_table.name))
        IS NOT NULL
      ) AS "ready"
      FROM (VALUES
        ('PartnerOrganization'),
        ('PartnerOrganizationCategory'),
        ('PartnerOrganizationContactChannel'),
        ('PartnerRelationshipPeriod'),
        ('PartnerContact'),
        ('PartnerFollowUpEntry'),
        ('PartnerFollowUpAction'),
        ('PartnerOrganizationDeletionTombstone'),
        ('PartnerOrganizationMergeRedirect')
      ) AS required_table(name)
    `;

    return rows[0]?.ready === true;
  } catch {
    return false;
  }
};

export const assertPartnerFeatureReady = async (): Promise<void> => {
  if (!(await isPartnerSchemaReady()))
    throw partnerErrors.featureNotConfigured();
};
