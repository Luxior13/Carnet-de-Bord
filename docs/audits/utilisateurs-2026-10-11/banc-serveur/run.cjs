const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const esbuild = require("esbuild");
const { Prisma, PrismaClient } = require("@prisma/client");

const url = new URL(
  process.env.USERS_LIST_TEST_DATABASE_URL || "postgresql://invalid/",
);
assert(["localhost", "127.0.0.1"].includes(url.hostname));
assert.equal(url.pathname, "/users_list_test");
const schema = "users_perf_" + randomUUID().replaceAll("-", "");
const admin = new PrismaClient({ datasourceUrl: url.toString() });
url.searchParams.set("schema", schema);
url.searchParams.set("connection_limit", "1");
const db = new PrismaClient({
  datasourceUrl: url.toString(),
  log: [{ emit: "event", level: "query" }],
});
let queryCount = 0;
db.$on("query", () => {
  queryCount++;
});
globalThis.__usersBenchDb = db;
let created = false;

async function compile(file) {
  const bundle = await esbuild.build({
    entryPoints: [
      path.resolve(
        __dirname,
        "../../../../apps/web/src/features/users/server/" + file,
      ),
    ],
    bundle: true,
    platform: "node",
    format: "cjs",
    packages: "external",
    write: false,
    plugins: [
      {
        name: "isolated-db",
        setup(build) {
          build.onResolve({ filter: /^\$server\/prisma$/ }, () => ({
            path: "db",
            namespace: "audit",
          }));
          build.onResolve({ filter: /^server-only$/ }, () => ({
            path: "marker",
            namespace: "audit",
          }));
          build.onLoad({ filter: /.*/, namespace: "audit" }, (args) => ({
            contents:
              args.path === "db"
                ? "export const prisma = globalThis.__usersBenchDb;"
                : "",
          }));
        },
      },
    ],
  });
  const loaded = { exports: {} };
  new Function("module", "exports", "require", bundle.outputFiles[0].text)(
    loaded,
    loaded.exports,
    require,
  );
  return loaded.exports;
}

// Fixed reconstruction of the pre-correction GET read, preserving its seven
// ORM reads and optional all-ID search. Auth and HTTP projection are excluded
// from both sides of this local database comparison.
async function before(input, visibility, searchQuery) {
  const where = { deletedAt: null };
  if (input.search) {
    const matches = await db.$queryRaw(searchQuery(input.search, visibility));
    where.id = { in: matches.map((row) => row.id) };
  }
  if (input.role === "SUPERADMIN") where.isProtected = true;
  else if (input.role)
    Object.assign(where, { role: input.role, isProtected: false });
  if (input.status === "active") where.isActive = true;
  else if (input.status === "inactive") where.isActive = false;
  else if (input.status === "pending") {
    where.mustChangePassword = true;
    where.AND = [visibility.isProtected ? {} : { isProtected: false }];
  }
  const sort =
    input.sort === "recent"
      ? [
          { lastLoginAt: { nulls: "last", sort: "desc" } },
          { createdAt: "desc" },
          { id: "asc" },
        ]
      : input.sort === "created"
        ? [{ createdAt: "desc" }, { id: "asc" }]
        : [
            { lastName: "asc" },
            { firstName: "asc" },
            { createdAt: "desc" },
            { id: "asc" },
          ];
  const select = Object.fromEntries(
    [
      "contactEmail",
      "contactEmailVerifiedAt",
      "createdAt",
      "failedLoginAttempts",
      "firstName",
      "id",
      "isActive",
      "isProtected",
      "lastLoginAt",
      "lastName",
      "lockedUntil",
      "loginName",
      "mfaEnabledAt",
      "mustChangePassword",
      "passwordChangedAt",
      "role",
    ].map((key) => [key, true]),
  );
  const count = (extra) =>
    db.user.count({ where: { deletedAt: null, ...extra } });
  const [
    total,
    users,
    statsTotal,
    activeCounts,
    roleCounts,
    pending,
    protectedCount,
  ] = await Promise.all([
    db.user.count({ where }),
    db.user.findMany({
      where,
      select,
      take: input.limit,
      skip: input.skip,
      orderBy: visibility.isProtected
        ? sort
        : [{ isProtected: "desc" }, ...sort],
    }),
    count({}),
    db.user.groupBy({
      _count: { _all: true },
      by: ["isActive"],
      where: { deletedAt: null },
    }),
    db.user.groupBy({
      _count: { _all: true },
      by: ["role"],
      where: { deletedAt: null },
    }),
    visibility.canViewSecurity
      ? count({
          mustChangePassword: true,
          ...(visibility.isProtected ? {} : { isProtected: false }),
        })
      : Promise.resolve(null),
    count({ isProtected: true }),
  ]);
  return {
    total,
    users,
    stats: {
      active: activeCounts.find((row) => row.isActive)?._count._all || 0,
      inactive: activeCounts.find((row) => !row.isActive)?._count._all || 0,
      total: statsTotal,
      pendingPasswordChange: pending,
      byRole: {
        ADMIN:
          (roleCounts.find((row) => row.role === "ADMIN")?._count._all || 0) -
          protectedCount,
        SUPERADMIN: protectedCount,
        USER: roleCounts.find((row) => row.role === "USER")?._count._all || 0,
      },
    },
  };
}

async function prepare() {
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  created = true;
  await admin.$executeRawUnsafe(
    "CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public",
  );
  await db.$executeRawUnsafe(`SET search_path TO "${schema}", public`);
  await db.$executeRawUnsafe("SET TIME ZONE 'Europe/Paris'");
  await db.$executeRawUnsafe("SET statement_timeout = '60s'");
  await db.$executeRawUnsafe(
    `CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'USER')`,
  );
  await db.$executeRawUnsafe(`CREATE TABLE "User" (
    "id" text PRIMARY KEY, "loginName" text UNIQUE, "firstName" text, "lastName" text,
    "contactEmail" text, "isProtected" boolean DEFAULT false, "deletedAt" timestamp,
    "contactEmailVerifiedAt" timestamp, "createdAt" timestamp, "failedLoginAttempts" integer DEFAULT 0,
    "isActive" boolean DEFAULT true, "lastLoginAt" timestamp, "lockedUntil" timestamp,
    "mfaEnabledAt" timestamp, "mustChangePassword" boolean DEFAULT false,
    "passwordChangedAt" timestamp, "role" "UserRole" DEFAULT 'USER'
  )`);
  // Current physical indexes relevant to the User reads, without claiming to
  // recreate the complete authentication/deletion schema.
  for (const field of [
    "createdAt",
    "isActive",
    "lastLoginAt",
    "lockedUntil",
    "mustChangePassword",
    "role",
  ])
    await db.$executeRawUnsafe(
      `CREATE INDEX "User_deletedAt_${field}_idx" ON "User" ("deletedAt", "${field}")`,
    );
  for (const field of ["deletedAt", "role", "contactEmail", "mfaEnabledAt"])
    await db.$executeRawUnsafe(
      `CREATE INDEX "User_${field}_idx" ON "User" ("${field}")`,
    );
  for (const field of ["loginName", "contactEmail", "firstName", "lastName"])
    await db.$executeRawUnsafe(
      `CREATE INDEX "User_${field}_trgm_idx" ON "User" USING gin ("${field}" gin_trgm_ops)`,
    );
  await db.$executeRawUnsafe(
    'CREATE UNIQUE INDEX "User_single_protected_root_key" ON "User" ("isProtected") WHERE "isProtected" = true',
  );
}

async function seed(size) {
  await db.$executeRawUnsafe('TRUNCATE TABLE "User"');
  await db.$executeRawUnsafe(
    `INSERT INTO "User" ("id", "loginName", "firstName", "lastName", "contactEmail", "isProtected", "isActive", "mustChangePassword", "role", "createdAt", "lastLoginAt", "deletedAt")
    SELECT 'user-' || lpad(n::text, 6, '0'), 'compte.' || n,
      CASE WHEN n % 5 = 0 THEN 'Élodie' ELSE 'Compte' END,
      CASE WHEN n % 5 = 0 THEN 'Martin' ELSE 'Fictif' END,
      CASE WHEN n % 3 = 0 THEN 'contact.' || n || '@example.test' END,
      n = 1, n = 1 OR n % 5 <> 0, n % 7 = 0,
      CASE WHEN n = 1 OR n % 10 = 0 THEN 'ADMIN'::"UserRole" ELSE 'USER'::"UserRole" END,
      timestamp '2026-01-01' + (n % 60) * interval '1 day',
      CASE WHEN n % 3 = 0 THEN timestamp '2026-10-01' + (n % 9) * interval '1 day' END,
      CASE WHEN n % 19 = 0 THEN timestamp '2026-09-01' END
    FROM generate_series(1, $1::integer) n`,
    size,
  );
  await db.$executeRawUnsafe('ANALYZE "User"');
}

const rounded = (x) => Math.round(x * 1000) / 1000;
async function measure(run) {
  for (let i = 0; i < 2; i++) await run();
  const samples = [],
    counts = [];
  for (let i = 0; i < 20; i++) {
    queryCount = 0;
    const started = performance.now();
    const result = await run();
    JSON.stringify(result);
    samples.push(performance.now() - started);
    counts.push(queryCount);
  }
  samples.sort((a, b) => a - b);
  return {
    medianMs: rounded((samples[9] + samples[10]) / 2),
    p95Ms: rounded(samples[18]),
    queryCounts: [...new Set(counts)],
  };
}

async function main() {
  const service = await compile("users-list.service.ts");
  const search = await compile("users-list-search.ts");
  await prepare();
  const proof = {
    date: new Date().toISOString(),
    node: process.version,
    prisma: Prisma.prismaVersion.client,
    postgres: (await db.$queryRawUnsafe("SELECT version() AS version"))[0]
      .version,
    platform: `${os.platform()} ${os.arch()}`,
    cpu: os.cpus()[0].model,
    connectionLimit: 1,
    warmup: 2,
    samples: 20,
    comparison:
      "Prior GET read reconstructed from audited code; new real listUsers service. Database and returned DTO serialization only, no auth, HTTP or browser.",
    results: [],
  };
  const visibility = {
    canViewContact: true,
    canViewSecurity: true,
    isProtected: false,
  };
  const scenarios = [
    ["name", {}],
    ["recent", { sort: "recent" }],
    ["created", { sort: "created" }],
    ["broad-search", { search: "Compte" }],
    ["multiword-name", { search: "Élodie Martin" }],
    ["contact", { search: "contact.30@" }],
    ["inactive", { status: "inactive" }],
    ["admin", { role: "ADMIN" }],
    ["pending", { status: "pending" }],
    ["empty", { search: "absent-value" }],
    ["second-page", { skip: 25 }],
  ];
  for (const size of [25, 1000, 10000]) {
    await seed(size);
    for (const [name, overrides] of scenarios) {
      const input = {
        limit: 25,
        role: null,
        search: "",
        skip: 0,
        sort: "name",
        status: null,
        ...overrides,
      };
      const oldRun = () =>
        before(input, visibility, search.buildUserSearchQuery);
      const newRun = () => service.listUsers(input, visibility);
      assert.deepEqual(
        await newRun(),
        await oldRun(),
        "Same read contract: " + name,
      );
      const oldResult = await measure(oldRun);
      const newResult = await measure(newRun);
      proof.results.push({
        size,
        scenario: name,
        before: oldResult,
        after: newResult,
      });
      console.log(size, name, oldResult.medianMs, "->", newResult.medianMs);
      if (
        size === 10000 &&
        ["name", "broad-search", "multiword-name", "admin"].includes(name)
      ) {
        const query = service.buildUsersPageQuery(input, visibility);
        const plan = await db.$queryRawUnsafe(
          "EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) " + query.text,
          ...query.values,
        );
        fs.writeFileSync(
          path.join(__dirname, `10000-${name}-plan.json`),
          JSON.stringify(plan, null, 2),
        );
      }
    }
  }
  fs.writeFileSync(
    path.join(__dirname, "observations.json"),
    JSON.stringify(proof, null, 2),
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
    if (created)
      await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    await admin.$disconnect();
  });
