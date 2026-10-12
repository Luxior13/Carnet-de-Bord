const {
  authenticate,
  api,
  assert,
  chromium,
  config,
  expect,
  fs,
  json,
  path,
  prisma,
} = require("./auth.cjs");
const out = path.join(__dirname, "preuves");
fs.mkdirSync(out, { recursive: true });
const results = {
  date: new Date().toISOString(),
  environment: {
    next: "15.5.23",
    postgres: "17",
    nextPort: 3129,
    postgresPort: 54660,
    database: "account_sessions_test",
  },
  scenarios: [],
};
const actor = "e2e-only-superadmin";
const auditCount = () =>
  prisma.auditLog.count({
    where: { targetUserId: actor, action: "SESSION_INVALIDATE" },
  });
const sessionCount = () => prisma.session.count({ where: { userId: actor } });
async function record(name, callback) {
  const result = { name };
  try {
    await callback(result);
    result.passed = true;
  } catch (error) {
    result.passed = false;
    result.error = error.message.slice(0, 1200);
  }
  results.scenarios.push(result);
  fs.writeFileSync(
    path.join(out, "resultats.json"),
    JSON.stringify(results, null, 2),
  );
  console.log(`${result.passed ? "PASS" : "FAIL"} ${name}`);
  assert(result.passed, `Stopped after failed scenario: ${name}`);
}
async function loadSecurity(page) {
  await page.goto("/mon-compte?section=security");
  await page
    .getByRole("button", {
      name: "Déconnecter les autres sessions",
      exact: true,
    })
    .waitFor();
}
async function focusMetrics(page) {
  return page.evaluate(() => {
    const heading = document.getElementById("account-sessions-heading");
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
    const current = await authenticate(
      browser,
      config.E2E_SUPERADMIN_LOGIN_NAME,
    );
    contexts.push(current.context);
    let other = await authenticate(browser, config.E2E_SUPERADMIN_LOGIN_NAME);
    contexts.push(other.context);
    const page = current.page;
    let deleteRequests = 0;
    page.on("request", (request) => {
      if (
        request.method() === "DELETE" &&
        new URL(request.url()).pathname === "/api/auth/sessions"
      )
        deleteRequests++;
    });
    await record(
      "Révocation globale annulée, deux sessions réelles conservées",
      async (result) => {
        await loadSecurity(page);
        const before = await sessionCount();
        assert.equal(before, 2);
        const auditBefore = await auditCount();
        await page
          .getByRole("button", {
            name: "Déconnecter les autres sessions",
            exact: true,
          })
          .click();
        await page
          .getByRole("alertdialog")
          .getByRole("button", { name: "Annuler", exact: true })
          .click();
        await expect(page.getByRole("alertdialog")).toHaveCount(0);
        assert.equal(deleteRequests, 0);
        assert.equal(await sessionCount(), before);
        assert.equal(await auditCount(), auditBefore);
        result.sessions = before;
        result.deleteRequests = 0;
        result.auditDelta = 0;
      },
    );
    await record(
      "Révocation globale confirmée, session courante conservée et autre navigateur refusé",
      async (result) => {
        const auditBefore = await auditCount();
        await page
          .getByRole("button", {
            name: "Déconnecter les autres sessions",
            exact: true,
          })
          .click();
        const responsePromise = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname === "/api/auth/sessions" &&
            response.request().method() === "DELETE",
        );
        await page
          .getByRole("alertdialog")
          .getByRole("button", { name: "Déconnecter", exact: true })
          .click();
        const response = await responsePromise;
        assert.equal(response.status(), 200);
        await expect(page.getByRole("alertdialog")).toHaveCount(0);
        await expect(
          page.getByText("Aucune autre session active.", { exact: true }),
        ).toBeVisible();
        await expect(page.locator("#account-sessions-heading")).toBeFocused();
        result.focus = await focusMetrics(page);
        assert(result.focus.headingTop >= result.focus.barBottom - 1);
        assert.equal(await sessionCount(), 1);
        assert.equal(await auditCount(), auditBefore + 1);
        assert.equal((await api(other.page).get("/api/auth/me")).status(), 401);
        assert.equal((await api(page).get("/api/auth/me")).status(), 200);
        result.http = 200;
        result.remainingSessions = 1;
        result.auditDelta = 1;
        result.otherBrowser = 401;
        result.currentBrowser = 200;
        await page.screenshot({
          path: path.join(out, "revoke-success-1440.png"),
        });
      },
    );
    await other.context.close();
    other = await authenticate(browser, config.E2E_SUPERADMIN_LOGIN_NAME);
    contexts.push(other.context);
    await record(
      "Réponse perdue après commit réel, relecture automatique sans rejeu DELETE et focus mobile visible",
      async (result) => {
        await page.setViewportSize({ width: 390, height: 700 });
        await loadSecurity(page);
        const auditBefore = await auditCount();
        const deleteBefore = deleteRequests;
        let committedStatus = null;
        let readsAfterLoss = 0;
        await page.route("**/api/auth/sessions", async (route) => {
          if (route.request().method() === "DELETE") {
            const actual = await route.fetch();
            committedStatus = actual.status();
            assert.equal(committedStatus, 200);
            await route.abort("failed");
          } else {
            if (committedStatus !== null) readsAfterLoss++;
            await route.continue();
          }
        });
        await page
          .getByRole("button", {
            name: "Déconnecter les autres sessions",
            exact: true,
          })
          .click();
        await page
          .getByRole("alertdialog")
          .getByRole("button", { name: "Déconnecter", exact: true })
          .click();
        await expect(page.getByRole("alertdialog")).toHaveCount(0);
        await expect(
          page.getByText("Aucune autre session active.", { exact: true }),
        ).toBeVisible();
        await expect(
          page.getByText(/La réponse n’a pas pu être confirmée/),
        ).toBeVisible();
        await expect(page.locator("#account-sessions-heading")).toBeFocused();
        result.focus = await focusMetrics(page);
        assert(result.focus.headingTop >= result.focus.barBottom - 1);
        assert.equal(committedStatus, 200);
        assert.equal(deleteRequests - deleteBefore, 1);
        assert.equal(readsAfterLoss, 1);
        assert.equal(await sessionCount(), 1);
        assert.equal(await auditCount(), auditBefore + 1);
        assert.equal((await api(other.page).get("/api/auth/me")).status(), 401);
        assert.equal((await api(page).get("/api/auth/me")).status(), 200);
        result.committedStatus = committedStatus;
        result.deleteRequests = 1;
        result.readsAfterLoss = readsAfterLoss;
        result.remainingSessions = 1;
        result.auditDelta = 1;
        result.otherBrowser = 401;
        result.currentBrowser = 200;
        await page.screenshot({ path: path.join(out, "revoke-lost-390.png") });
        await page.unroute("**/api/auth/sessions");
      },
    );
  } finally {
    await Promise.allSettled(contexts.map((context) => context.close()));
    await browser.close();
    await prisma.$disconnect();
  }
  results.passed = results.scenarios.filter((item) => item.passed).length;
  fs.writeFileSync(
    path.join(out, "resultats.json"),
    JSON.stringify(results, null, 2),
  );
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
