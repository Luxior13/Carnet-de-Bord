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
  target.port !== "54620" ||
  target.pathname !== "/person_detail_test" ||
  new URL(origin).hostname !== "127.0.0.1" ||
  new URL(origin).port !== "3125"
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
            return {
              status: response.status,
              data: response.status === 204 ? null : await response.json(),
            };
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

const directory = "/membres/repertoire";
const filteredReturn = directory + "?q=Audit&sort=updated";
const contexts = [];
const pageErrors = [];
let browser;
let diagnosticPage;
const nickname = (page) => page.locator("#person-detail-nickname");
const saveIdentity = (page) =>
  page.getByRole("button", { name: "Enregistrer", exact: true });
const section = (page) =>
  page.getByRole("navigation", {
    name: "Navigation de la fiche du répertoire",
  });
const unique = (label) =>
  "Audit " + label + " " + randomBytes(4).toString("hex");
async function scenario(name, action) {
  await action();
  observations.push({ name, result: "passed" });
  console.log("PASS " + name);
}
async function read(page, id) {
  return json(await api(page).get("/api/personnes/" + id));
}
async function create(page, name) {
  return (
    await json(
      await api(page).post("/api/personnes", {
        data: { nickname: name, structureStatus: "IN_STRUCTURE" },
        headers: await headers(page),
      }),
      201,
    )
  ).person;
}
async function patch(page, id, data) {
  const current = await read(page, id);
  return (
    await json(
      await api(page).patch("/api/personnes/" + id, {
        data: {
          nickname: current.nickname,
          firstName: current.firstName,
          lastName: current.lastName,
          birthDate: current.birthDate,
          structureStatus: current.structureStatus,
          ...data,
        },
        headers: await headers(page),
      }),
    )
  ).person;
}
async function open(page, id, active = "identite") {
  await page.goto(
    directory +
      "/" +
      id +
      "?" +
      new URLSearchParams({ returnTo: filteredReturn, section: active }),
  );
  await expect(section(page)).toBeVisible();
  if (active === "identite") await expect(nickname(page)).toHaveCount(1);
  await expect(
    page.getByText("Service temporairement indisponible", { exact: true }),
  ).toHaveCount(0);
}
async function goSection(page, name) {
  await section(page).getByRole("link", { name, exact: true }).click();
}
async function main() {
  browser = await chromium.launch({ headless: true });
  const root = await authenticate(browser, config.E2E_SUPERADMIN_LOGIN_NAME);
  contexts.push(root.context);
  const page = root.page;
  page.on("pageerror", (error) => pageErrors.push(error.message));
  let person = await create(page, unique("Fiche"));
  const id = person.id;
  diagnosticPage = page;
  let firstEmail;
  let secondEmail;
  await scenario(
    "SSR, retour filtré, formulaire identité et attributs sans remplissage",
    async () => {
      await open(page, id);
      await expect(nickname(page)).toHaveValue(person.nickname);
      await expect(
        page.locator('[data-slot="section-action-bar"]'),
      ).toHaveCount(0);
      await expect(
        page
          .getByRole("navigation", { name: /ariane/i })
          .getByRole("link", { name: "Répertoire", exact: true }),
      ).toHaveAttribute("href", filteredReturn);
      const brokenDescriptions = await page
        .locator("main [aria-describedby]")
        .evaluateAll((nodes) =>
          nodes.flatMap((node) =>
            (node.getAttribute("aria-describedby") || "")
              .split(/\s+/)
              .filter((id) => id && !document.getElementById(id)),
          ),
        );
      assert.deepEqual(brokenDescriptions, []);
      await expect(nickname(page)).toHaveAttribute("autocomplete", "off");
      await nickname(page).fill("");
      await nickname(page).press("Enter");
      await expect(nickname(page)).toHaveAttribute("aria-invalid", "true");
      await expect(nickname(page)).toBeFocused();
      await nickname(page).fill(unique("Identité"));
      const response = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/personnes/" + id) &&
          r.request().method() === "PATCH",
      );
      await nickname(page).press("Enter");
      await json(await response);
      await expect(
        page.locator('[data-slot="section-action-bar"]'),
      ).toHaveCount(0);
      await expect(nickname(page)).toBeFocused();
      person = await read(page, id);
    },
  );
  await scenario(
    "Conflit identité : brouillon conservé, champs distants fusionnés",
    async () => {
      const local = unique("Local");
      await nickname(page).fill(local);
      const remote = await patch(page, id, {
        firstName: "Camille",
        version: person.version,
      });
      const refusal = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/personnes/" + id) &&
          r.request().method() === "PATCH",
      );
      await saveIdentity(page).click();
      assert.equal((await refusal).status(), 409);
      await page
        .getByRole("button", { name: "Actualiser la version", exact: true })
        .click();
      await expect(page.locator("#person-detail-firstName")).toHaveValue(
        "Camille",
      );
      await expect(nickname(page)).toHaveValue(local);
      await expect(saveIdentity(page)).toBeEnabled();
      const response = page.waitForResponse(
        (r) =>
          r.url().endsWith("/api/personnes/" + id) &&
          r.request().method() === "PATCH",
      );
      await saveIdentity(page).click();
      await json(await response);
      person = await read(page, id);
      assert.equal(person.nickname, local);
      assert.equal(person.firstName, remote.firstName);
    },
  );
  await scenario(
    "Réponse identité perdue après commit : vérification avant nouvelle tentative",
    async () => {
      const local = unique("Confirmation");
      await nickname(page).fill(local);
      let calls = 0;
      const routePattern = "**/api/personnes/" + id;
      const handler = async (route) => {
        if (route.request().method() !== "PATCH") return route.continue();
        calls++;
        const response = await route.fetch();
        assert.equal(response.status(), 200);
        await route.abort("failed");
      };
      await page.route(routePattern, handler);
      await saveIdentity(page).click();
      await expect(
        page.getByText(
          /Le résultat de l.enregistrement n.a pas pu être confirmé/,
        ),
      ).toBeVisible();
      assert.equal((await read(page, id)).nickname, local);
      await page.unroute(routePattern, handler);
      await page
        .getByRole("button", { name: "Actualiser la version", exact: true })
        .click();
      await expect(
        page.locator('[data-slot="section-action-bar"]'),
      ).toHaveCount(0);
      assert.equal(calls, 1);
      person = await read(page, id);
    },
  );
  await scenario(
    "Email par Entrée, modification sans changement, focus et doublon légitime",
    async () => {
      await goSection(page, "Coordonnées");
      await page
        .getByRole("button", { name: "Ajouter un email", exact: true })
        .click();
      const email =
        "audit-" + randomBytes(4).toString("hex") + "@example.invalid";
      await page.locator("#person-child-email-email").fill(email);
      const response = page.waitForResponse(
        (r) => r.url().endsWith("/emails") && r.request().method() === "POST",
      );
      await page.locator("#person-child-email-email").press("Enter");
      await json(await response, 201);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      person = await read(page, id);
      firstEmail = person.emails[0];
      await page
        .getByRole("button", { name: "Modifier cet email", exact: true })
        .click();
      await expect(
        page
          .getByRole("dialog")
          .getByRole("button", { name: "Enregistrer", exact: true }),
      ).toBeDisabled();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Annuler", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Modifier cet email", exact: true }),
      ).toBeFocused();
      const other = await create(page, unique("Doublon"));
      await json(
        await api(page).post("/api/personnes/" + other.id + "/emails", {
          headers: await headers(page),
          data: {
            email,
            label: "Personnel",
            isPrimary: true,
            personVersion: other.version,
          },
        }),
        201,
      );
      await page
        .getByRole("button", { name: "Modifier cet email", exact: true })
        .click();
      await page.locator("#person-child-email-label").fill("Association");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await expect(
        page.getByRole("dialog").getByText(/Elle a bien été enregistrée ici/),
      ).toBeVisible();
      await page.getByRole("button", { name: "Terminer", exact: true }).click();
      person = await read(page, id);
      firstEmail = person.emails[0];
    },
  );
  await scenario(
    "Conflit coordonnée : valeur locale et libellé distant conservés",
    async () => {
      await page
        .getByRole("button", { name: "Modifier cet email", exact: true })
        .click();
      const local =
        "local-" + randomBytes(4).toString("hex") + "@example.invalid";
      await page.locator("#person-child-email-email").fill(local);
      person = (
        await json(
          await api(page).patch(
            "/api/personnes/" + id + "/emails/" + firstEmail.id,
            {
              headers: await headers(page),
              data: {
                email: firstEmail.email,
                label: "Professionnel",
                isPrimary: true,
                personVersion: person.version,
                version: firstEmail.version,
              },
            },
          ),
        )
      ).person;
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await expect(
        page
          .getByRole("dialog")
          .getByText("Modification concurrente", { exact: true }),
      ).toBeVisible();
      await page
        .getByRole("button", { name: "Actualiser la version", exact: true })
        .click();
      await expect(page.locator("#person-child-email-label")).toHaveValue(
        "Professionnel",
      );
      await expect(page.locator("#person-child-email-email")).toHaveValue(
        local,
      );
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      person = await read(page, id);
      firstEmail = person.emails[0];
      assert.equal(firstEmail.email, local);
      assert.equal(firstEmail.label, "Professionnel");
    },
  );
  await scenario(
    "Téléphone et profil social : champs, listes et données enregistrées",
    async () => {
      await page
        .getByRole("button", { name: "Ajouter un téléphone", exact: true })
        .click();
      await page.locator("#person-child-phone-phone").fill("0612345678");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page
        .getByRole("button", { name: "Ajouter un profil social", exact: true })
        .click();
      await page
        .locator("#person-child-social-identifier")
        .fill("audit-fictif");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      person = await read(page, id);
      assert.equal(person.phones[0].phone, "0612345678");
      assert.equal(
        (
          await prisma.personPhone.findUniqueOrThrow({
            where: { id: person.phones[0].id },
          })
        ).normalizedPhone,
        "+33612345678",
      );
      assert.equal(person.socialProfiles[0].networkKey, "discord");
      assert.equal(person.socialProfiles[0].isPrimary, true);
    },
  );
  await scenario(
    "Suppression email principal : remplacement explicite et état SQL",
    async () => {
      await page
        .getByRole("button", { name: "Ajouter un email", exact: true })
        .click();
      const email =
        "second-" + randomBytes(4).toString("hex") + "@example.invalid";
      await page.locator("#person-child-email-email").fill(email);
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      person = await read(page, id);
      secondEmail = person.emails.find((item) => item.email === email);
      const row = page
        .getByRole("listitem")
        .filter({
          has: page.getByRole("link", { name: firstEmail.email, exact: true }),
        });
      await row
        .getByRole("button", { name: "Modifier cet email", exact: true })
        .click();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Supprimer", exact: true })
        .click();
      const dialog = page.getByRole("alertdialog");
      await expect(
        dialog.getByRole("button", { name: "Supprimer", exact: true }),
      ).toBeDisabled();
      await dialog
        .getByRole("combobox", { name: "Nouveau principal", exact: true })
        .click();
      await page.getByRole("option", { name: email, exact: true }).click();
      await dialog
        .getByRole("button", { name: "Supprimer", exact: true })
        .click();
      await expect(dialog).toHaveCount(0);
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Ajouter un email", exact: true }),
      ).toBeFocused();
      person = await read(page, id);
      assert.equal(person.emails.length, 1);
      assert.equal(person.emails[0].id, secondEmail.id);
      assert.equal(person.emails[0].isPrimary, true);
      assert.equal(
        await prisma.personEmail.count({ where: { id: firstEmail.id } }),
        0,
      );
    },
  );
  await scenario(
    "Provenance réelle et clé d'historique invalide refusée",
    async () => {
      await goSection(page, "Identité");
      const hint = page.getByRole("button", {
        name: "Voir l'origine : Pseudo principal",
        exact: true,
      });
      await hint.focus();
      await expect(page.getByRole("tooltip")).toContainText(/par/);
      await nickname(page).focus();
      const response = await api(page).get(
        "/api/personnes/" +
          id +
          "/historique-champ?sectionKey=constructor&fieldKey=nickname",
      );
      assert.equal(response.status(), 400);
    },
  );
  await scenario(
    "Composition responsive, rail collant, absence de débordement",
    async () => {
      for (const viewport of [
        { width: 1440, height: 1000 },
        { width: 390, height: 844 },
        { width: 320, height: 568 },
        { width: 844, height: 390 },
      ]) {
        await page.setViewportSize(viewport);
        await expect(nickname(page)).toBeVisible();
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "Horizontal overflow",
        );
        const boxes = await page.locator("main").boundingBox();
        assert(boxes.width > 0);
        await page.screenshot({
          path: path.join(__dirname, "fiche-" + viewport.width + ".png"),
          fullPage: true,
        });
      }
      await page.setViewportSize({ width: 1440, height: 700 });
      await nickname(page).fill(unique("Brouillon visuel"));
      await page
        .locator('[data-slot="section-action-bar"]')
        .scrollIntoViewIfNeeded();
      const bounds = await page
        .locator('[data-slot="section-action-bar"]')
        .boundingBox();
      assert(bounds.y + bounds.height <= 702);
      await page.getByRole("button", { name: "Annuler", exact: true }).click();
      await page
        .getByRole("button", {
          name: "Abandonner les modifications",
          exact: true,
        })
        .click();
      await expect(nickname(page)).toBeFocused();
    },
  );
  await scenario(
    "Lecture seule : SSR autorisé, actions cachées et mutation refusée",
    async () => {
      const reader = await authenticate(browser, "e2e-detail-reader", {
        "persons:view": true,
      });
      contexts.push(reader.context);
      await open(reader.page, id);
      await expect(nickname(reader.page)).toBeDisabled();
      await expect(
        reader.page.getByRole("button", {
          name: "Supprimer la fiche",
          exact: true,
        }),
      ).toHaveCount(0);
      await expect(
        reader.page.getByRole("button", {
          name: "Voir l'origine : Pseudo principal",
          exact: true,
        }),
      ).toHaveCount(0);
      await goSection(reader.page, "Coordonnées");
      await expect(
        reader.page.getByRole("button", {
          name: "Ajouter un email",
          exact: true,
        }),
      ).toHaveCount(0);
      assert.equal(
        (
          await api(reader.page).patch("/api/personnes/" + id, {
            headers: await headers(reader.page),
            data: { nickname: "Interdit", version: person.version },
          })
        ).status(),
        403,
      );
      assert.equal(
        (
          await api(reader.page).get(
            "/api/personnes/" +
              id +
              "/historique-champ?sectionKey=identity&fieldKey=nickname",
          )
        ).status(),
        403,
      );
    },
  );
  await scenario(
    "Suppression fiche : conflit, réponse perdue, même clé après réouverture et retour filtré",
    async () => {
      await page
        .getByRole("button", { name: "Supprimer la fiche", exact: true })
        .click();
      person = await patch(page, id, {
        lastName: "Version distante",
        version: person.version,
      });
      let dialog = page.getByRole("alertdialog");
      await dialog
        .getByRole("button", { name: "Supprimer définitivement", exact: true })
        .click();
      await expect(
        dialog.getByText("Version périmée", { exact: true }),
      ).toBeVisible();
      await dialog
        .getByRole("button", { name: "Actualiser", exact: true })
        .click();
      await expect(
        dialog.getByRole("button", {
          name: "Supprimer définitivement",
          exact: true,
        }),
      ).toBeEnabled();
      const keys = [];
      let deletes = 0;
      const pattern = "**/api/personnes/" + id;
      const handler = async (route) => {
        if (route.request().method() !== "DELETE") return route.continue();
        keys.push(route.request().headers()["idempotency-key"]);
        deletes++;
        const response = await route.fetch();
        assert.equal(response.status(), 204);
        if (deletes === 1) await route.abort("failed");
        else await route.fulfill({ response });
      };
      await page.route(pattern, handler);
      await dialog
        .getByRole("button", { name: "Supprimer définitivement", exact: true })
        .click();
      await expect(
        dialog.getByText(
          /Le résultat de la suppression n.a pas pu être confirmé/,
        ),
      ).toBeVisible();
      assert.equal(await prisma.person.count({ where: { id } }), 0);
      await dialog
        .getByRole("button", { name: "Annuler", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Supprimer la fiche", exact: true })
        .click();
      await dialog
        .getByRole("button", { name: "Supprimer définitivement", exact: true })
        .click();
      await expect(page).toHaveURL(origin + filteredReturn);
      assert.equal(keys.length, 2);
      assert.equal(keys[0], keys[1]);
      await page.unroute(pattern, handler);
      assert.equal(
        await prisma.personEmail.count({ where: { personId: id } }),
        0,
      );
      assert.equal(
        await prisma.personPhone.count({ where: { personId: id } }),
        0,
      );
      assert.equal(
        await prisma.personSocialProfile.count({ where: { personId: id } }),
        0,
      );
    },
  );
  await scenario(
    "Révocation pendant une édition : API refuse et données retirées de la page",
    async () => {
      const target = await create(page, unique("Révocation"));
      const editor = await authenticate(browser, "e2e-detail-editor", {
        "persons:view": true,
        "persons:update": true,
      });
      contexts.push(editor.context);
      await open(editor.page, target.id);
      await nickname(editor.page).fill("Brouillon révoqué");
      await prisma.user.update({
        where: { loginName: "e2e-detail-editor" },
        data: { permissions: {} },
      });
      await saveIdentity(editor.page).click();
      await expect(
        editor.page.getByText(
          "Vous n'avez pas la permission de consulter cette fiche.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(nickname(editor.page)).toHaveCount(0);
      assert.equal((await read(page, target.id)).nickname, target.nickname);
      await editor.page.reload();
      await expect(
        editor.page.getByText(
          "Vous n'avez pas la permission de consulter cette fiche.",
          { exact: true },
        ),
      ).toBeVisible();
      await prisma.user.update({
        where: { loginName: "e2e-detail-editor" },
        data: { permissions: { "persons:view": true, "persons:delete": true } },
      });
      await editor.page.reload();
      await editor.page
        .getByRole("button", { name: "Supprimer la fiche", exact: true })
        .click();
      await prisma.user.update({
        where: { loginName: "e2e-detail-editor" },
        data: { permissions: {} },
      });
      await editor.page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Supprimer définitivement", exact: true })
        .click();
      await expect(
        editor.page.getByText(
          "Vous n'avez pas la permission de consulter cette fiche.",
          { exact: true },
        ),
      ).toBeVisible();
      assert.equal(await prisma.person.count({ where: { id: target.id } }), 1);
    },
  );
  await scenario(
    "Accès anonyme direct : connexion requise et API 401",
    async () => {
      const context = await browser.newContext({ baseURL: origin });
      contexts.push(context);
      const anonymous = await context.newPage();
      await anonymous.goto(directory + "/" + id);
      await expect(anonymous).toHaveURL(/\/login/);
      assert.equal(
        (await api(anonymous).get("/api/personnes/" + id)).status(),
        401,
      );
    },
  );
  assert.deepEqual(pageErrors, []);
}
function sanitize(value) {
  let text = String(value);
  for (const [key, value] of Object.entries(config))
    if (/PASSWORD|KEY/.test(key) && typeof value === "string")
      text = text.replaceAll(value, "[secret]");
  for (const entry of fs.readdirSync(work))
    if (entry.endsWith(".totp"))
      text = text.replaceAll(
        fs.readFileSync(path.join(work, entry), "utf8"),
        "[totp-secret]",
      );
  return text.replace(/\b\d{6}\b/g, "[six-digits]");
}
main()
  .then(() => {
    fs.writeFileSync(
      path.join(__dirname, "resultats.json"),
      JSON.stringify(
        {
          checkedAt: new Date().toISOString(),
          browser: "Chromium " + browser.version(),
          observations,
          limitations: [
            "Base PostgreSQL, comptes et données fictifs isolés ; serveur Next de production local.",
            "Deux pertes de réponse injectées après commits PostgreSQL réels.",
            "Dimensions émulées ; pas de lecteur d’écran ni de Safari/iOS réel.",
          ],
        },
        null,
        2,
      ) + "\n",
    );
  })
  .catch(async (error) => {
    if (diagnosticPage)
      console.error(
        sanitize(
          await diagnosticPage
            .getByRole("dialog")
            .locator('[role="alert"]')
            .allTextContents(),
        ),
      );
    console.error(sanitize(error.stack));
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const context of contexts) await context.close();
    if (browser) await browser.close();
    await prisma.$disconnect();
  });
