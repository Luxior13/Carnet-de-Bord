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
  target.port !== "54610" ||
  target.pathname !== "/person_creation_test" ||
  new URL(origin).hostname !== "127.0.0.1" ||
  new URL(origin).port !== "3124"
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
const directory = "/membres/repertoire";
const createPath = directory + "/nouveau";
const contexts = [];
let browser;
let pageErrors = [];
const nickname = (page) => page.locator("#create-person-nickname");
const submit = (page) =>
  page.getByRole("button", { name: "Créer et ouvrir la fiche", exact: true });
const unique = (label) =>
  "Audit " + label + " " + randomBytes(4).toString("hex");
async function scenario(name, action) {
  await action();
  observations.push({ name, result: "passed" });
  console.log("PASS " + name);
}
async function openCreation(page, returnTo = directory) {
  const readiness = page.waitForResponse(
    (response) => response.url() === origin + "/api/health/ready",
  );
  await page.goto(createPath + "?" + new URLSearchParams({ returnTo }));
  const readinessResponse = await readiness;
  if (readinessResponse.status() === 429) {
    const seconds = Number(readinessResponse.headers()["retry-after"]);
    assert(Number.isFinite(seconds) && seconds >= 0 && seconds <= 60);
    console.log("Harness respecting readiness Retry-After: " + seconds + "s");
    await new Promise((resolve) => setTimeout(resolve, seconds * 1000 + 100));
    await page.getByRole("button", { name: "Revérifier", exact: true }).click();
  }
  await expect(nickname(page)).toBeVisible();
  await expect(submit(page)).toBeEnabled();
}
async function createViaUi(page, name) {
  await nickname(page).fill(name);
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url() === origin + "/api/personnes" &&
      response.request().method() === "POST",
  );
  await submit(page).click();
  const data = await json(await responsePromise, 201);
  await expect(page).toHaveURL(
    new RegExp("/membres/repertoire/" + data.person.id + "\\?"),
  );
  await expect(
    page.getByRole("main").getByRole("heading", { level: 1 }),
  ).toContainText(data.person.nickname || data.person.firstName);
  return data.person;
}
async function committedLostResponse(page) {
  const handler = async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    const response = await route.fetch();
    assert.equal(
      response.status(),
      201,
      "Server must commit before transport failure",
    );
    await route.abort("failed");
  };
  await page.route("**/api/personnes", handler);
  return () => page.unroute("**/api/personnes", handler);
}
async function main() {
  browser = await chromium.launch({ headless: true });
  const root = await authenticate(browser, config.E2E_SUPERADMIN_LOGIN_NAME);
  contexts.push(root.context);
  const page = root.page;
  page.on("pageerror", (error) => pageErrors.push(error.message));
  if (baseline) {
    await scenario(
      "Avant : réponse perdue après commit, seconde soumission crée deux fiches",
      async () => {
        const name = unique("avant perte");
        await openCreation(page);
        await nickname(page).fill(name);
        const restore = await committedLostResponse(page);
        await submit(page).click();
        await expect(
          page.getByRole("alert").filter({ hasText: /fetch/i }),
        ).toBeVisible();
        await restore();
        await expect(submit(page)).toBeEnabled();
        assert.equal(
          await prisma.person.count({ where: { nickname: name } }),
          1,
        );
        await createViaUi(page, name);
        assert.equal(
          await prisma.person.count({ where: { nickname: name } }),
          2,
        );
      },
    );
    return;
  }
  let firstId;
  const filteredReturn =
    directory + "?q=Audit&structureStatus=OUTSIDE_STRUCTURE&sort=updated";
  await scenario(
    "Pseudo seul, normalisation, audit chiffré et retour filtré",
    async () => {
      await openCreation(page, filteredReturn);
      const name = unique("pseudo");
      const person = await createViaUi(page, "  " + name + "  ");
      firstId = person.id;
      const stored = await prisma.person.findUniqueOrThrow({
        where: { id: person.id },
      });
      assert.equal(stored.nickname, name);
      assert.equal(stored.firstName, null);
      assert.equal(stored.lastName, null);
      assert.equal(stored.birthDate, null);
      assert.equal(stored.structureStatus, "OUTSIDE_STRUCTURE");
      assert.equal(stored.version, 1);
      const audit = await prisma.auditLog.findFirstOrThrow({
        where: { entityType: "PERSON", entityId: person.id },
      });
      const changes = await prisma.auditFieldChange.findMany({
        where: { auditLogId: audit.id },
      });
      assert(changes.length >= 2);
      assert(
        !JSON.stringify(changes).includes(name),
        "Identity must be encrypted in history",
      );
      assert.equal(
        new URL(page.url()).searchParams.get("returnTo"),
        filteredReturn,
      );
      assert.equal(new URL(page.url()).searchParams.get("section"), "identite");
      const back = page
        .getByRole("navigation", { name: /ariane/i })
        .getByRole("link", { name: "Répertoire", exact: true });
      await expect(back).toHaveAttribute("href", filteredReturn);
      await back.click();
      await expect(page).toHaveURL(origin + filteredReturn);
      await expect(
        page.getByRole("main").getByRole("link", { name: new RegExp(name) }),
      ).toBeVisible();
    },
  );
  await scenario(
    "Prénom et nom sans pseudo, statut Dans la structure et Entrée",
    async () => {
      await openCreation(page);
      await page.locator("#create-person-firstName").fill("  Camille  ");
      await page.locator("#create-person-lastName").fill("  Exemple  ");
      await page.locator("#create-person-structureStatus").click();
      await page
        .getByRole("option", { name: "Dans la structure", exact: true })
        .click();
      const pending = page.waitForResponse(
        (response) =>
          response.url() === origin + "/api/personnes" &&
          response.request().method() === "POST",
      );
      await page.locator("#create-person-lastName").press("Enter");
      const result = await json(await pending, 201);
      assert.equal(result.person.nickname, null);
      assert.equal(result.person.firstName, "Camille");
      assert.equal(result.person.lastName, "Exemple");
      assert.equal(result.person.structureStatus, "IN_STRUCTURE");
      await expect(page).toHaveURL(new RegExp(result.person.id));
    },
  );
  await scenario(
    "Validation vide, corrections d’identité et aucun POST invalide",
    async () => {
      await openCreation(page);
      let posts = 0;
      const listener = (request) => {
        if (
          request.url() === origin + "/api/personnes" &&
          request.method() === "POST"
        )
          posts++;
      };
      page.on("request", listener);
      await submit(page).click();
      await expect(nickname(page)).toBeFocused();
      await expect(nickname(page)).toHaveAttribute("aria-invalid", "true");
      await page.locator("#create-person-firstName").fill("Camille");
      await page.locator("#create-person-lastName").fill("Exemple");
      await expect(nickname(page)).toHaveAttribute("aria-invalid", "false");
      assert.equal(posts, 0);
      page.off("request", listener);
      await page.getByRole("link", { name: "Annuler", exact: true }).click();
      await page.getByRole("button", { name: "Rester", exact: true }).click();
      await expect(
        page.getByRole("link", { name: "Annuler", exact: true }),
      ).toBeFocused();
      await expect(page.locator("#create-person-firstName")).toHaveValue(
        "Camille",
      );
      await page.getByRole("link", { name: "Annuler", exact: true }).click();
      await page
        .getByRole("button", { name: "Quitter sans enregistrer", exact: true })
        .click();
      await expect(page).toHaveURL(origin + directory);
    },
  );
  await scenario(
    "Cadre complet, clavier et sept largeurs sans débordement",
    async () => {
      await openCreation(page);
      for (const width of [320, 360, 390, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        assert.equal(await page.getByRole("main").count(), 1);
        assert.equal(await page.getByRole("heading", { level: 1 }).count(), 1);
        await nickname(page).focus();
        await expect(nickname(page)).toBeFocused();
        const overflow = await page.evaluate(
          () => document.documentElement.scrollWidth > window.innerWidth + 1,
        );
        assert.equal(overflow, false, "Overflow at " + width);
        const inCard = await page
          .locator('[data-slot="section-action-bar"]')
          .evaluate((el) => !!el.closest('[data-slot="card"]'));
        assert.equal(inCard, false);
        if (width === 320 || width === 1440)
          await page.screenshot({
            path: path.join(__dirname, "creation-" + width + ".png"),
            fullPage: true,
          });
      }
      await page.setViewportSize({ width: 1440, height: 1000 });
    },
  );
  await scenario(
    "Réponse perdue après vrai commit : reprise bloquée, recherche conserve la saisie",
    async () => {
      await openCreation(page);
      const name = unique("perte finale");
      await nickname(page).fill(name);
      const restore = await committedLostResponse(page);
      await submit(page).click();
      await expect(
        page.getByText("Création à vérifier", { exact: true }),
      ).toBeVisible();
      await restore();
      const retry = page.getByRole("button", {
        name: "Relancer la création",
        exact: true,
      });
      await expect(retry).toBeDisabled();
      await expect(nickname(page)).toBeDisabled();
      await expect(nickname(page)).toHaveValue(name);
      assert.equal(await prisma.person.count({ where: { nickname: name } }), 1);
      const popupPromise = page.waitForEvent("popup");
      await page
        .getByRole("link", {
          name: "Vérifier le répertoire (nouvel onglet)",
          exact: true,
        })
        .click();
      const popup = await popupPromise;
      await expect(
        popup.getByRole("main").getByRole("link", { name: new RegExp(name) }),
      ).toBeVisible();
      await popup.close();
      await expect(retry).toBeDisabled();
      assert.equal(await prisma.person.count({ where: { nickname: name } }), 1);
      await page.getByRole("link", { name: "Annuler", exact: true }).click();
      await expect(
        page.getByText(/Quitter cette page ne l’annule pas/),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Quitter la page", exact: true })
        .click();
      await expect(page).toHaveURL(origin + directory);
    },
  );
  await scenario(
    "Échec avant envoi, confirmation de reprise et création unique",
    async () => {
      await openCreation(page);
      const name = unique("sans commit");
      await nickname(page).fill(name);
      const handler = (route) =>
        route.request().method() === "POST"
          ? route.abort("failed")
          : route.continue();
      await page.route("**/api/personnes", handler);
      await submit(page).click();
      await expect(
        page.getByText("Création à vérifier", { exact: true }),
      ).toBeVisible();
      await page.unroute("**/api/personnes", handler);
      assert.equal(await prisma.person.count({ where: { nickname: name } }), 0);
      await page
        .getByRole("checkbox", {
          name: "J’ai vérifié le répertoire et souhaite relancer la création.",
          exact: true,
        })
        .check();
      const pending = page.waitForResponse(
        (response) =>
          response.url() === origin + "/api/personnes" &&
          response.request().method() === "POST",
      );
      await page
        .getByRole("button", { name: "Relancer la création", exact: true })
        .click();
      const result = await json(await pending, 201);
      await expect(page).toHaveURL(new RegExp(result.person.id));
      assert.equal(await prisma.person.count({ where: { nickname: name } }), 1);
    },
  );
  await scenario(
    "Retour externe neutralisé, annulation vierge et espaces seuls",
    async () => {
      await openCreation(page, "https://example.invalid/ailleurs");
      await nickname(page).fill("   ");
      await page.getByRole("link", { name: "Annuler", exact: true }).click();
      await expect(page).toHaveURL(origin + directory);
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
    },
  );
  await scenario(
    "Compte create/view seulement : création et lecture autorisées, administration refusée",
    async () => {
      const limited = await authenticate(browser, "e2e-person-limited", {
        "persons:view": true,
        "persons:create": true,
      });
      contexts.push(limited.context);
      await openCreation(limited.page);
      await createViaUi(limited.page, unique("limite"));
      const denied = await api(limited.page).get("/api/users");
      assert.equal(denied.status(), 403);
      await prisma.user.update({
        where: { loginName: "e2e-person-limited" },
        data: { permissions: { "persons:view": true } },
      });
      const before = await prisma.person.count();
      const response = await api(limited.page).post("/api/personnes", {
        headers: await headers(limited.page),
        data: { nickname: unique("refus") },
      });
      assert.equal(response.status(), 403);
      assert.equal(await prisma.person.count(), before);
      await limited.page.goto(createPath);
      await expect(
        limited.page.getByText(
          "Vous n'avez pas la permission de créer une fiche.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(nickname(limited.page)).toHaveCount(0);
    },
  );
  await scenario(
    "Anonyme et faux cookie ne peuvent créer ni lire le formulaire privé",
    async () => {
      for (const forged of [false, true]) {
        const context = await browser.newContext({ baseURL: origin });
        contexts.push(context);
        if (forged)
          await context.addCookies([
            { name: "auth-token", value: "forged-audit-token", url: origin },
          ]);
        const response = await context.request.get(createPath, {
          maxRedirects: 0,
        });
        assert.equal(response.status(), 307);
        assert(response.headers().location.includes("/login?next="));
        const raw = await context.request.post("/api/personnes", {
          data: { nickname: "Refus anonyme" },
          headers: { origin },
          maxRedirects: 0,
        });
        assert([401, 403].includes(raw.status()));
      }
    },
  );
  await scenario(
    "Double soumission pendant attente : une seule écriture et un seul audit",
    async () => {
      await openCreation(page);
      const name = unique("double");
      await nickname(page).fill(name);
      await page.locator("form").evaluate((form) => {
        form.requestSubmit();
        form.requestSubmit();
      });
      await expect(page).toHaveURL(/\/membres\/repertoire\/c[^?]+\?/);
      const persons = await prisma.person.findMany({
        where: { nickname: name },
      });
      assert.equal(persons.length, 1);
      assert.equal(
        await prisma.auditLog.count({
          where: { entityType: "PERSON", entityId: persons[0].id },
        }),
        1,
      );
    },
  );
  await scenario(
    "Chargement réel ralenti : aucun retour sans filtres avant le lien contextuel",
    async () => {
      await openCreation(page, filteredReturn);
      const name = unique("chargement");
      await nickname(page).fill(name);
      let release;
      let lockFinished;
      const released = new Promise((resolve) => {
        release = resolve;
      });
      const handler = async (route) => {
        if (route.request().method() !== "POST") return route.continue();
        const response = await route.fetch();
        assert.equal(response.status(), 201);
        let confirmLock;
        const acquired = new Promise((resolve) => {
          confirmLock = resolve;
        });
        // The write is committed. Delay the following server-side read only,
        // so Next streams its actual loading boundary to the browser.
        lockFinished = prisma.$transaction(
          async (transaction) => {
            await transaction.$executeRawUnsafe(
              'LOCK TABLE "Person" IN ACCESS EXCLUSIVE MODE',
            );
            confirmLock();
            await released;
          },
          { timeout: 20000 },
        );
        await Promise.race([acquired, lockFinished]);
        await route.fulfill({ response });
      };
      await page.route("**/api/personnes", handler);
      try {
        await submit(page).click();
        await expect(
          page.getByRole("status", {
            name: "Chargement de la fiche",
            exact: true,
          }),
        ).toBeVisible();
        const back = page
          .getByRole("navigation", { name: /ariane/i })
          .getByRole("link", { name: "Répertoire", exact: true });
        await expect(back).toHaveCount(0);
        release();
        await lockFinished;
        await expect(
          page.getByRole("main").getByRole("heading", { level: 1 }),
        ).toContainText(name);
        await expect(back).toHaveAttribute("href", filteredReturn);
        await back.click();
        await expect(page).toHaveURL(origin + filteredReturn);
      } finally {
        release();
        await lockFinished;
        await page.unroute("**/api/personnes", handler);
      }
    },
  );
  assert.equal(pageErrors.length, 0, "Unexpected browser JavaScript error");
}
function sanitize(value) {
  let text = String(value);
  for (const [key, value] of Object.entries(config)) {
    if (/PASSWORD|KEY/.test(key) && typeof value === "string")
      text = text.replaceAll(value, "[secret]");
  }
  for (const entry of fs.readdirSync(work)) {
    if (entry.endsWith(".totp"))
      text = text.replaceAll(
        fs.readFileSync(path.join(work, entry), "utf8"),
        "[totp-secret]",
      );
  }
  return text.replace(/\b\d{6}\b/g, "[six-digits]");
}
main()
  .then(() => {
    fs.writeFileSync(
      path.join(
        __dirname,
        baseline ? "avant-integration.json" : "resultats.json",
      ),
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          browser: "Chromium " + browser.version(),
          mode: baseline ? "baseline" : "final",
          observations,
          limitations: [
            "HTTP loopback, base et comptes fictifs isolés.",
            "Erreurs de transport injectées dans le navigateur ; commits PostgreSQL réels.",
            "Pas de garantie d’idempotence : la reprise manuelle constitue une nouvelle création.",
          ],
        },
        null,
        2,
      ) + "\n",
    );
  })
  .catch((error) => {
    console.error(sanitize(error.stack));
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const context of contexts) await context.close();
    if (browser) await browser.close();
    await prisma.$disconnect();
  });
