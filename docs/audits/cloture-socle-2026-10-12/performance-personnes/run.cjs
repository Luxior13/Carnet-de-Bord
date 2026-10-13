// Real listPersons + Prisma against a disposable local PostgreSQL schema.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const esbuild = require("esbuild");
const { Prisma, PrismaClient } = require("@prisma/client");

const root = path.resolve(__dirname, "../../../..");
const target = process.env.PERSONS_LIST_TEST_DATABASE_URL;
const url = new URL(target || "postgresql://invalid/");
assert(
  ["127.0.0.1", "localhost"].includes(url.hostname),
  "Local test host required",
);
assert.equal(
  url.pathname,
  "/repertoire_pagination_test",
  "Dedicated test database required",
);
const schema = "repertoire_perf_" + randomUUID().replaceAll("-", "");
const work = fs.mkdtempSync(
  path.join(os.tmpdir(), "noctambule-directory-server-"),
);
const admin = new PrismaClient({ datasourceUrl: url.toString() });
url.searchParams.set("schema", schema);
// Serial connection makes queueing explicit and keeps timezone/search_path stable.
url.searchParams.set("connection_limit", "1");
const db = new PrismaClient({
  datasourceUrl: url.toString(),
  log: [{ emit: "event", level: "query" }],
});
let schemaCreated = false;
let durations = [];
let emittedQueries = [];
let listQuery;
db.$on("query", (event) =>
  emittedQueries.push({
    sql: event.query,
    parameters: JSON.parse(event.params),
  }),
);
globalThis.__directoryAuditPrisma = {
  $queryRaw: async (query) => {
    listQuery = query;
    const started = performance.now();
    const value = await db.$queryRaw(query);
    durations.push({ kind: "list", ms: performance.now() - started });
    return value;
  },
  person: {
    count: async (args) => {
      const started = performance.now();
      const value = await db.person.count(args);
      durations.push({ kind: "overview", ms: performance.now() - started });
      return value;
    },
  },
};
const summary = {
  date: new Date().toISOString(),
  platform: `${os.platform()} ${os.release()} ${os.arch()}`,
  cpu: os.cpus()[0]?.model,
  node: process.version,
  prisma: Prisma.prismaVersion.client,
  connectionLimit: 1,
  timezone: "Europe/Paris",
  samplesAfterWarmup: 20,
  warmupCalls: 2,
  limits: [
    "Synthetic 25/1k/10k people; 10 audits/person.",
    "Real service and SQL, no HTTP/auth/browser latency.",
    "Warm cache; initial call is not a cold-disk measurement.",
    "Single client, no concurrent writers; no 100k production-budget certification.",
  ],
  results: [],
};
const round = (value) => Math.round(value * 1000) / 1000;
const percentile = (values, p) =>
  [...values].sort((a, b) => a - b)[Math.ceil(values.length * p) - 1];
function summarizePlan(raw) {
  const plan = raw[0]["QUERY PLAN"][0];
  const indexes = new Set();
  const seqScans = [];
  function walk(node) {
    if (node["Index Name"]) indexes.add(node["Index Name"]);
    if (node["Node Type"].includes("Seq Scan"))
      seqScans.push({
        relation: node["Relation Name"],
        rows: node["Actual Rows"],
        loops: node["Actual Loops"],
        removed: node["Rows Removed by Filter"] ?? 0,
      });
    for (const child of node.Plans ?? []) walk(child);
  }
  walk(plan.Plan);
  return {
    executionMs: plan["Execution Time"],
    planningMs: plan["Planning Time"],
    indexes: [...indexes],
    seqScans,
    sharedHitBlocks: plan.Plan["Shared Hit Blocks"],
    sharedReadBlocks: plan.Plan["Shared Read Blocks"],
    tempWrittenBlocks: plan.Plan["Temp Written Blocks"],
  };
}

async function prepareSchema() {
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  schemaCreated = true;
  await admin.$executeRawUnsafe(
    "CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public",
  );
  await db.$executeRawUnsafe(`SET search_path TO "${schema}", public`);
  await db.$executeRawUnsafe("SET TIME ZONE 'Europe/Paris'");
  await db.$executeRawUnsafe("SET statement_timeout = '60s'");
  summary.postgres = (
    await db.$queryRawUnsafe("SELECT version() AS version")
  )[0].version;
  await db.$executeRawUnsafe(
    `CREATE TYPE "PersonStructureStatus" AS ENUM ('IN_STRUCTURE', 'OUTSIDE_STRUCTURE')`,
  );
  await db.$executeRawUnsafe(`CREATE TABLE "Person" (
    "id" text PRIMARY KEY, "nickname" varchar(80), "firstName" varchar(100), "lastName" varchar(100),
    "normalizedNickname" varchar(160), "normalizedFirstName" varchar(200), "normalizedLastName" varchar(200),
    "sortName" varchar(401) NOT NULL, "structureStatus" "PersonStructureStatus" NOT NULL,
    "version" integer NOT NULL DEFAULT 1, "createdAt" timestamp(3) NOT NULL, "updatedAt" timestamp(3) NOT NULL)`);
  await db.$executeRawUnsafe(
    `CREATE TABLE "PersonEmail" ("id" text PRIMARY KEY, "personId" text, "normalizedEmail" varchar(320), "isPrimary" boolean DEFAULT false)`,
  );
  await db.$executeRawUnsafe(
    `CREATE TABLE "PersonPhone" ("id" text PRIMARY KEY, "personId" text, "normalizedPhone" varchar(32), "isPrimary" boolean DEFAULT false)`,
  );
  await db.$executeRawUnsafe(
    `CREATE TABLE "PersonSocialProfile" ("id" text PRIMARY KEY, "personId" text, "networkKey" varchar(80), "normalizedIdentifier" varchar(320), "normalizedProfileUrlHash" varchar(64), "normalizedProfileUrl" text, "isPrimary" boolean DEFAULT false)`,
  );
  await db.$executeRawUnsafe(
    `CREATE TABLE "AuditLog" ("id" text PRIMARY KEY, "entityType" text, "entityId" text, "createdAt" timestamp(3), "actorDisplayNameSnapshot" text, "actorLoginNameSnapshot" text)`,
  );
  const foundation = fs.readFileSync(
    path.join(
      root,
      "packages/database/prisma/migrations/20260721120000_person_identity_foundation/migration.sql",
    ),
    "utf8",
  );
  const sorting = fs.readFileSync(
    path.join(
      root,
      "packages/database/prisma/migrations/20260722190000_person_directory_sorting/migration.sql",
    ),
    "utf8",
  );
  for (const sql of (foundation + "\n" + sorting).match(
    /CREATE (?:UNIQUE )?INDEX [\s\S]*?;/g,
  )) {
    if (
      !/ON "public"\."(?:Person|PersonEmail|PersonPhone|PersonSocialProfile|AuditLog)"/.test(
        sql,
      )
    )
      continue;
    await db.$executeRawUnsafe(sql.replaceAll('"public".', ""));
  }
  // Match the current index names after the following migration.
  await db.$executeRawUnsafe(
    'ALTER INDEX "PersonSocialProfile_personId_networkKey_normalizedIdentifier_key" RENAME TO "PersonSocialProfile_person_network_identifier_key"',
  );
  await db.$executeRawUnsafe(
    'ALTER INDEX "PersonSocialProfile_personId_networkKey_normalizedProfileUrlHash_key" RENAME TO "PersonSocialProfile_person_network_url_hash_key"',
  );
}

async function seed(size) {
  for (const table of [
    "PersonEmail",
    "PersonPhone",
    "PersonSocialProfile",
    "AuditLog",
    "Person",
  ])
    await db.$executeRawUnsafe(`TRUNCATE "${table}"`);
  await db.$executeRaw`INSERT INTO "Person" ("id", "nickname", "firstName", "lastName", "normalizedNickname", "normalizedFirstName", "normalizedLastName", "sortName", "structureStatus", "createdAt", "updatedAt")
    SELECT 'person-' || lpad(n::text, 5, '0'), 'Pseudo ' || lpad(n::text, 5, '0'),
      CASE WHEN n % 20 = 0 THEN 'Élodie' ELSE 'Camille' END,
      CASE WHEN n % 20 = 0 THEN 'Martin' ELSE 'Famille ' || (n % 100)::text END,
      'pseudo ' || lpad(n::text, 5, '0'), CASE WHEN n % 20 = 0 THEN 'elodie' ELSE 'camille' END,
      CASE WHEN n % 20 = 0 THEN 'martin' ELSE 'famille ' || (n % 100)::text END,
      'pseudo ' || lpad(n::text, 5, '0'),
      CASE WHEN n % 3 = 0 THEN 'OUTSIDE_STRUCTURE' ELSE 'IN_STRUCTURE' END::"PersonStructureStatus",
      timestamp '2026-01-01' + n * interval '1 second', timestamp '2026-01-01' + (n % 100) * interval '1 second'
    FROM generate_series(1, ${size}::integer) n`;
  await db.$executeRaw`INSERT INTO "PersonEmail" ("id", "personId", "normalizedEmail")
    SELECT 'email-' || n || '-' || e, 'person-' || lpad(n::text, 5, '0'), 'member-' || lpad(n::text, 5, '0') || '@' || e || '.example.test'
    FROM generate_series(1, ${size}::integer) n CROSS JOIN generate_series(1, 2) e WHERE n % 5 < 3`;
  await db.$executeRaw`INSERT INTO "PersonPhone" ("id", "personId", "normalizedPhone")
    SELECT 'phone-' || n, 'person-' || lpad(n::text, 5, '0'), '+336' || lpad(n::text, 8, '0')
    FROM generate_series(1, ${size}::integer) n WHERE n % 5 < 2`;
  await db.$executeRaw`INSERT INTO "PersonSocialProfile" ("id", "personId", "networkKey", "normalizedIdentifier", "normalizedProfileUrl", "normalizedProfileUrlHash")
    SELECT 'social-' || n, 'person-' || lpad(n::text, 5, '0'), 'discord', 'player-' || lpad(n::text, 5, '0'),
      'https://social.example.test/profile/' || lpad(n::text, 5, '0'),
      encode(sha256(('https://social.example.test/profile/' || lpad(n::text, 5, '0'))::bytea), 'hex')
    FROM generate_series(1, ${size}::integer) n WHERE n % 10 IN (0, 2, 7)`;
  await db.$executeRaw`INSERT INTO "AuditLog" ("id", "entityType", "entityId", "createdAt", "actorDisplayNameSnapshot", "actorLoginNameSnapshot")
    SELECT 'audit-' || n || '-' || a, 'PERSON', 'person-' || lpad(n::text, 5, '0'),
      timestamp '2026-01-01' + a * interval '1 second', 'Opérateur fictif', 'operator.test'
    FROM generate_series(1, ${size}::integer) n CROSS JOIN generate_series(1, 10) a`;
  for (const table of [
    "Person",
    "PersonEmail",
    "PersonPhone",
    "PersonSocialProfile",
    "AuditLog",
  ])
    await db.$executeRawUnsafe(`ANALYZE "${table}"`);
}

async function main() {
  const aliases = {
    "server-only": "",
    "$server/prisma":
      "export const prisma = globalThis.__directoryAuditPrisma;",
    $env: "export const env = { MFA_ENCRYPTION_KEY_V1: 'AQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQE=' };",
  };
  const bundle = await esbuild.build({
    stdin: {
      contents: `export { listPersons } from './apps/web/src/features/persons/server/person-list.service';`,
      resolveDir: root,
      loader: "ts",
    },
    bundle: true,
    write: false,
    platform: "node",
    format: "cjs",
    tsconfig: path.join(root, "apps/web/tsconfig.json"),
    packages: "external",
    plugins: [
      {
        name: "test-database",
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) =>
            Object.hasOwn(aliases, args.path)
              ? { path: args.path, namespace: "audit" }
              : null,
          );
          build.onLoad({ filter: /.*/, namespace: "audit" }, (args) => ({
            contents: aliases[args.path],
            loader: "ts",
            resolveDir: root,
          }));
        },
      },
    ],
  });
  // Resolve external packages relative to this repository, not the temp folder.
  const loaded = { exports: {} };
  new Function("require", "exports", "module", bundle.outputFiles[0].text)(
    require,
    loaded.exports,
    loaded,
  );
  const { listPersons } = loaded.exports;
  assert.equal(typeof listPersons, "function");
  await prepareSchema();
  for (const size of [25, 1000, 10000]) {
    await seed(size);
    const scenarios = [
      ["name", { sort: "name" }],
      ["created", { sort: "created" }],
      ["updated", { sort: "updated" }],
      ["outside", { structureStatus: "OUTSIDE_STRUCTURE" }],
      ["missing-contacts", { contacts: "missing" }],
      ["broad-identity", { q: "pseudo" }],
      ["multiword-identity", { q: "Élo Mar" }],
      ["email", { q: "member-00020@" }],
      ["phone-prefix", { q: "+33600000" }],
      ["social-identifier", { q: "player-00020" }],
      ["social-url", { q: "https://social.example.test/profile/00020" }],
      ["empty", { q: "absentxyz" }],
    ];
    const first = await listPersons({ limit: 25, q: "" });
    if (first.pagination.nextCursor)
      scenarios.push(["second-page", { cursor: first.pagination.nextCursor }]);
    for (const [name, params] of scenarios) {
      const input = { limit: 25, q: "", ...params };
      emittedQueries = [];
      durations = [];
      const start = performance.now();
      const result = await listPersons(input);
      const initialMs = performance.now() - start;
      const statements = [...emittedQueries];
      const actualListQuery = listQuery;
      const calls = [...durations];
      assert.equal(calls.length, 4, "One list statement + three global counts");
      assert.equal(result.overview.total, size);
      assert(result.items.length <= 25);
      assert.equal(
        result.items[0]?.lastModifiedBy?.displayName ?? "Opérateur fictif",
        "Opérateur fictif",
      );
      for (let n = 0; n < 2; n++) await listPersons(input);
      const timings = [];
      for (let n = 0; n < 20; n++) {
        const tick = performance.now();
        await listPersons(input);
        timings.push(performance.now() - tick);
      }
      const explain = await db.$queryRaw(
        Prisma.sql`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${actualListQuery}`,
      );
      const countPlans = [];
      for (const statement of statements.filter(
        (value) =>
          value.sql.includes("COUNT(*)") &&
          !value.sql.includes("WITH filtered"),
      )) {
        countPlans.push(
          summarizePlan(
            await db.$queryRawUnsafe(
              "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + statement.sql,
              ...statement.parameters,
            ),
          ),
        );
      }
      const measurement = {
        size,
        audits: size * 10,
        name,
        returned: result.items.length,
        total: result.pagination.total,
        sqlCalls: calls.length,
        initialMs: round(initialMs),
        medianMs: round(percentile(timings, 0.5)),
        p95Ms: round(percentile(timings, 0.95)),
        initialCalls: calls.map((value) => ({ ...value, ms: round(value.ms) })),
        listPlan: summarizePlan(explain),
        overviewPlans: countPlans,
      };
      summary.results.push(measurement);
      fs.writeFileSync(
        path.join(work, `${size}-${name}-plan.json`),
        JSON.stringify(explain, null, 2),
      );
      fs.writeFileSync(
        path.join(work, "observations.json"),
        JSON.stringify(summary, null, 2),
      );
      console.log(
        `${size} ${name}: median=${measurement.medianMs}ms p95=${measurement.p95Ms}ms`,
      );
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    if (schemaCreated)
      await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.$disconnect();
    delete globalThis.__directoryAuditPrisma;
    console.log("Preuves : " + work);
  });
