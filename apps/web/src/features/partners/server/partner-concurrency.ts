import 'server-only';

import { Prisma } from '@prisma/client';

import { partnerErrors } from './partner-errors';

export const lockPartnerForIndependentMutation = async (
  transaction: Prisma.TransactionClient,
  partnerId: string,
): Promise<void> => {
  const locked = await transaction.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT "id"
    FROM "public"."PartnerOrganization"
    WHERE "id" = ${partnerId}
    FOR UPDATE
  `);
  if (locked.length !== 1) throw partnerErrors.notFound();
};
