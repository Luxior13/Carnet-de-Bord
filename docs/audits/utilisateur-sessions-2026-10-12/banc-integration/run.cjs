const {
  authenticate,
  api,
  assert,
  chromium,
  config,
  expect,
  fs,
  path,
  prisma,
  work,
} = require("./auth.cjs");
const { generate } = require("otplib");
const out = path.join(__dirname, "preuves");
fs.mkdirSync(out, { recursive: true });
const results = {
  date: new Date().toISOString(),
  environment: {
    next: "15.5.23",
    postgres: "17",
    nextPort: 3130,
    postgresPort: 54661,
    database: "user_sessions_test",
  },
  scenarios: [],
};
async function record(name, action) {
  const row = { name };
  try {
    await action(row);
    row.passed = true;
  } catch (error) {
    row.passed = false;
    row.error = error.message.slice(0, 1200);
  }
  results.scenarios.push(row);
  fs.writeFileSync(
    path.join(out, "resultats.json"),
    JSON.stringify(results, null, 2),
  );
  console.log(`${row.passed ? "PASS" : "FAIL"} ${name}`);
  assert(row.passed, `Stopped after failed scenario: ${name}`);
}
async function stepUp(page) {
  const credential = await prisma.totpCredential.findFirstOrThrow({
    where: { user: { loginName: config.E2E_SUPERADMIN_LOGIN_NAME } },
  });
  if (
    credential.lastUsedTimeStep !== null &&
    credential.lastUsedTimeStep >= BigInt(Math.floor(Date.now() / 30000))
  ) {
    const delay =
      Number(credential.lastUsedTimeStep + 1n) * 30000 - Date.now() + 300;
    assert(delay < 31000);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  const secret = fs.readFileSync(
    path.join(work, config.E2E_SUPERADMIN_LOGIN_NAME + ".totp"),
    "utf8",
  );
  await page
    .locator("#admin-step-up-password")
    .fill(config.E2E_SUPERADMIN_PASSWORD);
  await page.locator("#admin-step-up-code").fill(await generate({ secret }));
  await page
    .getByRole("button", { name: "Confirmer et continuer", exact: true })
    .click();
  await expect(page.locator("#admin-step-up-password")).toHaveCount(0);
}
async function metrics(page) {
  return page.evaluate(() => {
    const heading = document.getElementById("user-security-sessions-heading");
    const nav = document.querySelector('[data-slot="page-section-navigation"]');
    return {
      focusedId: document.activeElement?.id,
      headingTop: heading.getBoundingClientRect().top,
      barBottom: nav.getBoundingClientRect().bottom,
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  results.environment.chromium = browser.version();
  const contexts = [];
  try {
    const actor = await authenticate(browser, config.E2E_SUPERADMIN_LOGIN_NAME);
    contexts.push(actor.context);
    const root = await prisma.user.findUniqueOrThrow({
      where: { id: "e2e-only-superadmin" },
    });
    const loginName = "e2e-target-" + Date.now().toString(36);
    const target = await prisma.user.create({
      data: {
        loginName,
        passwordHash: root.passwordHash,
        firstName: "Compte",
        lastName: "Sessions fictives",
        role: "USER",
      },
    });
    await prisma.loginNameReservation.create({
      data: { loginName, userId: target.id },
    });
    let targetOne = await authenticate(browser, loginName);
    let targetTwo = await authenticate(browser, loginName);
    contexts.push(targetOne.context, targetTwo.context);
    const page = actor.page;
    const endpoint = `/api/users/${target.id}/sessions`;
    const count = () => prisma.session.count({ where: { userId: target.id } });
    const auditCount = () =>
      prisma.auditLog.count({
        where: { targetUserId: target.id, action: "SESSION_INVALIDATE" },
      });
    let deletes = 0;
    page.on("request", (request) => {
      if (
        request.method() === "DELETE" &&
        new URL(request.url()).pathname === endpoint
      )
        deletes++;
    });
    const load = async () => {
      await page.goto(`/systeme/utilisateurs/${target.id}?section=security`);
      await expect(
        page.getByRole("button", {
          name: "Révoquer toutes les sessions",
          exact: true,
        }),
      ).toBeEnabled();
    };
    const single = async () => {
      await page.locator("[data-session-id]").first().click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Révoquer la session", exact: true })
        .click();
    };
    const global = async () => {
      await page
        .getByRole("button", {
          name: "Révoquer toutes les sessions",
          exact: true,
        })
        .click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Révoquer", exact: true })
        .click();
    };
    await record(
      "Annuler la confirmation et la preuve sensible conserve les deux sessions",
      async (row) => {
        await load();
        assert.equal(await count(), 2);
        await page
          .getByRole("button", {
            name: "Révoquer toutes les sessions",
            exact: true,
          })
          .click();
        await page
          .getByRole("alertdialog")
          .getByRole("button", { name: "Annuler", exact: true })
          .click();
        assert.equal(deletes, 0);
        await single();
        await page.locator("#admin-step-up-password").waitFor();
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Annuler", exact: true })
          .click();
        await expect(page.locator("#admin-step-up-password")).toHaveCount(0);
        assert.equal(await count(), 2);
        assert.equal(await auditCount(), 0);
        row.deleteRequests = deletes;
        row.remainingSessions = 2;
        row.auditDelta = 0;
      },
    );
    await record(
      "Révocation individuelle après mot de passe et TOTP réels",
      async (row) => {
        const before = deletes;
        await single();
        await page.locator("#admin-step-up-password").waitFor();
        await stepUp(page);
        await expect(page.locator("[data-session-id]")).toHaveCount(1);
        assert.equal(await count(), 1);
        assert.equal(await auditCount(), 1);
        const statuses = await Promise.all(
          [targetOne, targetTwo].map(async (item) =>
            (await api(item.page).get("/api/auth/me")).status(),
          ),
        );
        assert.deepEqual(statuses.sort(), [200, 401]);
        await expect(
          page.locator("#user-security-sessions-heading"),
        ).toBeFocused();
        row.focus = await metrics(page);
        assert(row.focus.headingTop >= row.focus.barBottom - 1);
        row.deleteRequests = deletes - before;
        row.targetBrowsers = statuses;
        row.auditDelta = 1;
      },
    );
    await record(
      "Révocation globale confirmée sans toucher la session administrateur",
      async (row) => {
        const before = deletes;
        await global();
        await expect(
          page.getByText("Aucune session active.", { exact: true }),
        ).toBeVisible();
        assert.equal(await count(), 0);
        assert.equal(await auditCount(), 2);
        const statuses = await Promise.all(
          [targetOne, targetTwo].map(async (item) =>
            (await api(item.page).get("/api/auth/me")).status(),
          ),
        );
        assert.deepEqual(statuses, [401, 401]);
        assert.equal((await api(page).get("/api/auth/me")).status(), 200);
        await expect(
          page.locator("#user-security-sessions-heading"),
        ).toBeFocused();
        row.focus = await metrics(page);
        assert(row.focus.headingTop >= row.focus.barBottom - 1);
        row.deleteRequests = deletes - before;
        row.targetBrowsers = statuses;
        row.actor = 200;
        row.auditDelta = 1;
        await page.screenshot({
          path: path.join(out, "sessions-success-1440.png"),
        });
      },
    );
    await targetOne.context.close();
    await targetTwo.context.close();
    targetOne = await authenticate(browser, loginName);
    contexts.push(targetOne.context);
    await record(
      "Réponse perdue après commit : notice persistante, relecture sans nouveau DELETE et focus mobile",
      async (row) => {
        await page.setViewportSize({ width: 390, height: 700 });
        await load();
        const before = deletes;
        let committed = null;
        let reads = 0;
        await page.route("**" + endpoint + "*", async (route) => {
          if (route.request().method() === "DELETE") {
            const response = await route.fetch();
            committed = response.status();
            assert.equal(committed, 200);
            await route.abort("failed");
          } else {
            if (committed !== null) reads++;
            await route.continue();
          }
        });
        await global();
        await expect(
          page.getByText("Aucune session active.", { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText(/La réponse n’a pas pu être confirmée/),
        ).toBeVisible();
        await expect(
          page.locator("#user-security-sessions-heading"),
        ).toBeFocused();
        row.focus = await metrics(page);
        assert(row.focus.headingTop >= row.focus.barBottom - 1);
        assert.equal(deletes - before, 1);
        assert.equal(reads, 1);
        assert.equal(await count(), 0);
        assert.equal(await auditCount(), 3);
        assert.equal(
          (await api(targetOne.page).get("/api/auth/me")).status(),
          401,
        );
        assert.equal((await api(page).get("/api/auth/me")).status(), 200);
        Object.assign(row, {
          committedStatus: committed,
          deleteRequests: 1,
          readsAfterLoss: reads,
          remainingSessions: 0,
          auditDelta: 1,
          targetBrowser: 401,
          actor: 200,
        });
        await page.screenshot({
          path: path.join(out, "sessions-lost-390.png"),
        });
        await page.unroute("**" + endpoint + "*");
      },
    );
  } finally {
    await Promise.allSettled(contexts.map((context) => context.close()));
    await browser.close();
    await prisma.$disconnect();
  }
  results.passed = results.scenarios.filter((row) => row.passed).length;
  fs.writeFileSync(
    path.join(out, "resultats.json"),
    JSON.stringify(results, null, 2),
  );
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
