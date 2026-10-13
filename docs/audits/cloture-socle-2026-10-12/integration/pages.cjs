const {
  authenticate,
  api,
  assert,
  chromium,
  config,
  expect,
  fs,
  headers,
  json,
  path,
  prisma,
} = require("./auth.cjs");
const { hash } = require("bcryptjs");
const out = path.join(__dirname, "preuves");
fs.mkdirSync(out, { recursive: true });
const results = {
  date: new Date().toISOString(),
  server: "Next production + PostgreSQL isolated",
  expectedScenarios: 14,
  completed: false,
  scenarios: [],
};
async function record(name, action) {
  const row = { name };
  try {
    await action(row);
    row.passed = true;
  } catch (error) {
    row.passed = false;
    row.error = error.message.slice(0, 800);
  }
  results.scenarios.push(row);
  fs.writeFileSync(
    path.join(out, "pages.json"),
    JSON.stringify(results, null, 2),
  );
  console.log(`${row.passed ? "PASS" : "FAIL"} ${name}`);
  assert(row.passed, "Stop after first failed closure scenario");
}
async function structure(page, expectedTitle) {
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  if (expectedTitle)
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      expectedTitle,
    );
  assert(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "Horizontal page overflow",
  );
}
async function ensureFixture(loginName, permissions) {
  return prisma.user.upsert({
    where: { loginName },
    update: { permissions },
    create: {
      loginName,
      firstName: "Compte fictif",
      lastName: "Clôture",
      role: "USER",
      permissions,
      passwordHash: await hash(config.E2E_SUPERADMIN_PASSWORD, 12),
      loginNameReservations: { create: { loginName } },
    },
  });
}
async function respectReadinessLimit(response, row) {
  assert.equal(response.status(), 429);
  const seconds = Number(response.headers()["retry-after"]);
  assert(
    Number.isFinite(seconds) && seconds >= 0 && seconds <= 60,
    "Bounded readiness Retry-After",
  );
  row.readinessWaitSeconds = (row.readinessWaitSeconds || 0) + seconds;
  console.log("Harness respecting readiness Retry-After: " + seconds + "s");
  await new Promise((resolve) => setTimeout(resolve, seconds * 1000 + 100));
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  results.chromium = browser.version();
  const contexts = [];
  try {
    const anonymous = await browser.newContext({ baseURL: config.WEB_URL });
    contexts.push(anonymous);
    const login = await anonymous.newPage();
    await record(
      "Anonymous protection and login at three widths",
      async (row) => {
        await login.goto("/systeme/utilisateurs");
        await expect(login).toHaveURL(/\/login/);
        for (const width of [320, 768, 1440]) {
          await login.setViewportSize({ width, height: 900 });
          await expect(
            login.getByLabel("Identifiant de connexion"),
          ).toBeVisible();
          assert(
            await login.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth + 1,
            ),
          );
        }
        row.widths = [320, 768, 1440];
        assert.equal((await api(login).get("/api/users")).status(), 401);
        assert.equal((await api(login).get("/api/personnes")).status(), 401);
      },
    );

    const root = await authenticate(browser, config.E2E_SUPERADMIN_LOGIN_NAME);
    contexts.push(root.context);
    const page = root.page;
    const currentUser = (await json(await api(page).get("/api/auth/me"))).user;
    const accountTitle =
      [currentUser.firstName, currentUser.lastName]
        .filter(Boolean)
        .join(" ")
        .trim() || currentUser.loginName;
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const targetUser = await ensureFixture("e2e-cloture-lecture", {
      "persons:view": true,
      "persons:create": false,
      "persons:update": false,
      "persons:delete": false,
    });
    const person = await json(
      await api(page).post("/api/personnes", {
        headers: await headers(page),
        data: {
          nickname: "Fiche fictive Clôture",
          firstName: "",
          lastName: "",
          structureStatus: "IN_STRUCTURE",
        },
      }),
      201,
    );
    const personId = person.person?.id;
    assert(personId, "Created person ID");
    const pages = [
      [
        "home",
        "/",
        currentUser.firstName.trim()
          ? "Bonjour " + currentUser.firstName.trim()
          : "Bienvenue",
      ],
      ["account", "/mon-compte", accountTitle],
      ["persons", "/membres/repertoire", "Répertoire"],
      ["person-create", "/membres/repertoire/nouveau", "Nouvelle fiche"],
      [
        "person-detail",
        "/membres/repertoire/" + personId,
        person.person.nickname,
      ],
      ["users", "/systeme/utilisateurs", "Utilisateurs"],
      ["user-create", "/systeme/utilisateurs/nouveau", "Nouvel utilisateur"],
      [
        "user-detail",
        "/systeme/utilisateurs/" + targetUser.id,
        [targetUser.firstName, targetUser.lastName].filter(Boolean).join(" "),
      ],
      ["settings", "/systeme/parametres", "Paramètres système"],
      ["roadmap", "/systeme/feuille-de-route", "Feuille de route"],
    ];
    for (const [name, route, title] of pages) {
      await record(
        "Real page " + route + " at 320, 768 and 1440 px",
        async (row) => {
          await page.setViewportSize({ width: 320, height: 900 });
          let readiness = page.waitForResponse(
            (response) =>
              new URL(response.url()).pathname === "/api/health/ready",
          );
          const response = await page.goto(route);
          assert.equal(response.status(), 200);
          let readinessResponse = await readiness;
          if (readinessResponse.status() === 429) {
            await respectReadinessLimit(readinessResponse, row);
            readiness = page.waitForResponse(
              (response) =>
                new URL(response.url()).pathname === "/api/health/ready",
            );
            await page.reload();
            readinessResponse = await readiness;
          }
          assert.equal(
            readinessResponse.status(),
            200,
            "Real readiness after optional bounded retry",
          );
          for (const width of [320, 768, 1440]) {
            await page.setViewportSize({ width, height: 900 });
            await structure(page, title);
            await expect(
              page.locator('[aria-busy="true"]').filter({ visible: true }),
            ).toHaveCount(0);
            if (name === "person-create")
              await expect(
                page.locator("#create-person-nickname"),
              ).toBeEnabled();
            if (
              width === 1440 ||
              (width === 320 &&
                ["persons", "user-detail", "account"].includes(name))
            ) {
              await page.screenshot({
                path: path.join(out, name + "-" + width + ".png"),
                fullPage: false,
              });
            }
          }
          row.widths = [320, 768, 1440];
        },
      );
    }
    await record(
      "Real setting save, CSRF refusal, version conflict and atomic audit",
      async (row) => {
        const key = "audit.retentionDays";
        const current = (
          await json(await api(page).get("/api/systeme/parametres"))
        ).find((setting) => setting.key === key);
        assert(current && !current.isStoredValueInvalid);
        assert(current.value < 3650, "Room for a synthetic retention increase");
        const href = "/api/systeme/parametres/" + key;
        const data = {
          expectedVersion: current.version,
          value: current.value + 1,
        };
        const auditCount = () =>
          prisma.auditLog.count({
            where: { action: "SYSTEM_SETTING_UPDATE" },
          });
        const beforeAudit = await auditCount();
        assert.equal((await api(page).put(href, { data })).status(), 403);
        assert.equal(await auditCount(), beforeAudit);
        const saved = await json(
          await api(page).put(href, {
            headers: await headers(page),
            data,
          }),
        );
        assert.equal(saved.value, data.value);
        assert.equal(saved.version, current.version + 1);
        const stored = await prisma.systemSetting.findUnique({
          where: { key },
        });
        assert.equal(stored.value, data.value);
        assert.equal(stored.version, saved.version);
        assert.equal(await auditCount(), beforeAudit + 1);
        const stale = await api(page).put(href, {
          headers: await headers(page),
          data: { expectedVersion: current.version, value: current.value },
        });
        assert.equal(stale.status(), 409);
        assert.equal((await stale.json()).error.code, "CONFLICT");
        assert.deepEqual(
          await prisma.systemSetting.findUnique({ where: { key } }),
          stored,
        );
        assert.equal(await auditCount(), beforeAudit + 1);
        row.http = [403, 200, 409];
        row.persistedAndAudited = true;
      },
    );
    await record(
      "Aliases, missing route, missing resources and readiness",
      async (row) => {
        await page.goto("/administration");
        await expect(page).toHaveURL(/\/systeme\/utilisateurs$/);
        await page.goto("/tableau-de-bord");
        await expect(page).toHaveURL(/\/$/);
        await page.goto("/systeme");
        await expect(page).toHaveURL(/\/systeme\/utilisateurs$/);
        const missing = await page.goto("/route-cloture-inexistante");
        assert.equal(missing.status(), 404);
        await structure(page, "Page introuvable");
        await page.goto("/");
        assert.equal(
          (await api(page).get("/api/users/cloture-inexistant")).status(),
          404,
        );
        assert.equal(
          (await api(page).get("/api/personnes/cloture-inexistante")).status(),
          404,
        );
        assert.equal((await api(page).get("/api/health/live")).status(), 200);
        let readiness = await api(page).get("/api/health/ready");
        if (readiness.status() === 429) {
          await respectReadinessLimit(readiness, row);
          readiness = await api(page).get("/api/health/ready");
        }
        assert.equal(readiness.status(), 200);
        assert.equal((await readiness.json()).checks.persons, "ready");
        row.javascriptErrors = errors;
        assert.equal(
          errors.length,
          0,
          "Uncaught JavaScript errors during real page traversal",
        );
      },
    );
    await record(
      "Read-only person user: real MFA, list, forbidden mutations and system APIs",
      async (row) => {
        const limited = await authenticate(browser, targetUser.loginName);
        contexts.push(limited.context);
        await limited.page.goto("/membres/repertoire");
        await structure(limited.page, "Répertoire");
        await expect(
          limited.page.locator('a[href^="/membres/repertoire/nouveau"]'),
        ).toHaveCount(0);
        const checks = [
          ["users", (await api(limited.page).get("/api/users")).status(), 403],
          [
            "settings",
            (await api(limited.page).get("/api/systeme/parametres")).status(),
            403,
          ],
          [
            "persons-read",
            (await api(limited.page).get("/api/personnes")).status(),
            200,
          ],
          [
            "persons-create",
            (
              await api(limited.page).post("/api/personnes", {
                headers: await headers(limited.page),
                data: { nickname: "Forbidden" },
              })
            ).status(),
            403,
          ],
        ];
        for (const [, actual, expected] of checks)
          assert.equal(actual, expected);
        row.http = checks;
        await prisma.user.update({
          where: { id: targetUser.id },
          data: { permissions: { "persons:view": false } },
        });
        assert.equal(
          (await api(limited.page).get("/api/personnes")).status(),
          403,
        );
        await limited.page.goto("/membres/repertoire");
        await expect(
          limited.page.getByRole("heading", {
            name: "Accès refusé",
            exact: true,
            level: 1,
          }),
        ).toBeVisible();
        row.revokedDuringSession = true;
      },
    );
    assert.equal(results.scenarios.length, results.expectedScenarios);
    results.completed = true;
  } finally {
    fs.writeFileSync(
      path.join(out, "pages.json"),
      JSON.stringify(results, null, 2),
    );
    for (const context of contexts) await context.close();
    await browser.close();
    await prisma.$disconnect();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
