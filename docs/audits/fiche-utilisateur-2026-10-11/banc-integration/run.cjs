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
  target.pathname !== "/user_detail_audit_test" ||
  new URL(origin).hostname !== "127.0.0.1" ||
  new URL(origin).port !== "3118"
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
    ["get", "post", "patch", "delete"].map((method) => [
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
const privateValues = [];
async function scenario(name, action) {
  await action();
  observations.push({ name, result: "passed" });
  console.log("PASS " + name);
}
const profile = (page) => page.locator("#user-first-name");
const save = (page) =>
  page.getByRole("button", { name: "Enregistrer", exact: true });
const detail = (id) => directory + "/" + id;
const userApi = (id) => "/api/users/" + id;
const patchResponse = (page, id) =>
  page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === userApi(id) &&
      r.request().method() === "PATCH",
  );
async function openSection(page, id, section = "profile") {
  await page.goto(detail(id) + "?section=" + section);
  await page.getByRole("link", { name: "Profil", exact: true }).waitFor();
  if (section === "profile") await profile(page).waitFor();
  if (section === "access") await page.locator("#user-role").waitFor();
  if (section === "account")
    await page
      .getByRole("switch", {
        name: "Modifier son prénom et son nom",
        exact: true,
      })
      .waitFor();
  if (section === "security") {
    await page.locator("#user-active-switch").waitFor();
    await expect(
      page.locator('section[aria-labelledby="user-security-heading"]'),
    ).toHaveAttribute("aria-busy", "false");
  }
}
async function waitNextTotp(loginName) {
  const c = await prisma.totpCredential.findFirstOrThrow({
    where: { user: { loginName } },
  });
  if (
    c.lastUsedTimeStep !== null &&
    c.lastUsedTimeStep >= BigInt(Math.floor(Date.now() / 30000))
  ) {
    const delay = Number(c.lastUsedTimeStep + 1n) * 30000 - Date.now() + 300;
    assert(delay < 31000);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
}
async function rootCode() {
  await waitNextTotp(config.E2E_SUPERADMIN_LOGIN_NAME);
  const value = await generate({
    secret: fs.readFileSync(
      path.join(work, config.E2E_SUPERADMIN_LOGIN_NAME + ".totp"),
      "utf8",
    ),
  });
  privateValues.push(value);
  return value;
}
async function completeStepUp(page) {
  await page
    .locator("#admin-step-up-password")
    .fill(config.E2E_SUPERADMIN_PASSWORD);
  await page.locator("#admin-step-up-code").fill(await rootCode());
  await page
    .getByRole("button", { name: "Confirmer et continuer", exact: true })
    .click();
  await expect(page.locator("#admin-step-up-password")).toHaveCount(0);
}
async function rootProof(page) {
  const response = await api(page).post("/api/auth/step-up", {
    headers: await headers(page),
    data: {
      currentPassword: config.E2E_SUPERADMIN_PASSWORD,
      currentTotpCode: await rootCode(),
    },
  });
  await json(response);
}
async function current(page, id) {
  return (await json(await api(page).get(userApi(id)))).user;
}
async function patch(page, id, values, status = 200) {
  const before = await current(page, id);
  const response = await api(page).patch(userApi(id), {
    headers: await headers(page),
    data: { expectedUpdatedAt: before.updatedAt, ...values },
  });
  assert.equal(response.status(), status, "Unexpected PATCH result");
  return response;
}
async function run() {
  const browser = await chromium.launch({ headless: true });
  const contexts = [];
  try {
    const root = await authenticate(browser, config.E2E_SUPERADMIN_LOGIN_NAME);
    contexts.push(root.context);
    const page = root.page;
    const runId = Date.now().toString(36);
    const targetLogin = "detail." + runId;
    const targetSession = await authenticate(browser, targetLogin, {});
    contexts.push(targetSession.context);
    const target = await prisma.user.findUniqueOrThrow({
      where: { loginName: targetLogin },
    });
    let reissuedPassword;
    await prisma.user.update({
      where: { id: target.id },
      data: {
        firstName: "Camille",
        lastName: "Nom facultatif",
        contactEmail: "initial@example.test",
      },
    });

    await scenario(
      "real root and target logins/MFA, four detail sections at seven widths",
      async () => {
        for (const section of ["profile", "access", "account", "security"]) {
          await openSection(page, target.id, section);
          for (const width of [320, 390, 640, 768, 1024, 1440, 1920]) {
            await page.setViewportSize({ width, height: 1000 });
            await expect
              .poll(
                async () =>
                  page.evaluate(() =>
                    [
                      document.documentElement,
                      document.querySelector("#main-content"),
                    ].every((el) => el.scrollWidth - el.clientWidth <= 1),
                  ),
                { message: "Horizontal overflow " + section + "/" + width },
              )
              .toBe(true);
          }
        }
        await page.setViewportSize({ width: 1440, height: 1000 });
      },
    );
    await scenario(
      "clear optional surname, normalize contact and persist profile with audit",
      async () => {
        await openSection(page, target.id);
        await page.locator("#user-last-name").fill("");
        await page
          .locator("#user-contact-email")
          .fill("  CONTACT@EXAMPLE.TEST  ");
        const response = patchResponse(page, target.id);
        await save(page).click();
        assert.equal((await response).status(), 200);
        await expect(save(page)).toHaveCount(0);
        await page.reload();
        await page.waitForLoadState("networkidle");
        await expect(page.locator("#user-last-name")).toHaveValue("");
        const stored = await prisma.user.findUniqueOrThrow({
          where: { id: target.id },
        });
        assert.equal(stored.lastName, "");
        assert.equal(stored.firstName, "Camille");
        assert.equal(stored.contactEmail, "contact@example.test");
        assert(
          (await prisma.auditLog.count({
            where: { targetUserId: target.id, action: "USER_UPDATE" },
          })) > 0,
        );
        await main(page).evaluate((el) => {
          el.scrollTop = 0;
        });
        await page.screenshot({
          path: path.join(__dirname, "profil-1440.png"),
        });
        const unversioned = await api(page).patch(userApi(target.id), {
          headers: await headers(page),
          data: { firstName: "No version" },
        });
        assert.equal(unversioned.status(), 400);
      },
    );
    await scenario(
      "concurrent editors get conflict, preserve draft and explicitly refresh before save",
      async () => {
        const other = await root.context.newPage();
        try {
          await openSection(page, target.id);
          await openSection(other, target.id);
          await profile(page).fill("Version A");
          await profile(other).fill("Version B");
          let response = patchResponse(page, target.id);
          await save(page).click();
          assert.equal((await response).status(), 200);
          response = patchResponse(other, target.id);
          await save(other).click();
          assert.equal((await response).status(), 409);
          await expect(save(other)).toBeDisabled();
          await other
            .getByRole("button", {
              name: "Actualiser et conserver ma saisie",
              exact: true,
            })
            .click();
          await expect(profile(other)).toHaveValue("Version B");
          await expect(save(other)).toBeEnabled();
          response = patchResponse(other, target.id);
          await save(other).click();
          assert.equal((await response).status(), 200);
          assert.equal((await current(page, target.id)).firstName, "Version B");
        } finally {
          await other.close();
        }
      },
    );
    await scenario(
      "dirty section navigation keeps draft and restores focus on cancellation",
      async () => {
        await openSection(page, target.id);
        await profile(page).fill("Brouillon conserve");
        const security = page.getByRole("link", {
          name: "Sécurité",
          exact: true,
        });
        await security.focus();
        await page.keyboard.press("Enter");
        await expect(page.getByRole("alertdialog")).toBeVisible();
        await page.getByRole("button", { name: "Rester", exact: true }).click();
        await expect(security).toBeFocused();
        await expect(profile(page)).toHaveValue("Brouillon conserve");
        await page
          .getByRole("button", { name: "Annuler", exact: true })
          .click();
        await expect(profile(page)).toHaveValue("Version B");
      },
    );
    await scenario(
      "revoke one then all real sessions with a real password/TOTP challenge",
      async () => {
        const second = await authenticate(browser, targetLogin);
        contexts.push(second.context);
        await openSection(page, target.id, "security");
        await expect(
          page.getByRole("button", { name: /^Révoquer la session / }),
        ).toHaveCount(2);
        await prisma.session.updateMany({
          where: { userId: "e2e-only-superadmin" },
          data: {
            passwordReauthenticatedAt: null,
            criticalMfaVerifiedAt: null,
          },
        });
        await page
          .getByRole("button", { name: /^Révoquer la session / })
          .first()
          .click();
        await page
          .getByRole("button", { name: "Révoquer la session", exact: true })
          .click();
        await page.locator("#admin-step-up-password").waitFor();
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Annuler", exact: true })
          .click();
        assert.equal(
          await prisma.session.count({ where: { userId: target.id } }),
          2,
        );
        await page
          .getByRole("button", { name: /^Révoquer la session / })
          .first()
          .click();
        await page
          .getByRole("button", { name: "Révoquer la session", exact: true })
          .click();
        await completeStepUp(page);
        await expect(
          page.getByRole("button", { name: /^Révoquer la session / }),
        ).toHaveCount(1);
        const statuses = [
          (await api(targetSession.page).get("/api/auth/me")).status(),
          (await api(second.page).get("/api/auth/me")).status(),
        ].sort();
        assert.deepEqual(statuses, [200, 401]);
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
        await expect(
          page.getByText("Aucune session active.", { exact: true }),
        ).toBeVisible();
        assert.equal(
          await prisma.session.count({ where: { userId: target.id } }),
          0,
        );
        assert.equal(
          (await api(targetSession.page).get("/api/auth/me")).status(),
          401,
        );
        assert.equal(
          (await api(second.page).get("/api/auth/me")).status(),
          401,
        );
      },
    );
    await scenario(
      "administrative and personal permissions preserve the other scope",
      async () => {
        await patch(page, target.id, {
          permissionScope: "access",
          permissions: { "persons:view": true },
        });
        await openSection(page, target.id, "account");
        const toggle = page.getByRole("switch", {
          name: "Modifier son prénom et son nom",
          exact: true,
        });
        await expect(toggle).toBeChecked();
        await toggle.click();
        const response = patchResponse(page, target.id);
        await save(page).click();
        assert.equal((await response).status(), 200);
        await expect(save(page)).toBeDisabled();
        let user = await prisma.user.findUniqueOrThrow({
          where: { id: target.id },
        });
        assert.equal(user.permissions["persons:view"], true);
        assert.equal(user.permissions["account:update_profile"], false);
        await patch(page, target.id, {
          permissionScope: "access",
          permissions: null,
        });
        user = await prisma.user.findUniqueOrThrow({
          where: { id: target.id },
        });
        assert.equal(user.permissions["account:update_profile"], false);
        assert.notEqual(user.permissions["persons:view"], true);
      },
    );
    await scenario(
      "login rename reserves both names and keeps the contact independent",
      async () => {
        await openSection(page, target.id);
        await page.locator("#user-login-name").fill("renamed." + runId);
        await save(page).click();
        const response = patchResponse(page, target.id);
        await page
          .getByRole("button", { name: "Modifier et déconnecter", exact: true })
          .click();
        assert.equal((await response).status(), 200);
        await expect(save(page)).toHaveCount(0);
        const stored = await prisma.user.findUniqueOrThrow({
          where: { id: target.id },
        });
        assert.equal(stored.loginName, "renamed." + runId);
        assert.equal(stored.contactEmail, "contact@example.test");
        for (const loginName of [targetLogin, stored.loginName])
          assert.equal(
            (
              await prisma.loginNameReservation.findUniqueOrThrow({
                where: { loginName },
              })
            ).userId,
            target.id,
          );
      },
    );
    await scenario(
      "real password reset, copy, acknowledgement and hide without persistent secret",
      async () => {
        await openSection(page, target.id, "security");
        await page.locator("#user-reset-password").click();
        await page
          .getByRole("alertdialog")
          .getByRole("button", { name: "Réinitialiser", exact: true })
          .click();
        await expect(
          page.getByRole("heading", {
            name: "Nouveau mot de passe temporaire",
            exact: true,
          }),
        ).toBeVisible();
        const card = page
          .locator('[data-slot="card"]')
          .filter({
            has: page.getByRole("heading", {
              name: "Nouveau mot de passe temporaire",
              exact: true,
            }),
          });
        const password = await card.locator("code").innerText();
        privateValues.push(password);
        const stored = await prisma.user.findUniqueOrThrow({
          where: { id: target.id },
        });
        assert(await compare(password, stored.passwordHash));
        assert(stored.mustChangePassword);
        await root.context.grantPermissions([
          "clipboard-read",
          "clipboard-write",
        ]);
        await page
          .getByRole("button", {
            name: "Copier le mot de passe temporaire",
            exact: true,
          })
          .click();
        assert(
          (await page.evaluate(() => navigator.clipboard.readText())) ===
            password,
          "Clipboard mismatch",
        );
        await expect(
          page.locator("#reset-password-preserved"),
        ).not.toBeChecked();
        assert(
          !(
            await page.evaluate(() =>
              JSON.stringify({ ...localStorage, ...sessionStorage }),
            )
          ).includes(password),
        );
        const audits = await prisma.auditLog.findMany({
          where: { targetUserId: target.id },
        });
        assert(!JSON.stringify(audits).includes(password));
        await page.locator("#reset-password-preserved").check();
        await page
          .getByRole("button", { name: "Terminer et masquer", exact: true })
          .click();
        await expect(page.locator("#user-reset-password")).toBeFocused();
        await expect(card).toHaveCount(0);
      },
    );
    await scenario(
      "password reset committed with lost response requires GET then explicit new emission",
      async () => {
        let requests = 0;
        await page.route(
          "**" + userApi(target.id) + "/reset-password",
          async (route) => {
            requests++;
            const response = await route.fetch();
            assert.equal(response.status(), 200);
            await route.abort("connectionreset");
          },
        );
        await page.locator("#user-reset-password").click();
        await page
          .getByRole("alertdialog")
          .getByRole("button", { name: "Réinitialiser", exact: true })
          .click();
        await page
          .getByRole("button", {
            name: "Vérifier l’état du compte",
            exact: true,
          })
          .click();
        await expect(
          page.getByRole("button", {
            name: "Émettre un nouveau mot de passe",
            exact: true,
          }),
        ).toBeEnabled();
        assert.equal(requests, 1);
        await page.unroute("**" + userApi(target.id) + "/reset-password");
        const before = (
          await prisma.user.findUniqueOrThrow({ where: { id: target.id } })
        ).passwordHash;
        await page
          .getByRole("button", {
            name: "Émettre un nouveau mot de passe",
            exact: true,
          })
          .click();
        await page
          .getByRole("alertdialog")
          .getByRole("button", { name: "Réinitialiser", exact: true })
          .click();
        await expect(page.locator("#reset-password-preserved")).toBeVisible();
        reissuedPassword = await page
          .locator('[data-slot="card"]')
          .filter({
            has: page.getByRole("heading", {
              name: "Nouveau mot de passe temporaire",
              exact: true,
            }),
          })
          .locator("code")
          .innerText();
        privateValues.push(reissuedPassword);
        const after = (
          await prisma.user.findUniqueOrThrow({ where: { id: target.id } })
        ).passwordHash;
        assert(
          before !== after,
          "Explicit reissue must replace the earlier hash",
        );
        await page.locator("#reset-password-preserved").check();
        await page
          .getByRole("button", { name: "Terminer et masquer", exact: true })
          .click();
      },
    );
    await scenario(
      "root MFA recovery deletes old credentials and recovery codes, then allows fresh enrollment",
      async () => {
        await page
          .getByRole("button", {
            name: "Réinitialiser la double authentification",
            exact: true,
          })
          .click();
        await page
          .locator("#admin-mfa-reset-password")
          .fill(config.E2E_SUPERADMIN_PASSWORD);
        await page.locator("#admin-mfa-reset-code").fill(await rootCode());
        const response = page.waitForResponse(
          (r) =>
            r.url().endsWith("/reset-mfa") && r.request().method() === "POST",
        );
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Réinitialiser", exact: true })
          .click();
        assert.equal((await response).status(), 200);
        await expect(page.getByRole("dialog")).toHaveCount(0);
        assert.equal(
          await prisma.totpCredential.count({ where: { userId: target.id } }),
          0,
        );
        assert.equal(
          await prisma.mfaRecoveryCode.count({ where: { userId: target.id } }),
          0,
        );
        assert.equal(
          await prisma.session.count({ where: { userId: target.id } }),
          0,
        );
        assert.equal(
          (await prisma.user.findUniqueOrThrow({ where: { id: target.id } }))
            .mfaEnabledAt,
          null,
        );
        const renewed = await authenticate(
          browser,
          "renamed." + runId,
          undefined,
          reissuedPassword,
        );
        contexts.push(renewed.context);
        await expect(
          renewed.page.getByRole("heading", {
            name: "Changement de mot de passe requis",
            exact: true,
          }),
        ).toBeVisible();
        const password = "Audit!A7" + randomBytes(18).toString("base64url");
        privateValues.push(password);
        await renewed.page.locator("#newPassword").fill(password);
        await renewed.page.locator("#confirmPassword").fill(password);
        await renewed.page
          .getByRole("button", { name: "Changer le mot de passe", exact: true })
          .click();
        await expect(
          renewed.page.getByRole("heading", {
            name: "Changement de mot de passe requis",
            exact: true,
          }),
        ).toHaveCount(0);
        assert.equal(
          (await prisma.user.findUniqueOrThrow({ where: { id: target.id } }))
            .mustChangePassword,
          false,
        );
        assert.equal(
          await prisma.totpCredential.count({ where: { userId: target.id } }),
          1,
        );
      },
    );
    await scenario(
      "MFA reset committed with lost response is resolved by GET without duplicate POST",
      async () => {
        await openSection(page, target.id, "security");
        let requests = 0;
        await page.route(
          "**" + userApi(target.id) + "/reset-mfa",
          async (route) => {
            requests++;
            const response = await route.fetch();
            assert.equal(response.status(), 200);
            await route.abort("connectionreset");
          },
        );
        await page
          .getByRole("button", {
            name: "Réinitialiser la double authentification",
            exact: true,
          })
          .click();
        await page
          .locator("#admin-mfa-reset-password")
          .fill(config.E2E_SUPERADMIN_PASSWORD);
        await page.locator("#admin-mfa-reset-code").fill(await rootCode());
        const dialog = page.getByRole("dialog");
        await dialog
          .getByRole("button", { name: "Réinitialiser", exact: true })
          .click();
        const check = dialog.getByRole("button", {
          name: "Vérifier l’état du compte",
          exact: true,
        });
        await expect(check).toBeVisible();
        await expect(
          dialog.getByRole("button", { name: "Réinitialiser", exact: true }),
        ).toBeDisabled();
        await check.click();
        await expect(dialog).toHaveCount(0);
        assert.equal(requests, 1);
        assert.equal(
          await prisma.totpCredential.count({ where: { userId: target.id } }),
          0,
        );
        assert.equal(
          (await prisma.user.findUniqueOrThrow({ where: { id: target.id } }))
            .mfaEnabledAt,
          null,
        );
        await page.unroute("**" + userApi(target.id) + "/reset-mfa");
      },
    );
    await scenario(
      "read-only projection and live revocation remove private fields and prevent mutations",
      async () => {
        const readerLogin = "reader." + runId;
        const reader = await authenticate(browser, readerLogin, {
          "users:view": true,
          "users:view_contact": true,
          "users:view_security": true,
          "users:view_sessions": true,
        });
        contexts.push(reader.context);
        await openSection(reader.page, target.id);
        await expect(reader.page.locator("#user-contact-email")).toHaveValue(
          "contact@example.test",
        );
        await expect(profile(reader.page)).toBeDisabled();
        await prisma.user.update({
          where: { loginName: readerLogin },
          data: { permissions: { "users:view": true } },
        });
        // Advance only the browser's Date to exercise the existing one-minute
        // activity sync; timers and all server authorization still run normally.
        await reader.page.clock.setFixedTime(new Date(Date.now() + 65000));
        await reader.page.evaluate(() =>
          window.dispatchEvent(new Event("mousedown")),
        );
        await expect(
          reader.page.getByText("contact@example.test", { exact: true }),
        ).toHaveCount(0);
        await expect(reader.page.locator("#user-contact-email")).toHaveCount(0);
        const read = await current(reader.page, target.id);
        assert.equal(read.contactEmail, null);
        assert.equal(read.securityDetailsVisible, false);
        await patch(reader.page, target.id, { firstName: "Forbidden" }, 403);
        await prisma.user.update({
          where: { loginName: readerLogin },
          data: { permissions: { "users:view": false } },
        });
        await reader.page.clock.setFixedTime(new Date(Date.now() + 130000));
        await reader.page.evaluate(() =>
          window.dispatchEvent(new Event("mousedown")),
        );
        await expect(profile(reader.page)).toHaveCount(0);
        assert.equal(
          (await api(reader.page).get(userApi(target.id))).status(),
          403,
        );
      },
    );
    await scenario(
      "deactivation required before irreversible deletion, tombstone and reservation retained",
      async () => {
        await rootProof(page);
        await openSection(page, target.id, "security");
        await expect(
          page.getByRole("button", {
            name: "Supprimer définitivement",
            exact: true,
          }),
        ).toBeDisabled();
        assert.equal(
          (
            await api(page).delete(userApi(target.id), {
              headers: await headers(page),
            })
          ).status(),
          409,
        );
        await page.locator("#user-active-switch").click();
        const response = patchResponse(page, target.id);
        await page
          .getByRole("button", { name: "Désactiver le compte", exact: true })
          .click();
        assert.equal((await response).status(), 200);
        await page
          .getByRole("button", {
            name: "Supprimer définitivement",
            exact: true,
          })
          .click();
        await page
          .locator("#delete-user-confirmation")
          .fill("renamed." + runId);
        const deletion = page.waitForResponse(
          (r) =>
            new URL(r.url()).pathname === userApi(target.id) &&
            r.request().method() === "DELETE",
        );
        await page
          .getByRole("alertdialog")
          .getByRole("button", {
            name: "Supprimer définitivement",
            exact: true,
          })
          .click();
        assert.equal((await deletion).status(), 200);
        await expect(page).toHaveURL(/\/systeme\/utilisateurs(?:\?|$)/);
        const tombstone = await prisma.user.findUniqueOrThrow({
          where: { id: target.id },
        });
        assert(tombstone.deletedAt);
        assert.equal(tombstone.contactEmail, null);
        assert.equal(
          await prisma.session.count({ where: { userId: target.id } }),
          0,
        );
        assert.equal(
          (
            await prisma.loginNameReservation.findUniqueOrThrow({
              where: { loginName: targetLogin },
            })
          ).userId,
          target.id,
        );
        assert.equal((await api(page).get(userApi(target.id))).status(), 404);
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
  } catch (error) {
    let message = error.message;
    for (const secret of [...privateValues, config.E2E_SUPERADMIN_PASSWORD])
      if (secret) message = message.replaceAll(secret, "[secret masqué]");
    console.error(message);
    throw new Error(
      "Detail integration failed; inspect redacted diagnostic above.",
    );
  } finally {
    for (const context of contexts) await context.close();
    await browser.close();
    await prisma.$disconnect();
  }
}
run().catch(() => {
  process.exitCode = 1;
});
