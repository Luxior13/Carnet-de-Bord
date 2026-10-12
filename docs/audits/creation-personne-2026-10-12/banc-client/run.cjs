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
  path.join(os.tmpdir(), "noctambule-person-create-client-"),
);
const directoryHref = "/membres/repertoire?q=exemple&status=IN_STRUCTURE";
const initial =
  "/membres/repertoire/nouveau?returnTo=" + encodeURIComponent(directoryHref);
const before = process.env.AUDIT_BEFORE === "1";
console.log("Résultats : " + work);

async function main() {
  const mock = JSON.stringify(path.join(__dirname, "mocks.tsx"));
  const aliases = {
    "$context/UserContext": `export {useUser} from ${mock};`,
    "$context/FeatureAvailabilityContext": `export {useFeatureAvailability} from ${mock};`,
    "$components/AuthenticatedLayout": `export {AuthenticatedLayout as default} from ${mock};`,
    "next/link": `export {Link as default} from ${mock};`,
    "next/navigation": `export {usePathname,useRouter,useSearchParams} from ${mock};`,
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
        name: "person-creation-session-and-shell",
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
  const heading = (page) => page.getByRole("heading", { level: 1 });
  const nickname = (page) =>
    page.getByLabel("Pseudo principal", { exact: true });
  const submit = (page) =>
    page.getByRole("button", { name: "Créer et ouvrir la fiche", exact: true });
  const cancel = (page) =>
    page.getByRole("link", { name: "Annuler", exact: true });
  const fill = async (page) => nickname(page).fill("CamilleAudit");
  const metrics = async (page) => {
    const result = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      main: document.querySelector("main")?.scrollWidth,
      mainWidth: document.querySelector("main")?.clientWidth,
      hero: document.querySelector('[data-slot="page-heading"]')?.scrollWidth,
      heroWidth: document.querySelector('[data-slot="page-heading"]')
        ?.clientWidth,
    }));
    assert.ok(result.document <= result.viewport + 1, JSON.stringify(result));
    assert.ok(result.main <= result.mainWidth + 1, JSON.stringify(result));
    if (result.hero !== undefined)
      assert.ok(result.hero <= result.heroWidth + 1, JSON.stringify(result));
    return result;
  };
  const updateActor = async (page, patch) =>
    page.evaluate((value) => {
      window.__auditSetActor(value);
    }, patch);
  async function run(name, width, fn, options = {}) {
    if (process.env.AUDIT_ONLY && !name.includes(process.env.AUDIT_ONLY))
      return;
    const context = await browser.newContext({
      viewport: { width, height: options.height || 900 },
      reducedMotion: "reduce",
      timezoneId: "Europe/Paris",
    });
    await context.addInitScript((value) => {
      window.__auditOptions = value;
      if (value.storageBlocked)
        Storage.prototype.setItem = function () {
          throw new DOMException("Stockage fictif bloqué", "SecurityError");
        };
      if (value.fastTimeout) {
        const timer = window.setTimeout;
        window.setTimeout = function (callback, delay, ...args) {
          return timer(callback, delay === 30000 ? 100 : delay, ...args);
        };
      }
    }, options);
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    const errors = [],
      apiRequests = [];
    const api = {
      mode: options.mode || "success",
      posts: [],
      held: [],
      gets: [],
    };
    const success = (post) => ({
      success: true,
      data: {
        person: {
          id: "audit-created-person",
          nickname: post.nickname,
          firstName: post.firstName,
          lastName: post.lastName,
          structureStatus: post.structureStatus,
          version: 1,
        },
      },
    });
    const fulfill = (route, body) =>
      route.fulfill({ status: 201, json: success(body) });
    api.resolve = async () => {
      for (const held of api.held.splice(0))
        await fulfill(held.route, held.body).catch(() => {});
    };
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        url = new URL(req.url());
      apiRequests.push({ method: req.method(), path: url.pathname });
      if (req.method() !== "POST") {
        api.gets.push(url.pathname + url.search);
        await route.fulfill({
          status: 404,
          json: {
            success: false,
            error: { code: "NOT_FOUND", message: "Création introuvable" },
          },
        });
        return;
      }
      const body = req.postDataJSON();
      api.posts.push({ body, headers: req.headers() });
      if (api.mode === "hold") {
        api.held.push({ route, body });
        return;
      }
      if (api.mode === "lost") {
        await route.abort("failed");
        return;
      }
      if (api.mode === "invalidjson") {
        await route.fulfill({
          status: 201,
          body: "{invalide",
          contentType: "application/json",
        });
        return;
      }
      if (["error", "field", "forbidden"].includes(api.mode)) {
        await route.fulfill({
          status:
            api.mode === "field" ? 400 : api.mode === "forbidden" ? 403 : 500,
          json: {
            success: false,
            error: {
              code:
                api.mode === "field"
                  ? "VALIDATION_ERROR"
                  : api.mode === "forbidden"
                    ? "FORBIDDEN"
                    : "INTERNAL_ERROR",
              message:
                api.mode === "forbidden"
                  ? "Accès fictif refusé"
                  : "Erreur fictive contrôlée",
              ...(api.mode === "field"
                ? { details: { nickname: ["Pseudo fictif refusé"] } }
                : {}),
            },
          },
        });
        return;
      }
      await fulfill(route, body);
    });
    try {
      await page.goto(origin + (options.url || initial));
      if (!options.loading && !options.unavailable && !options.noAccess)
        await expect(heading(page)).toHaveText("Nouvelle fiche");
      const details = await fn(page, api);
      assert.deepEqual(errors, []);
      observations.push({
        name,
        width,
        status: "pass",
        ...details,
        requestCounts: { posts: api.posts.length, gets: api.gets.length },
        metrics: await metrics(page),
      });
      console.log("PASS " + name + " " + width);
    } catch (error) {
      observations.push({
        name,
        width,
        status: "fail",
        error: String(error),
        errors,
        apiRequests,
      });
      console.log("FAIL " + name + " " + width + ": " + String(error));
    } finally {
      await context.close();
    }
  }
  try {
    if (before) {
      await run(
        "avant-reponse-perdue-rejeu",
        390,
        async (page, api) => {
          await fill(page);
          await submit(page).click();
          await expect(
            page.getByRole("alert").filter({ hasText: "Failed to fetch" }),
          ).toBeVisible();
          await expect(submit(page)).toBeEnabled();
          api.mode = "success";
          await submit(page).click();
          await expect(heading(page)).toHaveText("Destination simulée");
          assert.equal(api.posts.length, 2);
          return {
            defect: "second POST possible après réponse perdue",
            keys: api.posts.map((p) => p.headers["idempotency-key"] || null),
          };
        },
        { mode: "lost" },
      );
      await run(
        "avant-erreur-generale-focus",
        390,
        async (page, api) => {
          await fill(page);
          await submit(page).click();
          await expect(
            page.getByRole("alert").filter({ hasText: "Erreur fictive" }),
          ).toBeVisible();
          return {
            activeElement: await page.evaluate(() => ({
              tag: document.activeElement.tagName,
              text: document.activeElement.textContent.slice(0, 140),
            })),
          };
        },
        { mode: "error" },
      );
      await run("avant-barre-dans-carte", 1440, async (page) => ({
        barInsideCard: await page
          .locator('[data-slot="section-action-bar"]')
          .evaluate((n) => Boolean(n.closest('[data-slot="card"]'))),
        dirtyBeforeInput: await page
          .locator('[data-slot="section-action-bar"]')
          .getAttribute("data-dirty"),
      }));
      await run("avant-disponibilite-perte-brouillon", 390, async (page) => {
        await fill(page);
        await page.evaluate(() => window.__auditToggleFeature(false));
        await expect(heading(page)).toHaveText(
          "Répertoire temporairement indisponible",
        );
        await page.evaluate(() => window.__auditToggleFeature(true));
        await expect(nickname(page)).toHaveValue("");
        return { defect: "disponibilité true/false/true perd le brouillon" };
      });
      return;
    }
    for (const width of [320, 390, 768, 1024, 1440, 1920])
      await run("composition-clavier", width, async (page) => {
        await expect(heading(page)).toHaveCount(1);
        await expect(nickname(page)).toHaveAttribute("autocomplete", "off");
        for (const input of await page
          .locator('input:not([aria-hidden="true"])')
          .all()) {
          await expect(input).toHaveAttribute("autocomplete", "off");
          await expect(input).toHaveAttribute("data-bwignore", "true");
        }
        await expect(page.locator("form")).toHaveAttribute(
          "autocomplete",
          "off",
        );
        const status = page.getByRole("combobox", {
          name: "Statut dans la structure",
        });
        await status.focus();
        await page.keyboard.press("ArrowDown");
        await expect(page.getByRole("listbox")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(status).toBeFocused();
        if ([320, 1440].includes(width))
          await page.screenshot({
            path: path.join(work, `creation-${width}.png`),
            fullPage: true,
          });
        return {
          barInsideCard: await page
            .locator('[data-slot="section-action-bar"]')
            .evaluate((n) => Boolean(n.closest('[data-slot="card"]'))),
        };
      });
    await run("validation-vide-puis-pseudo-entree", 390, async (page, api) => {
      await submit(page).click();
      await expect(nickname(page)).toHaveAttribute("aria-invalid", "true");
      await expect(nickname(page)).toBeFocused();
      assert.equal(api.posts.length, 0);
      await nickname(page).fill("   CamilleAudit   ");
      await nickname(page).press("Enter");
      await expect(heading(page)).toHaveText("Destination simulée");
      assert.equal(api.posts.length, 1);
      assert.equal(api.posts[0].body.nickname, "CamilleAudit");
      const url = new URL(page.url());
      assert.equal(url.searchParams.get("returnTo"), directoryHref);
      assert.equal(url.searchParams.get("section"), "identite");
    });
    await run("identite-civile-statut", 768, async (page, api) => {
      await page.getByLabel("Prénom", { exact: true }).fill("Camille");
      await submit(page).click();
      assert.equal(api.posts.length, 0);
      await page.getByLabel("Nom", { exact: true }).fill("Exemple");
      await page.getByRole("combobox").click();
      await page
        .getByRole("option", { name: "Dans la structure", exact: true })
        .click();
      await submit(page).click();
      await expect(heading(page)).toHaveText("Destination simulée");
      assert.equal(api.posts[0].body.nickname, null);
      assert.equal(api.posts[0].body.structureStatus, "IN_STRUCTURE");
    });
    await run(
      "erreur-champ-et-reprise",
      390,
      async (page, api) => {
        await fill(page);
        await submit(page).click();
        await expect(nickname(page)).toBeFocused();
        await expect(nickname(page)).toHaveValue("CamilleAudit");
        await expect(nickname(page)).toHaveAttribute("aria-invalid", "true");
        api.mode = "success";
        await nickname(page).fill("AutrePseudo");
        await submit(page).click();
        await expect(heading(page)).toHaveText("Destination simulée");
      },
      { mode: "field" },
    );
    await run(
      "double-soumission-en-attente",
      390,
      async (page, api) => {
        await fill(page);
        await page.locator("form").evaluate((form) => {
          form.requestSubmit();
          form.requestSubmit();
        });
        await expect.poll(() => api.posts.length).toBe(1);
        await expect(nickname(page)).toBeDisabled();
        await expect(cancel(page)).toHaveAttribute("aria-disabled", "true");
        await api.resolve();
        await expect(heading(page)).toHaveText("Destination simulée");
        assert.equal(api.posts.length, 1);
      },
      { mode: "hold" },
    );
    await run("depart-annule-focus-puis-confirme", 320, async (page) => {
      await fill(page);
      await cancel(page).click();
      const dialog = page.getByRole("alertdialog");
      await expect(dialog).toBeVisible();
      await dialog.getByRole("button", { name: "Rester", exact: true }).click();
      await expect(cancel(page)).toBeFocused();
      await expect(nickname(page)).toHaveValue("CamilleAudit");
      await cancel(page).click();
      await dialog
        .getByRole("button", { name: "Quitter sans enregistrer", exact: true })
        .click();
      await expect(heading(page)).toHaveText("Destination simulée");
      assert.equal(new URL(page.url()).pathname, "/membres/repertoire");
    });
    await run("saisie-effacee-sans-confirmation", 390, async (page) => {
      await fill(page);
      await nickname(page).fill("");
      await cancel(page).click();
      await expect(heading(page)).toHaveText("Destination simulée");
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
    });
    await run(
      "compte-change-reponse-tardive",
      390,
      async (page, api) => {
        await fill(page);
        await submit(page).click();
        await expect.poll(() => api.posts.length).toBe(1);
        await updateActor(page, { id: "audit-other-creator" });
        await expect(nickname(page)).toHaveValue("");
        await api.resolve();
        await expect(heading(page)).toHaveText("Nouvelle fiche");
        await expect(submit(page)).toBeEnabled();
        await expect(nickname(page)).toHaveValue("");
      },
      { mode: "hold" },
    );
    await run(
      "droits-retires-reponse-tardive",
      390,
      async (page, api) => {
        await fill(page);
        await submit(page).click();
        await expect.poll(() => api.posts.length).toBe(1);
        await updateActor(page, {
          isProtected: false,
          role: "USER",
          permissions: { "persons:view": true, "persons:create": false },
        });
        await expect(heading(page)).toHaveText("Accès refusé");
        await api.resolve();
        await expect(heading(page)).toHaveText("Accès refusé");
        await expect(page.locator("form")).toHaveCount(0);
      },
      { mode: "hold" },
    );
    await run(
      "chargement-disponibilite",
      390,
      async (page) => {
        await expect(
          page.getByRole("status", { name: "Chargement", exact: true }),
        ).toBeVisible();
        await expect(page.locator("form")).toHaveCount(0);
        await page.evaluate(() =>
          window.__auditSetFeature({ featureAvailabilityLoaded: true }),
        );
        await expect(heading(page)).toHaveText("Nouvelle fiche");
      },
      { loading: true },
    );
    await run(
      "service-indisponible-reverification",
      390,
      async (page) => {
        await expect(heading(page)).toHaveText("Nouvelle fiche");
        await expect(page.getByRole("alert")).toContainText(
          "Répertoire temporairement indisponible",
        );
        await expect(submit(page)).toBeDisabled();
        await fill(page);
        await page
          .getByRole("button", { name: "Revérifier", exact: true })
          .click();
        await expect(heading(page)).toHaveText("Nouvelle fiche");
        await expect(submit(page)).toBeEnabled();
        await expect(nickname(page)).toHaveValue("CamilleAudit");
      },
      { unavailable: true },
    );
    await run(
      "sans-permission",
      320,
      async (page) => {
        await expect(heading(page)).toHaveText("Accès refusé");
        await expect(page.locator("form")).toHaveCount(0);
      },
      { noAccess: true, limited: true },
    );
    await run(
      "retour-externe-neutralise",
      390,
      async (page) => {
        await expect(cancel(page)).toHaveAttribute(
          "href",
          "/membres/repertoire",
        );
      },
      {
        url:
          "/membres/repertoire/nouveau?returnTo=" +
          encodeURIComponent("https://example.test/extern"),
      },
    );
    await run(
      "valeurs-longues-et-paysage",
      390,
      async (page) => {
        await nickname(page).fill("É".repeat(80));
        await page.getByLabel("Prénom", { exact: true }).fill("É".repeat(100));
        await page.getByLabel("Nom", { exact: true }).fill("É".repeat(100));
        await submit(page).scrollIntoViewIfNeeded();
        await expect(submit(page)).toBeVisible();
        return {
          position: await page
            .locator('[data-slot="section-action-bar"]')
            .evaluate((n) => getComputedStyle(n).position),
        };
      },
      { height: 500 },
    );
    for (const mode of ["lost", "error", "invalidjson"])
      await run(
        "incertain-verification-explicite-" + mode,
        390,
        async (page, api) => {
          await fill(page);
          await submit(page).click();
          const alert = page
            .getByRole("alert")
            .filter({ hasText: "Création à vérifier" });
          const retry = page.getByRole("button", {
            name: "Relancer la création",
            exact: true,
          });
          await expect(alert).toBeVisible();
          await expect(alert).toBeFocused();
          await expect(nickname(page)).toBeDisabled();
          await expect(nickname(page)).toHaveValue("CamilleAudit");
          await expect(retry).toBeDisabled();
          const verify = page.getByRole("link", {
            name: "Vérifier le répertoire (nouvel onglet)",
            exact: true,
          });
          await expect(verify).toHaveAttribute("target", "_blank");
          await expect(verify).toHaveAttribute(
            "href",
            "/membres/repertoire?q=CamilleAudit",
          );
          await page.locator("form").evaluate((f) => {
            f.requestSubmit();
            f.requestSubmit();
          });
          assert.equal(api.posts.length, 1);
          await page.getByRole("checkbox", { name: /J’ai vérifié/ }).check();
          api.mode = "success";
          await retry.click();
          await expect(heading(page)).toHaveText("Destination simulée");
          assert.equal(api.posts.length, 2);
          assert.deepEqual(api.posts[0].body, api.posts[1].body);
          return {
            noAutomaticReplay: true,
            samePayloadAfterExplicitConfirmation: true,
          };
        },
        { mode },
      );
    await run(
      "reprise-refusee-conserve-incertitude",
      320,
      async (page, api) => {
        await fill(page);
        await submit(page).click();
        await expect(
          page.getByRole("checkbox", { name: /J’ai vérifié/ }),
        ).toBeVisible();
        await page.getByRole("checkbox", { name: /J’ai vérifié/ }).check();
        api.mode = "field";
        await page
          .getByRole("button", { name: "Relancer la création", exact: true })
          .click();
        const alert = page
          .getByRole("alert")
          .filter({ hasText: "Création à vérifier" });
        await expect(alert).toContainText(
          "Le résultat de la première demande reste à vérifier",
        );
        await expect(alert).toBeFocused();
        await expect(nickname(page)).toBeDisabled();
        await expect(
          page.getByRole("checkbox", { name: /J’ai vérifié/ }),
        ).not.toBeChecked();
        await expect(
          page.getByRole("button", {
            name: "Relancer la création",
            exact: true,
          }),
        ).toBeDisabled();
        assert.equal(api.posts.length, 2);
        await page.screenshot({
          path: path.join(work, "incertitude-320.png"),
          fullPage: true,
        });
      },
      { mode: "lost" },
    );
    await run(
      "timeout-borne-sans-rejeu",
      390,
      async (page, api) => {
        await fill(page);
        await submit(page).click();
        const alert = page
          .getByRole("alert")
          .filter({ hasText: "Création à vérifier" });
        await expect(alert).toBeFocused();
        await expect(nickname(page)).toBeDisabled();
        await expect(
          page.getByRole("button", {
            name: "Relancer la création",
            exact: true,
          }),
        ).toBeDisabled();
        assert.equal(api.posts.length, 1);
        return { timer30000AcceleratedTo100: true };
      },
      { mode: "hold", fastTimeout: true },
    );
    await run(
      "succes-navigation-refusee-stockage-bloque",
      390,
      async (page, api) => {
        await fill(page);
        await submit(page).click();
        const confirmed = page.getByRole("heading", {
          name: "Fiche créée",
          exact: true,
        });
        await expect(confirmed).toBeFocused();
        await expect(page.locator("form")).toHaveCount(0);
        await expect(submit(page)).toHaveCount(0);
        const open = page.getByRole("link", {
          name: "Ouvrir la fiche",
          exact: true,
        });
        await expect(open).toHaveAttribute(
          "href",
          /\/membres\/repertoire\/audit-created-person\?/,
        );
        assert.equal(api.posts.length, 1);
        await open.click();
        await expect(heading(page)).toHaveText("Destination simulée");
        assert.equal(api.posts.length, 1);
      },
      { navigationThrows: true, storageBlocked: true },
    );
    await run("disponibilite-brouillon-focus-conserves", 390, async (page) => {
      await fill(page);
      await nickname(page).focus();
      await page.evaluate(() => window.__auditToggleFeature(false));
      await expect(page.getByRole("alert")).toContainText(
        "Répertoire temporairement indisponible",
      );
      await expect(nickname(page)).toHaveValue("CamilleAudit");
      await expect(nickname(page)).toBeFocused();
      await expect(submit(page)).toBeDisabled();
      await nickname(page).fill("CamilleAuditSuite");
      await page.evaluate(() => window.__auditToggleFeature(true));
      await expect(nickname(page)).toHaveValue("CamilleAuditSuite");
      await expect(nickname(page)).toBeFocused();
      await expect(submit(page)).toBeEnabled();
    });
    await run(
      "refus-definitif-reprise",
      390,
      async (page, api) => {
        await fill(page);
        await submit(page).click();
        const alert = page
          .getByRole("alert")
          .filter({ hasText: "Création non effectuée" });
        await expect(alert).toBeFocused();
        await expect(nickname(page)).toHaveValue("CamilleAudit");
        await expect(nickname(page)).toBeEnabled();
        await expect(submit(page)).toBeEnabled();
        await expect(page.getByRole("checkbox")).toHaveCount(0);
        assert.equal(api.posts.length, 1);
      },
      { mode: "forbidden" },
    );
    await run(
      "depart-pendant-requete-reponse-ignoree",
      390,
      async (page, api) => {
        await fill(page);
        await submit(page).click();
        await expect.poll(() => api.posts.length).toBe(1);
        await page
          .getByRole("navigation")
          .getByRole("link", { name: "Répertoire", exact: true })
          .click();
        const dialog = page.getByRole("alertdialog");
        await expect(dialog).toContainText(
          "Quitter cette page ne l’annule pas",
        );
        await dialog
          .getByRole("button", { name: "Quitter la page", exact: true })
          .click();
        await expect(heading(page)).toHaveText("Destination simulée");
        const left = page.url();
        await api.resolve();
        assert.equal(page.url(), left);
        await expect(
          page.getByText("Fiche créée", { exact: true }),
        ).toHaveCount(0);
      },
      { mode: "hold" },
    );
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
    const result = {
      completedAt: new Date().toISOString(),
      timezone: "Europe/Paris",
      browser: "Chromium",
      passed: observations.filter((item) => item.status === "pass").length,
      total: observations.length,
      observations,
    };
    fs.writeFileSync(
      path.join(work, "observations.json"),
      JSON.stringify(result, null, 2),
    );
    console.log(
      JSON.stringify({ work, passed: result.passed, total: result.total }),
    );
    if (result.passed !== result.total) process.exitCode = 1;
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
