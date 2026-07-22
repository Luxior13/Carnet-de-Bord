import { type Prisma, PrismaClient } from '@prisma/client';

import {
  assertMinimumPerformanceDataset,
  assertPerformanceDatabaseIsolation,
  assertPerformancePlan,
  assertPerformanceTargetConfirmation,
  parsePerformanceConfirmation,
  parsePerformanceDatabaseTarget,
  type PerformanceDatasetCounts,
  type PerformancePlanExpectation,
  type PerformancePlanSummary,
} from './persons-performance-plan.ts';

type ConnectionRow = {
  databaseName: string;
  readOnly: string;
  schemaName: string | null;
};

type CountRow = {
  auditFieldChanges: bigint;
  auditLogs: bigint;
  persons: bigint;
};

type IdentitySampleRow = { value: string };
type StatusSampleRow = { value: 'IN_STRUCTURE' | 'OUTSIDE_STRUCTURE' };
type EmailSampleRow = { value: string };
type PhoneSampleRow = { value: string };
type SocialSampleRow = { networkKey: string; value: string };
type UrlSampleRow = { hash: string; networkKey: string; value: string };
type HistorySampleRow = {
  entityId: string;
  entityType: string;
  fieldKey: string;
  recordId: string | null;
  sectionKey: string;
};
type IndexRow = { indexName: string };

type PerformanceSamples = Readonly<{
  email: string;
  history: HistorySampleRow;
  identity: string;
  phone: string;
  social: SocialSampleRow;
  status: StatusSampleRow['value'];
  url: UrlSampleRow;
}>;

type PerformanceQuery = Readonly<{
  expectation: PerformancePlanExpectation;
  parameters: readonly unknown[];
  sql: string;
}>;

const IDENTITY_PREFIX_INDEXES = [
  'Person_normalizedFirstName_prefix_idx',
  'Person_normalizedLastName_prefix_idx',
  'Person_normalizedNickname_prefix_idx',
] as const;

const IDENTITY_TRIGRAM_INDEXES = [
  'Person_normalizedFirstName_trgm_idx',
  'Person_normalizedLastName_trgm_idx',
  'Person_normalizedNickname_trgm_idx',
] as const;

const requireSample = <T>(rows: readonly T[], description: string): T => {
  const row = rows[0];
  if (!row) {
    throw new Error(
      `Performance dataset has no representative ${description} sample`,
    );
  }

  return row;
};

const escapeLikePattern = (value: string): string =>
  value.replaceAll('\\', '\\\\').replaceAll('%', '\\%').replaceAll('_', '\\_');

const getPerformanceSamples = async (
  transaction: Prisma.TransactionClient,
): Promise<PerformanceSamples> => {
  const status = requireSample(
    await transaction.$queryRaw<StatusSampleRow[]>`
      SELECT "structureStatus" AS "value"
      FROM "Person"
      GROUP BY "structureStatus"
      ORDER BY COUNT(*) DESC
      LIMIT 1
    `,
    'structure status',
  );
  const identity = requireSample(
    await transaction.$queryRaw<IdentitySampleRow[]>`
      SELECT COALESCE(
        "normalizedNickname",
        "normalizedFirstName",
        "normalizedLastName"
      ) AS "value"
      FROM "Person"
      WHERE LENGTH(COALESCE(
        "normalizedNickname",
        "normalizedFirstName",
        "normalizedLastName"
      )) >= 5
      LIMIT 1
    `,
    'normalized identity',
  );
  const email = requireSample(
    await transaction.$queryRaw<EmailSampleRow[]>`
      SELECT "normalizedEmail" AS "value"
      FROM "PersonEmail"
      WHERE "normalizedEmail" <> ''
      LIMIT 1
    `,
    'email',
  );
  const phone = requireSample(
    await transaction.$queryRaw<PhoneSampleRow[]>`
      SELECT "normalizedPhone" AS "value"
      FROM "PersonPhone"
      WHERE "normalizedPhone" <> ''
      LIMIT 1
    `,
    'phone',
  );
  const social = requireSample(
    await transaction.$queryRaw<SocialSampleRow[]>`
      SELECT
        "networkKey",
        "normalizedIdentifier" AS "value"
      FROM "PersonSocialProfile"
      WHERE "normalizedIdentifier" IS NOT NULL
      LIMIT 1
    `,
    'social identifier',
  );
  const url = requireSample(
    await transaction.$queryRaw<UrlSampleRow[]>`
      SELECT
        "normalizedProfileUrlHash" AS "hash",
        "networkKey",
        "normalizedProfileUrl" AS "value"
      FROM "PersonSocialProfile"
      WHERE "normalizedProfileUrlHash" IS NOT NULL
        AND "normalizedProfileUrl" IS NOT NULL
      LIMIT 1
    `,
    'social URL',
  );
  const history = requireSample(
    await transaction.$queryRaw<HistorySampleRow[]>`
      SELECT
        "entityId",
        "entityType",
        "fieldKey",
        "recordId",
        "sectionKey"
      FROM "AuditFieldChange"
      WHERE "entityType" = 'PERSON'
      ORDER BY "createdAt" DESC, "id" DESC
      LIMIT 1
    `,
    'Person field history',
  );

  return {
    email: email.value,
    history,
    identity: identity.value,
    phone: phone.value,
    social,
    status: status.value,
    url,
  };
};

const buildPerformanceQueries = (
  samples: PerformanceSamples,
): readonly PerformanceQuery[] => {
  const prefixLength = Math.min(8, samples.identity.length);
  const prefixPattern = `${escapeLikePattern(samples.identity.slice(0, prefixLength))}%`;
  const trigramPattern = `%${escapeLikePattern(samples.identity)}%`;
  const historyRecordClause =
    samples.history.recordId === null
      ? 'field_change."recordId" IS NULL'
      : 'field_change."recordId" = $5';
  const historyParameters = [
    samples.history.entityType,
    samples.history.entityId,
    samples.history.sectionKey,
    samples.history.fieldKey,
    ...(samples.history.recordId === null ? [] : [samples.history.recordId]),
  ];

  return [
    {
      expectation: {
        indexRequirements: [
          {
            description: 'general Person keyset order',
            oneOf: ['Person_createdAt_id_idx'],
          },
        ],
        name: 'persons-general-list',
      },
      parameters: [],
      sql: `
        SELECT p."id", p."nickname", p."firstName", p."lastName"
        FROM "Person" p
        ORDER BY p."createdAt" DESC, p."id" DESC
        LIMIT 26
      `,
    },
    {
      expectation: {
        indexRequirements: [
          {
            description: 'filtered Person keyset order',
            oneOf: ['Person_structureStatus_createdAt_id_idx'],
          },
        ],
        name: 'persons-filtered-list',
      },
      parameters: [samples.status],
      sql: `
        SELECT p."id", p."nickname", p."firstName", p."lastName"
        FROM "Person" p
        WHERE p."structureStatus" = $1::"PersonStructureStatus"
        ORDER BY p."createdAt" DESC, p."id" DESC
        LIMIT 26
      `,
    },
    {
      expectation: {
        indexRequirements: [
          {
            description: 'exact normalized identity',
            oneOf: IDENTITY_PREFIX_INDEXES,
          },
        ],
        name: 'persons-identity-exact',
      },
      parameters: [samples.identity],
      sql: `
        SELECT p."id"
        FROM "Person" p
        WHERE (
          p."normalizedNickname" = $1
          OR p."normalizedFirstName" = $1
          OR p."normalizedLastName" = $1
        )
        ORDER BY p."createdAt" DESC, p."id" DESC
        LIMIT 26
      `,
    },
    {
      expectation: {
        indexRequirements: [
          {
            description: 'normalized identity prefix',
            oneOf: IDENTITY_PREFIX_INDEXES,
          },
        ],
        name: 'persons-identity-prefix',
      },
      parameters: [prefixPattern],
      sql: `
        SELECT p."id"
        FROM "Person" p
        WHERE (
          p."normalizedNickname" LIKE $1 ESCAPE E'\\\\'
          OR p."normalizedFirstName" LIKE $1 ESCAPE E'\\\\'
          OR p."normalizedLastName" LIKE $1 ESCAPE E'\\\\'
        )
        ORDER BY p."createdAt" DESC, p."id" DESC
        LIMIT 26
      `,
    },
    {
      expectation: {
        indexRequirements: [
          {
            description: 'normalized identity trigram',
            oneOf: IDENTITY_TRIGRAM_INDEXES,
          },
        ],
        name: 'persons-identity-trigram',
      },
      parameters: [trigramPattern],
      sql: `
        SELECT p."id"
        FROM "Person" p
        WHERE (
          p."normalizedNickname" LIKE $1 ESCAPE E'\\\\'
          OR p."normalizedFirstName" LIKE $1 ESCAPE E'\\\\'
          OR p."normalizedLastName" LIKE $1 ESCAPE E'\\\\'
        )
        ORDER BY p."createdAt" DESC, p."id" DESC
        LIMIT 26
      `,
    },
    {
      expectation: {
        indexRequirements: [
          {
            description: 'email exact lookup',
            oneOf: [
              'PersonEmail_normalizedEmail_idx',
              'PersonEmail_normalizedEmail_prefix_idx',
            ],
          },
        ],
        name: 'persons-email-exists',
      },
      parameters: [samples.email],
      sql: `
        SELECT p."id"
        FROM "Person" p
        WHERE EXISTS (
          SELECT 1
          FROM "PersonEmail" email
          WHERE email."personId" = p."id"
            AND email."normalizedEmail" = $1
        )
        ORDER BY p."createdAt" DESC, p."id" DESC
        LIMIT 26
      `,
    },
    {
      expectation: {
        indexRequirements: [
          {
            description: 'phone exact lookup',
            oneOf: [
              'PersonPhone_normalizedPhone_idx',
              'PersonPhone_normalizedPhone_prefix_idx',
            ],
          },
        ],
        name: 'persons-phone-exists',
      },
      parameters: [samples.phone],
      sql: `
        SELECT p."id"
        FROM "Person" p
        WHERE EXISTS (
          SELECT 1
          FROM "PersonPhone" phone
          WHERE phone."personId" = p."id"
            AND phone."normalizedPhone" = $1
        )
        ORDER BY p."createdAt" DESC, p."id" DESC
        LIMIT 26
      `,
    },
    {
      expectation: {
        indexRequirements: [
          {
            description: 'social identifier exact lookup',
            oneOf: [
              'PersonSocialProfile_normalizedIdentifier_idx',
              'PersonSocialProfile_normalizedIdentifier_prefix_idx',
            ],
          },
        ],
        name: 'persons-social-identifier-exists',
      },
      parameters: [samples.social.networkKey, samples.social.value],
      sql: `
        SELECT p."id"
        FROM "Person" p
        WHERE EXISTS (
          SELECT 1
          FROM "PersonSocialProfile" social
          WHERE social."personId" = p."id"
            AND social."networkKey" = $1
            AND social."normalizedIdentifier" = $2
        )
        ORDER BY p."createdAt" DESC, p."id" DESC
        LIMIT 26
      `,
    },
    {
      expectation: {
        indexRequirements: [
          {
            description: 'social URL hash lookup',
            oneOf: [
              'PersonSocialProfile_normalizedProfileUrlHash_idx',
              'PersonSocialProfile_personId_networkKey_normalizedProfileUrlHash_key',
            ],
          },
        ],
        name: 'persons-social-url-hash-and-value-exists',
      },
      parameters: [samples.url.networkKey, samples.url.hash, samples.url.value],
      sql: `
        SELECT p."id"
        FROM "Person" p
        WHERE EXISTS (
          SELECT 1
          FROM "PersonSocialProfile" social_url
          WHERE social_url."personId" = p."id"
            AND social_url."networkKey" = $1
            AND social_url."normalizedProfileUrlHash" = $2
            AND social_url."normalizedProfileUrl" = $3
        )
        ORDER BY p."createdAt" DESC, p."id" DESC
        LIMIT 26
      `,
    },
    {
      expectation: {
        indexRequirements: [
          {
            description: 'contextual field history',
            oneOf: [
              'AuditFieldChange_entityType_entityId_sectionKey_fieldKey_recordId_createdAt_id_idx',
            ],
          },
          {
            description: 'field history AuditLog join',
            oneOf: ['AuditLog_pkey'],
          },
        ],
        name: 'persons-field-history',
      },
      parameters: historyParameters,
      sql: `
        SELECT
          field_change."id",
          field_change."createdAt",
          field_change."changeType",
          audit."actorDisplayNameSnapshot",
          audit."actorLoginNameSnapshot"
        FROM "AuditFieldChange" field_change
        INNER JOIN "AuditLog" audit ON audit."id" = field_change."auditLogId"
        WHERE field_change."entityType" = $1
          AND field_change."entityId" = $2
          AND field_change."sectionKey" = $3
          AND field_change."fieldKey" = $4
          AND ${historyRecordClause}
        ORDER BY field_change."createdAt" DESC, field_change."id" DESC
        LIMIT 3
      `,
    },
  ];
};

const assertExpectedIndexesExist = (
  queries: readonly PerformanceQuery[],
  indexes: ReadonlySet<string>,
): void => {
  const missing = queries.flatMap((query) =>
    query.expectation.indexRequirements.flatMap((requirement) =>
      requirement.oneOf.some((indexName) => indexes.has(indexName))
        ? []
        : [
            `${query.expectation.name}: ${requirement.description} (${requirement.oneOf.join(', ')})`,
          ],
    ),
  );
  if (missing.length > 0) {
    throw new Error(`Expected indexes are absent: ${missing.join('; ')}`);
  }
};

const runPerformanceChecks = async (
  transaction: Prisma.TransactionClient,
  target: ReturnType<typeof parsePerformanceDatabaseTarget>,
): Promise<{
  counts: PerformanceDatasetCounts;
  plans: Readonly<Record<string, PerformancePlanSummary>>;
}> => {
  await transaction.$executeRawUnsafe(
    'SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY',
  );
  await transaction.$executeRawUnsafe("SET LOCAL statement_timeout = '300s'");
  await transaction.$executeRawUnsafe("SET LOCAL lock_timeout = '5s'");
  const connection = requireSample(
    await transaction.$queryRaw<ConnectionRow[]>`
      SELECT
        current_database() AS "databaseName",
        current_schema() AS "schemaName",
        current_setting('transaction_read_only') AS "readOnly"
    `,
    'database connection',
  );
  if (
    connection.databaseName !== target.databaseName ||
    connection.schemaName !== target.schema ||
    connection.readOnly !== 'on'
  ) {
    throw new Error(
      `Connected target mismatch or transaction is writable (database=${connection.databaseName}, schema=${String(connection.schemaName)}, readOnly=${connection.readOnly})`,
    );
  }
  const countRow = requireSample(
    await transaction.$queryRaw<CountRow[]>`
      SELECT
        (SELECT COUNT(*) FROM "Person")::bigint AS "persons",
        (SELECT COUNT(*) FROM "AuditLog")::bigint AS "auditLogs",
        (SELECT COUNT(*) FROM "AuditFieldChange")::bigint AS "auditFieldChanges"
    `,
    'dataset counts',
  );
  const counts: PerformanceDatasetCounts = countRow;
  assertMinimumPerformanceDataset(counts);
  const samples = await getPerformanceSamples(transaction);
  const queries = buildPerformanceQueries(samples);
  const indexRows = await transaction.$queryRaw<IndexRow[]>`
    SELECT indexname AS "indexName"
    FROM pg_indexes
    WHERE schemaname = current_schema()
  `;
  assertExpectedIndexesExist(
    queries,
    new Set(indexRows.map((row) => row.indexName)),
  );
  const plans: Record<string, PerformancePlanSummary> = {};
  for (const query of queries) {
    const rawPlan = await transaction.$queryRawUnsafe<Array<JsonObject>>(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query.sql}`,
      ...query.parameters,
    );
    const summary = assertPerformancePlan(rawPlan, query.expectation);
    // Query names are a closed in-process registry, never user-provided keys.
    plans[query.expectation.name] = summary;
  }

  return { counts, plans };
};

type JsonObject = Record<string, unknown>;

const databaseUrl = process.env.PERSONS_PERFORMANCE_DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'PERSONS_PERFORMANCE_DATABASE_URL is required; DATABASE_URL is never used as a fallback',
  );
}
const target = parsePerformanceDatabaseTarget(databaseUrl);
assertPerformanceDatabaseIsolation(target, process.env.DATABASE_URL);
const confirmation = parsePerformanceConfirmation(process.argv.slice(2));
assertPerformanceTargetConfirmation(target, confirmation);

const prisma = new PrismaClient({
  datasources: { db: { url: databaseUrl } },
});

try {
  const result = await prisma.$transaction(
    (transaction) => runPerformanceChecks(transaction, target),
    { maxWait: 10_000, timeout: 3_600_000 },
  );
  process.stdout.write(
    `${JSON.stringify({
      counts: {
        auditFieldChanges: result.counts.auditFieldChanges.toString(),
        auditLogs: result.counts.auditLogs.toString(),
        persons: result.counts.persons.toString(),
      },
      plans: result.plans,
      status: 'ready',
      target: target.identity,
    })}\n`,
  );
} finally {
  await prisma.$disconnect();
}
