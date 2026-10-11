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
  target.pathname !== "/users_audit_test" ||
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
const query = (value) => "?search=" + encodeURIComponent(value);
const search = (page) =>
  page.getByRole("searchbox", {
    name: "Rechercher un compte utilisateur",
  });
const pagination = (page) =>
  page.getByRole("navigation", { name: "Pagination des utilisateurs" });
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
async function authenticate(browser, loginName, permissions) {
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
    await page.locator("#password").fill(config.E2E_SUPERADMIN_PASSWORD);
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
async function settle(page, count) {
  await search(page).waitFor();
  await expect(
    page.locator('[aria-label="Résultats des utilisateurs"]'),
  ).toHaveAttribute("aria-busy", "false");
  if (count !== undefined)
    await expect(
      page.locator("table tbody tr").filter({ has: page.locator("a") }),
    ).toHaveCount(count);
}
async function scenario(name, action) {
  try {
    await action();
    observations.push({ name, result: "passed" });
    console.log("PASS " + name);
  } catch (error) {
    observations.push({ name, result: "failed", error: error.message });
    if (activePage)
      await activePage.screenshot({
        path: path.join(work, "integration-failure.png"),
        fullPage: true,
      });
    throw error;
  }
}
async function seed() {
  for (let i = 1; i <= 65; i++) {
    const suffix = String(i).padStart(3, "0");
    const data = {
      loginName: `audit.user.${suffix}`,
      firstName: "Audit",
      lastName: `Compte ${suffix}`,
      passwordHash: "fictional-no-login",
      role: i % 3 === 0 ? "ADMIN" : "USER",
      isActive: i % 4 !== 0,
      mustChangePassword: i % 5 === 0,
      contactEmail: i % 2 ? null : `audit-${suffix}@example.test`,
      lastLoginAt: i % 6 ? new Date("2025-03-14T13:42:00Z") : null,
    };
    const user = await prisma.user.upsert({
      where: { id: `users-audit-${suffix}` },
      create: { id: `users-audit-${suffix}`, ...data },
      update: data,
    });
    await prisma.loginNameReservation.upsert({
      where: { loginName: data.loginName },
      create: { loginName: data.loginName, userId: user.id },
      update: {},
    });
  }
  await prisma.user.upsert({
    where: { id: "users-audit-compound" },
    create: {
      id: "users-audit-compound",
      loginName: "audit.elodie",
      firstName: "Élodie",
      lastName: "Du Pont",
      passwordHash: "fictional-no-login",
      contactEmail: "contact-only@example.test",
    },
    update: {},
  });
}
async function run() {
  const browser = await chromium.launch({ headless: true });
  const contexts = [];
  try {
    await seed();
    let owner;
    await scenario(
      "Interactive password login and real TOTP proof",
      async () => {
        owner = await authenticate(browser, config.E2E_SUPERADMIN_LOGIN_NAME);
        contexts.push(owner.context);
        activePage = owner.page;
        await owner.page.goto(directory);
        await settle(owner.page, 25);
        await expect(
          owner.page.getByRole("link", {
            name: /Créer un utilisateur|Nouvel utilisateur/,
          }),
        ).toBeVisible();
      },
    );
    const page = owner.page;
    await scenario(
      "Private API: real pagination, totals and no credential fields",
      async () => {
        const response = await page.evaluate(async () => {
          const r = await fetch("/api/users");
          return {
            headers: Object.fromEntries(r.headers),
            status: r.status,
            body: await r.json(),
          };
        });
        assert.equal(response.status, 200);
        assert(response.headers["cache-control"].includes("no-store"));
        const result = response.body.data;
        assert.equal(result.users.length, 25);
        assert.equal(
          result.pagination.total,
          await prisma.user.count({ where: { deletedAt: null } }),
        );
        assert.equal(result.stats.total, result.pagination.total);
        for (const user of result.users)
          for (const key of [
            "passwordHash",
            "totpCredential",
            "sessions",
            "recoveryCodes",
            "secretCiphertext",
          ])
            assert(!(key in user));
      },
    );
    await scenario(
      "Real SQL search: full name, accents, contact and literal symbols",
      async () => {
        for (const input of [
          "Élodie Du Pont",
          "Pont ÉLODIE",
          "  Du   Pont  Élodie ",
        ]) {
          const result = await json(
            await api(page).get("/api/users" + query(input)),
          );
          assert.deepEqual(
            result.users.map((u) => u.id),
            ["users-audit-compound"],
          );
        }
        assert.equal(
          (
            await json(
              await api(page).get("/api/users" + query("contact-only")),
            )
          ).pagination.total,
          1,
        );
        assert.equal(
          (await json(await api(page).get("/api/users" + query("%"))))
            .pagination.total,
          0,
        );
        await search(page).fill("Élodie Du Pont");
        await expect(page).toHaveURL(/search=/);
        await settle(page, 1);
        await expect(
          page
            .getByRole("link", { name: "Ouvrir le compte de Élodie Du Pont" })
            .first(),
        ).toBeVisible();
      },
    );
    await scenario(
      "Global overview opens exactly its role subset",
      async () => {
        const expected = (await json(await api(page).get("/api/users"))).stats
          .byRole.ADMIN;
        await page
          .getByRole("link", { name: /Afficher les comptes : Administrateurs/ })
          .click();
        await expect(page).toHaveURL(/role=ADMIN/);
        await settle(page, expected);
        assert.equal(new URL(page.url()).searchParams.has("search"), false);
        assert.equal(
          (await json(await api(page).get("/api/users?role=ADMIN"))).pagination
            .total,
          expected,
        );
      },
    );
    await scenario(
      "Pagination, browser history, detail return and focus restore",
      async () => {
        await page.goto(directory + query("Audit Compte"));
        await settle(page, 25);
        const next = pagination(page).getByRole("button", {
          name: /suivante/i,
        });
        await next.click();
        await expect(page).toHaveURL(/page=2/);
        await settle(page, 25);
        await expect(
          page.locator('[aria-label="Résultats des utilisateurs"]'),
        ).toBeFocused();
        await page.goBack();
        await expect(page).not.toHaveURL(/page=2/);
        await settle(page, 25);
        await next.click();
        await expect(page).toHaveURL(/page=2/);
        await settle(page, 25);
        const link = page.locator("table tbody tr a").nth(8);
        const label = await link.getAttribute("aria-label");
        await link.scrollIntoViewIfNeeded();
        const before = await main(page).evaluate((node) => node.scrollTop);
        await link.focus();
        await link.click();
        await expect(page).toHaveURL(/\/systeme\/utilisateurs\/users-audit-/);
        await page
          .getByRole("navigation", { name: "Fil d'Ariane" })
          .getByRole("link", { name: "Utilisateurs", exact: true })
          .click();
        await expect(page).toHaveURL(/page=2/);
        await settle(page, 25);
        await expect(
          page.getByRole("link", { name: label, exact: true }).first(),
        ).toBeFocused();
        await expect
          .poll(() => main(page).evaluate((node) => node.scrollTop))
          .toBeGreaterThan(Math.max(0, before - 35));
        await page.reload();
        await settle(page, 25);
        await expect(
          page.getByRole("link", { name: label, exact: true }).first(),
        ).toBeFocused();
      },
    );
    await scenario(
      "Real shell responsive layouts from 320 to 1920 px",
      async () => {
        await page.goto(directory);
        await settle(page, 25);
        for (const width of [320, 390, 768, 1120, 1440, 1920]) {
          await page.setViewportSize({ width, height: 1000 });
          await main(page).evaluate((node) => {
            node.scrollTop = 0;
          });
          await expect(
            page.getByRole("heading", { name: "Utilisateurs", exact: true }),
          ).toBeVisible();
          const metrics = await page.evaluate(() => ({
            viewport: innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            tableVisible: Boolean(
              document.querySelector("table")?.getClientRects().length,
            ),
            identityWidth:
              document.querySelector("table tbody td")?.getBoundingClientRect()
                .width ?? 0,
            mainWidth: document.querySelector("#main-content").clientWidth,
            mainScrollWidth:
              document.querySelector("#main-content").scrollWidth,
          }));
          assert(metrics.documentWidth <= width + 1);
          assert(metrics.mainScrollWidth <= metrics.mainWidth + 1);
          if (metrics.tableVisible)
            assert(metrics.identityWidth >= 260, "Identity column too narrow");
          if (width <= 390) assert.equal(metrics.tableVisible, false);
          if ([390, 1120, 1920].includes(width))
            await page.screenshot({
              path: path.join(__dirname, `users-${width}.png`),
              fullPage: true,
            });
          observations.push({
            name: `Viewport ${width}`,
            result: "passed",
            metrics,
          });
        }
        await page.setViewportSize({ width: 1440, height: 1000 });
      },
    );
    let reader;
    await scenario(
      "Limited user authenticates with password and MFA; no contact/security leak",
      async () => {
        reader = await authenticate(browser, "e2e-users-reader", {
          "users:view": true,
        });
        contexts.push(reader.context);
        activePage = reader.page;
        await reader.page.goto(directory);
        await settle(reader.page, 25);
        await expect(
          reader.page.getByRole("link", {
            name: /Créer un utilisateur|Nouvel utilisateur/,
          }),
        ).toHaveCount(0);
        const result = await json(await api(reader.page).get("/api/users"));
        assert.equal(result.securityDetailsVisible, false);
        assert.equal(result.stats.pendingPasswordChange, null);
        for (const user of result.users) {
          assert.equal(user.contactEmail, null);
          assert.equal(user.securityDetailsVisible, false);
          assert.equal(user.mustChangePassword, false);
        }
        const protectedAccount = result.users.find((u) => u.isProtected);
        assert(protectedAccount);
        assert.equal(protectedAccount.identityDetailsVisible, false);
        assert.notEqual(
          protectedAccount.loginName,
          config.E2E_SUPERADMIN_LOGIN_NAME,
        );
        assert.equal(
          (
            await json(
              await api(reader.page).get(
                "/api/users" + query(config.E2E_SUPERADMIN_LOGIN_NAME),
              ),
            )
          ).pagination.total,
          0,
        );
        assert.equal(
          (
            await json(
              await api(reader.page).get(
                "/api/users?loginName=" + config.E2E_SUPERADMIN_LOGIN_NAME,
              ),
            )
          ).pagination.total,
          0,
        );
        assert.equal(
          (
            await json(
              await api(reader.page).get("/api/users" + query("contact-only")),
            )
          ).pagination.total,
          0,
        );
        assert.equal(
          (await api(reader.page).get("/api/users?status=pending")).status(),
          403,
        );
        assert.equal(
          (
            await api(reader.page).post("/api/users", {
              headers: await headers(reader.page),
              data: {},
            })
          ).status(),
          403,
        );
      },
    );
    await scenario(
      "Four column combinations use effective server permissions",
      async () => {
        for (const [contact, security] of [
          [false, false],
          [true, false],
          [false, true],
          [true, true],
        ]) {
          await prisma.user.update({
            where: { loginName: "e2e-users-reader" },
            data: {
              permissions: {
                "users:view": true,
                "users:view_contact": contact,
                "users:view_security": security,
              },
            },
          });
          await reader.page.reload();
          await settle(reader.page, 25);
          const result = await json(await api(reader.page).get("/api/users"));
          assert.equal(result.securityDetailsVisible, security);
          assert.equal(
            result.users.some((u) => u.contactEmail),
            contact,
          );
          await expect(
            reader.page.getByRole("columnheader", {
              name: "Email",
              exact: true,
            }),
          ).toHaveCount(contact ? 1 : 0);
          await expect(
            reader.page.getByRole("columnheader", {
              name: "Mot de passe",
              exact: true,
            }),
          ).toHaveCount(security ? 1 : 0);
          for (const width of [1120, 1280, 1440]) {
            await reader.page.setViewportSize({ width, height: 1000 });
            const layout = await reader.page.evaluate(() => ({
              tableVisible: Boolean(
                document.querySelector("table")?.getClientRects().length,
              ),
              identityWidth:
                document
                  .querySelector("table tbody td")
                  ?.getBoundingClientRect().width ?? 0,
              contentWidth: document.querySelector("#main-content").clientWidth,
              contentScrollWidth:
                document.querySelector("#main-content").scrollWidth,
            }));
            assert(layout.contentScrollWidth <= layout.contentWidth + 1);
            if (layout.tableVisible) assert(layout.identityWidth >= 260);
            observations.push({
              name: `Columns contact=${contact} security=${security} width=${width}`,
              result: "passed",
              layout,
            });
          }
        }
      },
    );
    await scenario(
      "Permission revoked during live session purges list and overview",
      async () => {
        await prisma.user.update({
          where: { loginName: "e2e-users-reader" },
          data: { permissions: { "users:view": false } },
        });
        assert.equal((await api(reader.page).get("/api/users")).status(), 403);
        await search(reader.page).fill("Audit");
        await expect(reader.page.locator("table tbody tr a")).toHaveCount(0);
        await expect(
          reader.page.getByRole("link", { name: /Afficher tous les comptes/ }),
        ).toHaveCount(0);
        await reader.page.reload();
        await expect(
          reader.page.getByText(
            "Vous n'avez pas la permission de consulter les utilisateurs.",
          ),
        ).toBeVisible();
        await expect(search(reader.page)).toHaveCount(0);
      },
    );
    await scenario("Unauthenticated list API denied", async () => {
      const publicContext = await browser.newContext({ baseURL: origin });
      contexts.push(publicContext);
      const publicPage = await publicContext.newPage();
      await publicPage.goto("/login");
      assert.equal((await api(publicPage).get("/api/users")).status(), 401);
    });
  } finally {
    fs.writeFileSync(
      path.join(__dirname, "observations.json"),
      JSON.stringify(
        {
          date: "2026-10-11",
          browser: browser.version(),
          environment:
            "Next production, PostgreSQL 17 isolated, real password/TOTP enrollment/session/API; fictional identities only",
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
