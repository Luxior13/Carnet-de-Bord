const {
  authenticate,
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
const { compare } = require("bcryptjs");
const out = path.join(__dirname, "preuves");
fs.mkdirSync(out, { recursive: true });
const results = {
  date: new Date().toISOString(),
  environment: {
    next: "15.5.23",
    postgres: "17",
    database: "creation_reprise_test",
    postgresPort: 54662,
    nextPort: 3131,
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
  assert(row.passed, "Stopped after failed scenario");
}
async function fill(page, login) {
  await page.locator("#newFirstName").fill("Compte fictif");
  await page.locator("#newLastName").fill("");
  await page.locator("#newLoginName").fill(login);
}
async function verifyCreated(page, login, role) {
  await expect(
    page.getByRole("heading", { name: "Compte créé", exact: true }),
  ).toBeVisible();
  const secret = await page
    .locator('section[aria-labelledby="created-password-title"] code')
    .innerText();
  const user = await prisma.user.findUniqueOrThrow({
    where: { loginName: login },
  });
  assert.equal(user.role, role);
  assert.equal(user.mustChangePassword, true);
  assert(await compare(secret, user.passwordHash));
  const reservation = await prisma.loginNameReservation.findUniqueOrThrow({
    where: { loginName: login },
  });
  assert.equal(reservation.userId, user.id);
  const logs = await prisma.auditLog.findMany({
    where: { targetUserId: user.id, action: "USER_CREATE" },
  });
  assert.equal(logs.length, 1);
  assert(!JSON.stringify(logs).includes(secret));
  await page.locator("#password-preserved").check();
  return user;
}
async function prove(page) {
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
  await page
    .locator("#admin-step-up-password")
    .fill(config.E2E_SUPERADMIN_PASSWORD);
  await page.locator("#admin-step-up-code").fill(
    await generate({
      secret: fs.readFileSync(
        path.join(work, config.E2E_SUPERADMIN_LOGIN_NAME + ".totp"),
        "utf8",
      ),
    }),
  );
  await page
    .getByRole("button", { name: "Confirmer et continuer", exact: true })
    .click();
}
(async () => {
  const browser = await chromium.launch({ headless: true });
  results.environment.chromium = browser.version();
  let context;
  try {
    const current = await authenticate(
      browser,
      config.E2E_SUPERADMIN_LOGIN_NAME,
    );
    context = current.context;
    const page = current.page;
    const runId = Date.now().toString(36);
    const submit = page.getByRole("button", {
      name: "Créer le compte",
      exact: true,
    });
    await page.goto("/systeme/utilisateurs/nouveau");
    await record(
      "Création USER réelle après revalidation, réservation et audit uniques",
      async (row) => {
        await fill(page, "simple." + runId);
        await submit.click();
        await verifyCreated(page, "simple." + runId, "USER");
        Object.assign(row, {
          role: "USER",
          accounts: 1,
          reservations: 1,
          audits: 1,
          bcryptVerified: true,
        });
      },
    );
    await record(
      "ADMIN : annuler conserve la saisie, puis vraie preuve mot de passe/TOTP et création",
      async (row) => {
        await page
          .getByRole("button", { name: "Créer un autre", exact: true })
          .click();
        await fill(page, "admin." + runId);
        await page.locator('label[for="newRole-ADMIN"]').click();
        await expect(page.locator("#newRole-ADMIN")).toBeChecked();
        await submit.click();
        await page.locator("#admin-step-up-password").waitFor();
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Annuler", exact: true })
          .click();
        assert.equal(
          await prisma.user.count({ where: { loginName: "admin." + runId } }),
          0,
        );
        await expect(submit).toBeFocused();
        await expect(page.locator("#newLoginName")).toHaveValue(
          "admin." + runId,
        );
        await submit.click();
        await page.locator("#admin-step-up-password").waitFor();
        await prove(page);
        await verifyCreated(page, "admin." + runId, "ADMIN");
        Object.assign(row, {
          cancellationCreatedAccounts: 0,
          role: "ADMIN",
          accounts: 1,
          reservations: 1,
          audits: 1,
          bcryptVerified: true,
        });
      },
    );
    await record(
      "Réponse perdue après commit, vérification exacte réelle et focus plus récent conservé",
      async (row) => {
        await page
          .getByRole("button", { name: "Créer un autre", exact: true })
          .click();
        await page.setViewportSize({ width: 390, height: 800 });
        const login = "perdu." + runId;
        await fill(page, login);
        let posts = 0;
        await page.route("**/api/users", async (route) => {
          if (route.request().method() !== "POST") return route.continue();
          posts++;
          const response = await route.fetch();
          assert.equal(response.status(), 200);
          await route.abort("failed");
        });
        await submit.click();
        await expect(
          page.getByRole("button", {
            name: "Vérifier la création",
            exact: true,
          }),
        ).toBeVisible();
        let release = () => {};
        let received = () => {};
        const held = new Promise((resolve) => {
          release = resolve;
        });
        const seen = new Promise((resolve) => {
          received = resolve;
        });
        let reads = 0;
        await page.route("**/api/users?*", async (route) => {
          const url = new URL(route.request().url());
          if (url.searchParams.get("loginName") !== login)
            return route.continue();
          reads++;
          const response = await route.fetch();
          assert.equal(response.status(), 200);
          received();
          await held;
          await route.fulfill({ response });
        });
        await page
          .getByRole("button", { name: "Vérifier la création", exact: true })
          .click();
        await seen;
        await page
          .getByRole("button", { name: "Rechercher une page", exact: true })
          .click();
        const search = page.getByRole("combobox", {
          name: "Rechercher une page",
          exact: true,
        });
        await search.fill("param");
        release();
        await expect(
          page.getByText("Un compte utilise cet identifiant", { exact: true }),
        ).toBeVisible();
        await expect(search).toBeFocused();
        assert.equal(posts, 1);
        assert.equal(reads, 1);
        const user = await prisma.user.findUniqueOrThrow({
          where: { loginName: login },
        });
        assert.equal(
          await prisma.user.count({ where: { loginName: login } }),
          1,
        );
        assert.equal(
          await prisma.auditLog.count({
            where: { targetUserId: user.id, action: "USER_CREATE" },
          }),
          1,
        );
        Object.assign(row, {
          committedStatus: 200,
          posts: 1,
          exactVerificationReads: 1,
          accounts: 1,
          audits: 1,
          laterSearchFocusPreserved: true,
        });
        await page.keyboard.press("Escape");
        await page
          .getByText("Un compte utilise cet identifiant", { exact: true })
          .scrollIntoViewIfNeeded();
        await page.screenshot({
          path: path.join(out, "creation-reprise-390.png"),
        });
        await page.unroute("**/api/users");
        await page.unroute("**/api/users?*");
      },
    );
  } finally {
    await context?.close();
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
