const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const { randomBytes } = require("node:crypto");
const { chromium, expect } = require("@playwright/test");
const { PrismaClient } = require("@prisma/client");
const { generate } = require("otplib");

if (!process.env.AUDIT_ENV_FILE)
  throw new Error("Temporary AUDIT_ENV_FILE required");
const config = JSON.parse(
  fs.readFileSync(process.env.AUDIT_ENV_FILE, "utf8").replace(/^\uFEFF/, ""),
);
const target = new URL(config.E2E_DATABASE_URL);
const origin = config.WEB_URL;
if (
  target.hostname !== "127.0.0.1" ||
  target.port !== "54599" ||
  target.pathname !== "/login_audit_test" ||
  origin !== "http://127.0.0.1:3122"
)
  throw new Error(
    "This harness requires the explicitly isolated login audit targets",
  );
const prisma = new PrismaClient({ datasourceUrl: target.toString() });
const privateValues = [
  config.E2E_SUPERADMIN_PASSWORD,
  config.MFA_ENCRYPTION_KEY_V1,
  config.AUDIT_ENCRYPTION_KEY_V1,
];
const observations = [];
const contexts = [];
const browserErrors = [];
const runId = randomBytes(4).toString("hex");
let browser;

async function scenario(name, action) {
  await action();
  observations.push({ name, result: "passed" });
  console.log("PASS " + name);
}
async function client(next = "/") {
  const context = await browser.newContext({
    baseURL: origin,
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  contexts.push(context);
  const page = await context.newPage();
  page.setDefaultTimeout(12000);
  page.on("pageerror", (error) => browserErrors.push(error.message));
  await page.goto("/login?next=" + encodeURIComponent(next));
  await expect(page.locator("#loginName")).toBeVisible();
  return { context, page, next };
}
async function api(page, url, method = "GET", data, customHeaders) {
  const csrf = (await page.context().cookies()).find(
    (cookie) => cookie.name === "csrf-token",
  );
  const headers = {
    ...(data ? { "content-type": "application/json" } : {}),
    ...(csrf ? { "x-csrf-token": csrf.value } : {}),
    ...customHeaders,
  };
  return page.evaluate(
    async ({ url, method, data, headers }) => {
      const response = await fetch(url, {
        method,
        headers: {
          ...headers,
          ...(headers["x-csrf-token"] === "invalid-audit-token"
            ? {}
            : {
                "x-csrf-token":
                  document.cookie
                    .split("; ")
                    .find((value) => value.startsWith("csrf-token="))
                    ?.split("=")[1] ?? "",
              }),
        },
        credentials: "same-origin",
        cache: "no-store",
        ...(data ? { body: JSON.stringify(data) } : {}),
      });
      return {
        status: response.status,
        payload: await response.json(),
        headers: Object.fromEntries(response.headers),
      };
    },
    { url, method, data, headers },
  );
}
async function fixture(label, overrides = {}) {
  const root = await prisma.user.findUniqueOrThrow({
    where: { id: "e2e-only-superadmin" },
  });
  const user = await prisma.user.create({
    data: {
      loginName: "audit." + label + "." + runId,
      firstName: "Audit",
      lastName: "Connexion",
      passwordHash: root.passwordHash,
      role: "USER",
      permissions: {},
      ...overrides,
    },
  });
  await prisma.loginNameReservation.create({
    data: { loginName: user.loginName, userId: user.id },
  });
  return user;
}
async function passwordStep(client, user, rememberMe = false) {
  await client.page.locator("#loginName").fill(user.loginName);
  await client.page.locator("#password").fill(config.E2E_SUPERADMIN_PASSWORD);
  if (rememberMe)
    await client.page
      .getByRole("checkbox", {
        name: "Rester connecté sur cet appareil",
        exact: true,
      })
      .check();
  await client.page
    .getByRole("button", { name: "Se connecter", exact: true })
    .click();
}
async function enroll(client, user) {
  const page = client.page;
  await page
    .getByRole("button", { name: "Configurer maintenant", exact: true })
    .click();
  const secret = (
    await page.getByLabel("Clé de configuration", { exact: true }).innerText()
  ).replace(/[\s-]/g, "");
  privateValues.push(secret);
  const remaining = 30 - (Math.floor(Date.now() / 1000) % 30);
  if (remaining < 5)
    await new Promise((resolve) => setTimeout(resolve, (remaining + 1) * 1000));
  const code = await generate({ secret });
  privateValues.push(code);
  await page.getByLabel("Code à 6 chiffres").fill(code);
  await page
    .getByRole("button", {
      name: "Activer la double authentification",
      exact: true,
    })
    .click();
  const list = page.getByRole("list", {
    name: "Codes de secours",
    exact: true,
  });
  await list.waitFor();
  const recovery = await list.locator("li").allTextContents();
  assert.equal(recovery.length, 10);
  privateValues.push(...recovery);
  await expect(
    page.getByRole("button", { name: "Terminer", exact: true }),
  ).toBeDisabled();
  await page
    .getByRole("checkbox", {
      name: /J.ai enregistré ces codes dans un endroit sûr/,
    })
    .check();
  await page.getByRole("button", { name: "Terminer", exact: true }).click();
  await expect(page).toHaveURL(origin + client.next);
  return { secret, recovery, user };
}
async function mfaClient(actor, next = "/") {
  const result = await client(next);
  await passwordStep(result, actor.user);
  await expect(result.page.locator("#login-mfa-code")).toBeVisible();
  return result;
}
async function freshTotp(actor) {
  const credential = await prisma.totpCredential.findUniqueOrThrow({
    where: { userId: actor.user.id },
  });
  const nextStepAt =
    Number((credential.lastUsedTimeStep ?? 0n) + 1n) * 30000 + 250;
  if (nextStepAt > Date.now()) {
    const wait = nextStepAt - Date.now();
    assert(wait < 31000, "Unexpected future TOTP time step");
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  const result = await generate({ secret: actor.secret });
  privateValues.push(result);
  return result;
}
async function verify(page, code, recovery = false) {
  if (recovery)
    await page
      .getByRole("button", { name: "Utiliser un code de secours", exact: true })
      .click();
  await page.locator("#login-mfa-code").fill(code);
  await page
    .getByRole("button", { name: "Vérifier et se connecter", exact: true })
    .click();
}
async function session(page) {
  const response = await api(page, "/api/auth/me");
  assert.equal(response.status, 200);
  assert.equal(response.payload.success, true);
  return response.payload.data;
}
async function run() {
  browser = await chromium.launch({ headless: true });
  try {
    // Only between runs, in the guarded disposable database. Never reset
    // counters between scenarios: quota behavior remains active throughout.
    await prisma.rateLimit.deleteMany({});
    const anon = await client();
    await scenario(
      "Entrée anonyme, sept largeurs et destination privée conservée",
      async () => {
        assert.equal((await api(anon.page, "/api/auth/me")).status, 401);
        for (const width of [320, 360, 390, 768, 1024, 1440, 1920]) {
          await anon.page.setViewportSize({ width, height: 1000 });
          assert(
            await anon.page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            "Horizontal overflow",
          );
          await expect(anon.page.locator("#loginName")).toBeVisible();
        }
        for (const field of ["#loginName", "#password"]) {
          await expect(anon.page.locator(field)).toHaveAttribute(
            "autocomplete",
            "off",
          );
          await expect(anon.page.locator(field)).toHaveValue("");
        }
        const next = "/systeme/feuille-de-route?phase=1&q=personnes";
        await anon.page.goto(next);
        await expect(anon.page).toHaveURL(/\/login\?next=/);
        await expect(anon.page.locator("#loginName")).toBeVisible();
        assert.equal(new URL(anon.page.url()).searchParams.get("next"), next);
      },
    );
    await scenario(
      "Refus publics uniformes et protection CSRF au middleware réel",
      async () => {
        const disabled = await fixture("disabled", { isActive: false });
        const locked = await fixture("locked", {
          lockedUntil: new Date(Date.now() + 600000),
        });
        const wrong = await fixture("wrong");
        let expected;
        for (const [loginName, password] of [
          ["inconnu." + runId, config.E2E_SUPERADMIN_PASSWORD],
          [disabled.loginName, config.E2E_SUPERADMIN_PASSWORD],
          [locked.loginName, config.E2E_SUPERADMIN_PASSWORD],
          [wrong.loginName, "IncorrectFictive1!"],
        ]) {
          const response = await api(anon.page, "/api/auth/login", "POST", {
            loginName,
            password,
          });
          assert.equal(response.status, 401);
          expected ??= response.payload;
          assert.deepEqual(response.payload, expected);
        }
        const denied = await api(
          anon.page,
          "/api/auth/login",
          "POST",
          {
            loginName: wrong.loginName,
            password: config.E2E_SUPERADMIN_PASSWORD,
          },
          { "x-csrf-token": "invalid-audit-token" },
        );
        assert.equal(denied.status, 403);
        const failures = await prisma.auditLog.findMany({
          where: {
            action: "LOGIN_FAILED",
            targetUserId: { in: [disabled.id, locked.id, wrong.id] },
          },
        });
        assert.equal(failures.length, 3);
        assert(failures.every((row) => row.userId === null));
        const serialized = JSON.stringify(failures);
        assert(!serialized.includes(config.E2E_SUPERADMIN_PASSWORD));
        assert(!serialized.includes("IncorrectFictive1!"));
      },
    );
    let rootActor;
    await scenario(
      "Bootstrap superadmin réel : MFA obligatoire, cookies et confiance limitée",
      async () => {
        const root = await prisma.user.findUniqueOrThrow({
          where: { id: "e2e-only-superadmin" },
        });
        const rootClient = await client();
        await passwordStep(rootClient, root, true);
        await expect(
          rootClient.page.getByRole("button", {
            name: "Configurer maintenant",
            exact: true,
          }),
        ).toBeVisible();
        assert.equal((await api(rootClient.page, "/api/auth/me")).status, 401);
        const challengeCookie = (await rootClient.context.cookies()).find(
          (cookie) => cookie.name === "mfa-challenge",
        );
        assert(challengeCookie?.httpOnly && challengeCookie.secure);
        assert.equal(challengeCookie.path, "/api/auth/mfa");
        assert.equal(challengeCookie.sameSite, "Strict");
        rootActor = await enroll(rootClient, root);
        const current = await session(rootClient.page);
        assert.equal(current.user.id, root.id);
        assert.equal(current.session.rememberMe, false);
        const row = await prisma.session.findFirstOrThrow({
          where: { userId: root.id },
        });
        assert(Math.abs(row.expiresAt - row.createdAt - 86400000) < 1000);
        assert(Math.abs(row.idleExpiresAt - row.createdAt - 1800000) < 1000);
        const sessionCookie = (await rootClient.context.cookies()).find(
          (cookie) => cookie.name === "session",
        );
        assert(sessionCookie?.httpOnly && sessionCookie.secure);
        assert.notEqual(row.token, sessionCookie.value);
      },
    );
    let actor;
    let trusted;
    await scenario(
      "Bootstrap utilisateur, codes uniques, session longue et retour interne filtré",
      async () => {
        const user = await fixture("trusted");
        trusted = await client("/systeme/feuille-de-route?phase=1&q=personnes");
        await passwordStep(trusted, user, true);
        actor = await enroll(trusted, user);
        assert.equal(new Set(actor.recovery).size, 10);
        const current = await session(trusted.page);
        assert.equal(current.session.rememberMe, true);
        const row = await prisma.session.findFirstOrThrow({
          where: { userId: user.id },
        });
        assert(Math.abs(row.expiresAt - row.createdAt - 30 * 86400000) < 1000);
        assert(
          Math.abs(row.idleExpiresAt - row.createdAt - 7 * 86400000) < 1000,
        );
        const credential = await prisma.totpCredential.findUniqueOrThrow({
          where: { userId: user.id },
        });
        assert(
          !JSON.stringify(credential, (_, value) =>
            typeof value === "bigint" ? String(value) : value,
          ).includes(actor.secret),
        );
        const codes = await prisma.mfaRecoveryCode.findMany({
          where: { userId: user.id },
        });
        assert.equal(codes.length, 10);
        assert(
          actor.recovery.every((code) => !JSON.stringify(codes).includes(code)),
        );
      },
    );
    await scenario(
      "Code refusé puis TOTP accepté, sans double alerte et avec reprise clavier",
      async () => {
        const login = await mfaClient(actor);
        await verify(login.page, "000000");
        await expect(login.page.locator("main").getByRole("alert")).toHaveText(
          "Code incorrect ou expiré",
        );
        await expect(
          login.page.locator("main").getByRole("alert"),
        ).toBeFocused();
        await expect(login.page.locator("#login-mfa-code")).toHaveValue("");
        await expect(
          login.page.locator('[data-sonner-toast][data-type="error"]'),
        ).toHaveCount(0);
        await verify(login.page, await freshTotp(actor));
        await expect(login.page).toHaveURL(origin + "/");
        assert.equal((await session(login.page)).session.rememberMe, false);
      },
    );
    await scenario(
      "Secours consommé une fois, rejeu refusé puis autre secours accepté",
      async () => {
        const first = await mfaClient(actor);
        await verify(first.page, actor.recovery[0], true);
        await expect(first.page).toHaveURL(origin + "/");
        assert.equal(
          await prisma.mfaRecoveryCode.count({
            where: { userId: actor.user.id, usedAt: { not: null } },
          }),
          1,
        );
        const second = await mfaClient(actor);
        await verify(second.page, actor.recovery[0], true);
        await expect(second.page.locator("main").getByRole("alert")).toHaveText(
          "Code incorrect ou expiré",
        );
        await verify(second.page, actor.recovery[1]);
        await expect(second.page).toHaveURL(origin + "/");
        assert.equal(
          await prisma.mfaRecoveryCode.count({
            where: { userId: actor.user.id, usedAt: { not: null } },
          }),
          2,
        );
      },
    );
    await scenario(
      "Défi réellement expiré : refus et retour aux identifiants utilisable",
      async () => {
        const expired = await mfaClient(actor);
        await prisma.mfaLoginChallenge.update({
          where: { userId: actor.user.id },
          data: { expiresAt: new Date(Date.now() - 1000) },
        });
        await verify(expired.page, actor.recovery[2], true);
        await expect(
          expired.page.locator("main").getByRole("alert"),
        ).toHaveText(
          "Le défi de connexion a expiré. Recommencez la connexion.",
        );
        assert.equal((await api(expired.page, "/api/auth/me")).status, 401);
        await expired.page
          .getByRole("button", {
            name: "Retour à l’identifiant et au mot de passe",
            exact: true,
          })
          .click();
        await expect(expired.page.locator("#loginName")).toBeFocused();
        await expect(expired.page.locator("#loginName")).toHaveValue(
          actor.user.loginName,
        );
        await expect(expired.page.locator("#password")).toHaveValue("");
      },
    );
    await scenario(
      "Annulation supprime le défi sans toucher aux sessions existantes",
      async () => {
        const cancelled = await mfaClient(actor);
        const before = await prisma.session.count({
          where: { userId: actor.user.id },
        });
        await cancelled.page
          .getByRole("button", {
            name: "Retour à l’identifiant et au mot de passe",
            exact: true,
          })
          .click();
        await expect(cancelled.page.locator("#password")).toBeVisible();
        assert.equal(
          await prisma.mfaLoginChallenge.count({
            where: { userId: actor.user.id },
          }),
          0,
        );
        assert.equal(
          await prisma.session.count({ where: { userId: actor.user.id } }),
          before,
        );
        assert(
          !(await cancelled.context.cookies()).some(
            (cookie) => cookie.name === "mfa-challenge",
          ),
        );
      },
    );
    await scenario(
      "Réponse MFA endommagée après commit : session retrouvée sans rejouer le code",
      async () => {
        const damaged = await mfaClient(actor);
        let calls = 0;
        await damaged.page.route("**/api/auth/mfa/verify", async (route) => {
          calls++;
          const response = await route.fetch();
          assert.equal(response.status(), 200);
          // Preserve real Set-Cookie headers; only the JSON body is damaged.
          // This is a controlled transport fault, not a mocked successful login.
          await route.fulfill({ response, body: "{" });
        });
        await verify(damaged.page, actor.recovery[2], true);
        await expect(
          damaged.page.getByRole("button", {
            name: "Vérifier la session",
            exact: true,
          }),
        ).toBeVisible();
        await expect(damaged.page.locator("#login-mfa-code")).toBeDisabled();
        assert.equal(
          await prisma.mfaRecoveryCode.count({
            where: { userId: actor.user.id, usedAt: { not: null } },
          }),
          3,
        );
        await damaged.page
          .getByRole("button", { name: "Vérifier la session", exact: true })
          .click();
        await expect(damaged.page).toHaveURL(origin + "/");
        assert.equal((await session(damaged.page)).user.id, actor.user.id);
        assert.equal(calls, 1);
      },
    );
    await scenario(
      "Destination externe rejetée après authentification réelle",
      async () => {
        const external = await mfaClient(
          actor,
          "https://example.invalid/escape",
        );
        await verify(external.page, actor.recovery[3], true);
        await expect(external.page).toHaveURL(origin + "/");
      },
    );
    await scenario(
      "Révocation de sécurité entre mot de passe et MFA refuse la session",
      async () => {
        const revoked = await mfaClient(actor);
        await prisma.user.update({
          where: { id: actor.user.id },
          data: { securityVersion: { increment: 1 } },
        });
        await verify(revoked.page, actor.recovery[4], true);
        await expect(
          revoked.page.locator("main").getByRole("alert"),
        ).toHaveText(
          "Le défi de connexion a expiré. Recommencez la connexion.",
        );
        assert.equal((await api(revoked.page, "/api/auth/me")).status, 401);
      },
    );
    await scenario(
      "Session périmée : SSR privé et lecture de session refusés",
      async () => {
        const expired = await mfaClient(rootActor);
        await verify(expired.page, rootActor.recovery[0], true);
        await expect(expired.page).toHaveURL(origin + "/");
        await prisma.session.updateMany({
          where: { userId: rootActor.user.id },
          data: { idleExpiresAt: new Date(Date.now() - 1000) },
        });
        await expired.page.goto("/systeme/feuille-de-route");
        await expect(expired.page).toHaveURL(/\/login\?next=/);
        assert.equal((await api(expired.page, "/api/auth/me")).status, 401);
      },
    );
    assert.deepEqual(browserErrors, [], "Unexpected browser JavaScript error");
    const result =
      JSON.stringify(
        {
          date: "2026-10-12",
          runtime: "Next production + PostgreSQL 17 + Chromium",
          browserVersion: browser.version(),
          scenarios: observations,
        },
        null,
        2,
      ) + "\n";
    assert(
      privateValues
        .filter((value) => value.length > 8)
        .every((value) => !result.includes(value)),
      "Secret found in result archive",
    );
    fs.writeFileSync(path.join(__dirname, "resultats.json"), result);
  } catch (error) {
    let message = error.message;
    for (const value of privateValues)
      if (value) message = message.replaceAll(value, "[secret masqué]");
    console.error(message);
    process.exitCode = 1;
  } finally {
    for (const context of contexts) await context.close();
    await browser?.close();
    await prisma.$disconnect();
  }
}
run();
