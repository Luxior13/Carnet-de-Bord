// Reproduction of the pre-audit GET pipeline: all search IDs, then paginated ORM query.
const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");
const { PrismaClient } = require("@prisma/client");

const target = new URL(
  process.env.USERS_LIST_TEST_DATABASE_URL || "postgresql://invalid/",
);
assert(["localhost", "127.0.0.1"].includes(target.hostname));
assert.equal(target.pathname, "/users_list_test");
const schema = "users_bound_" + randomUUID().replaceAll("-", "");
const admin = new PrismaClient({ datasourceUrl: target.toString() });
target.searchParams.set("schema", schema);
const db = new PrismaClient({ datasourceUrl: target.toString() });
let created = false;
async function main() {
  await admin.$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
  created = true;
  await db.$executeRawUnsafe(`CREATE TABLE "User" (
    "id" text PRIMARY KEY, "loginName" text, "firstName" text, "lastName" text,
    "contactEmail" text, "isProtected" boolean DEFAULT false,
    "deletedAt" timestamp, "createdAt" timestamp DEFAULT now()
  )`);
  await db.$executeRawUnsafe(`INSERT INTO "User" ("id", "loginName", "firstName", "lastName")
    SELECT 'fictif-' || n, 'fictif.' || n, 'Compte', 'Fictif'
    FROM generate_series(1, 33000) AS n`);
  const bundle = await esbuild.build({
    entryPoints: [
      path.resolve(
        __dirname,
        "../../../../apps/web/src/features/users/server/users-list-search.ts",
      ),
    ],
    bundle: true,
    platform: "node",
    format: "cjs",
    packages: "external",
    write: false,
  });
  const loaded = { exports: {} };
  new Function("module", "exports", "require", bundle.outputFiles[0].text)(
    loaded,
    loaded.exports,
    require,
  );
  const rows = await db.$queryRaw(
    loaded.exports.buildUserSearchQuery("Fictif", {
      canViewContact: false,
      isProtected: false,
    }),
  );
  const proof = {
    date: new Date().toISOString(),
    users: 33000,
    searchRowsTransferredToApplication: rows.length,
  };
  try {
    const page = await db.user.findMany({
      select: { id: true },
      where: { deletedAt: null, id: { in: rows.map((row) => row.id) } },
      orderBy: [
        { isProtected: "desc" },
        { lastName: "asc" },
        { firstName: "asc" },
        { createdAt: "desc" },
        { id: "asc" },
      ],
      skip: 0,
      take: 25,
    });
    proof.result = { success: true, returned: page.length };
  } catch (error) {
    proof.result = {
      success: false,
      code: error.code,
      reason: error.meta?.message || error.message.split("\n").at(-1),
    };
  }
  fs.writeFileSync(
    path.join(__dirname, "before-search-bound.json"),
    JSON.stringify(proof, null, 2),
  );
  console.log(JSON.stringify(proof));
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
