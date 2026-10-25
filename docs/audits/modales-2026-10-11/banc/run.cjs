const fs = require("fs"),
  path = require("path"),
  http = require("http"),
  assert = require("assert/strict");
const esbuild = require("esbuild");
const { chromium, expect } = require("@playwright/test");
const postcss = require("postcss");
const tailwind = require("@tailwindcss/postcss");
const root = path.resolve(__dirname, "../../../.."),
  src = path.join(root, "apps/web/src");
const work = fs.mkdtempSync(
  path.join(require("os").tmpdir(), "noctambule-modal-audit-"),
);
const proof = work;
console.log("Résultats du banc : " + proof);
const now = "2026-10-11T00:00:00.000Z";
const actor = {
  id: "audit-root",
  loginName: "audit.root",
  firstName: "Camille",
  lastName: "Exemple",
  role: "SUPERADMIN",
  isProtected: true,
  isActive: true,
  mfaEnabled: true,
  mustChangePassword: false,
  permissions: {},
  createdAt: now,
  updatedAt: now,
};
const target = {
  ...actor,
  id: "audit-target",
  loginName: "compte.exemple",
  firstName: "Alex",
  role: "USER",
  isProtected: false,
  isActive: false,
  contactEmail: "exemple@example.test",
};
const base = {
  createdAt: now,
  updatedAt: now,
  version: 1,
  label: "Personnel",
  isPrimary: true,
};
const person = {
  id: "person-fixture",
  version: 1,
  createdAt: now,
  updatedAt: now,
  nickname: "Joueur Exemple",
  firstName: "Alex",
  lastName: "Exemple",
  birthDate: null,
  age: null,
  isAdult: null,
  lastChange: null,
  structureStatus: "IN_STRUCTURE",
  emails: [
    { ...base, id: "email-one", email: "premier@example.test" },
    {
      ...base,
      id: "email-two",
      email: "second@example.test",
      isPrimary: false,
    },
  ],
  phones: [
    { ...base, id: "phone-one", phone: "+33612345678", countryCode: "FR" },
  ],
  socialProfiles: [
    {
      ...base,
      id: "social-one",
      networkKey: "discord",
      identifier: "joueur.exemple",
      profileUrl: null,
    },
  ],
};
const sessions = [
  {
    id: "current",
    isCurrent: true,
    userAgent: "Mozilla/5.0 Chrome/130",
    ipAddress: "127.0.0.1",
    createdAt: now,
    lastSeenAt: now,
    expiresAt: "2026-11-11T00:00:00.000Z",
    idleExpiresAt: "2026-10-18T00:00:00.000Z",
    rememberMe: false,
  },
  {
    id: "other",
    isCurrent: false,
    userAgent: "Mozilla/5.0 Firefox/130",
    ipAddress: "127.0.0.2",
    createdAt: now,
    lastSeenAt: now,
    expiresAt: "2026-11-11T00:00:00.000Z",
    idleExpiresAt: "2026-10-18T00:00:00.000Z",
    rememberMe: false,
  },
];
const json = (route, data, status = 200) =>
  route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(
      status < 400
        ? { success: true, data }
        : {
            success: false,
            error: {
              code: status === 409 ? "CONFLICT" : "INTERNAL_ERROR",
              message: "Erreur simulée",
            },
          },
    ),
  });
const body = async (page) => page.locator("body").innerText();
async function main() {
  fs.mkdirSync(proof, { recursive: true });
  const mock = path.join(__dirname, "mocks.tsx");
  const alias = {
    "$context/UserContext": `export {useUser} from ${JSON.stringify(mock)};`,
    "$context/FeatureAvailabilityContext": `export {useFeatureAvailability} from ${JSON.stringify(mock)};`,
    "$components/AuthenticatedLayout": `export {AuthenticatedLayout as default} from ${JSON.stringify(mock)};`,
    "next/navigation": `export {useRouter,useSearchParams,usePathname} from ${JSON.stringify(mock)};`,
    "next/link": `import React from 'react';export default function Link({href,children,...p}){return <a href={href} {...p}>{children}</a>}`,
    "next/image": `import React from 'react';export default function Image({priority,unoptimized,fill,...p}){return <img {...p}/>}`,
    "next/dynamic": `import React from 'react';export default function dynamic(loader){const C=React.lazy(()=>loader().then(m=>({default:m.default??m})));return p=><React.Suspense fallback={null}><C {...p}/></React.Suspense>}`,
    $env: `export const env={NEXT_PUBLIC_WEB_URL:'http://127.0.0.1',WEB_URL:'http://127.0.0.1'};`,
  };
  await esbuild.build({
    entryPoints: [path.join(__dirname, "fixture.tsx")],
    bundle: true,
    outfile: path.join(work, "bundle.js"),
    platform: "browser",
    format: "iife",
    jsx: "automatic",
    tsconfig: path.join(root, "apps/web/tsconfig.json"),
    define: { "process.env.NODE_ENV": '"development"' },
    plugins: [
      {
        name: "mocks",
        setup(b) {
          b.onResolve({ filter: /.*/ }, (args) =>
            Object.hasOwn(alias, args.path)
              ? { path: args.path, namespace: "audit" }
              : null,
          );
          b.onLoad({ filter: /.*/, namespace: "audit" }, (args) => ({
            contents: alias[args.path],
            loader: "tsx",
            resolveDir: root,
          }));
        },
      },
    ],
  });
  const css = await postcss([
    tailwind({ base: path.join(root, "apps/web") }),
  ]).process(fs.readFileSync(path.join(src, "app/globals.css"), "utf8"), {
    from: path.join(src, "app/globals.css"),
  });
  fs.writeFileSync(path.join(work, "style.css"), css.css);
  const server = http.createServer((req, res) => {
    const file = req.url.split("?")[0];
    if (file === "/bundle.js" || file === "/style.css") {
      res.setHeader(
        "Content-Type",
        file.endsWith("css") ? "text/css" : "application/javascript",
      );
      res.end(fs.readFileSync(path.join(work, file.slice(1))));
    } else {
      res.setHeader("Content-Type", "text/html");
      res.end(
        '<!doctype html><html class="dark" lang="fr"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><style>:root{--font-geist-sans:Arial,sans-serif;--font-geist-mono:monospace}body{margin:0}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
      );
    }
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const url = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch({ headless: true });
  const results = [];
  async function run(width, name, fixture, fn, height = 844) {
    if (process.env.AUDIT_ONLY && !name.includes(process.env.AUDIT_ONLY))
      return;
    const context = await browser.newContext({
      viewport: { width, height },
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    page.setDefaultTimeout(6500);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/api/**", async (route) => {
      const u = new URL(route.request().url());
      let data = { user: target };
      if (u.pathname.includes("sessions")) data = { sessions };
      else if (u.pathname === "/api/systeme/parametres")
        data = [
          {
            key: "audit.retentionDays",
            description: null,
            value: 1095,
            version: 1,
            updatedAt: now,
          },
        ];
      else if (u.pathname === "/api/auth/mfa")
        data = { enabled: true, enabledAt: now, recoveryCodesRemaining: 8 };
      else if (u.pathname.includes("/personnes/")) data = { person };
      return json(route, data);
    });
    await page.route("**/fixture/person", (r) =>
      json(r, {
        ...person,
        version: 2,
        emails: person.emails.map((x) => ({ ...x, version: 2 })),
      }),
    );
    await page.goto(`${url}/audit?fixture=${fixture}`);
    await page
      .getByRole("link", { name: "Accueil", exact: true })
      .first()
      .waitFor();
    try {
      await fn(page);
      assert.equal(errors.length, 0, errors.join("\n"));
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "horizontal page overflow",
      );
      results.push({ width, height, scenario: name, result: "passed" });
      console.log(`${width} ${name}: passed`);
    } catch (e) {
      console.error(`${width} ${name}: FAILED`, e.message, errors);
      console.error((await body(page)).slice(0, 8000));
      await page.screenshot({ path: path.join(work, "failure.png") });
      throw e;
    } finally {
      await context.close();
    }
  }
  async function inspect(
    page,
    { escape = true, focus = true, screenshot } = {},
  ) {
    const topDialog = page
      .locator('[role="dialog"]:visible,[role="alertdialog"]:visible')
      .last();
    await expect(topDialog).toBeVisible();
    const id = await topDialog.getAttribute("id");
    const dialog = page.locator('[id="' + id + '"]');
    const fields = dialog.locator(
      'input:not([type="hidden"]):not([type="checkbox"]):not([type="radio"]), textarea',
    );
    // Since 25 October 2026 (REV-07), authentication fields carry their
    // autofill token and no ignore attribute; every other field stays off.
    const tokens = [
      "current-password",
      "new-password",
      "one-time-code",
      "username",
    ];
    for (const field of await fields.all()) {
      if (tokens.includes(await field.getAttribute("autocomplete"))) {
        await expect(field).not.toHaveAttribute("data-bwignore", "true");
        continue;
      }
      await expect(field).toHaveAttribute("autocomplete", "off");
      for (const attribute of [
        "data-bwignore",
        "data-1p-ignore",
        "data-lpignore",
      ])
        await expect(field).toHaveAttribute(attribute, "true");
      await expect(field).toHaveAttribute("data-form-type", "other");
    }
    for (const form of await dialog.locator("form").all())
      await expect(form).toHaveAttribute("autocomplete", "off");
    const bounds = await dialog.boundingBox();
    const vp = page.viewportSize();
    assert(
      bounds.x >= -1 &&
        bounds.y >= -1 &&
        bounds.x + bounds.width <= vp.width + 1 &&
        bounds.y + bounds.height <= vp.height + 1,
      "dialog outside viewport",
    );
    assert(
      await dialog.evaluate((e) => e.scrollWidth <= e.clientWidth + 2),
      "dialog horizontal overflow",
    );
    for (let i = 0; i < 14; i++) {
      await page.keyboard.press("Tab");
      assert(
        await dialog.evaluate((e) => e.contains(document.activeElement)),
        "focus escaped dialog",
      );
    }
    if (screenshot)
      await page.screenshot({ path: path.join(proof, screenshot) });
    if (escape) {
      if ((await dialog.getAttribute("role")) === "alertdialog") {
        await page.evaluate(
          () =>
            new Promise((resolve) =>
              requestAnimationFrame(() => requestAnimationFrame(resolve)),
            ),
        );
        await page.mouse.click(1, 1);
        await expect(dialog).toBeVisible();
      }
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
      if (focus) await expect(page.locator("#opener")).toBeFocused();
    }
  }
  try {
    const simple = [
      "child-email-new",
      "child-phone-new",
      "child-social-new",
      "child-email-readonly",
      "child-phone-readonly",
      "child-social-readonly",
      "password",
      "stepup",
      "reset-mfa",
      "contact",
      "codes",
      "unsaved",
    ];
    for (const width of [320, 390, 768, 1440]) {
      for (const fixture of simple)
        await run(width, `layout-${fixture}`, fixture, async (page) => {
          await page.locator("#opener").click();
          await inspect(page, {
            screenshot: width === 390 ? `${fixture}-390.png` : undefined,
          });
          if (!fixture.startsWith("child") && fixture !== "unsaved") {
            await page.locator("#opener").click();
            await expect(page.getByRole("dialog")).toBeVisible();
            await page.evaluate(
              () =>
                new Promise((resolve) =>
                  requestAnimationFrame(() => requestAnimationFrame(resolve)),
                ),
            );
            await page.mouse.click(1, 1);
            await expect(page.getByRole("dialog")).not.toBeVisible();
            await expect(page.locator("#opener")).toBeFocused();
          }
        });
      for (const fixture of ["setup", "setup-replace", "password-forced"])
        await run(width, `locked-${fixture}`, fixture, async (page) => {
          await page.locator("#opener").click();
          await inspect(page, { escape: false });
          await page.keyboard.press("Escape");
          await expect(page.getByRole("dialog")).toBeVisible();
          assert.equal(
            await page
              .getByRole("button", { name: "Fermer", exact: true })
              .count(),
            0,
          );
        });
      await run(width, "nested-focus", "nested", async (page) => {
        await page.locator("#opener").click();
        await page.locator("#nested-opener").click();
        await page.getByRole("button", { name: "Rester", exact: true }).click();
        await expect(page.locator("#nested-opener")).toBeFocused();
        await page.locator("#nested-opener").click();
        await page
          .getByRole("button", { name: "Continuer", exact: true })
          .click();
        await expect(
          page.getByRole("dialog", { name: "Confirmation suivante" }),
        ).toBeVisible();
        await expect(page.locator("#admin-step-up-password")).toBeFocused();
        await inspect(page, { escape: false });
      });
      await run(width, "person-draft-conflict", "child-email", async (page) => {
        await page.locator("#opener").click();
        const email = page.locator("#person-child-email-email");
        await email.fill("brouillon@example.test");
        await page.evaluate(() =>
          window.dispatchEvent(new Event("audit-refresh")),
        );
        await expect(email).toHaveValue("brouillon@example.test");
        await page
          .getByRole("button", { name: "Annuler", exact: true })
          .click();
        await page.getByRole("button", { name: "Rester", exact: true }).click();
        await expect(
          page.getByRole("button", { name: "Annuler", exact: true }),
        ).toBeFocused();
        await expect(email).toHaveValue("brouillon@example.test");
        let calls = 0,
          version;
        await page.route("**/api/personnes/**", async (r) => {
          calls++;
          version = r.request().postDataJSON();
          if (calls === 1) return json(r, null, 409);
          return json(r, { person: { ...person, version: 3 } });
        });
        await page
          .getByRole("button", { name: "Enregistrer", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Actualiser la version" })
          .click();
        await expect(email).toHaveValue("brouillon@example.test");
        await page
          .getByRole("button", { name: "Enregistrer", exact: true })
          .evaluate((e) => {
            e.click();
            e.click();
          });
        await expect(page.getByRole("dialog")).not.toBeVisible();
        assert.equal(calls, 2);
        assert.equal(version.version, 2);
        assert.equal(version.personVersion, 2);
      });
      await run(width, "search", "search", async (page) => {
        await page
          .getByRole("button", { name: /Rechercher/ })
          .first()
          .click();
        await inspect(page, { focus: false });
      });
    }
    for (const width of [320, 1440]) {
      for (const action of [
        "contact",
        "login",
        "password",
        "mfa",
        "sessions",
        "session",
        "delete",
      ])
        await run(width, `integrated-user-${action}`, "user", async (page) => {
          let opener;
          if (action === "contact") {
            opener = page.getByRole("button", {
              name: "Supprimer l'adresse de contact",
              exact: true,
            });
          } else if (action === "login") {
            await page.locator("#user-login-name").fill("compte.modifie");
            opener = page.getByRole("button", {
              name: "Enregistrer",
              exact: true,
            });
          } else {
            await page
              .getByRole("link", { name: "Sécurité", exact: true })
              .click();
            const names = {
              password: "Réinitialiser le mot de passe",
              mfa: "Réinitialiser la double authentification",
              sessions: "Révoquer toutes les sessions",
              session: /^Révoquer la session /,
              delete: "Supprimer définitivement",
            };
            opener = page
              .getByRole("button", { name: names[action], exact: true })
              .first();
          }
          await opener.click();
          await inspect(page, { focus: false });
          await expect(opener).toBeFocused();
        });
      for (const action of ["reduction", "refresh", "navigation"])
        await run(
          width,
          `integrated-settings-${action}`,
          "settings",
          async (page) => {
            // Direct entry since the settings redesign of 14 October 2026.
            await page.getByRole("spinbutton").fill("730");
            const opener =
              action === "reduction"
                ? page.getByRole("button", { name: /^Enregistrer/ })
                : action === "refresh"
                  ? page.getByRole("button", {
                      name: "Actualiser",
                      exact: true,
                    })
                  : page.locator("#destination");
            await opener.click();
            await inspect(page, { focus: false });
            if (action === "reduction")
              await expect(page.getByRole("spinbutton")).toBeFocused();
            else await expect(opener).toBeFocused();
          },
        );
      for (const all of [false, true])
        await run(
          width,
          `integrated-security-${all ? "all" : "one"}`,
          "account-security",
          async (page) => {
            const opener = page.getByRole("button", {
              name: all ? "Déconnecter les autres sessions" : "Déconnecter",
              exact: true,
            });
            await opener.click();
            await inspect(page, { focus: false });
            await expect(opener).toBeFocused();
          },
        );
      for (const kind of ["email", "téléphone", "profil"])
        await run(
          width,
          `integrated-delete-${kind}`,
          "collections",
          async (page) => {
            await page
              .getByRole("button", {
                name:
                  kind === "email"
                    ? "Modifier cet email"
                    : `Modifier ce ${kind}`,
                exact: true,
              })
              .first()
              .click();
            const opener = page.getByRole("button", {
              name: "Supprimer",
              exact: true,
            });
            await opener.click();
            await inspect(page, { focus: false });
            await expect(opener).toBeFocused();
          },
        );
      await run(width, "integrated-danger", "danger", async (page) => {
        const opener = page.getByRole("button", {
          name: "Supprimer la fiche",
          exact: true,
        });
        await opener.click();
        await inspect(page, { focus: false });
        await expect(opener).toBeFocused();
      });
    }
    await run(390, "sidebar-mobile", "sidebar", async (page) => {
      const trigger = page.locator('[data-sidebar="trigger"]');
      await trigger.click();
      await inspect(page, { focus: false });
      await expect(trigger).toBeFocused();
    });
    await run(
      390,
      "person-duplicate-warning",
      "child-email-new",
      async (page) => {
        await page.route("**/api/personnes/**", (r) =>
          json(r, {
            person: { ...person, version: 2 },
            duplicateWarning: { duplicateFound: true, fields: ["email"] },
          }),
        );
        await page.locator("#opener").click();
        await page
          .locator("#person-child-email-email")
          .fill("doublon@example.test");
        await page
          .getByRole("button", { name: "Enregistrer", exact: true })
          .click();
        await expect(
          page.getByText(/Elle a bien été enregistrée ici/),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Terminer", exact: true }),
        ).toBeVisible();
        await page.evaluate(() =>
          window.dispatchEvent(new Event("audit-refresh")),
        );
        await expect(
          page.getByText(/Elle a bien été enregistrée ici/),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Terminer", exact: true })
          .click();
        await expect(page.getByRole("dialog")).not.toBeVisible();
      },
    );
    await run(390, "delete-conflict-reload", "collections", async (page) => {
      let calls = 0,
        payload;
      await page.route("**/api/personnes/**", (r) => {
        calls++;
        payload = r.request().postDataJSON();
        return calls === 1
          ? json(r, null, 409)
          : json(r, {
              person: {
                ...person,
                version: 3,
                emails: [{ ...person.emails[1], isPrimary: true, version: 3 }],
              },
            });
      });
      await page
        .getByRole("button", { name: "Modifier cet email", exact: true })
        .first()
        .click();
      await page
        .getByRole("button", { name: "Supprimer", exact: true })
        .click();
      const confirmation = page.getByRole("alertdialog");
      const select = confirmation.getByRole("combobox");
      await select.click();
      await page.getByRole("option", { name: "second@example.test" }).click();
      await confirmation
        .getByRole("button", { name: "Supprimer", exact: true })
        .click();
      await confirmation
        .getByRole("button", { name: "Actualiser", exact: true })
        .click();
      await expect(
        confirmation.getByRole("button", { name: "Supprimer", exact: true }),
      ).toBeDisabled();
      await select.click();
      await page.getByRole("option", { name: "second@example.test" }).click();
      await confirmation
        .getByRole("button", { name: "Supprimer", exact: true })
        .evaluate((e) => {
          e.click();
          e.click();
        });
      await expect(confirmation).not.toBeVisible();
      assert.equal(calls, 2);
      assert.equal(payload.version, 2);
      assert.equal(payload.personVersion, 2);
      await expect(
        page.getByRole("button", { name: "Ajouter un email" }),
      ).toBeFocused();
    });
    await run(390, "danger-reload-error", "danger", async (page) => {
      await page.route("**/fixture/delete", (r) => json(r, null, 409));
      await page.route("**/fixture/person", (r) => json(r, null, 500));
      await page.getByRole("button", { name: "Supprimer la fiche" }).click();
      await page
        .getByRole("button", { name: "Supprimer définitivement", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Actualiser", exact: true })
        .click();
      await expect(page.getByRole("alert")).toContainText(
        "Actualisation impossible",
      );
      await expect(
        page.getByRole("button", {
          name: "Supprimer définitivement",
          exact: true,
        }),
      ).toBeDisabled();
    });
    await run(
      390,
      "admin-reset-single-and-stale",
      "reset-mfa",
      async (page) => {
        let release;
        const gate = new Promise((r) => (release = r));
        let calls = 0;
        await page.route("**/api/users/**", async (r) => {
          calls++;
          await gate;
          return json(r, { user: target });
        });
        await page.locator("#opener").click();
        await page
          .locator("#admin-mfa-reset-password")
          .fill("FictifSeulement!123");
        await page.locator("#admin-mfa-reset-code").fill("123456");
        await page.locator("form").evaluate((e) => {
          e.requestSubmit();
          e.requestSubmit();
        });
        await expect.poll(() => calls).toBe(1);
        await page.keyboard.press("Escape");
        await expect(page.getByRole("dialog")).toBeVisible();
        await page.evaluate(() =>
          window.dispatchEvent(new Event("audit-target")),
        );
        release();
        await page.waitForTimeout(100);
        await expect(page.locator("#completions")).toHaveText("0");
        await expect(page.locator("#admin-mfa-reset-password")).toHaveValue("");
      },
    );
    await run(390, "mfa-cancel-error-retry", "setup", async (page) => {
      let calls = 0;
      await page.route("**/api/auth/mfa/challenge", async (r) => {
        calls++;
        await new Promise((resolve) => setTimeout(resolve, 80));
        return json(r, {}, calls === 1 ? 500 : 200);
      });
      await page.locator("#opener").click();
      const cancel = page.getByRole("button", { name: "Retour", exact: true });
      await cancel.evaluate((e) => {
        e.click();
        e.click();
      });
      await expect(page.getByRole("alert")).toContainText(
        "Impossible d’annuler",
      );
      assert.equal(calls, 1);
      await cancel.click();
      await expect(page.getByRole("dialog")).not.toBeVisible();
      assert.equal(calls, 2);
      await expect(page.locator("#opener")).toBeFocused();
    });
    await run(390, "codes-finish-error", "codes", async (page) => {
      await page.route("**/api/auth/mfa/recovery-codes", (r) =>
        json(r, { user: actor, recoveryCodes: ["AAAA-0000", "BBBB-1111"] }),
      );
      await page.locator("#opener").click();
      await page
        .locator("#mfa-action-current-password")
        .fill("FictifSeulement!123");
      await page.locator("#mfa-action-current-code").fill("123456");
      await page.locator("form").evaluate((e) => e.requestSubmit());
      await expect(
        page.getByRole("list", { name: "Codes de secours" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("checkbox").check();
      await page.evaluate(() => (window.auditFailFinish = true));
      await page.getByRole("button", { name: "Terminer", exact: true }).click();
      await expect(page.getByRole("alert")).toContainText(
        "Vos codes restent affichés",
      );
      await page.evaluate(() => (window.auditFailFinish = false));
      await page.getByRole("button", { name: "Terminer", exact: true }).click();
      await expect(page.getByRole("dialog")).not.toBeVisible();
    });
    await run(390, "contact-autofill-submit", "contact", async (page) => {
      const requests = [];
      await page.route("**/api/auth/contact-email", (route) => {
        requests.push(route.request().postDataJSON());
        return json(route, {
          user: { ...target, contactEmail: "nouveau@example.test" },
        });
      });
      await page.locator("#opener").click();
      const dialog = page.getByRole("dialog");
      const address = page.getByRole("textbox", { name: "Adresse de contact" });
      const password = page.getByLabel(/Mot de passe actuel/);
      await expect(address).toHaveAttribute("type", "text");
      await expect(address).toHaveAttribute("inputmode", "email");
      await expect(password).toHaveAttribute("type", "password");
      for (const field of [address, password]) {
        assert.equal(await field.getAttribute("name"), null);
        assert.equal(await field.getAttribute("readonly"), null);
      }
      for (const element of [address, password, dialog.locator("form")]) {
        await expect(element).toHaveAttribute("autocomplete", "off");
        for (const attribute of [
          "data-bwignore",
          "data-1p-ignore",
          "data-lpignore",
        ])
          await expect(element).toHaveAttribute(attribute, "true");
      }
      await expect(address).toBeFocused();
      await address.fill("adresse-invalide");
      await password.fill("FictifSeulement!123");
      await expect(address).toHaveAttribute("aria-invalid", "true");
      await expect(
        dialog.getByRole("button", { name: "Confirmer", exact: true }),
      ).toBeDisabled();
      await dialog.locator("form").evaluate((form) => form.requestSubmit());
      await expect(dialog.getByRole("alert")).toHaveText(
        "Adresse email invalide",
      );
      assert.equal(requests.length, 0);
      await address.fill("");
      await expect(
        dialog.getByRole("button", { name: "Confirmer", exact: true }),
      ).toBeDisabled();
      await address.fill("  Nouveau@Example.TEST  ");
      await expect(address).toHaveAttribute("aria-invalid", "false");
      await address.press("Enter");
      await expect(dialog).not.toBeVisible();
      assert.deepEqual(requests, [
        {
          contactEmail: "nouveau@example.test",
          currentPassword: "FictifSeulement!123",
        },
      ]);
    });
    await run(390, "contact-discard-focus", "contact", async (page) => {
      await page.locator("#opener").click();
      await page
        .getByRole("textbox", { name: /Adresse de contact/ })
        .fill("brouillon@example.test");
      await page.getByRole("button", { name: "Fermer", exact: true }).click();
      await page
        .getByRole("button", { name: "Continuer la modification" })
        .click();
      await expect(
        page.getByRole("button", { name: "Fermer", exact: true }),
      ).toBeFocused();
      await expect(
        page.getByRole("textbox", { name: /Adresse de contact/ }),
      ).toHaveValue("brouillon@example.test");
    });
    for (const fixture of ["stepup", "child-social-new"])
      await run(
        390,
        `short-viewport-${fixture}`,
        fixture,
        async (page) => {
          await page.locator("#opener").click();
          await inspect(page);
        },
        320,
      );
    if (process.env.AUDIT_ONLY?.includes("explore")) {
      for (const fixture of [
        "user",
        "settings",
        "account-security",
        "collections",
        "sidebar",
      ])
        await run(390, `explore-${fixture}`, fixture, async (page) => {
          await page.waitForTimeout(300);
          fs.writeFileSync(path.join(work, `${fixture}.txt`), await body(page));
        });
    }
  } finally {
    fs.writeFileSync(
      path.join(proof, "observations.json"),
      JSON.stringify(
        {
          date: new Date().toISOString(),
          fixtureDate: "2026-10-11",
          environment:
            "Chromium isolé ; composants/CSS réels ; session, navigation, API et données simulées",
          results,
        },
        null,
        2,
      ),
    );
    await browser.close();
    await new Promise((r) => server.close(r));
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
