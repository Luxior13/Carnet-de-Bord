const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const assert = require("node:assert/strict");
const esbuild = require("esbuild");
const postcss = require("postcss");
const tailwind = require("@tailwindcss/postcss");
const { chromium, expect } = require("@playwright/test");
const root = path.resolve(__dirname, "../../../..");
const work = fs.mkdtempSync(
  path.join(os.tmpdir(), "noctambule-creation-client-"),
);
const initial =
  "/systeme/utilisateurs/nouveau?returnTo=" +
  encodeURIComponent("/systeme/utilisateurs?q=exemple&role=USER&page=2");
const fakePassword = "FICTIF-audit!2026-ABCD";
const user = {
  id: "audit-created",
  firstName: "Camille",
  lastName: "Exemple",
  loginName: "camille.exemple",
  role: "USER",
  isProtected: false,
  isActive: true,
  contactEmail: "contact@example.test",
  mustChangePassword: true,
};
console.log("Résultats : " + work);

async function main() {
  const mock = JSON.stringify(path.join(__dirname, "mocks.tsx"));
  const aliases = {
    "$context/UserContext": `export {useUser} from ${mock};`,
    "$components/AuthenticatedLayout": `export {AuthenticatedLayout as default} from ${mock};`,
    "next/navigation": `export {useRouter,usePathname,useSearchParams} from ${mock};`,
    "next/link": `export {Link as default} from ${mock};`,
    "next/image": `import React from 'react';export default function Image({priority,unoptimized,fill,...props}) { return <img {...props}/>; }`,
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
        name: "isolated-creation-context",
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
      return res.end(
        fs.existsSync(path.join(work, name.slice(1)))
          ? fs.readFileSync(path.join(work, name.slice(1)))
          : "",
      );
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
  const fill = async (page, login = "camille.exemple") => {
    await page.locator("#newFirstName").fill("Camille");
    await page.locator("#newLoginName").fill(login);
  };
  const create = async (page, login) => {
    await fill(page, login);
    await page
      .getByRole("button", { name: "Créer le compte", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Compte créé", exact: true }),
    ).toBeFocused();
  };
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
      viewport: { width, height: 1000 },
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
      mode: options.mode || "success",
      getMode: "absent",
      posts: [],
      gets: [],
      held: [],
    };
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url());
      const method = req.method();
      if (url.pathname === "/api/auth/step-up") {
        api.mode = "success";
        await route.fulfill({
          status: 200,
          json: { success: true, data: { verified: true } },
        });
        return;
      }
      const body = method === "POST" ? req.postDataJSON() : null;
      const mode = method === "POST" ? api.mode : api.getMode;
      if (method === "POST")
        api.posts.push({ loginName: body.loginName, role: body.role });
      else api.gets.push(url.searchParams.toString());
      let status = 200;
      let payload = {
        success: true,
        data:
          method === "POST"
            ? {
                user: { ...user, ...body },
                temporaryPassword:
                  body.loginName === "seconde.exemple"
                    ? "FICTIF-deuxieme!2026"
                    : fakePassword,
              }
            : {
                users: mode === "found" ? [user] : [],
                total: mode === "found" ? 1 : 0,
                page: 1,
                limit: 1,
              },
      };
      if (mode === "serverError") {
        status = 500;
        payload = {
          success: false,
          error: { message: "Erreur fictive", code: "INTERNAL_ERROR" },
        };
      }
      if (mode === "forbidden") {
        status = 403;
        payload = {
          success: false,
          error: { message: "Droits fictifs insuffisants", code: "FORBIDDEN" },
        };
      }
      if (mode === "fieldError") {
        status = 400;
        payload = {
          success: false,
          error: {
            message: "Identifiant déjà utilisé.",
            code: "VALIDATION_ERROR",
            details: { loginName: ["Identifiant déjà utilisé."] },
          },
        };
      }
      if (mode === "reauth") {
        status = 403;
        payload = {
          success: false,
          error: {
            message: "Confirmation requise",
            code: "REAUTHENTICATION_REQUIRED",
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
      await page.goto(origin + (options.url || initial));
      await expect(
        page.getByRole("heading", {
          name: options.noAccess ? "Accès non autorisé" : "Nouvel utilisateur",
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
        "FAIL " + name + " " + width + ": " + String(error).slice(0, 300),
      );
    } finally {
      api.held.forEach((resolve) => resolve());
      await context.close();
    }
  }

  for (const width of [320, 390, 768, 1440, 1920]) {
    await run("responsive-form-success", width, async ({ page }) => {
      const form = await noOverflow(page);
      // Reprise du 23 octobre : le bandeau explique, la carte commence par
      // ses champs, la note du mot de passe est une aide et non une alerte.
      await expect(page.getByText("Création du compte", { exact: true })).toHaveCount(0);
        await expect(page.getByText("Modifications non enregistrées")).toHaveCount(0);
      await expect(page.getByText("Le compte pourra être complété après création.")).toHaveCount(0);
      await expect(page.getByText(/pour vous\s+connecter/)).toHaveCount(0);
      await expect(
        page.getByText(/Un mot de passe temporaire est généré à la création/),
      ).toBeVisible();
      await page.screenshot({
        path: path.join(work, "form-" + width + ".png"),
        fullPage: true,
      });
      await expect(
        page.getByRole("button", { name: "Créer le compte", exact: true }),
      ).toBeDisabled();
      await expect(
        page.getByRole("radio", { name: /Utilisateur/ }),
      ).toBeChecked();
      await page.getByRole("radio", { name: /Utilisateur/ }).focus();
      await page.keyboard.press("ArrowRight");
      await expect(
        page.getByRole("radio", { name: /Administrateur/ }),
      ).toBeChecked();
      await page.keyboard.press("ArrowLeft");
      assert.equal(
        await page.locator('input:not([autocomplete="off"])').count(),
        0,
      );
      await fill(page, "identifiant.long.pour.audit");
      await page
        .locator("#newLastName")
        .fill("Nom composé fictif très long pour le contrôle visuel");
      await page.locator("#newContactAddress").focus();
      await page
        .locator("#newContactAddress")
        .fill("adresse.longue.de.contact@example.test");
      await page
        .getByRole("button", { name: "Créer le compte", exact: true })
        .click();
      await expect(
        page.getByRole("heading", { name: "Compte créé", exact: true }),
      ).toBeFocused();
      const success = await noOverflow(page);
      await page.screenshot({
        path: path.join(work, "success-" + width + ".png"),
        fullPage: true,
      });
      const stored = await page.evaluate(() =>
        JSON.stringify({
          local: { ...localStorage },
          session: { ...sessionStorage },
        }),
      );
      assert.ok(!stored.includes(fakePassword));
      return { form, success };
    });
    await run("focus-leave-draft", width, async ({ page }) => {
      await fill(page);
      const trigger = page.getByRole("link", { name: "Annuler", exact: true });
      await trigger.click();
      await expect(page.getByRole("alertdialog")).toBeVisible();
      await page.getByRole("button", { name: "Rester", exact: true }).click();
      await expect(trigger).toBeFocused();
    });
    await run("focus-reset-secret", width, async ({ page }) => {
      await create(page);
      const trigger = page.getByRole("button", {
        name: "Créer un autre",
        exact: true,
      });
      await trigger.click();
      await page.getByRole("button", { name: "Rester", exact: true }).click();
      await expect(trigger).toBeFocused();
      await trigger.click();
      await page
        .getByRole("button", { name: "Créer un autre compte", exact: true })
        .click();
      await expect(page.locator("#newFirstName")).toBeFocused();
      await expect(page.locator("#newFirstName")).toHaveValue("");
    });
  }
  await run("validation-client-server", 390, async ({ page, api }) => {
    await page.locator("#newFirstName").fill(" ");
    await page.locator("#newLoginName").fill("a");
    await page.locator("#newLoginName").press("Enter");
    await expect(page.locator("#newFirstName")).toBeFocused();
    assert.equal(api.posts.length, 0);
    await fill(page);
    api.mode = "fieldError";
    await page
      .getByRole("button", { name: "Créer le compte", exact: true })
      .click();
    await expect(page.locator("#newLoginName")).toBeFocused();
    await expect(page.locator("#newLoginName")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
  await run(
    "limited-roles-and-revocation",
    390,
    async ({ page }) => {
      await expect(
        page.getByRole("radio", { name: /Administrateur/ }),
      ).toHaveCount(0);
      await fill(page);
      await page.evaluate(() => window.__auditSetActor({ permissions: {} }));
      await expect(page.locator("#newFirstName")).toHaveCount(0);
      await page.evaluate(() =>
        window.__auditSetActor({
          permissions: { "users:view": true, "users:create": true },
        }),
      );
      await expect(page.locator("#newFirstName")).toHaveValue("");
    },
    { limited: true },
  );
  await run("pending-duplicate-navigation", 390, async ({ page, api }) => {
    api.mode = "hold";
    await fill(page);
    await page.locator("form").evaluate((form) => {
      form.requestSubmit();
      form.requestSubmit();
    });
    await expect(
      page.getByRole("button", { name: "Création…", exact: true }),
    ).toBeDisabled();
    assert.equal(api.posts.length, 1);
    await expect(page.locator("#newFirstName")).toBeDisabled();
    await page.getByRole("navigation").getByRole("link").click();
    await expect(
      page.getByRole("alertdialog", { name: "Création en cours" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "Rester", exact: true }).click();
    api.held.forEach((resolve) => resolve());
    await expect(
      page.getByRole("heading", { name: "Compte créé", exact: true }),
    ).toBeFocused();
  });
  await run("recovery-absent-retry", 390, async ({ page, api }) => {
    api.mode = "serverError";
    await fill(page);
    await page
      .getByRole("button", { name: "Créer le compte", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Vérifier la création", exact: true }),
    ).toBeVisible();
    await expect(page.locator("#newFirstName")).toBeDisabled();
    await page
      .getByRole("button", { name: "Vérifier la création", exact: true })
      .click();
    await expect(
      page.getByText("Aucun compte trouvé pour le moment", { exact: true }),
    ).toBeVisible();
    assert.deepEqual(api.gets, ["limit=1&loginName=camille.exemple"]);
    api.mode = "success";
    await page
      .getByRole("button", { name: "Réessayer la création", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Compte créé", exact: true }),
    ).toBeFocused();
    assert.equal(api.posts.length, 2);
  });
  await run("recovery-found-and-forbidden", 390, async ({ page, api }) => {
    api.mode = "serverError";
    await fill(page);
    await page
      .getByRole("button", { name: "Créer le compte", exact: true })
      .click();
    api.getMode = "forbidden";
    await page
      .getByRole("button", { name: "Vérifier la création", exact: true })
      .click();
    await expect(
      page.getByText(/Vos droits actuels ne permettent pas de vérifier/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Réessayer la création", exact: true }),
    ).toHaveCount(0);
    api.getMode = "found";
    await page
      .getByRole("button", { name: "Vérifier la création", exact: true })
      .click();
    await expect(
      page.getByText("Un compte utilise cet identifiant", { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(fakePassword, { exact: true })).toHaveCount(0);
    await page
      .getByRole("button", { name: "Créer un autre compte", exact: true })
      .click();
    await expect(page.locator("#newFirstName")).toBeFocused();
  });
  await run("copy-acknowledgement-and-return", 390, async ({ page }) => {
    await create(page);
    await page
      .getByRole("button", { name: "Copier le mot de passe temporaire" })
      .click();
    await expect(page.getByRole("status")).toContainText("Mot de passe copié");
    await expect(page.getByRole("checkbox")).not.toBeChecked();
    const link = page.getByRole("link", { name: "Ouvrir la fiche" });
    assert.equal(
      new URL(
        await link.getAttribute("href"),
        "http://fictif.test",
      ).searchParams.get("returnTo"),
      "/systeme/utilisateurs?q=exemple&role=USER&page=2",
    );
    await link.click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page.getByRole("button", { name: "Rester", exact: true }).click();
    await expect(link).toBeFocused();
    await page.getByRole("checkbox").check();
    await link.click();
    await expect(
      page.getByRole("heading", { name: "Destination simulée" }),
    ).toBeVisible();
  });
  await run("copy-rejection-and-stale-completion", 390, async ({ page }) => {
    await create(page);
    await page.evaluate(() => (window.__auditClipboard.mode = "reject"));
    await page
      .getByRole("button", { name: "Copier le mot de passe temporaire" })
      .click();
    await expect(page.getByRole("status")).toContainText("Copie impossible");
    await page.evaluate(() => (window.__auditClipboard.mode = "hold"));
    await page
      .getByRole("button", { name: "Copier le mot de passe temporaire" })
      .click();
    await page.getByRole("checkbox").check();
    await page
      .getByRole("button", { name: "Créer un autre", exact: true })
      .click();
    await create(page, "seconde.exemple");
    await page.evaluate(() => window.__auditClipboard.pending[0].resolve());
    await expect(page.getByRole("status")).toBeEmpty();
    await expect(
      page.getByText("FICTIF-deuxieme!2026", { exact: true }),
    ).toBeVisible();
  });
  await run("admin-stepup-cancel-focus", 390, async ({ page, api }) => {
    api.mode = "reauth";
    await fill(page);
    await page.getByRole("radio", { name: /Utilisateur/ }).focus();
    await page.keyboard.press("ArrowRight");
    await page
      .getByRole("button", { name: "Créer le compte", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", {
        name: "Confirmer la création administrateur",
      }),
    ).toBeVisible();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Annuler", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Créer le compte", exact: true }),
    ).toBeFocused();
  });
  await run("admin-stepup-success-focus", 390, async ({ page, api }) => {
    api.mode = "reauth";
    await fill(page);
    await page.getByRole("radio", { name: /Utilisateur/ }).focus();
    await page.keyboard.press("ArrowRight");
    await page
      .getByRole("button", { name: "Créer le compte", exact: true })
      .click();
    await expect(
      page.getByRole("dialog", {
        name: "Confirmer la création administrateur",
      }),
    ).toBeVisible();
    await page.locator("#admin-step-up-password").fill("Mot-de-passe-fictif!");
    await page.locator("#admin-step-up-code").fill("123456");
    await page
      .getByRole("button", { name: "Confirmer et continuer", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Compte créé", exact: true }),
    ).toBeFocused();
    assert.deepEqual(
      api.posts.map((post) => post.role),
      ["ADMIN", "ADMIN"],
    );
  });
  await run(
    "late-response-after-permission-loss",
    390,
    async ({ page, api }) => {
      api.mode = "hold";
      await fill(page);
      await page
        .getByRole("button", { name: "Créer le compte", exact: true })
        .click();
      await page.evaluate(() =>
        window.__auditSetActor({
          isProtected: false,
          role: "USER",
          permissions: {},
        }),
      );
      api.held.forEach((resolve) => resolve());
      await expect(page.getByText(fakePassword, { exact: true })).toHaveCount(
        0,
      );
      await expect(page.locator("#newFirstName")).toHaveCount(0);
    },
  );
  await run("timeouts-post-verification", 390, async ({ page, api }) => {
    await page.clock.install();
    api.mode = "hold";
    await fill(page);
    await page
      .getByRole("button", { name: "Créer le compte", exact: true })
      .click();
    await expect.poll(() => api.posts.length).toBe(1);
    await page.clock.fastForward(30_100);
    await expect(
      page.getByRole("button", { name: "Vérifier la création", exact: true }),
    ).toBeVisible();
    api.getMode = "hold";
    await page
      .getByRole("button", { name: "Vérifier la création", exact: true })
      .click();
    await expect.poll(() => api.gets.length).toBe(1);
    await page.clock.fastForward(15_100);
    await expect(
      page.getByText(/Vérification impossible pour le moment/),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Vérifier la création", exact: true }),
    ).toBeEnabled();
    assert.equal(api.posts.length, 1);
  });
  await run("secret-cleared-on-actor-change", 390, async ({ page }) => {
    await create(page);
    await page.evaluate(() =>
      window.__auditSetActor({ id: "autre-compte-fictif" }),
    );
    await expect(page.getByText(fakePassword, { exact: true })).toHaveCount(0);
    await expect(page.locator("#newFirstName")).toHaveValue("");
  });
  await run(
    "external-returnTo-sanitized",
    390,
    async ({ page }) => {
      await expect(
        page.getByRole("link", { name: "Annuler", exact: true }),
      ).toHaveAttribute("href", "/systeme/utilisateurs");
    },
    {
      url: "/systeme/utilisateurs/nouveau?returnTo=https%3A%2F%2Fexample.test%2F",
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
