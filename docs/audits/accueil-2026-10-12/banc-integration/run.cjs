const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { chromium, expect } = require("@playwright/test");
const { PrismaClient } = require("@prisma/client");
const { generate } = require("otplib");

const envFile = process.env.AUDIT_ENV_FILE;
if (!envFile)
  throw new Error(
    "AUDIT_ENV_FILE must point to the temporary audit environment.",
  );
const config = JSON.parse(
  fs.readFileSync(envFile, "utf8").replace(/^\uFEFF/, ""),
);
const target = new URL(config.E2E_DATABASE_URL);
const origin = config.WEB_URL;
if (
  target.hostname !== "127.0.0.1" ||
  target.port !== "54600" ||
  target.pathname !== "/home_audit_test" ||
  new URL(origin).hostname !== "127.0.0.1" ||
  new URL(origin).port !== "3123"
) {
  throw new Error(
    "This harness requires the explicitly isolated local audit targets.",
  );
}
const work = path.dirname(envFile);
const prisma = new PrismaClient({ datasourceUrl: target.toString() });
const observations = [];

const { randomBytes } = require("node:crypto");
const json = async (response, status = 200) => {
  const payload = await response.json();
  assert.equal(
    response.status(),
    status,
    payload.error?.message || "Unexpected HTTP status",
  );
  assert.equal(payload.success, true);
  return payload.data;
};
// Chromium accepts Secure cookies on loopback HTTP; Playwright's separate
// request client does not. Exercise the browser's actual authenticated fetch.
const api = (page) =>
  Object.fromEntries(
    ["get", "post", "patch", "delete", "put"].map((method) => [
      method,
      async (url, options = {}) => {
        const result = await page.evaluate(
          async ({ method, url, options }) => {
            const response = await fetch(url, {
              method: method.toUpperCase(),
              cache: "no-store",
              credentials: "same-origin",
              headers: {
                ...options.headers,
                ...(options.data ? { "content-type": "application/json" } : {}),
              },
              ...(options.data ? { body: JSON.stringify(options.data) } : {}),
            });
            return { status: response.status, data: await response.json() };
          },
          { method, url, options },
        );
        return { status: () => result.status, json: async () => result.data };
      },
    ]),
  );
async function headers(page) {
  const cookie = (await page.context().cookies()).find(
    (item) => item.name === "csrf-token",
  );
  assert(cookie, "Missing real CSRF cookie");
  return { "x-csrf-token": cookie.value, origin };
}
async function authenticate(
  browser,
  loginName,
  permissions,
  password = config.E2E_SUPERADMIN_PASSWORD,
  role = "USER",
) {
  const secretPath = path.join(work, loginName + ".totp");
  if (permissions) {
    const root = await prisma.user.findUniqueOrThrow({
      where: { id: "e2e-only-superadmin" },
    });
    const user = await prisma.user.upsert({
      where: { loginName },
      create: {
        loginName,
        passwordHash: root.passwordHash,
        firstName: "Audit",
        lastName: "Lecture",
        role,
        permissions,
      },
      update: { permissions },
    });
    await prisma.loginNameReservation.upsert({
      where: { loginName },
      create: { loginName, userId: user.id },
      update: {},
    });
  }
  const context = await browser.newContext({
    baseURL: origin,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("response", async (response) => {
    if (
      response.url().endsWith("/api/auth/mfa/verify") &&
      response.request().method() === "POST" &&
      response.ok()
    ) {
      const payload = await response.json();
      page.loginUserUpdatedAt = payload.data.user.updatedAt;
    }
  });
  await page.goto("/login");
  const response = await api(page).get("/api/auth/me");
  if (response.status() !== 200) {
    await page.goto("/login");
    await page.getByLabel("Identifiant de connexion").fill(loginName);
    await page.locator("#password").fill(password);
    await page
      .getByRole("button", { name: "Se connecter", exact: true })
      .click();
    if (fs.existsSync(secretPath)) {
      const lastCredential = await prisma.totpCredential.findFirst({
        where: { user: { loginName } },
        select: { lastUsedTimeStep: true },
      });
      const currentStep = BigInt(Math.floor(Date.now() / 30000));
      if (
        lastCredential?.lastUsedTimeStep !== null &&
        lastCredential?.lastUsedTimeStep >= currentStep
      ) {
        const delay =
          Number(lastCredential.lastUsedTimeStep + 1n) * 30000 -
          Date.now() +
          250;
        assert(delay < 31000, "Unexpected future TOTP time step");
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
      await page
        .locator("#login-mfa-code")
        .fill(await generate({ secret: fs.readFileSync(secretPath, "utf8") }));
      await page
        .getByRole("button", { name: "Vérifier et se connecter", exact: true })
        .click();
    } else {
      await page
        .getByRole("button", { name: "Configurer maintenant", exact: true })
        .click();
      const secret = (
        await page
          .getByLabel("Clé de configuration", { exact: true })
          .innerText()
      ).replace(/[\s-]/g, "");
      fs.writeFileSync(secretPath, secret);
      const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
      if (remaining < 6)
        await new Promise((resolve) =>
          setTimeout(resolve, (remaining + 1) * 1000),
        );
      await page
        .getByLabel("Code à 6 chiffres")
        .fill(await generate({ secret }));
      await page
        .getByRole("button", {
          name: "Activer la double authentification",
          exact: true,
        })
        .click();
      await page
        .getByRole("list", { name: "Codes de secours", exact: true })
        .waitFor();
      await page
        .getByRole("checkbox", {
          name: /J.ai enregistré ces codes dans un endroit sûr/,
        })
        .check();
      await page.getByRole("button", { name: "Terminer", exact: true }).click();
    }
    await expect(page).toHaveURL(/\/$/);
  }
  return { context, page };
}

const baseline = process.env.AUDIT_BASELINE === "1";
const mainHeading = (page) =>
  page.getByRole("main").getByRole("heading", { level: 1 });
const contexts = [];
async function scenario(name, action) {
  await action();
  observations.push({ name, result: "passed" });
  console.log("PASS " + name);
}
async function renameFromAccount(page, newName) {
  await page
    .getByRole("main")
    .getByRole("link", { name: "Mon compte", exact: true })
    .click();
  await expect(page).toHaveURL(origin + "/mon-compte");
  await page.locator("#edit-firstName").fill(newName);
  const response = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/auth/me") &&
      response.request().method() === "PATCH",
  );
  await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
  assert.equal((await response).status(), 200);
  // Await the real UI update before traversing the previously visited RSC tree.
  await expect(mainHeading(page)).toContainText(newName);
  await page.goBack();
  await expect(page).toHaveURL(origin + "/");
  await expect(mainHeading(page)).toHaveCount(1);
}
async function run() {
  const browser = await chromium.launch({ headless: true });
  const errors = [];
  try {
    let root = await authenticate(browser, config.E2E_SUPERADMIN_LOGIN_NAME);
    contexts.push(root.context);
    if (!baseline && !root.page.loginUserUpdatedAt) {
      // The version regression happens on ordinary verification, not bootstrap.
      // Always exercise it, including a run against a freshly seeded database.
      root = await authenticate(browser, config.E2E_SUPERADMIN_LOGIN_NAME);
      contexts.push(root.context);
    }
    const page = root.page;
    page.on("pageerror", (error) => errors.push(error.message));
    const beforeName = await mainHeading(page).innerText();
    if (process.env.AUDIT_AUTH_VERSION === "1") {
      const current = await json(await api(page).get("/api/auth/me"));
      assert(page.loginUserUpdatedAt, "Missing MFA response version");
      assert.notEqual(
        page.loginUserUpdatedAt,
        current.user.updatedAt,
        "Stale version did not reproduce",
      );
      await page
        .getByRole("main")
        .getByRole("link", { name: "Mon compte", exact: true })
        .click();
      await page.locator("#edit-firstName").fill("Diagnostic accueil");
      const attempt = page.waitForResponse(
        (response) =>
          response.url().endsWith("/api/auth/me") &&
          response.request().method() === "PATCH",
      );
      await page
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      const status = (await attempt).status();
      assert.equal(status, 409);
      fs.writeFileSync(
        path.join(__dirname, "version-profil-avant.json"),
        JSON.stringify(
          {
            date: "2026-10-12",
            scenario:
              "Connexion MFA normale puis première modification du profil",
            loginVersionDiffersFromCurrent: true,
            observedProfileUpdateStatus: status,
            result: "defect-reproduced",
          },
          null,
          2,
        ) + "\n",
      );
      console.log("REPRODUCED stale user version in MFA login response");
      return;
    }
    const suffix = randomBytes(3).toString("hex");
    const nextName = "Camille-" + suffix;
    if (!baseline && page.loginUserUpdatedAt) {
      const current = await json(await api(page).get("/api/auth/me"));
      assert.equal(
        page.loginUserUpdatedAt,
        current.user.updatedAt,
        "MFA must return the committed profile version",
      );
    }
    await renameFromAccount(page, nextName);
    const afterName = await mainHeading(page).innerText();
    if (baseline) {
      assert.notEqual(
        afterName,
        "Bonjour " + nextName,
        "Baseline did not reproduce stale greeting",
      );
      assert.equal(afterName, beforeName);
      await page.reload();
      await expect(mainHeading(page)).toHaveText("Bonjour " + nextName);
      fs.writeFileSync(
        path.join(__dirname, "avant.json"),
        JSON.stringify(
          {
            date: "2026-10-12",
            sourceCommit: "282066c",
            browserVersion: browser.version(),
            scenario:
              "Modification du prénom dans Mon compte puis retour navigateur vers l’accueil",
            staleBeforeReload: true,
            correctAfterReload: true,
            result: "defect-reproduced",
          },
          null,
          2,
        ) + "\n",
      );
      console.log(
        "REPRODUCED stale greeting after profile update and browser Back",
      );
      return;
    }
    assert.equal(afterName, "Bonjour " + nextName);
    await scenario(
      "Prénom modifié dans Mon compte : retour navigateur et rechargement cohérents",
      async () => {
        await page.reload();
        await expect(mainHeading(page)).toHaveText("Bonjour " + nextName);
        assert.equal(
          (await json(await api(page).get("/api/auth/me"))).user.firstName,
          nextName,
        );
      },
    );
    await scenario(
      "Structure, clavier et accueil complet à sept largeurs",
      async () => {
        for (const width of [320, 360, 390, 768, 1024, 1440, 1920]) {
          await page.setViewportSize({ width, height: 1000 });
          await expect(mainHeading(page)).toHaveCount(1);
          await expect(page.getByRole("main")).toHaveCount(1);
          const link = page
            .getByRole("main")
            .getByRole("link", { name: "Mon compte", exact: true });
          await expect(link).toBeVisible();
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          );
          const clipped = await page
            .locator('[data-slot="page-heading"]')
            .evaluate((node) => node.scrollWidth > node.clientWidth);
          assert.equal(clipped, false);
        }
        await page.setViewportSize({ width: 1440, height: 1000 });
        const link = page
          .getByRole("main")
          .getByRole("link", { name: "Mon compte", exact: true });
        await link.focus();
        await expect(link).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(page).toHaveURL(origin + "/mon-compte");
        await page.goBack();
        await expect(mainHeading(page)).toHaveText("Bonjour " + nextName);
      },
    );
    await scenario(
      "Prénom de 50 caractères sans espaces : retour immédiat lisible à320px",
      async () => {
        await page.setViewportSize({ width: 1440, height: 1000 });
        await renameFromAccount(page, "A".repeat(50));
        await expect(mainHeading(page)).toHaveText("Bonjour " + "A".repeat(50));
        await page.setViewportSize({ width: 320, height: 900 });
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        await expect(
          page
            .getByRole("main")
            .getByRole("link", { name: "Mon compte", exact: true }),
        ).toBeVisible();
        await page.screenshot({
          path: path.join(__dirname, "accueil-320.png"),
        });
        await page.setViewportSize({ width: 1440, height: 1000 });
        await renameFromAccount(page, nextName);
        await expect(mainHeading(page)).toHaveText("Bonjour " + nextName);
        await page.screenshot({
          path: path.join(__dirname, "accueil-1440.png"),
        });
      },
    );
    await scenario(
      "Compte sans droits métier : accueil et Mon compte accessibles, utilisateurs refusés",
      async () => {
        const limited = await authenticate(browser, "audit.home." + suffix, {});
        contexts.push(limited.context);
        limited.page.on("pageerror", (error) => errors.push(error.message));
        await expect(mainHeading(limited.page)).toHaveText("Bonjour Audit");
        await expect(
          limited.page
            .getByRole("main")
            .getByRole("link", { name: "Mon compte", exact: true }),
        ).toBeVisible();
        assert.equal((await api(limited.page).get("/api/users")).status(), 403);
        await limited.page
          .getByRole("main")
          .getByRole("link", { name: "Mon compte", exact: true })
          .click();
        await expect(limited.page.locator("#edit-firstName")).toBeVisible();
        await limited.page.goBack();
        await expect(mainHeading(limited.page)).toHaveText("Bonjour Audit");
      },
    );
    await scenario(
      "Ancienne API retirée et aucun chargement de synthèse depuis l’accueil",
      async () => {
        let requests = 0;
        const count = (request) => {
          if (new URL(request.url()).pathname === "/api/dashboard") requests++;
        };
        page.on("request", count);
        await page.reload();
        await expect(mainHeading(page)).toBeVisible();
        await page.waitForLoadState("networkidle");
        page.off("request", count);
        assert.equal(requests, 0);
        const response = await page.evaluate(async () => {
          const result = await fetch("/api/dashboard");
          return { status: result.status, text: await result.text() };
        });
        assert.equal(response.status, 404);
        assert(!response.text.includes("recentActivity"));
        assert(!response.text.includes("lockedActiveUsers"));
      },
    );
    await scenario(
      "Accès direct anonyme et cookie forgé redirigés sans salutation privée",
      async () => {
        const context = await browser.newContext({ baseURL: origin });
        contexts.push(context);
        for (const headers of [
          {},
          {
            cookie: "session=fictive-invalid-token",
            "x-request-path": "/login",
            "x-request-target": "/login",
          },
        ]) {
          const response = await context.request.get("/", {
            maxRedirects: 0,
            headers,
          });
          assert.equal(response.status(), 307);
          const destination = new URL(response.headers().location, origin);
          assert.equal(destination.pathname, "/login");
          assert.equal(destination.searchParams.get("next"), "/");
          assert(!(await response.text()).includes(nextName));
        }
      },
    );
    await scenario(
      "Ancienne entrée tableau-de-bord redirige vers l’accueil actuel",
      async () => {
        await page.goto("/tableau-de-bord");
        await expect(page).toHaveURL(origin + "/");
        await expect(mainHeading(page)).toHaveText("Bonjour " + nextName);
      },
    );
    await scenario(
      "Session révoquée : rechargement de l’accueil privé refusé",
      async () => {
        await prisma.session.deleteMany({
          where: { userId: "e2e-only-superadmin" },
        });
        await page.reload();
        await expect(page).toHaveURL(/\/login\?next=/);
        await expect(page.locator("#loginName")).toBeVisible();
        await expect(
          page.getByText("Bonjour " + nextName, { exact: true }),
        ).toHaveCount(0);
      },
    );
    assert.deepEqual(errors, []);
    fs.writeFileSync(
      path.join(__dirname, "resultats.json"),
      JSON.stringify(
        {
          date: "2026-10-12",
          runtime: "Next production + PostgreSQL17 + Chromium",
          browserVersion: browser.version(),
          scenarios: observations,
        },
        null,
        2,
      ) + "\n",
    );
  } catch (error) {
    let message = error.message;
    const secrets = [
      config.E2E_SUPERADMIN_PASSWORD,
      config.MFA_ENCRYPTION_KEY_V1,
      config.AUDIT_ENCRYPTION_KEY_V1,
    ];
    for (const file of fs.readdirSync(work))
      if (file.endsWith(".totp"))
        secrets.push(fs.readFileSync(path.join(work, file), "utf8"));
    for (const secret of secrets)
      if (secret) message = message.replaceAll(secret, "[secret masqué]");
    console.error(message.replace(/\b\d{6}\b/g, "[code masqué]"));
    process.exitCode = 1;
  } finally {
    for (const context of contexts) await context.close();
    await browser.close();
    await prisma.$disconnect();
  }
}
run();
