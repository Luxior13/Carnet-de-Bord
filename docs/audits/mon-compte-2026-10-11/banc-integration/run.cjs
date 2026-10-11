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
  target.pathname !== "/account_audit_test" ||
  new URL(origin).hostname !== "127.0.0.1" ||
  new URL(origin).port !== "3119"
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
const profile = (page) => page.locator("#edit-firstName");
const save = (page) =>
  page.getByRole("button", { name: "Enregistrer", exact: true });
const patchResponse = (page, url = "/api/auth/me") =>
  page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === url && r.request().method() === "PATCH",
  );
async function openAccount(page, section = "profile") {
  await page.goto(
    "/mon-compte" + (section === "security" ? "?section=security" : ""),
  );
  if (section === "profile") await profile(page).waitFor();
  else await expect(page.locator("#account-sessions-heading")).toBeVisible();
  await page.waitForLoadState("networkidle");
}
async function patchProfile(page, changes) {
  const before = (await json(await api(page).get("/api/auth/me"))).user;
  return json(
    await api(page).patch("/api/auth/me", {
      headers: await headers(page),
      data: {
        firstName: before.firstName,
        lastName: before.lastName ?? "",
        expectedUpdatedAt: before.updatedAt,
        ...changes,
      },
    }),
  );
}
async function contactDialog(page) {
  await page.getByRole("button", { name: /^(Ajouter|Gérer)$/ }).click();
  return page.getByRole("dialog");
}
async function submitContact(page, email, password) {
  const dialog = await contactDialog(page);
  await dialog.locator("#account-contact-email").fill(email);
  await dialog.locator("#account-contact-current-password").fill(password);
  const response = patchResponse(page, "/api/auth/contact-email");
  await dialog.getByRole("button", { name: "Confirmer", exact: true }).click();
  return response;
}
async function freshCode(loginName) {
  const credential = await prisma.totpCredential.findFirstOrThrow({
    where: { user: { loginName } },
  });
  if (
    credential.lastUsedTimeStep !== null &&
    credential.lastUsedTimeStep >= BigInt(Math.floor(Date.now() / 30000))
  ) {
    const delay =
      Number(credential.lastUsedTimeStep + 1n) * 30000 - Date.now() + 250;
    assert(delay < 31000);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  const code = await generate({
    secret: fs.readFileSync(path.join(work, loginName + ".totp"), "utf8"),
  });
  privateValues.push(code);
  return code;
}
async function run() {
  const browser = await chromium.launch({ headless: true });
  const contexts = [];
  const loginName = "account-audit-" + randomBytes(4).toString("hex");
  let password = config.E2E_SUPERADMIN_PASSWORD;
  try {
    const primary = await authenticate(browser, loginName, {});
    contexts.push(primary.context);
    const page = primary.page;
    const user = await prisma.user.findUniqueOrThrow({ where: { loginName } });
    const second = await primary.context.newPage();
    second.setDefaultTimeout(12000);
    await scenario(
      "Connexion réelle et configuration MFA initiale",
      async () => {
        await openAccount(page);
        const authenticated = (await json(await api(page).get("/api/auth/me")))
          .user;
        assert.equal(authenticated.id, user.id);
        assert(
          Number.isFinite(Date.parse(authenticated.updatedAt)),
          "Session must expose the account version required by personal forms",
        );
        assert(
          await prisma.totpCredential.findFirst({ where: { userId: user.id } }),
        );
        await expect(save(page)).toHaveCount(0);
      },
    );
    await scenario(
      "Profil : sauvegarde, nom facultatif, identité de connexion inchangée",
      async () => {
        await profile(page).fill("  Camille  ");
        await page.locator("#edit-lastName").fill("");
        await expect(save(page)).toBeEnabled();
        assert.equal(
          await save(page).evaluate((button) => button.form?.id),
          "account-profile-form",
        );
        const response = patchResponse(page);
        await profile(page).press("Enter");
        assert.equal((await response).status(), 200);
        await expect(save(page)).toHaveCount(0);
        const saved = await prisma.user.findUniqueOrThrow({
          where: { id: user.id },
        });
        assert.equal(saved.firstName, "Camille");
        assert.equal(saved.lastName, "");
        assert.equal(saved.loginName, loginName);
      },
    );
    await scenario(
      "Deux onglets : conflit profil, fusion du seul champ modifié et reprise",
      async () => {
        await openAccount(second);
        await profile(page).fill("Brouillon local");
        await patchProfile(second, { lastName: "Nom distant" });
        const response = patchResponse(page);
        await save(page).click();
        assert.equal((await response).status(), 409);
        await expect(profile(page)).toHaveValue("Brouillon local");
        await page
          .getByRole("button", { name: "Actualiser la version", exact: true })
          .click();
        await expect(page.locator("#edit-lastName")).toHaveValue("Nom distant");
        await expect(profile(page)).toHaveValue("Brouillon local");
        const retry = patchResponse(page);
        await save(page).click();
        assert.equal((await retry).status(), 200);
        await expect(save(page)).toHaveCount(0);
        const saved = await prisma.user.findUniqueOrThrow({
          where: { id: user.id },
        });
        assert.equal(saved.firstName, "Brouillon local");
        assert.equal(saved.lastName, "Nom distant");
      },
    );
    await scenario(
      "Contact normalisé sans effacer le brouillon du profil",
      async () => {
        await profile(page).fill("Profil conservé");
        assert.equal(
          (
            await submitContact(page, "  CONTACT@EXAMPLE.TEST  ", password)
          ).status(),
          200,
        );
        await expect(page.getByRole("dialog")).toHaveCount(0);
        await expect(profile(page)).toHaveValue("Profil conservé");
        const saved = await prisma.user.findUniqueOrThrow({
          where: { id: user.id },
        });
        assert.equal(saved.contactEmail, "contact@example.test");
        assert.equal(saved.loginName, loginName);
        const response = patchResponse(page);
        await save(page).click();
        assert.equal((await response).status(), 200);
        await expect(save(page)).toHaveCount(0);
      },
    );
    await scenario(
      "Contact : formulaire périmé refusé, saisie préservée après relecture",
      async () => {
        const dialog = await contactDialog(page);
        await dialog
          .locator("#account-contact-email")
          .fill("local@example.test");
        await dialog
          .locator("#account-contact-current-password")
          .fill(password);
        const current = (await json(await api(second).get("/api/auth/me")))
          .user;
        await json(
          await api(second).patch("/api/auth/contact-email", {
            headers: await headers(second),
            data: {
              contactEmail: "distant@example.test",
              currentPassword: password,
              expectedUpdatedAt: current.updatedAt,
            },
          }),
        );
        const response = patchResponse(page, "/api/auth/contact-email");
        await dialog
          .getByRole("button", { name: "Confirmer", exact: true })
          .click();
        assert.equal((await response).status(), 409);
        await expect(
          dialog.locator("#account-contact-current-password"),
        ).toHaveValue("");
        await dialog
          .getByRole("button", { name: "Actualiser la version", exact: true })
          .click();
        await expect(dialog.getByRole("status")).toContainText(
          "distant@example.test",
        );
        await expect(dialog.locator("#account-contact-email")).toHaveValue(
          "local@example.test",
        );
        await dialog
          .locator("#account-contact-current-password")
          .fill(password);
        const retry = patchResponse(page, "/api/auth/contact-email");
        await dialog
          .getByRole("button", { name: "Confirmer", exact: true })
          .click();
        assert.equal((await retry).status(), 200);
        await expect(dialog).toHaveCount(0);
      },
    );
    await scenario(
      "Contact : écriture réelle puis réponse perdue, relecture sans rejeu",
      async () => {
        let writes = 0;
        const loseReply = async (route) => {
          if (route.request().method() !== "PATCH") return route.continue();
          writes++;
          const committed = await route.fetch();
          assert.equal(committed.status(), 200);
          await route.abort("failed");
        };
        await page.route("**/api/auth/contact-email", loseReply);
        const dialog = await contactDialog(page);
        await dialog
          .locator("#account-contact-email")
          .fill("lost-reply@example.test");
        await dialog
          .locator("#account-contact-current-password")
          .fill(password);
        await dialog
          .getByRole("button", { name: "Confirmer", exact: true })
          .click();
        await expect(dialog.getByRole("alert")).toContainText("peut-être");
        assert.equal(
          (await prisma.user.findUniqueOrThrow({ where: { id: user.id } }))
            .contactEmail,
          "lost-reply@example.test",
        );
        await page.unroute("**/api/auth/contact-email", loseReply);
        await dialog
          .getByRole("button", { name: "Actualiser la version", exact: true })
          .click();
        await expect(dialog.getByRole("status")).toContainText(
          "lost-reply@example.test",
        );
        await expect(
          dialog.getByRole("button", { name: "Confirmer", exact: true }),
        ).toBeDisabled();
        assert.equal(writes, 1);
        await dialog
          .getByRole("button", { name: "Annuler", exact: true })
          .click();
        await expect(dialog).toHaveCount(0);
      },
    );
    await scenario(
      "Suppression du contact confirmée avec mot de passe",
      async () => {
        const dialog = await contactDialog(page);
        await dialog
          .getByRole("button", {
            name: "Supprimer l'adresse de contact",
            exact: true,
          })
          .click();
        await dialog
          .locator("#account-contact-current-password")
          .fill(password);
        const response = patchResponse(page, "/api/auth/contact-email");
        await dialog
          .getByRole("button", {
            name: "Confirmer la suppression",
            exact: true,
          })
          .click();
        assert.equal((await response).status(), 200);
        await expect(dialog).toHaveCount(0);
        assert.equal(
          (await prisma.user.findUniqueOrThrow({ where: { id: user.id } }))
            .contactEmail,
          null,
        );
      },
    );
    await scenario(
      "Profil et Sécurité de 320 à 1920 px sans débordement",
      async () => {
        for (const section of ["profile", "security"]) {
          await openAccount(page, section);
          for (const width of [320, 390, 640, 768, 1024, 1440, 1920]) {
            await page.setViewportSize({
              width,
              height: width < 768 ? 844 : 1000,
            });
            await expect
              .poll(() =>
                page.evaluate(
                  () => document.documentElement.scrollWidth - innerWidth,
                ),
              )
              .toBeLessThanOrEqual(1);
            if (width === 390 || width === 1440)
              await page.screenshot({
                path: path.join(__dirname, `${section}-${width}.png`),
                fullPage: true,
              });
          }
        }
        await page.setViewportSize({ width: 1440, height: 1000 });
      },
    );
    let extra;
    await scenario(
      "Sessions : appareil réel supplémentaire et révocation individuelle",
      async () => {
        extra = await authenticate(browser, loginName);
        contexts.push(extra.context);
        await openAccount(page, "security");
        const rows = await json(await api(page).get("/api/auth/sessions"));
        assert.equal(rows.sessions.length, 2);
        await page
          .getByRole("button", {
            name: /^Déconnecter (Windows|Appareil|Linux|Mac|Android)/,
          })
          .first()
          .click();
        const dialog = page.getByRole("alertdialog");
        const response = page.waitForResponse(
          (r) =>
            new URL(r.url()).pathname === "/api/auth/sessions" &&
            r.request().method() === "DELETE",
        );
        await dialog
          .getByRole("button", { name: "Déconnecter", exact: true })
          .click();
        assert.equal((await response).status(), 200);
        await expect(dialog).toHaveCount(0);
        await expect(page.locator("#account-sessions-heading")).toBeFocused();
        assert.equal((await api(extra.page).get("/api/auth/me")).status(), 401);
        assert.equal((await api(page).get("/api/auth/me")).status(), 200);
      },
    );
    await scenario(
      "Mot de passe : validation réelle, rotation et fermeture des autres sessions",
      async () => {
        extra = await authenticate(browser, loginName);
        contexts.push(extra.context);
        await openAccount(page, "security");
        await page
          .getByRole("button", { name: "Changer le mot de passe", exact: true })
          .click();
        const dialog = page.getByRole("dialog");
        const next = "Changed!7" + randomBytes(20).toString("base64url");
        privateValues.push(next);
        await dialog.locator("#currentPassword").fill(password);
        await dialog.locator("#newPassword").fill(next);
        await dialog.locator("#confirmPassword").fill(next);
        const response = page.waitForResponse(
          (r) =>
            new URL(r.url()).pathname === "/api/auth/change-password" &&
            r.request().method() === "POST",
        );
        await dialog
          .getByRole("button", { name: "Changer le mot de passe", exact: true })
          .click();
        assert.equal((await response).status(), 200);
        await expect(dialog).toHaveCount(0);
        const saved = await prisma.user.findUniqueOrThrow({
          where: { id: user.id },
        });
        assert(await compare(next, saved.passwordHash));
        assert.equal(await compare(password, saved.passwordHash), false);
        password = next;
        assert.equal((await api(extra.page).get("/api/auth/me")).status(), 401);
        assert.equal((await api(page).get("/api/auth/me")).status(), 200);
      },
    );
    await scenario(
      "Codes de secours : preuve TOTP, remplacement réel et acquittement",
      async () => {
        await openAccount(page, "security");
        const previous = await prisma.mfaRecoveryCode.findMany({
          where: { userId: user.id },
          select: { id: true },
        });
        await page
          .getByRole("button", {
            name: "Nouveaux codes de secours",
            exact: true,
          })
          .click();
        const dialog = page.getByRole("dialog");
        await dialog.locator("#mfa-action-current-password").fill(password);
        await dialog
          .locator("#mfa-action-current-code")
          .fill(await freshCode(loginName));
        const response = page.waitForResponse(
          (r) =>
            new URL(r.url()).pathname === "/api/auth/mfa/recovery-codes" &&
            r.request().method() === "POST",
        );
        await dialog
          .getByRole("button", { name: "Générer", exact: true })
          .click();
        assert.equal((await response).status(), 200);
        await expect(
          dialog.getByRole("list", { name: "Codes de secours", exact: true }),
        ).toBeVisible();
        const next = await prisma.mfaRecoveryCode.findMany({
          where: { userId: user.id },
          select: { id: true },
        });
        assert.equal(next.length, 10);
        assert(next.every((n) => !previous.some((p) => p.id === n.id)));
        const visibleCodes = await dialog
          .getByRole("list", { name: "Codes de secours", exact: true })
          .getByRole("listitem")
          .allTextContents();
        privateValues.push(...visibleCodes);
        await primary.context.grantPermissions([
          "clipboard-read",
          "clipboard-write",
        ]);
        await dialog
          .getByRole("button", { name: "Copier", exact: true })
          .click();
        await expect
          .poll(() =>
            page.evaluate(async () =>
              (await navigator.clipboard.readText()).replace(/\r\n/g, "\n"),
            ),
          )
          .toBe(visibleCodes.join("\n"));
        const downloadPromise = page.waitForEvent("download");
        await dialog
          .getByRole("button", { name: "Télécharger", exact: true })
          .click();
        const download = await downloadPromise;
        const downloadPath = path.join(work, "recovery-codes-private.txt");
        await download.saveAs(downloadPath);
        const file = fs.readFileSync(downloadPath, "utf8");
        assert(visibleCodes.every((code) => file.includes(code)));
        fs.unlinkSync(downloadPath);
        await expect(
          dialog.getByRole("button", { name: "Terminer", exact: true }),
        ).toBeDisabled();
        await dialog
          .getByRole("checkbox", {
            name: /J.ai enregistré ces codes dans un endroit sûr/,
          })
          .check();
        await dialog
          .getByRole("button", { name: "Terminer", exact: true })
          .click();
        await expect(dialog).toHaveCount(0);
        assert.equal((await api(page).get("/api/auth/me")).status(), 200);
      },
    );
    await scenario(
      "Autonomie du profil retirée à chaud, contact personnel toujours accessible",
      async () => {
        await openAccount(page);
        await prisma.user.update({
          where: { id: user.id },
          data: {
            permissions: {
              "account:update_profile": false,
              "account:update_contact": false,
            },
          },
        });
        await page.clock.setFixedTime(new Date(Date.now() + 130000));
        await page.evaluate(() => window.dispatchEvent(new Event("mousedown")));
        await expect(profile(page)).toBeDisabled();
        await expect(
          page.getByRole("button", { name: /^(Ajouter|Gérer)$/ }),
        ).toBeEnabled();
        const current = (await json(await api(page).get("/api/auth/me"))).user;
        assert.equal(
          (
            await api(page).patch("/api/auth/me", {
              headers: await headers(page),
              data: {
                firstName: "Interdit",
                lastName: "",
                expectedUpdatedAt: current.updatedAt,
              },
            })
          ).status(),
          403,
        );
        assert.equal(
          (
            await api(page).patch("/api/auth/contact-email", {
              headers: await headers(page),
              data: {
                contactEmail: "personal@example.test",
                currentPassword: password,
                expectedUpdatedAt: current.updatedAt,
              },
            })
          ).status(),
          200,
        );
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
      "Account integration failed; inspect redacted diagnostic above.",
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
