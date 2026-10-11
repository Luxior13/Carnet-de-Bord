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
  path.join(os.tmpdir(), "noctambule-detail-client-"),
);
const base = "/systeme/utilisateurs/audit-target";
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
      viewport: { width, height: options.height ?? 1000 },
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
            if (state.mode === "reject")
              return Promise.reject(new Error("Copie fictive indisponible"));
            if (state.mode === "hold")
              return new Promise((resolve, reject) =>
                state.pending.push({ resolve, reject }),
              );
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
      user: { ...target, ...options.user },
      sessions: structuredClone(sessions),
      getMode: "success",
      patchMode: "success",
      mfaMode: "success",
      sessionsMode: options.sessionsMode || "success",
      requests: [],
      held: [],
      resets: 0,
    };
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url()),
        method = req.method();
      let body = null;
      try {
        body = req.postDataJSON();
      } catch {}
      api.requests.push({
        path: url.pathname,
        query: url.search,
        method,
        body: body
          ? Object.fromEntries(
              Object.entries(body).filter(
                ([key]) =>
                  !["currentPassword", "currentTotpCode"].includes(key),
              ),
            )
          : null,
      });
      let mode = "success",
        status = 200,
        payload = { success: true, data: {} };
      if (url.pathname.endsWith("/sessions")) {
        mode = api.sessionsMode;
        if (method === "DELETE") {
          api.sessions = url.searchParams.has("id")
            ? api.sessions.filter((s) => s.id !== url.searchParams.get("id"))
            : [];
          payload.data = { revokedCount: 1 };
        } else payload.data = { sessions: api.sessions };
      } else if (url.pathname.endsWith("/reset-password")) {
        api.resets++;
        api.user = { ...api.user, mustChangePassword: true };
        api.sessions = [];
        payload.data = {
          temporaryPassword:
            api.resets === 1 ? fakePassword : "FICTIF-second-reset!2026",
          user: api.user,
        };
      } else if (url.pathname.endsWith("/reset-mfa")) {
        api.user = {
          ...api.user,
          mfaEnabledAt: null,
          criticalAccessReady: false,
        };
        api.sessions = [];
        payload.data = { user: api.user };
        if (api.mfaMode === "lost") {
          await route.abort("failed");
          return;
        }
      } else if (url.pathname.endsWith("/step-up")) {
        payload.data = { verified: true };
      } else if (url.pathname === "/api/users/audit-target") {
        mode = method === "PATCH" ? api.patchMode : api.getMode;
        if (method === "PATCH" && ["success", "hold"].includes(mode)) {
          const { expectedUpdatedAt, permissionScope, ...patch } = body;
          api.user = {
            ...api.user,
            ...patch,
            updatedAt: "2026-10-11T12:00:00Z",
          };
        }
        payload.data = { user: api.user };
      }
      if (mode === "conflict") {
        status = 409;
        payload = {
          success: false,
          error: {
            message: "Version fictive modifiée par un autre responsable.",
            code: "CONFLICT",
          },
        };
      }
      if (mode === "fieldError") {
        status = 400;
        payload = {
          success: false,
          error: {
            message: "Prénom fictif invalide.",
            code: "VALIDATION_ERROR",
            details: { firstName: ["Prénom fictif invalide."] },
          },
        };
      }
      if (mode === "forbidden") {
        status = 403;
        payload = {
          success: false,
          error: { message: "Accès fictif retiré.", code: "FORBIDDEN" },
        };
      }
      if (mode === "forbiddenNonJson") {
        await route.fulfill({
          status: 403,
          contentType: "text/plain",
          body: "Accès fictif retiré.",
        });
        return;
      }
      if (mode === "error") {
        status = 500;
        payload = {
          success: false,
          error: {
            message: "Lecture fictive indisponible.",
            code: "INTERNAL_ERROR",
          },
        };
      }
      if (mode === "hold")
        await new Promise((resolve) => api.held.push(resolve));
      try {
        await route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(payload),
        });
      } catch {}
    });
    try {
      await page.goto(
        origin +
          base +
          "?" +
          new URLSearchParams({
            section: options.section || "profile",
            returnTo: "/systeme/utilisateurs?q=exemple&page=2",
          }),
      );
      await expect(
        page.getByRole("heading", {
          name: [api.user.firstName, api.user.lastName]
            .filter(Boolean)
            .join(" "),
          exact: true,
        }),
      ).toBeVisible();
      const detail = await fn({ page, api, context });
      assert.deepEqual(errors, []);
      observations.push({ name, width, pass: true, detail });
      console.log("PASS " + name + " " + width);
    } catch (error) {
      observations.push({
        name,
        width,
        pass: false,
        error: String(error),
        pageErrors: errors,
      });
      await page.screenshot({
        path: path.join(work, name + "-" + width + "-failure.png"),
        fullPage: true,
      });
      console.log(
        "FAIL " + name + " " + width + ": " + String(error).slice(0, 450),
      );
    } finally {
      api.held.forEach((resolve) => resolve());
      await context.close();
    }
  }
  for (const { width, height, sticky } of [
    { width: 1440, height: 900, sticky: true },
    { width: 390, height: 844, sticky: false },
    { width: 1440, height: 550, sticky: false },
  ]) {
    await run(
      `status-actionbar-page-scroll-${height}`,
      width,
      async ({ page }) => {
        await page.getByRole("switch", { name: "Compte actif" }).click();
        const bar = page.getByRole("group", {
          name: "Enregistrement de l’état du compte",
          exact: true,
        });
        const measure = () =>
          bar.evaluate((element) => {
            let scroller = element.parentElement;
            while (
              scroller &&
              !(
                /auto|scroll/.test(getComputedStyle(scroller).overflowY) &&
                scroller.scrollHeight > scroller.clientHeight + 1
              )
            )
              scroller = scroller.parentElement;
            scroller ??= document.scrollingElement;
            const isDocument = scroller === document.scrollingElement;
            const rect = element.getBoundingClientRect();
            const viewport = isDocument
              ? { top: 0, bottom: innerHeight }
              : scroller.getBoundingClientRect();
            return {
              insideCard: Boolean(element.closest('[data-slot="card"]')),
              position: getComputedStyle(element).position,
              top: rect.top,
              bottom: rect.bottom,
              viewportTop: viewport.top,
              viewportBottom: viewport.bottom,
              scrollTop: scroller.scrollTop,
              scrollMax: scroller.scrollHeight - scroller.clientHeight,
            };
          });
        const scroll = async (fraction) => {
          await bar.evaluate((element, value) => {
            let scroller = element.parentElement;
            while (
              scroller &&
              !(
                /auto|scroll/.test(getComputedStyle(scroller).overflowY) &&
                scroller.scrollHeight > scroller.clientHeight + 1
              )
            )
              scroller = scroller.parentElement;
            scroller ??= document.scrollingElement;
            scroller.scrollTop =
              (scroller.scrollHeight - scroller.clientHeight) * value;
          }, fraction);
          await page.evaluate(
            () =>
              new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve)),
              ),
          );
          return measure();
        };
        const initial = await measure();
        assert.equal(initial.insideCard, false, JSON.stringify(initial));
        assert.equal(
          initial.position,
          sticky ? "sticky" : "static",
          JSON.stringify(initial),
        );
        assert.ok(initial.scrollMax > 200, JSON.stringify(initial));
        const middle = await scroll(0.4);
        const lower = await scroll(0.75);
        if (sticky) {
          for (const sample of [middle, lower]) {
            assert.ok(sample.top >= sample.viewportTop, JSON.stringify(sample));
            assert.ok(
              Math.abs(sample.bottom - (sample.viewportBottom - 16)) <= 2,
              JSON.stringify(sample),
            );
          }
        } else {
          assert.ok(
            Math.abs(
              lower.top - middle.top + (lower.scrollTop - middle.scrollTop),
            ) <= 2,
            JSON.stringify({ middle, lower }),
          );
        }
        const end = await scroll(1);
        assert.ok(
          end.top >= end.viewportTop && end.bottom <= end.viewportBottom,
          JSON.stringify(end),
        );
        await page.screenshot({
          path: path.join(work, `status-actionbar-${width}-${height}.png`),
          fullPage: false,
        });
        await bar.getByRole("button", { name: "Annuler", exact: true }).click();
        await expect(
          page.getByRole("switch", { name: "Compte actif" }),
        ).toBeFocused();
        await expect(
          page.getByRole("switch", { name: "Compte actif" }),
        ).toBeChecked();
        await expect(bar).toHaveAttribute("data-dirty", "false");
        assert.equal((await measure()).position, "static");
        return { initial, middle, lower, end, expectedSticky: sticky };
      },
      { section: "security", height },
    );
  }
  for (const width of [320, 390, 768, 1440, 1920]) {
    for (const section of ["profile", "access", "account", "security"])
      await run(
        "responsive-" + section,
        width,
        async ({ page }) => {
          await expect(
            page.getByRole("navigation", {
              name: "Navigation de la fiche utilisateur",
            }),
          ).toBeVisible();
          await expect(
            page.getByRole("link", { name: "Activité", exact: true }),
          ).toHaveCount(0);
          if (section === "security")
            await expect(
              page.getByText("Windows - Chrome", { exact: true }),
            ).toBeVisible();
          const metrics = await noOverflow(page);
          await page.screenshot({
            path: path.join(work, section + "-" + width + ".png"),
            fullPage: true,
          });
          return metrics;
        },
        { section },
      );
    await run(
      "focus-status-cancel",
      width,
      async ({ page }) => {
        await page.getByRole("switch", { name: "Compte actif" }).click();
        await page
          .getByRole("button", { name: "Annuler", exact: true })
          .click();
        await expect(
          page.getByRole("switch", { name: "Compte actif" }),
        ).toBeFocused();
        await expect(
          page.getByRole("switch", { name: "Compte actif" }),
        ).toBeChecked();
      },
      { section: "security" },
    );
  }
  await run(
    "profile-save-validation-and-contact",
    390,
    async ({ page, api }) => {
      await page.locator("#user-last-name").fill("");
      await page.locator("#user-last-name").press("Enter");
      await expect
        .poll(() => api.requests.filter((r) => r.method === "PATCH").length)
        .toBe(1);
      assert.equal(
        api.requests.find((r) => r.method === "PATCH").body.lastName,
        "",
      );
      await page.locator("#user-first-name").fill("Autre");
      api.patchMode = "fieldError";
      await page
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await expect(page.locator("#user-first-name")).toBeFocused();
      await expect(page.locator("#user-first-name")).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      await page.getByRole("button", { name: "Annuler", exact: true }).click();
      await page
        .getByRole("button", {
          name: "Supprimer l'adresse de contact",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "Conserver l'adresse", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Supprimer l'adresse de contact",
          exact: true,
        }),
      ).toBeFocused();
    },
  );
  for (const section of ["profile", "access", "account", "security"])
    await run(
      "conflict-refresh-" + section,
      390,
      async ({ page, api }) => {
        if (section === "profile")
          await page.locator("#user-first-name").fill("Brouillon");
        else if (section === "account")
          await page.getByRole("switch").first().click();
        else if (section === "security")
          await page.getByRole("switch", { name: "Compte actif" }).click();
        else {
          await page.locator("#user-role").click();
          await page
            .getByRole("option", { name: "Administrateur", exact: true })
            .click();
        }
        api.patchMode = "conflict";
        await page
          .getByRole("button", {
            name:
              section === "security" ? "Désactiver le compte" : "Enregistrer",
            exact: true,
          })
          .click();
        await expect(
          page.getByText("Version fictive modifiée par un autre responsable.", {
            exact: true,
          }),
        ).toBeVisible();
        await page
          .getByRole("button", {
            name: "Actualiser et conserver ma saisie",
            exact: true,
          })
          .click();
        const focus =
          section === "profile"
            ? page.locator("#user-first-name")
            : section === "access"
              ? page.locator("#user-role")
              : section === "account"
                ? page.getByRole("switch").first()
                : page.getByRole("switch", { name: "Compte actif" });
        await expect(focus).toBeFocused();
        if (section === "profile")
          await expect(page.locator("#user-first-name")).toHaveValue(
            "Brouillon",
          );
      },
      { section },
    );
  await run(
    "session-retry-and-revocation-focus",
    390,
    async ({ page, api }) => {
      await expect(
        page.getByRole("button", { name: "Réessayer", exact: true }),
      ).toBeVisible();
      api.sessionsMode = "success";
      await page
        .getByRole("button", { name: "Réessayer", exact: true })
        .click();
      await expect(
        page.getByText("Windows - Chrome", { exact: true }),
      ).toBeVisible();
      const focused = await page.evaluate(
        () => document.activeElement?.tagName,
      );
      assert.notEqual(focused, "BODY");
      await page
        .getByRole("button", {
          name: "Révoquer la session Windows Chrome",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "Conserver la session", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Révoquer la session Windows Chrome",
          exact: true,
        }),
      ).toBeFocused();
      await page
        .getByRole("button", {
          name: "Révoquer la session Windows Chrome",
          exact: true,
        })
        .click();
      await page
        .getByRole("button", { name: "Révoquer la session", exact: true })
        .click();
      await expect(
        page.getByText("Windows - Chrome", { exact: true }),
      ).toHaveCount(0);
      assert.notEqual(
        await page.evaluate(() => document.activeElement?.tagName),
        "BODY",
      );
    },
    { section: "security", sessionsMode: "error" },
  );
  await run(
    "secret-copy-stale-result",
    390,
    async ({ page }) => {
      const reset = async () => {
        await page
          .getByRole("button", {
            name: "Réinitialiser le mot de passe",
            exact: true,
          })
          .click();
        await page
          .getByRole("alertdialog")
          .getByRole("button", { name: "Réinitialiser", exact: true })
          .click();
        await expect(
          page.getByRole("checkbox", { name: /J’ai conservé/ }),
        ).toBeVisible();
      };
      await reset();
      await page.evaluate(() => (window.__auditClipboard.mode = "hold"));
      await page
        .getByRole("button", { name: "Copier le mot de passe temporaire" })
        .click();
      await page.getByRole("checkbox", { name: /J’ai conservé/ }).check();
      await page.getByRole("button", { name: "Terminer et masquer" }).click();
      await reset();
      await page.evaluate(() => window.__auditClipboard.pending[0].resolve());
      await expect(
        page.getByText(
          "Mot de passe copié. Confirmez que vous l’avez conservé pour le transmettre.",
          { exact: true },
        ),
      ).toHaveCount(0);
    },
    { section: "security" },
  );
  await run(
    "mfa-reset-error-focus",
    390,
    async ({ page }) => {
      await page
        .getByRole("button", {
          name: "Réinitialiser la double authentification",
          exact: true,
        })
        .click();
      await expect(page.locator("#admin-mfa-reset-password")).toBeFocused();
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Annuler", exact: true })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Réinitialiser la double authentification",
          exact: true,
        }),
      ).toBeFocused();
    },
    { section: "security" },
  );
  await run(
    "mfa-reset-lost-response-check",
    390,
    async ({ page, api }) => {
      api.mfaMode = "lost";
      await page
        .getByRole("button", {
          name: "Réinitialiser la double authentification",
          exact: true,
        })
        .click();
      await page.locator("#admin-mfa-reset-password").fill("Preuve-fictive!");
      await page.locator("#admin-mfa-reset-code").fill("123456");
      await page
        .getByRole("dialog")
        .getByRole("button", { name: "Réinitialiser", exact: true })
        .click();
      await expect(
        page.getByText(/La réponse du serveur n’a pas pu être confirmée/),
      ).toBeVisible();
      await expect(
        page
          .getByRole("dialog")
          .getByRole("button", { name: "Réinitialiser", exact: true }),
      ).toBeDisabled();
      api.getMode = "error";
      await page
        .getByRole("button", { name: "Vérifier l’état du compte", exact: true })
        .click();
      await expect(
        page.getByText(/Vérification impossible. Le résultat reste incertain/),
      ).toBeVisible();
      api.getMode = "success";
      await page
        .getByRole("button", { name: "Vérifier l’état du compte", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(page.locator("#user-security-mfa-heading")).toBeFocused();
      assert.equal(
        api.requests.filter((r) => r.path.endsWith("/reset-mfa")).length,
        1,
      );
    },
    { section: "security" },
  );
  await run(
    "readonly-profile-and-hidden-fields",
    320,
    async ({ page }) => {
      await expect(
        page.getByText("Lecture seule", { exact: true }),
      ).toBeVisible();
      await expect(page.locator("#user-first-name")).toBeDisabled();
      await expect(page.locator("#user-login-name")).toBeDisabled();
      await expect(page.locator("#user-contact-email")).toHaveCount(0);
      await expect(
        page.getByRole("link", { name: "Sécurité", exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: "Enregistrer", exact: true }),
      ).toHaveCount(0);
      await noOverflow(page);
    },
    {
      limited: true,
      user: { securityDetailsVisible: false, contactEmail: null },
    },
  );
  await run(
    "permissions-configured-blocked-and-scopes",
    390,
    async ({ page, api }) => {
      const row = page.locator('[data-permission="persons:create"]');
      await expect(
        row.getByText("Page inaccessible", { exact: true }),
      ).toBeVisible();
      await expect(
        row.getByRole("button", { name: /Autoriser/ }),
      ).toHaveAttribute("aria-pressed", "true");
      await expect(
        row.getByText(/Réglage autorisé, accès bloqué/),
      ).toBeVisible();
      const access = page.locator('[data-permission="persons:view"]');
      await access.getByRole("button", { name: /Autoriser/ }).click();
      await expect(row.getByText("Autorisé", { exact: true })).toBeVisible();
      await page
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await expect
        .poll(() => api.requests.filter((r) => r.method === "PATCH").length)
        .toBe(1);
      assert.equal(
        api.requests.find((r) => r.method === "PATCH").body.permissionScope,
        "access",
      );
      await page
        .getByRole("button", { name: "Compte personnel", exact: true })
        .click();
      await page.getByRole("switch").first().click();
      await page
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await expect
        .poll(() => api.requests.filter((r) => r.method === "PATCH").length)
        .toBe(2);
      const second = api.requests.filter((r) => r.method === "PATCH")[1].body;
      assert.equal(second.permissionScope, "account");
      assert.ok(
        !Object.keys(second.permissions || {}).some((key) =>
          key.startsWith("persons:"),
        ),
      );
    },
    {
      section: "access",
      user: { permissions: { "persons:create": true, "persons:view": false } },
    },
  );
  await run(
    "role-requires-target-mfa",
    390,
    async ({ page }) => {
      await page.locator("#user-role").click();
      await expect(
        page.getByRole("option", { name: "Administrateur", exact: true }),
      ).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(page.locator("#user-role")).toBeFocused();
      await expect(
        page.getByText("Double authentification requise avant promotion.", {
          exact: true,
        }),
      ).toBeVisible();
    },
    {
      section: "access",
      user: { mfaEnabledAt: null, criticalAccessReady: false },
    },
  );
  await run(
    "conflict-refresh-failure-retry-focus",
    390,
    async ({ page, api }) => {
      await page.locator("#user-first-name").fill("Brouillon");
      api.patchMode = "conflict";
      await page
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      api.getMode = "error";
      await page
        .getByRole("button", {
          name: "Actualiser et conserver ma saisie",
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("button", {
          name: "Actualiser et conserver ma saisie",
          exact: true,
        }),
      ).toBeFocused();
      await expect(page.locator("#user-first-name")).toHaveValue("Brouillon");
      api.getMode = "success";
      await page
        .getByRole("button", {
          name: "Actualiser et conserver ma saisie",
          exact: true,
        })
        .click();
      await expect(page.locator("#user-first-name")).toBeFocused();
    },
  );
  await run(
    "scope-ssr-actor-return-no-recycled-snapshot",
    390,
    async ({ page, api }) => {
      assert.equal(api.requests.length, 0);
      api.user = { ...api.user, firstName: "Version B" };
      await page.evaluate(() =>
        window.__auditSetActor({ id: "audit-second-actor" }),
      );
      await expect(page.locator("#user-first-name")).toHaveValue("Version B");
      api.user = { ...api.user, firstName: "Version A récente" };
      await page.evaluate(() =>
        window.__auditSetActor({ id: "audit-creator" }),
      );
      await expect(page.locator("#user-first-name")).toHaveValue(
        "Version A récente",
      );
      assert.equal(api.requests.filter((r) => r.method === "GET").length, 2);
    },
    { initialUser: target },
  );
  await run("scope-unchanged-retains-draft", 390, async ({ page, api }) => {
    await page.locator("#user-first-name").fill("Brouillon conservé");
    await page.evaluate(() =>
      window.__auditSetActor({
        permissions: { "users:create": true, "users:view": true },
        updatedAt: "2026-10-11T20:00:00Z",
      }),
    );
    await expect(page.locator("#user-first-name")).toHaveValue(
      "Brouillon conservé",
    );
    assert.equal(api.requests.filter((r) => r.method === "GET").length, 1);
  });
  await run(
    "scope-late-patch-after-actor-change",
    390,
    async ({ page, api }) => {
      api.patchMode = "hold";
      await page.locator("#user-first-name").fill("Ancienne écriture");
      await page
        .getByRole("button", { name: "Enregistrer", exact: true })
        .click();
      await expect
        .poll(() => api.requests.filter((r) => r.method === "PATCH").length)
        .toBe(1);
      api.user = { ...api.user, firstName: "Nouvelle portée" };
      await page.evaluate(() =>
        window.__auditSetActor({ id: "audit-second-actor" }),
      );
      await expect(page.locator("#user-first-name")).toHaveValue(
        "Nouvelle portée",
      );
      api.held.forEach((resolve) => resolve());
      await expect(page.locator("#user-first-name")).toHaveValue(
        "Nouvelle portée",
      );
    },
  );
  await run(
    "forbidden-background-purges-secret",
    390,
    async ({ page, api }) => {
      api.getMode = "forbiddenNonJson";
      await page
        .getByRole("button", {
          name: "Réinitialiser le mot de passe",
          exact: true,
        })
        .click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Réinitialiser", exact: true })
        .click();
      await expect(
        page.getByText(
          "Vous n'avez pas la permission de consulter cet utilisateur.",
          { exact: true },
        ),
      ).toBeVisible();
      await expect(page.getByText(fakePassword, { exact: true })).toHaveCount(
        0,
      );
      await expect(
        page.getByRole("heading", { name: "Camille Exemple", exact: true }),
      ).toHaveCount(0);
    },
    { section: "security" },
  );
  await run(
    "self-profile-long-unbroken-name",
    320,
    async ({ page }) => {
      await expect(
        page.getByRole("heading", {
          name: "Profil administratif",
          exact: true,
        }),
      ).toBeVisible();
      const identity = page
        .getByText("A".repeat(50) + " " + "B".repeat(50), { exact: true })
        .last();
      const metrics = await identity.evaluate((node) => ({
        width: node.clientWidth,
        scrollWidth: node.scrollWidth,
      }));
      assert.ok(
        metrics.scrollWidth <= metrics.width + 1,
        JSON.stringify(metrics),
      );
      return noOverflow(page);
    },
    {
      actor: { id: "audit-target" },
      user: { firstName: "A".repeat(50), lastName: "B".repeat(50) },
    },
  );
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
