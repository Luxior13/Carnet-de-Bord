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
  target.port === "5432" ||
  target.pathname !== "/repertoire_audit_test" ||
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
let activePage;
const prefix = "Audit Répertoire";
const directory = "/membres/repertoire";
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
const query = (value) => "?q=" + encodeURIComponent(value);
const search = (page) =>
  page.getByRole("searchbox", {
    name: "Rechercher par pseudo, nom ou coordonnée",
  });
const pagination = (page) =>
  page.getByRole("navigation", { name: "Pagination des membres" });
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
const selectedNames = (page) =>
  page
    .locator("table tbody tr")
    .evaluateAll((rows) =>
      rows
        .map((row) => row.querySelector("a")?.textContent?.trim())
        .filter(Boolean),
    );
async function headers(page) {
  const cookie = (await page.context().cookies()).find(
    (item) => item.name === "csrf-token",
  );
  assert(cookie, "Missing real CSRF cookie");
  return { "x-csrf-token": cookie.value, origin };
}
async function authenticate(browser, loginName, permissions) {
  const statePath = path.join(work, loginName + ".state.json");
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
    ...(fs.existsSync(statePath) ? { storageState: statePath } : {}),
  });
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  await page.goto("/login");
  const response = await api(page).get("/api/auth/me");
  if (response.status() !== 200) {
    await page.goto("/login");
    await page.getByLabel("Identifiant de connexion").fill(loginName);
    await page.locator("#password").fill(config.E2E_SUPERADMIN_PASSWORD);
    await page
      .getByRole("button", { name: "Se connecter", exact: true })
      .click();
    if (fs.existsSync(secretPath)) {
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
    await context.storageState({ path: statePath });
  }
  return { context, page };
}
async function settle(page, count) {
  await search(page).waitFor();
  await expect
    .poll(() =>
      page
        .locator("table tbody tr")
        .filter({ has: page.locator("a") })
        .count(),
    )
    .toBe(count);
  if (count > 0)
    await expect(pagination(page)).not.toHaveAttribute("aria-busy", "true");
}
async function scenario(name, action) {
  const started = Date.now();
  try {
    const details = await action();
    observations.push({
      name,
      result: "passed",
      durationMs: Date.now() - started,
      ...details,
    });
    console.log(name + ": passed");
  } catch (error) {
    if (activePage && !activePage.isClosed()) {
      await activePage.screenshot({
        path: path.join(work, "integration-failure.png"),
      });
      console.error("Failed page URL: " + activePage.url());
      fs.writeFileSync(
        path.join(work, "integration-failure.txt"),
        await activePage.locator("body").innerText(),
      );
    }
    observations.push({ name, result: "failed", error: error.message });
    throw error;
  }
}
async function run() {
  const browser = await chromium.launch();
  const contexts = [];
  try {
    await scenario("anonymous-page-and-api", async () => {
      const context = await browser.newContext({ baseURL: origin });
      contexts.push(context);
      assert.equal((await context.request.get("/api/personnes")).status(), 401);
      const page = await context.newPage();
      await page.goto(directory);
      await expect(page).toHaveURL(/\/login\?next=/);
    });
    const { context, page } = await authenticate(
      browser,
      config.E2E_SUPERADMIN_LOGIN_NAME,
    );
    activePage = page;
    contexts.push(context);
    await scenario("real-login-and-mfa", async () => {
      const me = await json(await api(page).get("/api/auth/me"));
      assert.equal(me.user.isProtected, true);
      return {
        session:
          "Real password login, TOTP enrollment and application session on isolated database",
      };
    });
    let existing = await json(
      await api(page).get("/api/personnes" + query(prefix) + "&limit=100"),
    );
    if (!existing.items.length) {
      const mutationHeaders = await headers(page);
      for (let n = 1; n <= 60; n++) {
        await json(
          await api(page).post("/api/personnes", {
            headers: mutationHeaders,
            data: {
              nickname: prefix + " " + String(n).padStart(3, "0"),
              firstName: n === 1 ? "Élodie" : null,
              lastName: n === 1 ? "Martin" : null,
              structureStatus: n % 3 ? "IN_STRUCTURE" : "OUTSIDE_STRUCTURE",
              emails:
                n % 3 === 0
                  ? [
                      {
                        label: "Contact test",
                        email: "membre" + n + "@example.test",
                        isPrimary: true,
                      },
                    ]
                  : [],
            },
          }),
          201,
        );
      }
      existing = await json(
        await api(page).get("/api/personnes" + query(prefix) + "&limit=100"),
      );
    }
    assert.equal(
      existing.pagination.total,
      60,
      "Unexpected fixture data; use a fresh audit database.",
    );
    await scenario("three-pages-real-sql-stable-total", async () => {
      const seen = new Set();
      let cursor;
      const lengths = [];
      do {
        const payload = await json(
          await api(page).get(
            "/api/personnes" +
              query(prefix) +
              "&limit=25" +
              (cursor ? "&cursor=" + encodeURIComponent(cursor) : ""),
          ),
        );
        assert.equal(payload.pagination.total, 60);
        lengths.push(payload.items.length);
        for (const person of payload.items) {
          assert(!seen.has(person.id), "Duplicate cursor row");
          seen.add(person.id);
        }
        cursor = payload.pagination.nextCursor;
      } while (cursor);
      assert.deepEqual(lengths, [25, 25, 10]);
      return { rows: seen.size, pageLengths: lengths };
    });
    await scenario("real-list-navigation-and-return", async () => {
      await page.goto(directory + query(prefix));
      await settle(page, 25);
      await expect(pagination(page)).toContainText("Page 1 sur 3");
      await page
        .getByRole("button", { name: "Page suivante", exact: true })
        .click();
      await expect(pagination(page)).toContainText("Page 2 sur 3");
      const names = await selectedNames(page);
      const href = page.url();
      const link = page
        .locator("table tbody tr")
        .nth(8)
        .getByRole("link")
        .first();
      const title = (await link.innerText()).trim();
      await link.focus();
      await link.click();
      await expect(page).toHaveURL(/\/membres\/repertoire\/[^?]+/);
      await page.goBack();
      await expect(page).toHaveURL(href);
      await settle(page, 25);
      assert.deepEqual(await selectedNames(page), names);
      await expect(
        page
          .locator("table tbody")
          .getByRole("link", { name: title, exact: true }),
      ).toBeFocused();
      await page.reload();
      await settle(page, 25);
      await expect(pagination(page)).toContainText("Page 2 sur 3");
      await expect(
        page.getByRole("button", { name: "Page précédente", exact: true }),
      ).toBeEnabled();
      return { returnFocus: true, reloadPage: 2 };
    });
    await scenario("search-filter-sort-overview-real-data", async () => {
      await page.goto(directory + query(prefix));
      await settle(page, 25);
      await search(page).fill("martin ELODIE");
      await settle(page, 1);
      await expect(page.locator("table tbody")).toContainText(
        "Audit Répertoire 001",
      );
      await search(page).fill("membre3@example.test");
      await settle(page, 1);
      await expect(page.locator("table tbody")).toContainText(
        "Audit Répertoire 003",
      );
      await expect(page.locator("table tbody")).toContainText(
        "Trouvée par email, téléphone ou réseau",
      );
      await page
        .getByRole("button", { name: "Réinitialiser les filtres", exact: true })
        .click();
      await settle(page, 25);
      await page
        .getByRole("combobox", { name: "Filtrer par statut", exact: true })
        .click();
      await page
        .getByRole("option", { name: "Hors structure", exact: true })
        .click();
      await settle(page, 20);
      await page
        .getByRole("combobox", { name: "Trier le répertoire", exact: true })
        .click();
      await page
        .getByRole("option", { name: "Ajoutées récemment", exact: true })
        .click();
      await expect(page).toHaveURL(/sort=created/);
      await page
        .getByRole("link", { name: /^Afficher les fiches : Sans coordonnées/ })
        .click();
      await settle(page, 25);
      await expect(page).toHaveURL(/contacts=missing/);
      const expected = await json(
        await api(page).get("/api/personnes?contacts=missing&sort=created"),
      );
      assert.equal(expected.pagination.total, 40);
      await expect(
        page.getByRole("button", {
          name: "Retirer le filtre Sans coordonnées",
          exact: true,
        }),
      ).toBeVisible();
    });
    await scenario("invalid-cursor-recovery-and-boundaries", async () => {
      for (const suffix of [
        "?limit=101",
        "?q=" + "a".repeat(101),
        "?sort=unknown",
        "?cursor=invalid",
      ]) {
        assert.equal(
          (await api(page).get("/api/personnes" + suffix)).status(),
          400,
          suffix,
        );
      }
      await page.goto(directory + query(prefix) + "&page=2&cursor=invalid");
      await page
        .getByRole("button", { name: "Première page", exact: true })
        .click();
      await settle(page, 25);
      await expect(pagination(page)).toContainText("Page 1 sur 3");
      await expect(search(page)).toHaveValue(prefix);
    });
    await scenario("responsive-production-shell", async () => {
      for (const width of [320, 390, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.goto(directory + query(prefix));
        await search(page).waitFor();
        await expect(pagination(page)).toContainText("Page 1 sur 3");
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "Window overflow " + width,
        );
        assert(
          await main(page).evaluate(
            (el) => el.scrollWidth <= el.clientWidth + 1,
          ),
          "Main overflow " + width,
        );
        await main(page).evaluate((el) => {
          el.scrollTop = 0;
        });
        if (width === 390 || width === 1920)
          await page.screenshot({
            path: path.join(work, "repertoire-real-" + width + ".png"),
          });
      }
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await scenario("real-create-detail-return-and-fresh-search", async () => {
      await page.goto(directory + query(prefix));
      await settle(page, 25);
      await page
        .getByRole("link", { name: "Ajouter une fiche", exact: true })
        .click();
      const nickname = "Création E2E " + Date.now();
      await page.getByLabel("Pseudo principal").fill(nickname);
      await page
        .getByRole("button", { name: "Créer et ouvrir la fiche", exact: true })
        .click();
      await expect(page).toHaveURL(/\/membres\/repertoire\/c[a-z0-9]+/);
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        nickname,
      );
      const row = await prisma.person.findFirstOrThrow({ where: { nickname } });
      assert(
        (await prisma.auditLog.count({
          where: { entityType: "PERSON", entityId: row.id },
        })) > 0,
      );
      await page
        .getByRole("link", { name: "Répertoire", exact: true })
        .first()
        .click();
      await search(page).waitFor();
      await search(page).fill(nickname);
      await settle(page, 1);
      await expect(page.locator("table tbody")).toContainText(nickname);
      await search(page).fill(prefix);
      await settle(page, 25);
      const targetRow = existing.items.find(
        (item) => item.firstName === "Élodie" && item.lastName === "Martin",
      );
      await json(
        await api(page).patch("/api/personnes/" + targetRow.id, {
          headers: await headers(page),
          data: {
            version: targetRow.version,
            nickname: prefix + " 001 actualisé",
            firstName: "Élodie",
            lastName: "Martin",
            birthDate: null,
            structureStatus: "IN_STRUCTURE",
          },
        }),
      );
      await search(page).fill("aucun-resultat-audit-unique");
      await settle(page, 0);
      await search(page).fill(prefix);
      await settle(page, 25);
      await expect(page.locator("table tbody")).toContainText(
        prefix + " 001 actualisé",
      );
      return {
        createdThroughUi: true,
        auditPersisted: true,
        returnedFilterSnapshotFresh: true,
      };
    });
    const limited = await authenticate(browser, "e2e-repertoire-reader", {
      "persons:view": true,
    });
    activePage = limited.page;
    contexts.push(limited.context);
    await scenario("read-only-permission-and-revocation", async () => {
      await limited.page.goto(directory);
      await search(limited.page).waitFor();
      await expect(
        limited.page.getByRole("link", {
          name: "Ajouter une fiche",
          exact: true,
        }),
      ).toHaveCount(0);
      assert.equal(
        (
          await api(limited.page).post("/api/personnes", {
            headers: await headers(limited.page),
            data: { nickname: "Forbidden fixture" },
          })
        ).status(),
        403,
      );
      await prisma.user.update({
        where: { loginName: "e2e-repertoire-reader" },
        data: { permissions: { "persons:view": false } },
      });
      assert.equal(
        (await api(limited.page).get("/api/personnes")).status(),
        403,
      );
      await search(limited.page).fill("Audit");
      await expect
        .poll(() => limited.page.locator("table tbody tr").count())
        .toBe(0);
      assert.equal(
        await limited.page
          .getByRole("link", { name: /^Afficher toutes les fiches/ })
          .count(),
        0,
        "Overview remains after access revocation",
      );
      await limited.page.reload();
      await expect(
        limited.page.getByText(
          /Vous n'avez pas la permission de consulter le répertoire/,
        ),
      ).toBeVisible();
      await expect(search(limited.page)).toHaveCount(0);
    });
    const errors = await prisma.auditLog.count({
      where: { entityType: "PERSON" },
    });
    console.log("Real integration complete; person audit records: " + errors);
  } finally {
    fs.writeFileSync(
      path.join(work, "integration-observations.json"),
      JSON.stringify(
        {
          date: "2026-10-11",
          browser: browser.version(),
          environment:
            "Next production, real password+TOTP/session/API/PostgreSQL; isolated loopback database and fictional identities",
          observations,
        },
        null,
        2,
      ),
    );
    await Promise.all(contexts.map((context) => context.close()));
    await browser.close();
    await prisma.$disconnect();
  }
}
run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
