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
  target.pathname !== "/roadmap_audit_test" ||
  new URL(origin).hostname !== "127.0.0.1" ||
  new URL(origin).port !== "3121"
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

const destination = "/systeme/feuille-de-route";
const cards = (page) => page.locator('[data-slot="card"][id^="roadmap-"]');
const search = (page) =>
  page.getByRole("searchbox", { name: "Rechercher un chantier", exact: true });
const cardIds = (page) =>
  cards(page).evaluateAll((nodes) => nodes.map((node) => node.id));
const errors = [];
async function scenario(name, action) {
  await action();
  observations.push({ name, result: "passed" });
  console.log("PASS " + name);
}
async function openRoadmap(page, suffix = "") {
  await page.goto(destination + suffix);
  await expect(
    page.getByRole("heading", {
      name: "Feuille de route",
      exact: true,
      level: 1,
    }),
  ).toBeVisible();
  await expect(search(page)).toBeVisible();
  await page.waitForLoadState("networkidle");
}
async function choose(page, label, option) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page.getByRole("option", { name: option, exact: true }).click();
}
async function run() {
  const browser = await chromium.launch({ headless: true });
  const contexts = [];
  try {
    await scenario(
      "Accès anonyme et cookie forgé refusés, destination filtrée conservée",
      async () => {
        const context = await browser.newContext({ baseURL: origin });
        contexts.push(context);
        const suffix = "?pole=people&phase=1&q=personnes";
        const response = await context.request.get(destination + suffix, {
          maxRedirects: 0,
        });
        assert.equal(response.status(), 307);
        const redirect = new URL(response.headers().location, origin);
        assert.equal(redirect.pathname, "/login");
        assert.equal(redirect.searchParams.get("next"), destination + suffix);
        assert(!(await response.text()).includes("Première version prévue"));
        const page = await context.newPage();
        await page.goto(destination + suffix);
        await expect(page).toHaveURL(/\/login\?next=/);
        await expect(cards(page)).toHaveCount(0);
        const forged = await context.request.get(destination, {
          maxRedirects: 0,
          headers: {
          cookie: "session=fictive-not-a-session",
          "x-request-path": "/login",
          "x-request-target": "/login",
          },
        });
        assert.equal(forged.status(), 307);
      },
    );
    const root = await authenticate(browser, config.E2E_SUPERADMIN_LOGIN_NAME);
    contexts.push(root.context);
    const page = root.page;
    page.on("pageerror", (error) => errors.push(error.message));
    let baseline;
    await scenario(
      "Connexion MFA réelle et catalogue de 39 chantiers dans le cadre authentifié",
      async () => {
        await openRoadmap(page);
        await expect(cards(page)).toHaveCount(39);
        baseline = await cards(page).evaluateAll((nodes) =>
          nodes.map((node) => ({
            id: node.id,
            area: node
              .closest("section")
              .getAttribute("aria-labelledby")
              .replace("roadmap-area-", ""),
            phase: Number(node.textContent.match(/Étape (\d)/)[1]),
          })),
        );
        assert.equal(new Set(baseline.map((item) => item.id)).size, 39);
        await expect(
          page
            .getByRole("status")
            .filter({ hasText: "39 chantiers affichés sur 39" }),
        ).toBeVisible();
      },
    );
    await scenario(
      "Filtres cumulés, historique précédent/suivant et rechargement",
      async () => {
        await choose(page, "Pôle cible", "Membres");
        await expect
          .poll(() => cardIds(page))
          .toEqual(
            baseline
              .filter((item) => item.area === "people")
              .map((item) => item.id),
          );
        await choose(page, "Étape", "1. Fondations métier");
        const subset = baseline
          .filter((item) => item.area === "people" && item.phase === 1)
          .map((item) => item.id);
        await expect.poll(() => cardIds(page)).toEqual(subset);
        await page.goBack();
        await expect(
          page.getByRole("combobox", { name: "Étape", exact: true }),
        ).toContainText("Toutes les étapes");
        await expect
          .poll(() => cardIds(page))
          .toEqual(
            baseline
              .filter((item) => item.area === "people")
              .map((item) => item.id),
          );
        await page.goForward();
        await expect.poll(() => cardIds(page)).toEqual(subset);
        await page.reload();
        await expect.poll(() => cardIds(page)).toEqual(subset);
        await page
          .getByRole("button", { name: "Réinitialiser", exact: true })
          .click();
        await expect(cards(page)).toHaveCount(39);
        await expect(search(page)).toBeFocused();
      },
    );
    await scenario(
      "Recherche locale rapide, absence de requête de page et réinitialisation du vide",
      async () => {
        await page.waitForLoadState("networkidle");
        const unexpectedRequests = [];
        const record = (request) => {
          const url = new URL(request.url());
          if (
            url.pathname === destination ||
            url.searchParams.has("_rsc") ||
            /\/api\/(roadmap|systeme\/feuille-de-route)/.test(url.pathname)
          )
            unexpectedRequests.push(url.pathname);
        };
        page.on("request", record);
        const historyBefore = await page.evaluate(() => history.length);
        await search(page).pressSequentially("equipes", { delay: 0 });
        await expect(search(page)).toHaveValue("equipes");
        const matches = await cardIds(page);
        assert(matches.length > 0 && matches.length < 39);
        assert.equal(await page.evaluate(() => history.length), historyBefore);
        await search(page).fill("ÉQUIPES");
        await expect.poll(() => cardIds(page)).toEqual(matches);
        await search(page).fill("aucun-chantier-zzzz");
        await expect(cards(page)).toHaveCount(0);
        await page
          .getByRole("button", {
            name: "Réinitialiser les filtres",
            exact: true,
          })
          .click();
        await expect(cards(page)).toHaveCount(39);
        await expect(search(page)).toBeFocused();
        page.off("request", record);
        assert.deepEqual(unexpectedRequests, []);
      },
    );
    await scenario(
      "Anciennes destinations et URL atypiques, aucun module futur activé",
      async () => {
        await page.goto("/feuille-de-route?pole=people&phase=1");
        await expect(page).toHaveURL(
          /\/systeme\/feuille-de-route\?pole=people&phase=1/,
        );
        await expect
          .poll(() => cardIds(page))
          .toEqual(
            baseline
              .filter((item) => item.area === "people" && item.phase === 1)
              .map((item) => item.id),
          );
        for (const legacy of [
          "/activite/actualites",
          "/mes-notifications",
          "/systeme/journal-activite",
        ]) {
          await page.goto(legacy);
          await expect(page).toHaveURL(new RegExp(destination + "$"));
          await expect(cards(page)).toHaveCount(39);
        }
        await openRoadmap(page, "?pole=unknown&phase=999");
        await expect(cards(page)).toHaveCount(39);
        await expect(
          page.getByRole("combobox", { name: "Pôle cible", exact: true }),
        ).toContainText("Tous les pôles");
        await openRoadmap(
          page,
          "?q=" +
            encodeURIComponent("<script>window.fictiveInjected=true</script>"),
        );
        assert.equal(
          await page.evaluate(() => window.fictiveInjected),
          undefined,
        );
        await expect(cards(page)).toHaveCount(0);
        await openRoadmap(page, "?q=" + "a".repeat(220));
        await expect(search(page)).toHaveValue("a".repeat(200));
        await page
          .getByRole("button", {
            name: "Réinitialiser les filtres",
            exact: true,
          })
          .click();
        await expect(cards(page)).toHaveCount(39);
      },
    );
    await scenario(
      "Cadre réel et filtres utilisables à sept largeurs",
      async () => {
        for (const width of [320, 390, 640, 768, 1024, 1440, 1920]) {
          await page.setViewportSize({
            width,
            height: width < 768 ? 844 : 1000,
          });
          await openRoadmap(page, "?pole=people&phase=1");
          await expect
            .poll(() =>
              page.evaluate(
                () => document.documentElement.scrollWidth - innerWidth,
              ),
            )
            .toBeLessThanOrEqual(1);
          const overflowing = await page
            .locator("main")
            .evaluateAll((nodes) =>
              nodes.some((node) => node.scrollWidth > node.clientWidth + 1),
            );
          assert.equal(overflowing, false);
          await choose(page, "Pôle cible", "Esport");
          await choose(page, "Étape", "2. Quotidien esport");
          await expect
            .poll(() => cardIds(page))
            .toEqual(
              baseline
                .filter((item) => item.area === "esport" && item.phase === 2)
                .map((item) => item.id),
            );
          if (width === 390 || width === 1440) {
            await page.evaluate(() =>
              document.querySelector("main")?.scrollTo(0, 0),
            );
            await page.screenshot({
              path: path.join(__dirname, `feuille-de-route-${width}.png`),
            });
          }
        }
        await page.setViewportSize({ width: 1440, height: 1000 });
      },
    );
    const limited = await authenticate(
      browser,
      "roadmap-user-" + randomBytes(4).toString("hex"),
      {},
    );
    contexts.push(limited.context);
    limited.page.on("pageerror", (error) => errors.push(error.message));
    await scenario(
      "Compte USER sans permission administrative : catalogue et navigation autorisés",
      async () => {
        await openRoadmap(limited.page);
        await expect(cards(limited.page)).toHaveCount(39);
        await expect(
          limited.page
            .locator("aside")
            .getByRole("link", { name: "Paramètres système", exact: true }),
        ).toHaveCount(0);
        await limited.page.goto("/systeme");
        await expect(limited.page).toHaveURL(new RegExp(destination + "$"));
        await expect(cards(limited.page)).toHaveCount(39);
        assert.equal(
          (await api(limited.page).get("/api/systeme/parametres")).status(),
          403,
        );
      },
    );
    await scenario(
      "Session réellement périmée : rechargement privé refusé",
      async () => {
        const actor = await json(await api(limited.page).get("/api/auth/me"));
        const actorId = actor.user?.id ?? actor.id;
        assert(actorId && actorId !== "e2e-only-superadmin");
        await prisma.session.updateMany({
          where: { userId: actorId },
          data: { expiresAt: new Date(Date.now() - 1000) },
        });
        await limited.page.reload();
        await expect(limited.page).toHaveURL(/\/login\?next=/);
        await expect(cards(limited.page)).toHaveCount(0);
        assert.equal(
          (await api(limited.page).get("/api/auth/me")).status(),
          401,
        );
      },
    );
    assert.deepEqual(errors, [], "Unexpected browser errors");
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
    for (const secret of [
      config.E2E_SUPERADMIN_PASSWORD,
      config.MFA_ENCRYPTION_KEY_V1,
      config.AUDIT_ENCRYPTION_KEY_V1,
    ])
      if (secret) message = message.replaceAll(secret, "[secret masqué]");
    console.error(message);
    throw new Error(
      "Roadmap integration failed; inspect redacted diagnostic above.",
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
