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
  target.pathname !== "/settings_audit_test" ||
  new URL(origin).hostname !== "127.0.0.1" ||
  new URL(origin).port !== "3120"
) {
  throw new Error(
    "This harness requires the explicitly isolated local audit targets.",
  );
}
const work = path.dirname(envFile);
const prisma = new PrismaClient({ datasourceUrl: target.toString() });
const observations = [];
const { spawnSync } = require("node:child_process");
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
const settingKey = "audit.retentionDays";
const endpoint = "/api/systeme/parametres";
const settingUrl = endpoint + "/" + settingKey;
const row = (page) => page.locator('[data-setting-key="audit.retentionDays"]');
const input = (page) => page.locator("#system-setting-audit-retentionDays");
const edit = (page) => page.getByRole("button", { name: /^Modifier —/ });
const save = (page) => page.getByRole("button", { name: /^Enregistrer —/ });
const changed = (page) =>
  page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === settingUrl &&
      r.request().method() === "PUT",
  );
async function current(page) {
  return (await json(await api(page).get(endpoint)))[0];
}
async function put(page, value, version) {
  return api(page).put(settingUrl, {
    headers: await headers(page),
    data: { value, expectedVersion: version ?? (await current(page)).version },
  });
}
async function openSettings(page) {
  await page.goto("/systeme/parametres");
  await row(page).waitFor();
  await page.waitForLoadState("networkidle");
}
async function setDraft(page, value) {
  if ((await input(page).count()) === 0) await edit(page).click();
  await input(page).fill(String(value));
}
async function confirmPassword(page, { wrongFirst = false } = {}) {
  const field = page.locator("#admin-step-up-password");
  await expect(field).toBeVisible();
  await expect(field).toBeFocused();
  const confirm = page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmer", exact: true });
  if (wrongFirst) {
    await field.fill("FictiveWrongPassword!1");
    await confirm.click();
    await expect(page.getByRole("dialog").getByRole("alert")).toBeVisible();
    await expect(field).toBeFocused();
  }
  await field.fill(config.E2E_SUPERADMIN_PASSWORD);
  const response = changed(page);
  await confirm.click();
  assert.equal((await response).status(), 200);
  await expect(field).toHaveCount(0);
  await expect(edit(page)).toBeVisible();
}
async function run() {
  const browser = await chromium.launch({ headless: true });
  const contexts = [];
  try {
    // Only the known isolated fixture key is reset; audit history is retained.
    await prisma.systemSetting.deleteMany({ where: { key: settingKey } });
    const startingAuditCount = await prisma.auditLog.count({
      where: { action: "SYSTEM_SETTING_UPDATE" },
    });
    const root = await authenticate(browser, config.E2E_SUPERADMIN_LOGIN_NAME);
    contexts.push(root.context);
    const page = root.page;
    const oldAudit = await prisma.auditLog.create({
      data: {
        action: "USER_UPDATE",
        category: "SYSTEM",
        description: "Fictive audit old enough for isolated retention",
        createdAt: new Date(Date.now() - 1600 * 86400000),
      },
    });
    const recentAudit = await prisma.auditLog.create({
      data: {
        action: "USER_UPDATE",
        category: "SYSTEM",
        description: "Fictive audit retained by isolated maintenance",
        createdAt: new Date(Date.now() - 100 * 86400000),
      },
    });
    await scenario(
      "Connexion MFA réelle, défaut logiciel et absence de faux changement",
      async () => {
        await openSettings(page);
        const first = await current(page);
        assert.equal(first.value, 1095);
        assert.equal(first.version, 0);
        assert.equal(first.isStoredValueInvalid, false);
        const auditCount = await prisma.auditLog.count({
          where: { action: "SYSTEM_SETTING_UPDATE" },
        });
        const noOp = await json(await put(page, 1095, 0));
        assert.equal(noOp.version, 0);
        assert.equal(
          await prisma.systemSetting.count({ where: { key: settingKey } }),
          0,
        );
        assert.equal(
          await prisma.auditLog.count({
            where: { action: "SYSTEM_SETTING_UPDATE" },
          }),
          auditCount,
        );
        await setDraft(page, "01095");
        await expect(save(page)).toBeDisabled();
        await row(page)
          .getByRole("button", { name: "Annuler", exact: true })
          .click();
        await expect(edit(page)).toBeFocused();
      },
    );
    await scenario(
      "Lecture et édition à sept largeurs, bornes et clavier",
      async () => {
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
              path: path.join(__dirname, `lecture-${width}.png`),
              fullPage: true,
            });
          await edit(page).click();
          await expect(input(page)).toBeFocused();
          await input(page).fill("365");
          await expect(
            row(page).getByRole("button", { name: /^Diminuer/ }),
          ).toBeDisabled();
          await input(page).fill("3650");
          await expect(
            row(page).getByRole("button", { name: /^Augmenter/ }),
          ).toBeDisabled();
          await input(page).fill("3651");
          await expect(save(page)).toBeDisabled();
          await input(page).fill("");
          await expect(save(page)).toBeDisabled();
          await input(page).fill("1095");
          await input(page).press("ArrowUp");
          await expect(input(page)).toHaveValue("1096");
          await expect
            .poll(() =>
              page.evaluate(
                () => document.documentElement.scrollWidth - innerWidth,
              ),
            )
            .toBeLessThanOrEqual(1);
          if (width === 390 || width === 1440)
            await page.screenshot({
              path: path.join(__dirname, `edition-${width}.png`),
              fullPage: true,
            });
          await row(page)
            .getByRole("button", { name: "Annuler", exact: true })
            .click();
        }
        await page.setViewportSize({ width: 1440, height: 1000 });
      },
    );
    await scenario(
      "Augmentation par Entrée : version et audit réels, aucune purge immédiate",
      async () => {
        await setDraft(page, 1500);
        const response = changed(page);
        await input(page).press("Enter");
        assert.equal((await response).status(), 200);
        await expect(edit(page)).toBeFocused();
        const saved = await prisma.systemSetting.findUniqueOrThrow({
          where: { key: settingKey },
        });
        assert.equal(saved.value, 1500);
        assert.equal(saved.version, 1);
        assert.equal(
          await prisma.auditLog.count({
            where: { action: "SYSTEM_SETTING_UPDATE" },
          }),
          startingAuditCount + 1,
        );
        assert(
          await prisma.auditLog.findUnique({ where: { id: oldAudit.id } }),
        );
      },
    );
    await scenario(
      "Conflit entre deux onglets, saisie conservée et reprise explicite",
      async () => {
        const second = await root.context.newPage();
        await openSettings(second);
        await setDraft(page, 1800);
        await json(await put(second, 1700));
        const response = changed(page);
        await save(page).click();
        assert.equal((await response).status(), 409);
        await expect(input(page)).toHaveValue("1800");
        await page
          .getByRole("button", { name: "Conserver ma saisie", exact: true })
          .click();
        await expect(input(page)).toBeFocused();
        const retry = changed(page);
        await save(page).click();
        assert.equal((await retry).status(), 200);
        await expect(edit(page)).toBeFocused();
        assert.equal((await current(page)).value, 1800);
        await second.close();
      },
    );
    await scenario(
      "Actualisation avec brouillon : confirmation annulée puis abandon choisi",
      async () => {
        await setDraft(page, 1801);
        const refresh = page.getByRole("button", {
          name: "Actualiser",
          exact: true,
        });
        await refresh.click();
        await page
          .getByRole("alertdialog")
          .getByRole("button", {
            name: "Continuer la modification",
            exact: true,
          })
          .click();
        await expect(refresh).toBeFocused();
        await expect(input(page)).toHaveValue("1801");
        await refresh.click();
        await page
          .getByRole("button", {
            name: "Abandonner et actualiser",
            exact: true,
          })
          .click();
        await expect(edit(page)).toBeVisible();
        await expect(input(page)).toHaveCount(0);
        assert.equal((await current(page)).value, 1800);
      },
    );
    await scenario(
      "Réduction : annulation, refus sans preuve, mot de passe erroné puis correct",
      async () => {
        await prisma.session.updateMany({
          where: { userId: "e2e-only-superadmin" },
          data: { passwordReauthenticatedAt: null },
        });
        const withoutProof = await put(page, 1000);
        assert.equal(withoutProof.status(), 403);
        assert.equal(
          (await withoutProof.json()).error.code,
          "PASSWORD_REAUTHENTICATION_REQUIRED",
        );
        await setDraft(page, 1000);
        await save(page).click();
        await page
          .getByRole("button", {
            name: "Conserver la durée actuelle",
            exact: true,
          })
          .click();
        await expect(input(page)).toHaveValue("1000");
        await expect(input(page)).toBeFocused();
        assert.equal((await current(page)).value, 1800);
        await save(page).click();
        await page
          .getByRole("button", { name: "Réduire la durée", exact: true })
          .click();
        await confirmPassword(page, { wrongFirst: true });
        assert.equal((await current(page)).value, 1000);
        assert(
          await prisma.auditLog.findUnique({ where: { id: oldAudit.id } }),
        );
      },
    );
    await scenario(
      "Écriture validée puis réponse perdue : vérification sans renvoi automatique",
      async () => {
        let writes = 0;
        const loseReply = async (route) => {
          if (route.request().method() !== "PUT") return route.continue();
          writes++;
          const committed = await route.fetch();
          assert.equal(committed.status(), 200);
          await route.abort("failed");
        };
        await page.route(
          "**/api/systeme/parametres/audit.retentionDays",
          loseReply,
        );
        await setDraft(page, 1900);
        await save(page).click();
        await expect(row(page)).toContainText(/peut-être|pas pu être confirm/);
        await expect(save(page)).toBeDisabled();
        assert.equal(
          (
            await prisma.systemSetting.findUniqueOrThrow({
              where: { key: settingKey },
            })
          ).value,
          1900,
        );
        await page.unroute(
          "**/api/systeme/parametres/audit.retentionDays",
          loseReply,
        );
        await page
          .getByRole("button", {
            name: "Vérifier la valeur actuelle",
            exact: true,
          })
          .click();
        await page
          .getByRole("button", {
            name: "Utiliser la valeur actuelle",
            exact: true,
          })
          .click();
        assert.equal(writes, 1);
        await row(page)
          .getByRole("button", { name: "Annuler", exact: true })
          .click();
      },
    );
    await scenario(
      "Stockage invalide : état explicite et réparation protégée du défaut proposé",
      async () => {
        await prisma.systemSetting.update({
          where: { key: settingKey },
          data: { value: "fictive-invalid", version: { increment: 1 } },
        });
        await prisma.session.updateMany({
          where: { userId: "e2e-only-superadmin" },
          data: { passwordReauthenticatedAt: null },
        });
        await openSettings(page);
        const invalid = await current(page);
        assert.equal(invalid.isStoredValueInvalid, true);
        assert.equal(invalid.value, 1095);
        await expect(row(page)).toContainText(/bloqué/i);
        await expect(row(page)).not.toContainText("fictive-invalid");
        assert.equal((await put(page, 1095, invalid.version)).status(), 403);
        await edit(page).click();
        await expect(input(page)).toHaveValue("1095");
        await expect(save(page)).toBeEnabled();
        await save(page).click();
        await page
          .getByRole("alertdialog")
          .getByRole("button", { name: "Réparer la durée", exact: true })
          .click();
        await confirmPassword(page);
        const repaired = await current(page);
        assert.equal(repaired.isStoredValueInvalid, false);
        assert.equal(repaired.value, 1095);
        assert.equal(repaired.version, invalid.version + 1);
        assert(
          await prisma.auditLog.findUnique({ where: { id: oldAudit.id } }),
        );
      },
    );
    await scenario(
      "Commande de maintenance réelle : valeur enregistrée consommée, anciens audits purgés",
      async () => {
        const processResult = spawnSync(
          "bun",
          ["--conditions=react-server", "scripts/run-maintenance.ts"],
          {
            cwd: path.resolve(__dirname, "../../../../apps/web"),
            env: {
              ...process.env,
              ...config,
              DATABASE_URL: config.E2E_DATABASE_URL,
              NODE_ENV: "production",
            },
            encoding: "utf8",
            timeout: 65000,
            windowsHide: true,
          },
        );
        assert.equal(
          processResult.status,
          0,
          "Isolated maintenance command must succeed",
        );
        assert.match(processResult.stdout, /Maintenance completed/);
        assert.equal(
          await prisma.auditLog.findUnique({ where: { id: oldAudit.id } }),
          null,
        );
        assert(
          await prisma.auditLog.findUnique({ where: { id: recentAudit.id } }),
        );
        assert(
          await prisma.auditLog.findFirst({
            where: { action: "SYSTEM_SETTING_UPDATE" },
          }),
        );
        assert.equal((await api(page).get("/api/auth/me")).status(), 200);
      },
    );
    await scenario(
      "Accès administrateur retiré pendant la consultation : valeurs et éditeur retirés",
      async () => {
        const login = "settings-admin-" + randomBytes(4).toString("hex");
        const admin = await authenticate(
          browser,
          login,
          {},
          config.E2E_SUPERADMIN_PASSWORD,
          "ADMIN",
        );
        contexts.push(admin.context);
        await openSettings(admin.page);
        await prisma.user.update({
          where: { loginName: login },
          data: { role: "USER" },
        });
        await admin.page
          .getByRole("button", { name: "Actualiser", exact: true })
          .click();
        await expect(row(admin.page)).toHaveCount(0);
        assert.equal((await api(admin.page).get(endpoint)).status(), 403);
        assert.equal((await put(admin.page, 1200, 0)).status(), 403);
        await admin.page.reload();
        await expect(
          admin.page.getByText(
            "Cette page est réservée aux administrateurs autorisés.",
          ),
        ).toBeVisible();
      },
    );
    await scenario(
      "Requêtes anonymes, catalogue fermé et refus CSRF",
      async () => {
        const anon = await browser.newContext({ baseURL: origin });
        contexts.push(anon);
        const anonymousPage = await anon.newPage();
        await anonymousPage.goto("/login");
        assert.equal((await api(anonymousPage).get(endpoint)).status(), 401);
        assert.equal(
          (
            await api(page).put(endpoint + "/ui.defaultPageSize", {
              headers: await headers(page),
              data: { value: 25, expectedVersion: 0 },
            })
          ).status(),
          404,
        );
        assert.equal(
          (
            await api(page).put(settingUrl, {
              headers: { "x-csrf-token": "fictive-wrong" },
              data: {
                value: 1200,
                expectedVersion: (await current(page)).version,
              },
            })
          ).status(),
          403,
        );
      },
    );
    fs.writeFileSync(
      path.join(__dirname, "resultats.json"),
      JSON.stringify(
        {
          date: "2026-10-12",
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
      "Settings integration failed; inspect redacted diagnostic above.",
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
