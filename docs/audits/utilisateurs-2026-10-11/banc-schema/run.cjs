const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");

const config = JSON.parse(
  fs.readFileSync(process.env.AUDIT_ENV_FILE, "utf8").replace(/^\uFEFF/, ""),
);
const target = new URL(config.E2E_DATABASE_URL);
assert.equal(target.hostname, "127.0.0.1");
assert.equal(target.pathname, "/users_audit_test");
assert.notEqual(target.port || "5432", "5432");
const db = new PrismaClient({ datasourceUrl: target.toString() });
const observations = [];
const root = "e2e-only-superadmin";
const ordinary = `INSERT INTO "User" ("id","loginName","firstName","passwordHash","updatedAt") VALUES ('schema-audit','schema-audit','Audit','fictional',now())`;
const tombstone = `INSERT INTO "User" ("id","loginName","firstName","lastName","passwordHash","isActive","deletedAt","updatedAt") VALUES ('schema-deleted','deleted:' || md5('schema-deleted'),'Compte','supprimé','!deleted:' || md5('schema-deleted'),false,now(),now())`;

async function rejected(name, setup, query, code) {
  let reached = false;
  await assert.rejects(
    db.$transaction(async (tx) => {
      for (const statement of setup) await tx.$executeRawUnsafe(statement);
      reached = true;
      await tx.$executeRawUnsafe(query);
    }),
    (error) => reached && error.meta?.code === code,
    name,
  );
  observations.push({ name, result: "passed", postgresCode: code });
}
async function accepted(name, statements) {
  const rollback = new Error("intentional fixture rollback");
  await assert.rejects(
    db.$transaction(async (tx) => {
      for (const statement of statements) await tx.$executeRawUnsafe(statement);
      throw rollback;
    }),
    (error) => error === rollback,
    name,
  );
  observations.push({ name, result: "passed" });
}

async function run() {
  try {
    assert.equal(
      await db.user.count({ where: { id: root, isProtected: true } }),
      1,
    );
    await rejected(
      "A second root is impossible",
      [ordinary],
      `UPDATE "User" SET "role"='ADMIN', "isProtected"=true WHERE "id"='schema-audit'`,
      "23505",
    );
    for (const [label, assignment] of [
      ["demote", `"role"='USER'`],
      ["deactivate", `"isActive"=false`],
      ["unprotect", `"isProtected"=false`],
      ["mark deleted", `"deletedAt"=now()`],
    ])
      await rejected(
        `Cannot ${label} root`,
        [],
        `UPDATE "User" SET ${assignment} WHERE "id"='${root}'`,
        "P0001",
      );
    await rejected(
      "Cannot delete root",
      [],
      `DELETE FROM "User" WHERE "id"='${root}'`,
      "P0001",
    );
    await accepted("Root profile remains editable", [
      `UPDATE "User" SET "firstName"='Fictional profile' WHERE "id"='${root}'`,
    ]);
    await accepted("Last name and contact email are optional", [
      ordinary,
      `UPDATE "User" SET "lastName"=NULL, "contactEmail"=NULL WHERE "id"='schema-audit'`,
    ]);
    await rejected(
      "Login names are canonical",
      [ordinary],
      `UPDATE "User" SET "loginName"='INVALID SPACE' WHERE "id"='schema-audit'`,
      "23514",
    );
    await rejected(
      "Login names are unique",
      [ordinary],
      `UPDATE "User" SET "loginName"=(SELECT "loginName" FROM "User" WHERE "id"='${root}') WHERE "id"='schema-audit'`,
      "23505",
    );
    await rejected(
      "Contact emails are normalized",
      [ordinary],
      `UPDATE "User" SET "contactEmail"=' Mixed@Example.test ' WHERE "id"='schema-audit'`,
      "23514",
    );
    await rejected(
      "Verification needs a contact email",
      [ordinary],
      `UPDATE "User" SET "contactEmailVerifiedAt"=now() WHERE "id"='schema-audit'`,
      "23514",
    );
    const reservation = `INSERT INTO "LoginNameReservation" ("loginName","userId") VALUES ('schema-audit','schema-audit')`;
    await rejected(
      "Login reservation has exactly one owner",
      [ordinary, reservation],
      `INSERT INTO "LoginNameReservation" ("loginName","userId") VALUES ('schema-audit','${root}')`,
      "23505",
    );
    await rejected(
      "Reserved identity blocks physical deletion",
      [ordinary, reservation],
      `DELETE FROM "User" WHERE "id"='schema-audit'`,
      "23503",
    );
    await rejected(
      "Incomplete anonymization cannot become a tombstone",
      [ordinary],
      `UPDATE "User" SET "deletedAt"=now() WHERE "id"='schema-audit'`,
      "23514",
    );
    await accepted("Anonymous technical tombstone is valid", [tombstone]);
    await rejected(
      "Tombstone cannot be reactivated",
      [tombstone],
      `UPDATE "User" SET "deletedAt"=NULL WHERE "id"='schema-deleted'`,
      "P0001",
    );
    await rejected(
      "Tombstone cannot be deleted",
      [tombstone],
      `DELETE FROM "User" WHERE "id"='schema-deleted'`,
      "P0001",
    );
    const indexes =
      await db.$queryRaw`SELECT indexname, indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='User' ORDER BY indexname`;
    for (const field of [
      "loginName",
      "contactEmail",
      "firstName",
      "lastName",
    ]) {
      assert(
        indexes.some(
          (index) =>
            index.indexname === `User_${field}_trgm_idx` &&
            index.indexdef.includes("gin_trgm_ops"),
        ),
      );
    }
    observations.push({
      name: "Four declared trigram search indexes exist",
      result: "passed",
    });
    fs.writeFileSync(
      path.join(__dirname, "observations.json"),
      JSON.stringify(
        {
          date: "2026-10-11",
          migrationCount:
            await db.$queryRaw`SELECT count(*)::int AS count FROM "_prisma_migrations" WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`,
          observations,
          indexes,
        },
        null,
        2,
      ),
    );
    console.log(
      `${observations.length} User schema checks passed; all fixture transactions rolled back.`,
    );
  } finally {
    await db.$disconnect();
  }
}
run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
