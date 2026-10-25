const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const assert = require("node:assert/strict");
const esbuild = require("esbuild");
const postcss = require("postcss");
const tailwind = require("@tailwindcss/postcss");
const { chromium, expect } = require("@playwright/test");
const { target, sessions } = require("./data.cjs");
const root = path.resolve(__dirname, "../../../..");
const work = fs.mkdtempSync(
  path.join(os.tmpdir(), "noctambule-account-client-"),
);
const base = "/mon-compte";
const fakePassword = "FICTIF-reset!2026-ABCD";
console.log("Résultats : " + work);
async function main() {
  const mock = JSON.stringify(path.join(__dirname, "mocks.tsx"));
  const aliases = {
    "$context/UserContext": `export {useUser} from ${mock};`,
    "$components/AuthenticatedLayout": `export {AuthenticatedLayout as default} from ${mock};`,
    "next/navigation": `export {useRouter,usePathname,useSearchParams} from ${mock};`,
    "next/link": `export {Link as default} from ${mock};`,
    "next/dynamic": `import React from 'react';export default function dynamic(load){return React.lazy(()=>load().then(defaultExport=>({default:defaultExport})));}`,
    "next/image": `import React from 'react';export default function Image({priority,unoptimized,fill,...props}) {return <img {...props}/>;}`,
    $env: `export const env={NEXT_PUBLIC_WEB_URL:'http://127.0.0.1',WEB_URL:'http://127.0.0.1'};`,
  };
  await esbuild.build({
    entryPoints: [path.join(__dirname, "fixture.tsx")],
    outfile: path.join(work, "bundle.js"),
    bundle: true,
    platform: "browser",
    format: "iife",
    jsx: "automatic",
    tsconfig: path.join(root, "apps/web/tsconfig.json"),
    define: { "process.env.NODE_ENV": '"development"' },
    plugins: [
      {
        name: "isolated-detail-context",
        setup(build) {
          build.onResolve({ filter: /.*/ }, (args) =>
            Object.hasOwn(aliases, args.path)
              ? { path: args.path, namespace: "audit" }
              : null,
          );
          build.onLoad({ filter: /.*/, namespace: "audit" }, (args) => ({
            contents: aliases[args.path],
            loader: "tsx",
            resolveDir: root,
          }));
        },
      },
    ],
  });
  const cssFile = path.join(root, "apps/web/src/app/globals.css");
  const css = await postcss([
    tailwind({ base: path.join(root, "apps/web") }),
  ]).process(fs.readFileSync(cssFile, "utf8"), { from: cssFile });
  fs.writeFileSync(path.join(work, "style.css"), css.css);
  const server = http.createServer((req, res) => {
    const name = req.url.split("?")[0];
    if (["/bundle.js", "/bundle.css", "/style.css"].includes(name)) {
      res.setHeader(
        "Content-Type",
        name.endsWith(".js") ? "application/javascript" : "text/css",
      );
      return res.end(fs.readFileSync(path.join(work, name.slice(1))));
    }
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><html lang="fr" class="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/bundle.css"><style>:root{--font-geist-sans:Arial,sans-serif;--font-geist-mono:monospace}.audit-shell{min-height:100vh}@media(min-width:1024px){.audit-shell{margin-left:240px}}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const observations = [];
  const noOverflow = async (page) => {
    const metrics = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      main: document.querySelector("main")?.scrollWidth,
      mainWidth: document.querySelector("main")?.clientWidth,
    }));
    assert.ok(
      metrics.document <= metrics.viewport + 1,
      JSON.stringify(metrics),
    );
    assert.ok(metrics.main <= metrics.mainWidth + 1, JSON.stringify(metrics));
    return metrics;
  };
  async function run(name, width, fn, options = {}) {
    if (process.env.AUDIT_ONLY && !name.includes(process.env.AUDIT_ONLY))
      return;
    const context = await browser.newContext({
      viewport: { width, height: options.height ?? 900 },
      reducedMotion: "reduce",
      timezoneId: "Europe/Paris",
    });
    await context.addInitScript((value) => {
      window.__auditOptions = value;
      window.__auditClipboard = { mode: "success", pending: [], copies: 0 };
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: () => {
            const state = window.__auditClipboard;
            state.copies++;
            if (state.mode === "hold")
              return new Promise((resolve, reject) =>
                state.pending.push({ resolve, reject }),
              );
            if (state.mode === "reject")
              return Promise.reject(new Error("Copie fictive refusée"));
            return Promise.resolve();
          },
        },
      });
    }, options);
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const api = {
      user: {
        ...target,
        id: "audit-creator",
        role: "ADMIN",
        isProtected: true,
        permissions: { "users:view": true, "users:create": true },
        updatedAt: "2026-10-11T12:00:00.000Z",
        ...options.actor,
      },
      sessions: [
        { ...sessions[0], isCurrent: true },
        { ...sessions[1], isCurrent: false },
      ],
      mfa: {
        enabledAt: "2026-09-01T12:00:00Z",
        recoveryCodesRemaining: 8,
        required: true,
      },
      modes: {},
      held: [],
      requests: [],
    };
    const codes = Array.from(
      { length: 8 },
      (_, i) =>
        `${"ABCD-EFGH-IJKL-MNOP-QRST-UVW" + String.fromCharCode(65 + i)}`,
    );
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        method = req.method(),
        key = method + " " + url.pathname;
      let body = null;
      try {
        body = req.postDataJSON();
      } catch {}
      api.requests.push({
        method,
        path: url.pathname,
        query: url.search,
        body: body
          ? Object.fromEntries(
              Object.entries(body).filter(
                ([key]) => !/(password|code)/i.test(key),
              ),
            )
          : null,
      });
      const mode = api.modes[key] ?? "success";
      if (mode === "hold")
        await new Promise((resolve) => api.held.push(resolve));
      if (mode === "abort") return route.abort("failed");
      if (mode === "forbidden")
        return route.fulfill({
          status: 403,
          contentType: "text/html",
          body: "Accès refusé fictif",
        });
      if (mode === "error" || mode === "conflict")
        return route.fulfill({
          status: mode === "conflict" ? 409 : 500,
          contentType: "application/json",
          body: JSON.stringify({
            success: false,
            error: {
              code: mode === "conflict" ? "CONFLICT" : "INTERNAL_ERROR",
              message:
                mode === "conflict"
                  ? "Le compte a été modifié"
                  : "Erreur simulée",
            },
          }),
        });
      let data = {};
      if (url.pathname === "/api/auth/me") {
        if (method === "PATCH")
          api.user = {
            ...api.user,
            firstName: body.firstName,
            lastName: body.lastName,
            updatedAt: "2026-10-11T14:00:00Z",
          };
        data = { user: api.user, session: null };
      } else if (url.pathname === "/api/auth/contact-email") {
        api.user = {
          ...api.user,
          contactEmail: body.contactEmail,
          updatedAt: "2026-10-11T14:00:00Z",
        };
        data = { user: api.user };
      } else if (url.pathname === "/api/auth/sessions") {
        if (method === "DELETE")
          api.sessions = url.searchParams.has("id")
            ? api.sessions.filter((s) => s.id !== url.searchParams.get("id"))
            : api.sessions.filter((s) => s.isCurrent);
        data = { sessions: api.sessions, revokedCount: 1 };
      } else if (url.pathname === "/api/auth/mfa") data = api.mfa;
      else if (url.pathname === "/api/auth/mfa/recovery-codes")
        data = { user: api.user, recoveryCodes: codes };
      else if (url.pathname === "/api/auth/mfa/setup") {
        if (method === "POST")
          data = {
            manualKey: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
            qrCodeDataUrl:
              "data:image/svg+xml," +
              encodeURIComponent(
                '<svg xmlns="http://www.w3.org/2000/svg" width="208" height="208"><rect width="208" height="208" fill="white"/><text x="10" y="100">QR FICTIF</text></svg>',
              ),
            expiresAt: "2026-10-11T20:00:00Z",
            replacing: true,
          };
        else data = { user: api.user, recoveryCodes: codes };
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ success: true, data }),
      });
    });
    try {
      await page.goto(
        origin + base + (options.section ? "?section=" + options.section : ""),
      );
      await expect(
        options.forcedPassword
          ? page.getByRole("dialog")
          : page.getByRole("navigation", { name: "Navigation du compte" }),
      ).toBeVisible();
      const result = await fn({ page, api, context, codes });
      assert.deepEqual(errors, []);
      observations.push({
        name,
        width,
        pass: true,
        result,
        requests: api.requests,
      });
      await page.screenshot({
        path: path.join(work, name + "-" + width + ".png"),
        fullPage: true,
      });
    } catch (error) {
      observations.push({
        name,
        width,
        pass: false,
        error: error.message,
        errors,
        requests: api.requests,
      });
      await page
        .screenshot({
          path: path.join(work, name + "-" + width + "-FAIL.png"),
          fullPage: true,
        })
        .catch(() => {});
    } finally {
      await context.close();
      console.log(name + ": " + observations.at(-1).pass);
    }
  }
  const security = { section: "security" };
  for (const width of [320, 390, 768, 1440]) {
    await run(
      "security-responsive",
      width,
      async ({ page }) => {
        await expect(
          page.getByRole("heading", { name: "Sessions actives", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Déconnecter les autres sessions" }),
        ).toBeVisible();
        await page
          .getByRole("button", { name: "Détails techniques" })
          .first()
          .click();
        return noOverflow(page);
      },
      security,
    );
    await run(
      "password-modal-cancel-focus",
      width,
      async ({ page }) => {
        const opener = page.getByRole("button", {
          name: "Changer le mot de passe",
          exact: true,
        });
        await opener.click();
        const dialog = page.getByRole("dialog");
        await expect(dialog.locator("#currentPassword")).toBeFocused();
        // Since 25 October 2026 (REV-07), password managers may fill the
        // authentication fields; no ignore attribute remains on them.
        const expected = {
          confirmPassword: "new-password",
          currentPassword: "current-password",
          newPassword: "new-password",
        };
        for (const [id, token] of Object.entries(expected)) {
          const input = dialog.locator("#" + id);
          await expect(input).toHaveAttribute("autocomplete", token);
          await expect(input).not.toHaveAttribute("data-bwignore", "true");
        }
        await expect(dialog.locator("#password-rules li")).toHaveCount(3);
        await dialog
          .getByRole("button", { name: "Annuler", exact: true })
          .click();
        await expect(opener).toBeFocused();
        return noOverflow(page);
      },
      security,
    );
  }
  await run(
    "sessions-revoke-all-pending-focus",
    390,
    async ({ page, api }) => {
      api.modes["DELETE /api/auth/sessions"] = "hold";
      await page
        .getByRole("button", { name: "Déconnecter les autres sessions" })
        .click();
      const dialog = page.getByRole("alertdialog");
      await dialog
        .getByRole("button", { name: "Déconnecter", exact: true })
        .click();
      await expect.poll(() => api.held.length).toBe(1);
      await expect(dialog).toBeVisible();
      await expect(
        dialog.getByRole("button", { name: "Annuler" }),
      ).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
      api.held.shift()();
      await expect(dialog).toHaveCount(0);
      await expect(
        page.getByText("Aucune autre session active.", { exact: true }),
      ).toBeVisible();
      await expect(page.locator("#account-sessions-heading")).toBeFocused();
    },
    security,
  );
  await run(
    "sessions-revoke-one-focus",
    1440,
    async ({ page }) => {
      await page.getByRole("button", { name: /^Déconnecter (?!les)/ }).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Déconnecter", exact: true })
        .click();
      await expect(
        page.getByText("Aucune autre session active.", { exact: true }),
      ).toBeVisible();
      await expect(page.locator("#account-sessions-heading")).toBeFocused();
    },
    security,
  );
  await run(
    "sessions-revoke-refused-reread",
    390,
    async ({ page, api }) => {
      api.modes["GET /api/auth/sessions"] = "forbidden";
      await page
        .getByRole("button", { name: "Déconnecter les autres sessions" })
        .click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Déconnecter", exact: true })
        .click();
      await expect(
        page.getByText("Impossible de charger les sessions", { exact: true }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Déconnecter les autres sessions" }),
      ).toHaveCount(0);
      api.modes["GET /api/auth/sessions"] = "success";
      await page
        .getByRole("button", { name: "Réessayer", exact: true })
        .click();
      await expect(
        page.getByText("Aucune autre session active.", { exact: true }),
      ).toBeVisible();
      await expect(page.locator("#account-sessions-heading")).toBeFocused();
    },
    security,
  );
  // Rubrique « Accès » (audit DRT-07, 25 October 2026).
  const delegated = {
    isProtected: false,
    role: "USER",
    permissions: {
      "persons:view": true,
      "persons:view_contact": true,
      "users:view": true,
      "users:view_security": true,
      "users:reset_password": true,
    },
  };
  for (const [label, actor, width] of [
    ["delegated", delegated, 390],
    ["delegated", delegated, 1440],
    ["superadmin", {}, 390],
  ]) {
    await run(
      "access-summary-" + label,
      width,
      async ({ page }) => {
        const card = page.locator('[aria-labelledby="account-access-heading"]').first();
        await expect(
          page.getByRole("heading", { name: "Vos accès" }),
        ).toBeVisible();
        if (label === "delegated") {
          await expect(card.getByText("Consulter le répertoire")).toBeVisible();
          await expect(
            card.getByText("Réinitialiser le mot de passe"),
          ).toBeVisible();
          await expect(card.getByText("Créer des utilisateurs standards")).toHaveCount(0);
        } else {
          await expect(card.getByText(/En tant que superadmin/)).toBeVisible();
        }
        await page.screenshot({
          path: path.join(work, "access-summary-" + label + "-" + width + ".png"),
          fullPage: true,
        });
        return noOverflow(page);
      },
      { section: "access", actor },
    );
  }
  for (const width of [390, 1440]) {
    await run(
      "password-rules-feedback",
      width,
      async ({ page }) => {
        await page
          .getByRole("button", { name: "Changer le mot de passe", exact: true })
          .click();
        const dialog = page.getByRole("dialog");
        const rules = dialog.locator("#password-rules li");
        await expect(rules.filter({ hasText: "à respecter" })).toHaveCount(3);
        await dialog.locator("#newPassword").fill("Noctambule 26");
        await expect(rules.nth(0)).toContainText("respectée");
        await expect(rules.nth(1)).toContainText("respectée");
        await expect(rules.nth(2)).toContainText("à respecter");
        await expect(
          dialog.getByRole("button", { name: "Changer le mot de passe" }),
        ).toBeDisabled();
        return noOverflow(page);
      },
      security,
    );
  }
  await run(
    "password-success-double-submit",
    390,
    async ({ page, api }) => {
      await page
        .getByRole("button", { name: "Changer le mot de passe", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.locator("#currentPassword").fill("FICTIF-current!2026");
      await dialog.locator("#newPassword").fill("FICTIF-next!2026");
      await dialog.locator("#confirmPassword").fill("FICTIF-next!2026");
      api.modes["POST /api/auth/change-password"] = "hold";
      await dialog.locator("form").evaluate((form) => {
        form.requestSubmit();
        form.requestSubmit();
      });
      await expect.poll(() => api.held.length).toBe(1);
      api.held.shift()();
      await expect(dialog).toHaveCount(0);
      await expect(
        page.getByRole("button", {
          name: "Changer le mot de passe",
          exact: true,
        }),
      ).toBeFocused();
      assert.equal(
        api.requests.filter((x) => x.path === "/api/auth/change-password")
          .length,
        1,
      );
    },
    security,
  );
  await run(
    "password-lost-response",
    390,
    async ({ page, api }) => {
      await page
        .getByRole("button", { name: "Changer le mot de passe", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.locator("#currentPassword").fill("FICTIF-current!2026");
      await dialog.locator("#newPassword").fill("FICTIF-next!2026");
      await dialog.locator("#confirmPassword").fill("FICTIF-next!2026");
      api.modes["POST /api/auth/change-password"] = "abort";
      await dialog
        .getByRole("button", { name: "Changer le mot de passe", exact: true })
        .click();
      await expect(dialog.getByRole("alert")).toContainText(
        "a peut-être été modifié",
      );
      await expect(dialog.getByRole("alert")).toBeFocused();
      await expect(dialog.locator("#currentPassword")).toHaveCount(0);
      await expect(dialog.locator("input")).toHaveCount(0);
      await expect(
        dialog.getByRole("button", { name: "Recharger le compte" }),
      ).toBeVisible();
    },
    security,
  );
  await run(
    "mfa-recovery-codes-focus-copy-departure",
    320,
    async ({ page, codes }) => {
      await page
        .getByRole("button", { name: "Nouveaux codes de secours", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.locator("input[type=password]").fill("FICTIF-current!2026");
      await dialog.locator("input[inputmode=numeric]").fill("123456");
      await dialog
        .getByRole("button", { name: "Générer", exact: true })
        .click();
      await expect(dialog.getByRole("checkbox")).toBeFocused();
      await expect(
        dialog.getByRole("button", { name: "Terminer", exact: true }),
      ).toBeDisabled();
      await noOverflow(page);
      await page.screenshot({
        path: path.join(work, "codes-fictifs-320.png"),
        fullPage: true,
      });
      await page.evaluate(() => {
        window.__auditClipboard.mode = "hold";
      });
      await dialog.getByRole("button", { name: "Copier", exact: true }).click();
      await page.evaluate(() =>
        window.__auditSetActor({ id: "audit-new-actor" }),
      );
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await page.evaluate(() =>
        window.__auditClipboard.pending.shift().resolve(),
      );
      await expect(
        page.getByText("Codes de secours copiés", { exact: true }),
      ).toHaveCount(0);
      await expect(page.getByText(codes[0], { exact: true })).toHaveCount(0);
    },
    security,
  );
  await run(
    "mfa-recovery-lost-response",
    390,
    async ({ page, api }) => {
      await page
        .getByRole("button", { name: "Nouveaux codes de secours", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.locator("input[type=password]").fill("FICTIF-current!2026");
      await dialog.locator("input[inputmode=numeric]").fill("123456");
      api.modes["POST /api/auth/mfa/recovery-codes"] = "abort";
      await dialog
        .getByRole("button", { name: "Générer", exact: true })
        .click();
      await expect(dialog.getByRole("alert").first()).toContainText(
        "peuvent déjà être invalides",
      );
      await expect(dialog.getByRole("alert").first()).toBeFocused();
      await expect(dialog.locator("input[type=password]")).toHaveValue("");
    },
    security,
  );
  await run(
    "mfa-setup-scan-recovery-small-height",
    390,
    async ({ page }) => {
      await page
        .getByRole("button", { name: "Changer d’application", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.locator("input[type=password]").fill("FICTIF-current!2026");
      await dialog.locator("input[inputmode=numeric]").fill("123456");
      await dialog
        .getByRole("button", { name: "Continuer", exact: true })
        .click();
      await expect(dialog.locator("#mfa-setup-code")).toBeFocused();
      await noOverflow(page);
      await dialog.locator("#mfa-setup-code").fill("123456");
      await dialog
        .getByRole("button", {
          name: "Activer la double authentification",
          exact: true,
        })
        .click();
      await expect(dialog.getByRole("checkbox")).toBeFocused();
      await dialog.getByRole("checkbox").check();
      await dialog
        .getByRole("button", { name: "Terminer", exact: true })
        .click();
      await expect(dialog).toHaveCount(0);
      await expect(
        page.getByRole("button", {
          name: "Changer d’application",
          exact: true,
        }),
      ).toBeFocused();
    },
    { ...security, height: 550 },
  );
  await run(
    "profile-conflict-merge-server-field",
    390,
    async ({ page, api }) => {
      await page.locator("#edit-firstName").fill("Camille modifié");
      api.modes["PATCH /api/auth/me"] = "conflict";
      await page
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Actualiser la version",
          exact: true,
        }),
      ).toBeVisible();
      api.user = {
        ...api.user,
        lastName: "Nom serveur",
        updatedAt: "2026-10-11T13:00:00.000Z",
      };
      await page
        .getByRole("button", { name: "Actualiser la version", exact: true })
        .click();
      await expect(page.locator("#edit-firstName")).toHaveValue(
        "Camille modifié",
      );
      await expect(page.locator("#edit-lastName")).toHaveValue("Nom serveur");
      await expect(page.locator("#edit-firstName")).toBeFocused();
      api.modes["PATCH /api/auth/me"] = "success";
      await page
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Enregistrer", exact: true }),
      ).toHaveCount(0);
      await expect(page.locator("#edit-firstName")).toBeFocused();
    },
  );
  await run(
    "contact-snapshot-conflict-explicit-retry",
    390,
    async ({ page, api }) => {
      await page.getByRole("button", { name: "Gérer", exact: true }).click();
      const dialog = page.getByRole("dialog");
      await dialog
        .locator("#account-contact-email")
        .fill("nouveau@example.test");
      await dialog
        .locator("#account-contact-current-password")
        .fill("FICTIF-current!2026");
      await page.evaluate(() =>
        window.__auditSetActor({
          contactEmail: "serveur@example.test",
          updatedAt: "2026-10-11T13:00:00.000Z",
        }),
      );
      await expect(dialog.locator("#account-contact-email")).toHaveValue(
        "nouveau@example.test",
      );
      await expect(
        dialog.locator("#account-contact-current-password"),
      ).toHaveValue("FICTIF-current!2026");
      api.modes["PATCH /api/auth/contact-email"] = "conflict";
      await dialog
        .getByRole("button", { name: "Confirmer", exact: true })
        .click();
      await expect(
        dialog.getByRole("button", {
          name: "Actualiser la version",
          exact: true,
        }),
      ).toBeVisible();
      const attempts = () =>
        api.requests.filter((x) => x.path === "/api/auth/contact-email");
      assert.equal(attempts().length, 1);
      assert.equal(
        attempts()[0].body.expectedUpdatedAt,
        "2026-10-11T12:00:00.000Z",
      );
      api.user = {
        ...api.user,
        contactEmail: "serveur@example.test",
        updatedAt: "2026-10-11T13:00:00.000Z",
      };
      await dialog
        .getByRole("button", { name: "Actualiser la version", exact: true })
        .click();
      await expect(
        dialog.locator("#account-contact-current-password"),
      ).toHaveValue("");
      await expect(dialog.locator("#account-contact-email")).toHaveValue(
        "nouveau@example.test",
      );
      assert.equal(attempts().length, 1);
      api.modes["PATCH /api/auth/contact-email"] = "success";
      await dialog
        .locator("#account-contact-current-password")
        .fill("FICTIF-current!2026");
      await dialog
        .getByRole("button", { name: "Confirmer", exact: true })
        .click();
      await expect(dialog).toHaveCount(0);
      assert.equal(
        attempts()[1].body.expectedUpdatedAt,
        "2026-10-11T13:00:00.000Z",
      );
      await expect(
        page.getByRole("button", { name: "Gérer", exact: true }),
      ).toBeFocused();
    },
  );
  await run(
    "profile-readonly-contact-preserved",
    320,
    async ({ page }) => {
      await expect(page.locator("#edit-firstName")).toBeDisabled();
      await expect(
        page.getByRole("button", { name: "Enregistrer", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Gérer", exact: true }),
      ).toBeEnabled();
      return noOverflow(page);
    },
    {
      actor: {
        isProtected: false,
        role: "USER",
        permissions: {
          "account:view_profile": true,
          "account:update_profile": false,
          "account:update_contact": false,
          "account:view_security": false,
          "account:change_password": false,
          "account:manage_mfa": false,
          "account:manage_sessions": false,
        },
      },
    },
  );
  await run(
    "mfa-setup-lost-response-blocks-replay",
    390,
    async ({ page, api }) => {
      await page
        .getByRole("button", { name: "Changer d’application", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.locator("input[type=password]").fill("FICTIF-current!2026");
      await dialog.locator("input[inputmode=numeric]").fill("123456");
      await dialog
        .getByRole("button", { name: "Continuer", exact: true })
        .click();
      await dialog.locator("#mfa-setup-code").fill("123456");
      api.modes["PUT /api/auth/mfa/setup"] = "abort";
      await dialog
        .getByRole("button", {
          name: "Activer la double authentification",
          exact: true,
        })
        .click();
      await expect(dialog.getByRole("alert")).toContainText(
        "a peut-être été activée",
      );
      await expect(dialog.getByRole("alert")).toBeFocused();
      await expect(
        dialog.getByRole("button", {
          name: "Recharger le compte",
          exact: true,
        }),
      ).toBeVisible();
      await expect(dialog.locator("input")).toHaveCount(0);
      assert.equal(api.requests.filter((x) => x.method === "PUT").length, 1);
    },
    security,
  );
  await run(
    "forced-password-success-without-current-proof",
    390,
    async ({ page, api }) => {
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("heading", {
          name: "Changement de mot de passe requis",
        }),
      ).toBeVisible();
      await expect(dialog.locator("#currentPassword")).toHaveCount(0);
      await expect(dialog.locator("#newPassword")).toBeFocused();
      await expect(
        dialog.getByRole("button", { name: "Annuler", exact: true }),
      ).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
      await dialog.locator("#newPassword").fill("FICTIF-next!2026");
      await dialog.locator("#confirmPassword").fill("FICTIF-next!2026");
      await dialog
        .getByRole("button", { name: "Changer le mot de passe", exact: true })
        .click();
      await expect
        .poll(() => page.evaluate(() => window.__forcedSuccess))
        .toBe(true);
      assert.equal(
        api.requests.filter((x) => x.path === "/api/auth/change-password")
          .length,
        1,
      );
    },
    { forcedPassword: true },
  );
  await run(
    "mfa-codes-leave-warning-and-finish-focus",
    390,
    async ({ page }) => {
      await page
        .getByRole("button", { name: "Nouveaux codes de secours", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await dialog.locator("input[type=password]").fill("FICTIF-current!2026");
      await dialog.locator("input[inputmode=numeric]").fill("123456");
      await dialog
        .getByRole("button", { name: "Générer", exact: true })
        .click();
      await expect(dialog.getByRole("checkbox")).toBeFocused();
      const leaving = page.waitForEvent("dialog");
      void page.reload().catch(() => {});
      const warning = await leaving;
      assert.equal(warning.type(), "beforeunload");
      await warning.dismiss();
      await expect(dialog.getByRole("checkbox")).toBeVisible();
      await dialog.getByRole("checkbox").check();
      await dialog
        .getByRole("button", { name: "Terminer", exact: true })
        .click();
      await expect(dialog).toHaveCount(0);
      await expect(
        page.getByRole("button", {
          name: "Nouveaux codes de secours",
          exact: true,
        }),
      ).toBeFocused();
    },
    security,
  );
  await run("profile-native-enter-submit", 390, async ({ page, api }) => {
    await page.locator("#edit-firstName").fill("Camille Entrée");
    await expect(
      page.getByRole("button", { name: "Enregistrer", exact: true }),
    ).toBeEnabled();
    await page.locator("#edit-firstName").press("Enter");
    await expect
      .poll(
        () =>
          api.requests.filter(
            (x) => x.path === "/api/auth/me" && x.method === "PATCH",
          ).length,
      )
      .toBe(1);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.locator("#edit-firstName")).toBeFocused();
  });
  fs.writeFileSync(
    path.join(work, "observations.json"),
    JSON.stringify(observations, null, 2),
  );
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  console.log(
    `${observations.filter((x) => x.pass).length}/${observations.length} réussis`,
  );
  if (observations.some((x) => !x.pass)) process.exitCode = 1;
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
