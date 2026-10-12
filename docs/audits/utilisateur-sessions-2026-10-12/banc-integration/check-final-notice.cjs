// Narrow check after moving the unchanged uncertainty notice into Sessions.
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
  work,
} = require("./auth.cjs");
const { generate } = require("otplib");
const out = path.join(__dirname, "preuves");
(async () => {
  const browser = await chromium.launch({ headless: true });
  const contexts = [];
  try {
    const current = await authenticate(
      browser,
      config.E2E_SUPERADMIN_LOGIN_NAME,
    );
    contexts.push(current.context);
    const root = await prisma.user.findUniqueOrThrow({
      where: { id: "e2e-only-superadmin" },
    });
    const loginName = "e2e-notice-" + Date.now().toString(36);
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
    const other = await authenticate(browser, loginName);
    contexts.push(other.context);
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
    const currentTotpCode = await generate({
      secret: fs.readFileSync(
        path.join(work, config.E2E_SUPERADMIN_LOGIN_NAME + ".totp"),
        "utf8",
      ),
    });
    await json(
      await api(current.page).post("/api/auth/step-up", {
        headers: await headers(current.page),
        data: {
          currentPassword: config.E2E_SUPERADMIN_PASSWORD,
          currentTotpCode,
        },
      }),
    );
    const page = current.page;
    await page.setViewportSize({ width: 390, height: 700 });
    await page.goto(`/systeme/utilisateurs/${target.id}?section=security`);
    const button = page.getByRole("button", {
      name: "Révoquer toutes les sessions",
      exact: true,
    });
    await expect(button).toBeEnabled();
    const endpoint = `/api/users/${target.id}/sessions`;
    let deletes = 0;
    let reads = 0;
    let committed = null;
    await page.route("**" + endpoint + "*", async (route) => {
      if (route.request().method() === "DELETE") {
        deletes++;
        const response = await route.fetch();
        committed = response.status();
        assert.equal(committed, 200);
        await route.abort("failed");
      } else {
        if (committed !== null) reads++;
        await route.continue();
      }
    });
    await button.click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Révoquer", exact: true })
      .click();
    const sessions = page.locator(
      '[aria-labelledby="user-security-sessions-heading"]',
    );
    await expect(
      sessions.getByText(/La réponse n’a pas pu être confirmée/),
    ).toBeVisible();
    await expect(
      sessions.getByText("Aucune session active.", { exact: true }),
    ).toBeVisible();
    await expect(page.locator("#user-security-sessions-heading")).toBeFocused();
    assert.equal(deletes, 1);
    assert.equal(reads, 1);
    assert.equal(
      await prisma.session.count({ where: { userId: target.id } }),
      0,
    );
    assert.equal(
      await prisma.auditLog.count({
        where: { targetUserId: target.id, action: "SESSION_INVALIDATE" },
      }),
      1,
    );
    assert.equal((await api(other.page).get("/api/auth/me")).status(), 401);
    assert.equal((await api(page).get("/api/auth/me")).status(), 200);
    const geometry = await page.evaluate(() => {
      const heading = document.getElementById("user-security-sessions-heading");
      const card = document.querySelector(
        '[aria-labelledby="user-security-sessions-heading"]',
      );
      const alert = card.querySelector('[role="status"]');
      return {
        focusedId: document.activeElement.id,
        headingTop: heading.getBoundingClientRect().top,
        barBottom: document
          .querySelector('[data-slot="page-section-navigation"]')
          .getBoundingClientRect().bottom,
        noticeText: alert?.textContent,
        viewport: { width: innerWidth, height: innerHeight },
      };
    });
    assert(geometry.headingTop >= geometry.barBottom - 1);
    await page.screenshot({
      path: path.join(out, "sessions-notice-final-390.png"),
    });
    fs.writeFileSync(
      path.join(out, "notice-finale.json"),
      JSON.stringify(
        {
          date: new Date().toISOString(),
          passed: true,
          scope:
            "Notice moved into the Sessions card; narrow final build verification",
          committedStatus: committed,
          deleteRequests: deletes,
          readsAfterLoss: reads,
          auditDelta: 1,
          targetBrowser: 401,
          actor: 200,
          noticeInsideSessions: true,
          geometry,
        },
        null,
        2,
      ),
    );
    console.log(
      "PASS final notice inside Sessions, real commit/lost response and mobile focus",
    );
  } finally {
    await Promise.allSettled(contexts.map((context) => context.close()));
    await browser.close();
    await prisma.$disconnect();
  }
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
