const fs = require("node:fs");
const path = require("node:path");
const { PrismaClient } = require("@prisma/client");
const config = JSON.parse(
  fs.readFileSync(process.env.AUDIT_ENV_FILE, "utf8").replace(/^\uFEFF/, ""),
);
const target = new URL(config.ACCOUNT_TEST_DATABASE_URL);
if (
  target.hostname !== "127.0.0.1" ||
  target.port !== "54660" ||
  target.pathname !== "/account_service_test"
)
  throw new Error("Isolated service database required");
const db = new PrismaClient({ datasourceUrl: target.toString() });
(async () => {
  // This exclusively owned fresh database first received the four failing
  // pre-fix fixtures; retain aggregate state without identity or token data.
  const users = await db.user.findMany({
    take: 4,
    orderBy: { createdAt: "asc" },
    select: {
      securityVersion: true,
      createdAt: true,
      _count: { select: { sessions: true, auditLogs: true } },
    },
  });
  const result = {
    readAt: new Date().toISOString(),
    scope:
      "First four fixtures, created by the pre-fix regression run on the exclusively owned service database",
    cases: users.map((u, i) => ({
      case: i + 1,
      createdAt: u.createdAt,
      securityVersion: u.securityVersion,
      sessionsRemaining: u._count.sessions,
      audits: u._count.auditLogs,
    })),
  };
  fs.writeFileSync(
    path.join(__dirname, "baseline-state.json"),
    JSON.stringify(result, null, 2),
  );
  console.log(JSON.stringify(result));
})().finally(() => db.$disconnect());
