import 'server-only';

import { Prisma } from '@prisma/client';

import { partnerErrors } from './partner-errors';

export const touchPartner = async (
  transaction: Prisma.TransactionClient,
  input: { actorId: string; id: string; version: number },
): Promise<void> => {
  const result = await transaction.partnerOrganization.updateMany({
    data: { updatedById: input.actorId, version: { increment: 1 } },
    where: { id: input.id, version: input.version },
  });
  if (result.count !== 1) throw partnerErrors.versionConflict();
};

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
