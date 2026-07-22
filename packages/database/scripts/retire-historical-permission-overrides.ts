import { Prisma, PrismaClient } from '@prisma/client';

const CONFIRMATION_ARGUMENT =
  '--confirm-no-legacy-instances=RETIRE-HISTORICAL-PERMISSIONS';
const REQUIRED_MIGRATION = '20260721120000_person_identity_foundation';

type CountRow = Readonly<{ count: bigint }>;

const countRetiringOverrides = async (
  database: Pick<Prisma.TransactionClient, '$queryRaw'>,
): Promise<bigint> => {
  const rows = await database.$queryRaw<CountRow[]>`
    SELECT COUNT(*)::bigint AS "count"
    FROM "public"."User"
    WHERE "permissions" IS NOT NULL
      AND "permissions"::jsonb ?| ARRAY[
        'audit:view_sensitive',
        'system:audit_sensitive',
        'members:view',
        'members:update'
      ]
  `;

  return rows[0]?.count ?? 0n;
};

const prisma = new PrismaClient();

try {
  const appliedMigration = await prisma.$queryRaw<CountRow[]>`
    SELECT COUNT(*)::bigint AS "count"
    FROM "public"."_prisma_migrations"
    WHERE "migration_name" = ${REQUIRED_MIGRATION}
      AND "finished_at" IS NOT NULL
      AND "rolled_back_at" IS NULL
  `;
  if (appliedMigration[0]?.count !== 1n) {
    throw new Error(
      `Required migration ${REQUIRED_MIGRATION} is not applied successfully`,
    );
  }

  const pendingCount = await countRetiringOverrides(prisma);
  if (!process.argv.slice(2).includes(CONFIRMATION_ARGUMENT)) {
    process.stdout.write(
      [
        `Dry-run: ${pendingCount.toString()} user row(s) still contain retiring permission overrides.`,
        'No data was changed.',
        'After every legacy application instance has been stopped permanently, run again with:',
        CONFIRMATION_ARGUMENT,
        '',
      ].join('\n'),
    );
  } else {
    const result = await prisma.$transaction(
      async (transaction) => {
        await transaction.$queryRaw`
          SELECT pg_advisory_xact_lock(
            hashtext('retire-historical-permission-overrides-v1')
          )
        `;
        const before = await countRetiringOverrides(transaction);
        const updated = await transaction.$executeRaw`
          UPDATE "public"."User"
          SET "permissions" = NULLIF(
            "permissions"::jsonb
              - 'audit:view_sensitive'
              - 'system:audit_sensitive'
              - 'members:view'
              - 'members:update',
            '{}'::jsonb
          )
          WHERE "permissions" IS NOT NULL
            AND "permissions"::jsonb ?| ARRAY[
              'audit:view_sensitive',
              'system:audit_sensitive',
              'members:view',
              'members:update'
            ]
        `;
        const after = await countRetiringOverrides(transaction);
        if (after !== 0n || BigInt(updated) !== before) {
          throw new Error(
            'Historical permission cleanup did not converge atomically',
          );
        }

        return { after, before, updated };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    process.stdout.write(
      `Retired historical permission overrides from ${result.updated.toString()} user row(s); ${result.after.toString()} remain.\n`,
    );
  }
} finally {
  await prisma.$disconnect();
}
