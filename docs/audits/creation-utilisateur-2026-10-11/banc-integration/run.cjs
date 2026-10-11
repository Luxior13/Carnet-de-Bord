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
  (target.port || "5432") === "5432" ||
  target.pathname !== "/creation_audit_test" ||
  new URL(origin).hostname !== "127.0.0.1" ||
  new URL(origin).port !== "3117"
) {
  throw new Error(
    "This harness requires the explicitly isolated local audit targets.",
  );
}
const work = path.dirname(envFile);
const prisma = new PrismaClient({ datasourceUrl: target.toString() });
const observations = [];
const { compare } = require("bcryptjs");
const { randomBytes } = require("node:crypto");
const directory = "/systeme/utilisateurs";
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
const main = (page) => page.locator("#main-content");
// Chromium accepts Secure cookies on loopback HTTP; Playwright's separate
// request client does not. Exercise the browser's actual authenticated fetch.
const api = (page) =>
  Object.fromEntries(
    ["get", "post", "patch"].map((method) => [
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
        role: "USER",
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
async function scenario(name, action) {
  await action();
  observations.push({ name, result: "passed" });
  console.log("PASS " + name);
}
async function openForm(page, returnTo) {
  await page.goto(
    directory +
      "/nouveau" +
      (returnTo ? "?returnTo=" + encodeURIComponent(returnTo) : ""),
  );
  await page.locator("#newFirstName").waitFor();
}
async function fillForm(page, loginName, firstName = "Audit") {
  await page.locator("#newFirstName").fill(firstName);
  await page.locator("#newLoginName").fill(loginName);
}
const submit = (page) =>
  page.getByRole("button", { name: "Créer le compte", exact: true });
const confirm = (page) =>
  page.getByRole("heading", { name: "Compte créé", exact: true });
const creationBody = (loginName, role = "USER") => ({
  loginName,
  firstName: "Audit",
  lastName: "",
  contactEmail: "",
  role,
});
async function waitNextTotp(loginName) {
  const credential = await prisma.totpCredential.findFirstOrThrow({
    where: { user: { loginName } },
  });
  const step = BigInt(Math.floor(Date.now() / 30000));
  if (
    credential.lastUsedTimeStep !== null &&
    credential.lastUsedTimeStep >= step
  ) {
    const delay =
      Number(credential.lastUsedTimeStep + 1n) * 30000 - Date.now() + 300;
    assert(delay < 31000);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
async function run() {
  const browser = await chromium.launch({ headless: true });
  try {
    const { page, context } = await authenticate(
      browser,
      config.E2E_SUPERADMIN_LOGIN_NAME,
    );
    let created, temporaryPassword;
    const runId = Date.now().toString(36);
    const loginName = "created." + runId;
    const returnTo = directory + "?search=created&role=USER&page=2";
    await scenario(
      "real login + MFA, returnTo and responsive form at seven widths",
      async () => {
        await openForm(page, returnTo);
        await expect(
          page.getByRole("link", { name: "Annuler", exact: true }),
        ).toHaveAttribute("href", returnTo);
        for (const width of [320, 390, 640, 768, 1024, 1440, 1920]) {
          await page.setViewportSize({ width, height: 1000 });
          const overflow = await page.evaluate(() =>
            [
              document.documentElement,
              document.querySelector("#main-content"),
            ].map((el) => el.scrollWidth - el.clientWidth),
          );
          assert(
            overflow.every((value) => value <= 1),
            "Horizontal overflow at " + width,
          );
        }
        await page.setViewportSize({ width: 1440, height: 1000 });
      },
    );
    await scenario(
      "invalid email prevents POST; real USER creation, optional surname, contact normalization, bcrypt and audit",
      async () => {
        await fillForm(page, loginName);
        const email = page.locator("#newContactAddress");
        await email.focus();
        await email.fill("invalide");
        let requests = 0;
        const listener = (request) => {
          if (
            request.method() === "POST" &&
            new URL(request.url()).pathname === "/api/users"
          )
            requests++;
        };
        page.on("request", listener);
        await submit(page).click();
        await expect(email).toHaveAttribute("aria-invalid", "true");
        await expect(email).toBeFocused();
        assert.equal(requests, 0);
        await email.fill("  Audit.Contact@Example.Test  ");
        await submit(page).click();
        await expect(confirm(page)).toBeVisible();
        await expect(confirm(page)).toBeFocused();
        assert.equal(requests, 1);
        page.off("request", listener);
        temporaryPassword = await page
          .locator('section[aria-labelledby="created-password-title"] code')
          .innerText();
        created = await prisma.user.findUniqueOrThrow({ where: { loginName } });
        assert.equal(created.lastName, "");
        assert.equal(created.contactEmail, "audit.contact@example.test");
        assert.equal(created.mustChangePassword, true);
        assert.equal(created.isProtected, false);
        assert.equal(created.role, "USER");
        assert(await compare(temporaryPassword, created.passwordHash));
        assert.equal(
          (
            await prisma.loginNameReservation.findUniqueOrThrow({
              where: { loginName },
            })
          ).userId,
          created.id,
        );
        const audits = await prisma.auditLog.findMany({
          where: { action: "USER_CREATE", targetUserId: created.id },
        });
        assert.equal(audits.length, 1);
        assert(!JSON.stringify(audits).includes(temporaryPassword));
      },
    );
    await scenario(
      "clipboard, explicit acknowledgement, reset cancellation focus and no persistent secret",
      async () => {
        await context.grantPermissions(["clipboard-read", "clipboard-write"]);
        await page
          .getByRole("button", {
            name: "Copier le mot de passe temporaire",
            exact: true,
          })
          .click();
        await expect(
          page.getByText(
            "Mot de passe copié. Conservez-le pour le transmettre.",
            { exact: true },
          ),
        ).toBeVisible();
        assert(
          (await page.evaluate(() => navigator.clipboard.readText())) ===
            temporaryPassword,
          "The clipboard must contain the current secret",
        );
        await expect(page.locator("#password-preserved")).not.toBeChecked();
        await page
          .getByRole("button", { name: "Créer un autre", exact: true })
          .click();
        await expect(page.getByRole("alertdialog")).toBeVisible();
        await page.getByRole("button", { name: "Rester", exact: true }).click();
        await expect(
          page.getByRole("button", { name: "Créer un autre", exact: true }),
        ).toBeFocused();
        const persisted = await page.evaluate(() =>
          JSON.stringify({
            local: { ...localStorage },
            session: { ...sessionStorage },
          }),
        );
        assert(!persisted.includes(temporaryPassword));
        await page.locator("#password-preserved").check();
      },
    );
    await scenario(
      "new account authenticates, enrolls MFA, changes temporary password and signs in again",
      async () => {
        const newSession = await authenticate(
          browser,
          loginName,
          undefined,
          temporaryPassword,
        );
        const newPage = newSession.page;
        await expect(
          newPage.getByRole("heading", {
            name: "Changement de mot de passe requis",
            exact: true,
          }),
        ).toBeVisible();
        const replacement = "Audit!A7" + randomBytes(18).toString("base64url");
        await newPage.locator("#newPassword").fill(replacement);
        await newPage.locator("#confirmPassword").fill(replacement);
        const change = newPage.waitForResponse(
          (response) =>
            response.url().endsWith("/api/auth/change-password") &&
            response.request().method() === "POST",
        );
        await newPage
          .getByRole("button", { name: /Changer le mot de passe/ })
          .click();
        assert.equal((await change).status(), 200);
        await expect(
          newPage.getByRole("heading", {
            name: "Changement de mot de passe requis",
            exact: true,
          }),
        ).not.toBeVisible();
        const persisted = await prisma.user.findUniqueOrThrow({
          where: { id: created.id },
        });
        assert.equal(persisted.mustChangePassword, false);
        assert(await compare(replacement, persisted.passwordHash));
        assert(!(await compare(temporaryPassword, persisted.passwordHash)));
        assert(
          await prisma.totpCredential.findUnique({
            where: { userId: created.id },
          }),
        );
        await newSession.context.close();
        const reconnect = await authenticate(
          browser,
          loginName,
          undefined,
          replacement,
        );
        const me = await json(await api(reconnect.page).get("/api/auth/me"));
        assert.equal(me.user.id, created.id);
        await reconnect.context.close();
      },
    );
    await scenario(
      "duplicate identifier retained and focused; strict input and CSRF rejection",
      async () => {
        await page
          .getByRole("button", { name: "Créer un autre", exact: true })
          .click();
        await expect(page.locator("#newFirstName")).toBeFocused();
        await fillForm(page, loginName);
        await submit(page).click();
        await expect(page.locator("#newLoginName")).toHaveAttribute(
          "aria-invalid",
          "true",
        );
        await expect(page.locator("#newLoginName")).toBeFocused();
        await expect(page.locator("#newFirstName")).toHaveValue("Audit");
        const extra = await api(page).post("/api/users", {
          headers: await headers(page),
          data: { ...creationBody("invalid." + runId), isProtected: true },
        });
        assert.equal(extra.status(), 400);
        const csrf = await api(page).post("/api/users", {
          data: creationBody("csrf." + runId),
        });
        assert.equal(csrf.status(), 403);
      },
    );
    await scenario(
      "ADMIN proof cancellation retains form; real password and fresh TOTP create ADMIN",
      async () => {
        await page.locator("#newLoginName").fill("admin." + runId);
        await page.locator('label[for="newRole-ADMIN"]').click();
        await expect(page.locator("#newRole-ADMIN")).toBeChecked();
        // Root login is real; explicitly age only this isolated session's proof.
        await prisma.session.updateMany({
          where: { userId: "e2e-only-superadmin" },
          data: {
            passwordReauthenticatedAt: null,
            criticalMfaVerifiedAt: null,
          },
        });
        await submit(page).click();
        await page.locator("#admin-step-up-password").waitFor();
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Annuler", exact: true })
          .click();
        await expect(submit(page)).toBeFocused();
        await expect(page.locator("#newLoginName")).toHaveValue(
          "admin." + runId,
        );
        await submit(page).click();
        await page
          .locator("#admin-step-up-password")
          .fill(config.E2E_SUPERADMIN_PASSWORD);
        await waitNextTotp(config.E2E_SUPERADMIN_LOGIN_NAME);
        await page
          .locator("#admin-step-up-code")
          .fill(
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
        await expect(confirm(page)).toBeVisible();
        assert.equal(
          (
            await prisma.user.findUniqueOrThrow({
              where: { loginName: "admin." + runId },
            })
          ).role,
          "ADMIN",
        );
        await page.locator("#password-preserved").check();
      },
    );
    await scenario(
      "lost real commit response recovers by exact login with one account and one audit",
      async () => {
        await page
          .getByRole("button", { name: "Créer un autre", exact: true })
          .click();
        const lostLogin = "lost." + runId;
        await fillForm(page, lostLogin);
        let posts = 0;
        await page.route("**/api/users", async (route) => {
          if (route.request().method() !== "POST") return route.continue();
          posts++;
          const response = await route.fetch();
          assert.equal(response.status(), 200);
          await route.abort("connectionreset");
        });
        await submit(page).click();
        await expect(
          page
            .locator('[data-slot="alert-title"]')
            .filter({ hasText: "Vérifier la création" }),
        ).toBeVisible();
        await expect(page.locator("#newFirstName")).toBeDisabled();
        await page
          .getByRole("button", { name: "Vérifier la création", exact: true })
          .click();
        await expect(
          page.getByText("Un compte utilise cet identifiant", { exact: true }),
        ).toBeVisible();
        assert.equal(posts, 1);
        assert.equal(
          await prisma.user.count({ where: { loginName: lostLogin } }),
          1,
        );
        const lost = await prisma.user.findUniqueOrThrow({
          where: { loginName: lostLogin },
        });
        assert.equal(
          await prisma.auditLog.count({
            where: { action: "USER_CREATE", targetUserId: lost.id },
          }),
          1,
        );
        const data = await json(
          await api(page).get("/api/users?limit=1&loginName=" + lostLogin),
        );
        assert.equal(data.users[0].id, lost.id);
        assert(!JSON.stringify(data).includes("passwordHash"));
        assert(!JSON.stringify(data).includes("temporaryPassword"));
        await page.unroute("**/api/users");
      },
    );
    await scenario(
      "delegated creator USER allowed, ADMIN denied, live permission revocation denied",
      async () => {
        const delegate = "delegate." + runId;
        const session = await authenticate(browser, delegate, {
          "users:view": true,
          "users:create": true,
        });
        await openForm(session.page);
        await expect(
          session.page.getByRole("radio", { name: /Administrateur/ }),
        ).toHaveCount(0);
        const authHeaders = await headers(session.page);
        const createdData = await json(
          await api(session.page).post("/api/users", {
            headers: authHeaders,
            data: creationBody("delegated." + runId),
          }),
        );
        assert.equal(createdData.user.role, "USER");
        const denied = await api(session.page).post("/api/users", {
          headers: authHeaders,
          data: creationBody("denied." + runId, "ADMIN"),
        });
        assert.equal(denied.status(), 403);
        await prisma.user.update({
          where: { loginName: delegate },
          data: { permissions: { "users:view": true, "users:create": false } },
        });
        const revoked = await api(session.page).post("/api/users", {
          headers: authHeaders,
          data: creationBody("revoked." + runId),
        });
        assert.equal(revoked.status(), 403);
        assert.equal(
          await prisma.user.count({
            where: {
              loginName: { in: ["denied." + runId, "revoked." + runId] },
            },
          }),
          0,
        );
        await session.context.close();
      },
    );
    await scenario(
      "unsafe returnTo sanitized and clean final form screenshot",
      async () => {
        await openForm(page, "https://outside.example.test");
        await expect(
          page.getByRole("link", { name: "Annuler", exact: true }),
        ).toHaveAttribute("href", directory);
        await main(page).evaluate((el) => {
          el.scrollTop = 0;
        });
        await page.screenshot({ path: path.join(__dirname, "form-1440.png") });
      },
    );
    fs.writeFileSync(
      path.join(__dirname, "resultats.json"),
      JSON.stringify(
        {
          date: "2026-10-11",
          runtime: "Next production + PostgreSQL 17 + Chromium",
          browserVersion: browser.version(),
          scenarios: observations,
        },
        null,
        2,
      ) + "\n",
    );
    await context.close();
  } catch (error) {
    // Never capture a temporary password, MFA enrollment seed or recovery code.
    console.error(error.message);
    throw error;
  } finally {
    await browser.close();
    await prisma.$disconnect();
  }
}
run().catch(() => {
  process.exitCode = 1;
});
