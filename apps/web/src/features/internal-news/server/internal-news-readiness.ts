import 'server-only';

import type { PrismaClient } from '@prisma/client';

import { prisma } from '$server/prisma';

type SchemaRow = { ready: boolean };

export class InternalNewsFeatureUnavailableError extends Error {
  constructor() {
    super("La migration de l'actualité interne n'est pas encore disponible.");
    this.name = 'InternalNewsFeatureUnavailableError';
  }
}

export const isInternalNewsSchemaReady = async (
  client: PrismaClient = prisma,
): Promise<boolean> => {
  try {
    const rows = await client.$queryRaw<SchemaRow[]>`
      SELECT (
        to_regclass(
          format('%I.%I', current_schema(), 'InternalAnnouncement')
        ) IS NOT NULL
      ) AS "ready"
    `;

    return rows[0]?.ready === true;
  } catch {
    return false;
  }
};

export const assertInternalNewsFeatureReady = async (): Promise<void> => {
  if (!(await isInternalNewsSchemaReady())) {
    throw new InternalNewsFeatureUnavailableError();
  }
};
