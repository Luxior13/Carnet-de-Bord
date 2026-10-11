const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");
const { PrismaClient } = require("@prisma/client");

const url = new URL(
  process.env.PERSONS_SCHEMA_TEST_DATABASE_URL || "postgresql://invalid/",
);
assert(
  ["127.0.0.1", "localhost"].includes(url.hostname),
  "Local test database required",
);
assert.equal(
  url.pathname,
  "/repertoire_schema_test",
  "Fully migrated disposable test database required",
);
const db = new PrismaClient({ datasourceUrl: url.toString() });
const rollback = new Error("ROLLBACK_TEST_FIXTURES");
const results = [];
const models = ["personEmail", "personPhone", "personSocialProfile"];
const tables = {
  personEmail: "PersonEmail",
  personPhone: "PersonPhone",
  personSocialProfile: "PersonSocialProfile",
};
const person = (tx, extra = {}) =>
  tx.person.create({
    data: {
      id: "schema-" + randomUUID(),
      nickname: "Fictif",
      normalizedNickname: "fictif",
      sortName: "fictif",
      ...extra,
    },
  });
const coordinate = (kind, personId, suffix = "one", extra = {}) => ({
  personId,
  label: "Fictif",
  ...(kind === "personEmail"
    ? {
        email: suffix + "@example.test",
        normalizedEmail: suffix + "@example.test",
      }
    : kind === "personPhone"
      ? {
          phone: "+3361234567" + (suffix === "one" ? "1" : "2"),
          normalizedPhone: "+3361234567" + (suffix === "one" ? "1" : "2"),
        }
      : {
          networkKey: "discord",
          identifier: suffix,
          normalizedIdentifier: suffix,
        }),
  ...extra,
});
async function rejects(action, expected) {
  await assert.rejects(
    action,
    (error) => error.code === expected || error.message.includes(expected),
  );
}
async function check(name, run, status = "passed") {
  try {
    await db.$transaction(async (tx) => {
      await run(tx);
      throw rollback;
    });
  } catch (error) {
    if (error !== rollback)
      throw new Error(name + ": " + error.message, { cause: error });
  }
  results.push({ name, status });
  console.log(status + ": " + name);
}
async function main() {
  const migration =
    await db.$queryRaw`SELECT COUNT(*)::integer AS count FROM "_prisma_migrations" WHERE "finished_at" IS NOT NULL AND "rolled_back_at" IS NULL`;
  const server = await db.$queryRaw`SELECT version() AS version`;
  const bundle = await esbuild.build({
    entryPoints: [
      path.resolve(
        __dirname,
        "../../../../apps/web/src/features/persons/server/person-schema-readiness.ts",
      ),
    ],
    bundle: true,
    platform: "node",
    format: "cjs",
    write: false,
    plugins: [
      {
        name: "omit-server-only-marker",
        setup(build) {
          build.onResolve({ filter: /^server-only$/ }, () => ({
            path: "server-only",
            namespace: "marker",
          }));
          build.onLoad({ filter: /.*/, namespace: "marker" }, () => ({
            contents: "",
          }));
        },
      },
    ],
  });
  const loaded = { exports: {} };
  new Function("module", "exports", bundle.outputFiles[0].text)(
    loaded,
    loaded.exports,
  );
  const ready = await loaded.exports.isPersonSchemaCatalogReady(db);
  assert.equal(ready, true, "Real migrated PostgreSQL catalog must be ready");
  await check(
    "minimal nickname and native civil date are accepted",
    async (tx) => {
      const row = await person(tx, {
        birthDate: new Date("2000-02-29T00:00:00Z"),
      });
      assert.equal(row.birthDate.toISOString(), "2000-02-29T00:00:00.000Z");
    },
  );
  await check("minimum identity is enforced by SQL", (tx) =>
    rejects(
      () => person(tx, { nickname: null, normalizedNickname: null }),
      "Person_minimum_identity_check",
    ),
  );
  await check("identity normalized pair is enforced by SQL", (tx) =>
    rejects(
      () => person(tx, { normalizedNickname: null }),
      "Person_nickname_pair_check",
    ),
  );
  await check("person version cannot be zero", (tx) =>
    rejects(() => person(tx, { version: 0 }), "Person_version_check"),
  );
  for (const kind of models) {
    const table = tables[kind];
    await check(table + ": foreign key rejects orphan", (tx) =>
      rejects(
        () =>
          tx[kind].create({
            data: coordinate(kind, "missing-" + randomUUID()),
          }),
        "P2003",
      ),
    );
    await check(table + ": version cannot be zero", async (tx) => {
      const p = await person(tx);
      await rejects(
        () =>
          tx[kind].create({
            data: coordinate(kind, p.id, "one", { version: 0 }),
          }),
        table + "_version_check",
      );
    });
    await check(table + ": duplicate within person rejected", async (tx) => {
      const p = await person(tx);
      await tx[kind].create({ data: coordinate(kind, p.id) });
      await rejects(
        () => tx[kind].create({ data: coordinate(kind, p.id) }),
        "P2002",
      );
    });
    await check(
      table + ": same coordinate across two people accepted",
      async (tx) => {
        const a = await person(tx);
        const b = await person(tx);
        await tx[kind].create({ data: coordinate(kind, a.id) });
        await tx[kind].create({ data: coordinate(kind, b.id) });
        assert.equal(
          await tx[kind].count({ where: { personId: { in: [a.id, b.id] } } }),
          2,
        );
      },
    );
    await check(
      table + ": two primaries rejected in the same scope",
      async (tx) => {
        const p = await person(tx);
        await tx[kind].create({
          data: coordinate(kind, p.id, "one", { isPrimary: true }),
        });
        await rejects(
          () =>
            tx[kind].create({
              data: coordinate(kind, p.id, "two", { isPrimary: true }),
            }),
          "P2002",
        );
      },
    );
    await check(table + ": reassignment blocked", async (tx) => {
      const a = await person(tx);
      const b = await person(tx);
      const child = await tx[kind].create({ data: coordinate(kind, a.id) });
      const move = () =>
        tx[kind].update({
          data: { personId: b.id },
          where: { id: child.id },
        });
      await rejects(move, "A person coordinate cannot be reassigned");
    });
  }
  await check("phone must be normalized in international form", async (tx) => {
    const p = await person(tx);
    await rejects(
      () =>
        tx.personPhone.create({
          data: coordinate("personPhone", p.id, "one", {
            normalizedPhone: "0612345678",
          }),
        }),
      "PersonPhone_values_check",
    );
  });
  await check("social profile requires identifier or URL", async (tx) => {
    const p = await person(tx);
    await rejects(
      () =>
        tx.personSocialProfile.create({
          data: { personId: p.id, networkKey: "discord", label: "Fictif" },
        }),
      "PersonSocialProfile_identifier_or_url_check",
    );
  });
  await check(
    "social profile requires complete URL normalization set",
    async (tx) => {
      const p = await person(tx);
      await rejects(
        () =>
          tx.personSocialProfile.create({
            data: coordinate("personSocialProfile", p.id, "one", {
              profileUrl: "https://example.test/profile",
            }),
          }),
        "PersonSocialProfile_url_set_check",
      );
    },
  );
  await check("social primaries are scoped by network", async (tx) => {
    const p = await person(tx);
    await tx.personSocialProfile.create({
      data: coordinate("personSocialProfile", p.id, "one", { isPrimary: true }),
    });
    await tx.personSocialProfile.create({
      data: coordinate("personSocialProfile", p.id, "two", {
        isPrimary: true,
        networkKey: "twitch",
      }),
    });
    assert.equal(
      await tx.personSocialProfile.count({
        where: { personId: p.id, isPrimary: true },
      }),
      2,
    );
  });
  await check(
    "deleting a person cascades only its three coordinate collections",
    async (tx) => {
      const a = await person(tx);
      const b = await person(tx);
      for (const kind of models) {
        await tx[kind].create({ data: coordinate(kind, a.id) });
        await tx[kind].create({ data: coordinate(kind, b.id) });
      }
      await tx.person.delete({ where: { id: a.id } });
      for (const kind of models) {
        assert.equal(await tx[kind].count({ where: { personId: a.id } }), 0);
        assert.equal(await tx[kind].count({ where: { personId: b.id } }), 1);
      }
    },
  );
  await check(
    "no database foreign key connects people and authentication users",
    async (tx) => {
      const links =
        await tx.$queryRaw`SELECT conname FROM pg_constraint WHERE contype = 'f' AND
      ((conrelid = '"Person"'::regclass AND confrelid = '"User"'::regclass)
       OR (conrelid = '"User"'::regclass AND confrelid = '"Person"'::regclass))`;
      assert.deepEqual(links, []);
    },
  );
  await check(
    "database prevents two claims of the same person version",
    async (tx) => {
      const p = await person(tx);
      assert.equal(
        (
          await tx.person.updateMany({
            where: { id: p.id, version: 1 },
            data: { version: { increment: 1 } },
          })
        ).count,
        1,
      );
      assert.equal(
        (
          await tx.person.updateMany({
            where: { id: p.id, version: 1 },
            data: { version: { increment: 1 } },
          })
        ).count,
        0,
      );
    },
  );
  const proof = {
    date: new Date().toISOString(),
    postgres: server[0].version,
    appliedMigrations: migration[0].count,
    schemaReadiness: {
      ready,
      expectedCounts: loaded.exports.PERSON_SCHEMA_EXPECTED_COUNTS,
      implementation:
        "Real application catalog reader and validator; only server-only marker omitted.",
    },
    fixtures: "Every scenario uses a transaction rolled back after assertions.",
    results,
  };
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
  .finally(() => db.$disconnect());
