const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const assert = require("node:assert/strict");
const esbuild = require("esbuild");
const postcss = require("postcss");
const tailwind = require("@tailwindcss/postcss");
const { chromium, expect } = require("@playwright/test");
const { response } = require("./data.cjs");
const root = path.resolve(__dirname, "../../../..");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "noctambule-users-client-"));
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
        name: "isolated-users-context",
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
  // esbuild localizes named containers in CSS modules; Next/Tailwind's shared
  // data-table container is global. Preserve that production name in this bench.
  const bundledCss = path.join(work, "bundle.css");
  fs.writeFileSync(
    bundledCss,
    fs
      .readFileSync(bundledCss, "utf8")
      .replaceAll("@container UsersList_data-table ", "@container data-table "),
  );
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
      '<!doctype html><html lang="fr" class="dark"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/bundle.css"><style>:root{--font-geist-sans:Arial,sans-serif;--font-geist-mono:monospace}.audit-shell{min-height:100vh}@media(min-width:1024px){.audit-shell{margin-left:240px}}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const observations = [];
  async function run(name, width, fn, options = {}) {
    if (process.env.AUDIT_ONLY && !name.includes(process.env.AUDIT_ONLY))
      return;
    const context = await browser.newContext({
      viewport: { width, height: 1000 },
      reducedMotion: "reduce",
      timezoneId: "Europe/Paris",
      ...(options.browser ?? {}),
    });
    await context.addInitScript((value) => {
      window.__auditOptions = value;
    }, options);
    const page = await context.newPage();
    page.setDefaultTimeout(6000);
    await page.clock.setFixedTime(new Date("2026-10-11T14:00:00.000Z"));
    const errors = [];
    const requests = [];
    const api = {
      status: options.apiStatus || 200,
      revision: 0,
      hold: null,
      mode: options.mode || "normal",
      completed: [],
    };
    if (options.holdInitial)
      api.hold = new Promise((resolve) => {
        api.release = resolve;
      });
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/users?*", async (route) => {
      const params = new URL(route.request().url()).searchParams;
      requests.push(params.toString());
      const status = api.status;
      const body =
        status >= 400
          ? {
              success: false,
              error: {
                message: "Erreur simulée",
                code: status === 403 ? "FORBIDDEN" : "INTERNAL_ERROR",
              },
            }
          : {
              success: true,
              data: response(
                params,
                { ...options, mode: api.mode },
                api.revision,
              ),
            };
      if (api.hold) await api.hold;
      await route.fulfill({
        status,
        contentType: "application/json",
        body: api.nonJson ? "Réponse simulée non JSON" : JSON.stringify(body),
      });
      api.completed.push(params.toString());
    });
    try {
      await page.goto(
        origin +
          "/systeme/utilisateurs" +
          (options.query ? "?" + options.query : ""),
      );
      const details = await fn(page, api, requests);
      assert.deepEqual(errors, []);
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
        "horizontal page overflow",
      );
      observations.push({ name, width, result: "passed", requests, details });
      console.log(`${width} ${name}: passed`);
    } catch (error) {
      if (errors.length) console.error("Browser errors:", errors);
      observations.push({
        name,
        width,
        result: "failed",
        error: error.message,
        requests,
      });
      await page.screenshot({
        path: path.join(work, `${name}-${width}-failed.png`),
        fullPage: true,
      });
      throw error;
    } finally {
      await context.close();
    }
  }
  const search = (page) =>
    page.getByRole("searchbox", { name: /^Rechercher par nom/ });
  const quickFilters = (page) =>
    page.locator('[role="group"][aria-label^="Filtrer par"]');
  const quickFilter = (page, label) =>
    quickFilters(page).getByRole("button", {
      name: new RegExp("^" + label + "(, .+ comptes?)?$"),
    });
  const results = (page) =>
    page.locator('[aria-label="Résultats des utilisateurs"]');
  const links = (page) => results(page).locator("a:visible");
  const loaded = async (page) => {
    await expect(search(page)).toBeVisible();
    await expect(results(page)).toHaveAttribute("aria-busy", "false");
  };
  async function selectOption(page, label, option) {
    await page.getByRole("combobox", { name: label }).click();
    await page.getByRole("option", { name: option, exact: true }).click();
  }
  try {
    for (const width of [320, 390, 768, 1440, 1920]) {
      await run("presentation-and-a11y", width, async (page) => {
        await loaded(page);
        await expect(links(page)).toHaveCount(3);
        await expect(
          page.getByRole("heading", { name: "Utilisateurs", exact: true }),
        ).toBeVisible();
        await expect(links(page).first()).toHaveAttribute(
          "href",
          /\/mon-compte\?returnTo=/,
        );
        await expect(search(page)).toHaveAttribute("autocomplete", "off");
        await expect(search(page)).toHaveAttribute("data-bwignore", "true");
        await links(page).first().focus();
        await expect(links(page).first()).toBeFocused();
        const active = await links(page)
          .first()
          .evaluate((el) => ({
            outline: getComputedStyle(el).outlineStyle,
            ring: getComputedStyle(el.closest("tr") ?? el).boxShadow,
          }));
        assert.equal(active.outline, "none", "double focus ring");
        assert.notEqual(active.ring, "none", "focus ring missing");
        await expect(results(page)).toContainText("Il y a 2 h");
        const snapshot = await results(page).ariaSnapshot();
        assert(snapshot.includes("Identité protégée"));
        assert(!snapshot.includes("Avatar de"));
        await expect(
          page.getByRole("complementary", { name: "Vue d’ensemble" }),
        ).toHaveCount(0);
        await expect(quickFilter(page, "Tous")).toHaveText("Tous3");
        await expect(quickFilter(page, "Tous")).toHaveAccessibleName(
          "Tous, 3 comptes",
        );
        await expect(quickFilter(page, "Tous")).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        await expect(quickFilter(page, "Administrateurs")).toHaveAccessibleName(
          "Administrateurs, 1 compte",
        );
        await expect(page.getByRole("combobox")).toHaveCount(1);
        await expect(page.getByText("par page")).toHaveCount(0);
        const filtersSnapshot = await quickFilters(page)
          .evaluateAll((groups) => groups.map((g) => g.textContent));
        if ([390, 1440, 1920].includes(width))
          await page.screenshot({
            path: path.join(work, `users-${width}.png`),
            fullPage: true,
          });
        return {
          accessibility: snapshot,
          quickFilters: filtersSnapshot,
        };
      });
      await run(
        "filters-and-reset-focus",
        width,
        async (page, api, requests) => {
          await loaded(page);
          await search(page).fill("Camille");
          await expect(links(page)).toHaveCount(1);
          await page
            .getByRole("button", { name: "Effacer la recherche", exact: true })
            .click();
          await expect(search(page)).toBeFocused();
          await expect(links(page)).toHaveCount(3);
          await quickFilter(page, "Désactivés").click();
          await expect(links(page)).toHaveCount(1);
          await expect(quickFilter(page, "Désactivés")).toHaveAttribute(
            "aria-pressed",
            "true",
          );
          await expect(quickFilter(page, "Désactivés")).toBeFocused();
          await quickFilter(page, "Tous").click();
          await expect(links(page)).toHaveCount(3);
          await quickFilter(page, "Administrateurs").click();
          await expect(links(page)).toHaveCount(1);
          await expect(quickFilter(page, "Administrateurs")).toHaveAttribute(
            "aria-pressed",
            "true",
          );
          // Un rôle est un interrupteur : le second appui le retire.
          await quickFilter(page, "Administrateurs").click();
          await expect(links(page)).toHaveCount(3);
          await expect(quickFilter(page, "Administrateurs")).toHaveAttribute(
            "aria-pressed",
            "false",
          );
          await selectOption(
            page,
            "Trier les comptes utilisateurs",
            "Dernière connexion",
          );
          await page
            .getByRole("button", {
              name: "Réinitialiser les filtres",
              exact: true,
            })
            .click();
          await expect(search(page)).toBeFocused();
          await expect(links(page)).toHaveCount(3);
          assert.equal(
            requests.filter(
              (q) => new URLSearchParams(q).get("status") === "inactive",
            ).length,
            1,
          );
        },
      );
      await run(
        "long-values-large-counts",
        width,
        async (page) => {
          await loaded(page);
          await expect(links(page)).toHaveCount(4);
          await expect(quickFilter(page, "Tous")).toHaveText(
            /^Tous123\s?456\s?789$/,
          );
          const overflowing = await quickFilters(page)
            .locator("*")
            .evaluateAll((elements) =>
              elements
                .filter(
                  (el) =>
                    el.scrollWidth > el.clientWidth + 1 &&
                    el.clientWidth > 0 &&
                    getComputedStyle(el).overflowX === "visible",
                )
                .map((el) => ({ tag: el.tagName, text: el.textContent })),
            );
          assert.deepEqual(overflowing, []);
          if (width === 320)
            await page.screenshot({
              path: path.join(work, "users-long-320.png"),
              fullPage: true,
            });
        },
        { mode: "long" },
      );
    }
    for (const width of [320, 1440]) {
      await run("empty-reset-focus", width, async (page) => {
        await loaded(page);
        await search(page).fill("Introuvable");
        await expect(links(page)).toHaveCount(0);
        const reset = page
          .getByRole("button", { name: "Réinitialiser", exact: true })
          .locator("visible=true");
        await reset.click();
        await expect(search(page)).toBeFocused();
        await expect(links(page)).toHaveCount(3);
        await expect(search(page)).toBeFocused();
      });
      await run("keyboard-select-and-escape", width, async (page) => {
        await loaded(page);
        await quickFilter(page, "Désactivés").focus();
        await page.keyboard.press("Tab");
        await expect(quickFilter(page, "Mot de passe à changer")).toBeFocused();
        await page.keyboard.press("Space");
        await expect(links(page)).toHaveCount(1);
        await expect(quickFilter(page, "Mot de passe à changer")).toBeFocused();
        await expect(
          quickFilter(page, "Mot de passe à changer"),
        ).toHaveAttribute("aria-pressed", "true");
        const trigger = page.getByRole("combobox", {
          name: "Trier les comptes utilisateurs",
        });
        await trigger.focus();
        await page.keyboard.press("Space");
        await expect(
          page.getByRole("option", { name: "Nom (A–Z)", exact: true }),
        ).toBeFocused();
        await page.keyboard.press("End");
        await expect(
          page.getByRole("option", { name: "Date de création", exact: true }),
        ).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(trigger).toBeFocused();
        await expect(trigger).toContainText("Date de création");
        await expect(links(page)).toHaveCount(1);
        await page.keyboard.press("Space");
        await expect(page.getByRole("listbox")).toBeVisible();
        await page.keyboard.press("Escape");
        await expect(page.getByRole("listbox")).toHaveCount(0);
        await expect(trigger).toBeFocused();
      });
      await run(
        "forced-colors-focus",
        width,
        async (page) => {
          await loaded(page);
          await links(page).first().focus();
          const ring = await links(page)
            .first()
            .evaluate((el) => ({
              style: getComputedStyle(el).outlineStyle,
              width: getComputedStyle(el).outlineWidth,
            }));
          assert.equal(ring.style, "solid");
          assert(Number.parseFloat(ring.width) >= 2);
          if (width === 320)
            await page.screenshot({
              path: path.join(work, "users-forced-colors-320.png"),
              fullPage: true,
            });
        },
        { browser: { forcedColors: "active" } },
      );
    }
    await run(
      "quick-filters-combine",
      390,
      async (page) => {
        await loaded(page);
        await expect(links(page)).toHaveCount(1);
        await expect(quickFilter(page, "Actifs")).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        await expect(quickFilter(page, "Utilisateurs")).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        // Compteurs à facettes : recherche et autre dimension appliquées, ils
        // restent affichés et les boutons ne se déplacent pas.
        await expect(quickFilter(page, "Tous")).toHaveText("Tous1");
        await expect(quickFilter(page, "Désactivés")).toHaveText("Désactivés0");
        await expect(quickFilter(page, "Superadmin")).toHaveText("Superadmin0");
        await expect(quickFilter(page, "Utilisateurs")).toHaveText(
          "Utilisateurs1",
        );
        const before = await quickFilter(page, "Superadmin").boundingBox();
        await quickFilter(page, "Utilisateurs").click();
        await expect(quickFilter(page, "Utilisateurs")).toHaveAttribute(
          "aria-pressed",
          "false",
        );
        await expect(results(page)).toHaveAttribute("aria-busy", "false");
        const after = await quickFilter(page, "Superadmin").boundingBox();
        assert.deepEqual(after, before, "quick filters moved");
        await expect
          .poll(() => new URL(page.url()).searchParams.get("role"))
          .toBe(null);
        await expect(search(page)).toHaveValue("Camille");
        await expect
          .poll(() => new URL(page.url()).searchParams.get("status"))
          .toBe("active");
        await expect(quickFilter(page, "Utilisateurs")).toHaveAttribute(
          "aria-pressed",
          "false",
        );
        await expect(links(page)).toHaveCount(1);
      },
      { query: "search=Camille&status=active&role=USER&sort=recent" },
    );
    for (const columns of ["base", "contact", "security", "all"]) {
      await run(
        `columns-${columns}`,
        1100,
        async (page) => {
          await loaded(page);
          await expect(links(page)).toHaveCount(3);
          const table = page.getByRole("table", {
            name: "Comptes utilisateurs",
          });
          if (columns === "base") await expect(table).toBeVisible();
          else await expect(table).toHaveCount(0);
          if (columns === "base" || columns === "security") {
            await expect(search(page)).toHaveAccessibleName(
              "Rechercher par nom ou identifiant",
            );
            await expect(search(page)).toHaveAttribute(
              "placeholder",
              "Nom ou identifiant…",
            );
            await expect(
              page
                .getByText("camille@example.test", { exact: false })
                .locator("visible=true"),
            ).toHaveCount(0);
          } else
            await expect(
              page
                .getByText("camille@example.test", { exact: false })
                .locator("visible=true"),
            ).toBeVisible();
          const security = columns === "all" || columns === "security";
          await expect(quickFilter(page, "Mot de passe à changer")).toHaveCount(
            security ? 1 : 0,
          );
          await page.setViewportSize({ width: 1440, height: 1000 });
          await expect(
            page.getByRole("table", { name: "Comptes utilisateurs" }),
          ).toBeVisible();
          await expect(
            page.getByRole("columnheader", { name: "Email", exact: true }),
          ).toHaveCount(columns === "all" || columns === "contact" ? 1 : 0);
          await expect(
            page.getByRole("columnheader", {
              name: "Mot de passe",
              exact: true,
            }),
          ).toHaveCount(security ? 1 : 0);
        },
        { columns },
      );
    }
    await run(
      "initial-error-retry-focus",
      390,
      async (page, api, requests) => {
        const retry = page.getByRole("button", {
          name: "Réessayer",
          exact: true,
        });
        await expect(retry).toBeVisible();
        await retry.click();
        await expect.poll(() => requests.length).toBe(2);
        await expect(retry).toBeFocused();
        api.status = 200;
        await retry.click();
        await expect(links(page)).toHaveCount(3);
        await expect(results(page)).toBeFocused();
      },
      { apiStatus: 500 },
    );
    await run(
      "pagination-delay-error-retry-back",
      390,
      async (page, api, requests) => {
        await loaded(page);
        await expect(links(page)).toHaveCount(25);
        const firstReturnTo = async () =>
          new URL(
            await links(page).first().getAttribute("href"),
            page.url(),
          ).searchParams.get("returnTo");
        const pagination = page.getByRole("navigation", {
          name: "Pagination des utilisateurs",
        });
        let release;
        api.hold = new Promise((resolve) => {
          release = resolve;
        });
        api.status = 500;
        await page
          .getByRole("button", { name: "Page suivante", exact: true })
          .click();
        await expect.poll(() => requests.length).toBe(2);
        await expect(pagination).toContainText("Page 1 sur 2");
        await expect(links(page)).toHaveCount(25);
        await expect(
          page.getByRole("button", { name: "Page suivante", exact: true }),
        ).toBeDisabled();
        try {
          assert.equal(
            await firstReturnTo(),
            "/systeme/utilisateurs",
            "retained page 1 row must return to displayed page 1 while page 2 loads",
          );
        } finally {
          api.hold = null;
          release();
        }
        await expect(
          page.getByRole("button", { name: "Réessayer", exact: true }),
        ).toBeVisible();
        await expect(pagination).toContainText("Page 1 sur 2");
        assert.equal(
          await firstReturnTo(),
          "/systeme/utilisateurs",
          "retained page 1 row must return to displayed page 1 after page 2 failed",
        );
        api.status = 200;
        await page
          .getByRole("button", { name: "Réessayer", exact: true })
          .click();
        await expect(links(page)).toHaveCount(22);
        await expect(pagination).toContainText("Page 2 sur 2");
        assert.equal(await firstReturnTo(), "/systeme/utilisateurs?page=2");
        await expect(results(page)).toBeFocused();
        await page.goBack();
        await expect(links(page)).toHaveCount(25);
        await expect(pagination).toContainText("Page 1 sur 2");
      },
      { mode: "paginated" },
    );
    await run(
      "pagination-error-filter-keeps-focus",
      390,
      async (page, api) => {
        await loaded(page);
        api.status = 500;
        await page
          .getByRole("button", { name: "Page suivante", exact: true })
          .click();
        await expect(
          page.getByRole("button", { name: "Réessayer", exact: true }),
        ).toBeVisible();
        api.status = 200;
        await search(page).fill("Compte 01");
        await expect(links(page)).toHaveCount(1);
        await expect(search(page)).toBeFocused();
      },
      { mode: "paginated" },
    );
    for (const status of [401, 403])
      for (const nonJson of [false, true]) {
        await run(
          `access-${status}-${nonJson ? "text" : "json"}-purges`,
          390,
          async (page, api) => {
            await loaded(page);
            api.status = status;
            api.nonJson = nonJson;
            await search(page).fill("Camille");
            await expect(
              page.getByRole("button", { name: "Réessayer", exact: true }),
            ).toBeVisible();
            await expect(links(page)).toHaveCount(0);
            await expect(quickFilters(page).first()).not.toContainText(/\d/);
            await expect(quickFilters(page).last()).not.toContainText(/\d/);
          },
        );
      }
    await run(
      "slow-response-keeps-newer-search",
      390,
      async (page, api, requests) => {
        await loaded(page);
        let release;
        api.hold = new Promise((resolve) => {
          release = resolve;
        });
        await search(page).fill("Camille");
        await expect
          .poll(() =>
            requests.some(
              (q) => new URLSearchParams(q).get("search") === "Camille",
            ),
          )
          .toBe(true);
        api.hold = null;
        await search(page).fill("Zoé");
        await expect(links(page)).toHaveCount(1);
        await expect(links(page)).toContainText("Zoé Martin");
        release();
        await expect
          .poll(() =>
            api.completed.some(
              (q) => new URLSearchParams(q).get("search") === "Camille",
            ),
          )
          .toBe(true);
        await expect(links(page)).toContainText("Zoé Martin");
        await expect(search(page)).toHaveValue("Zoé");
        assert.equal(requests.length, 3);
      },
    );
    await run(
      "forbidden-pending-normalization",
      390,
      async (page, api, requests) => {
        await loaded(page);
        await expect(links(page)).toHaveCount(3);
        await expect.poll(() => new URL(page.url()).search).toBe("");
        assert(
          requests.every(
            (q) =>
              !new URLSearchParams(q).has("status") &&
              new URLSearchParams(q).get("page") === "1",
          ),
        );
        await page.evaluate(() =>
          history.pushState(
            null,
            "",
            "/systeme/utilisateurs?status=all&sort=invalid",
          ),
        );
        await expect.poll(() => new URL(page.url()).search).toBe("");
        await expect(links(page)).toHaveCount(3);
      },
      { columns: "base", query: "page=999&status=pending" },
    );
    await run(
      "read-only-empty",
      390,
      async (page) => {
        await loaded(page);
        await expect(
          page
            .getByText("Aucun utilisateur trouvé", { exact: true })
            .locator("visible=true"),
        ).toBeVisible();
        await expect(
          page.getByRole("link", { name: "Nouvel utilisateur", exact: true }),
        ).toHaveCount(0);
      },
      { mode: "empty", readOnly: true, columns: "base" },
    );
    await run(
      "access-denied",
      390,
      async (page, api, requests) => {
        await expect(
          page.getByText(
            "Vous n'avez pas la permission de consulter les utilisateurs.",
            { exact: true },
          ),
        ).toBeVisible();
        await expect(search(page)).toHaveCount(0);
        assert.deepEqual(requests, []);
      },
      { noAccess: true },
    );
    await run(
      "back-during-debounce",
      390,
      async (page, api, requests) => {
        await loaded(page);
        await expect(links(page)).toHaveCount(1);
        await page.evaluate(() =>
          history.pushState(null, "", "/systeme/utilisateurs"),
        );
        await expect(links(page)).toHaveCount(3);
        await search(page).fill("Camille");
        await page.goBack();
        await expect(search(page)).toHaveValue("Zoé");
        await expect(links(page)).toHaveCount(1);
        await expect(links(page)).toContainText("Zoé Martin");
        assert(
          !requests.some(
            (q) => new URLSearchParams(q).get("search") === "Camille",
          ),
        );
      },
      { query: "search=Zo%C3%A9" },
    );
    await run(
      "filter-before-debounce-uses-draft",
      390,
      async (page, api, requests) => {
        await loaded(page);
        await search(page).fill("Camille");
        await quickFilter(page, "Utilisateurs").click();
        await expect(links(page)).toHaveCount(1);
        await expect
          .poll(() => new URL(page.url()).searchParams.get("search"))
          .toBe("Camille");
        const filtered = requests.filter(
          (q) => new URLSearchParams(q).get("role") === "USER",
        );
        assert.equal(filtered.length, 1);
        assert.equal(new URLSearchParams(filtered[0]).get("search"), "Camille");
      },
    );
    await run(
      "typing-during-retry-keeps-focus",
      390,
      async (page, api, requests) => {
        await loaded(page);
        api.status = 500;
        await page
          .getByRole("button", { name: "Page suivante", exact: true })
          .click();
        const retry = page.getByRole("button", {
          name: "Réessayer",
          exact: true,
        });
        await expect(retry).toBeVisible();
        api.status = 200;
        let release;
        api.hold = new Promise((resolve) => {
          release = resolve;
        });
        await retry.click();
        await expect.poll(() => requests.length).toBe(3);
        await search(page).fill("Compte 01");
        api.hold = null;
        release();
        await expect.poll(() => api.completed.length).toBeGreaterThanOrEqual(3);
        await expect(search(page)).toBeFocused();
        await expect(links(page)).toHaveCount(1);
        await expect(search(page)).toBeFocused();
      },
      { mode: "paginated" },
    );
    await run(
      "loading-announcements",
      320,
      async (page, api) => {
        await expect(
          page.getByRole("status", { name: "Chargement", exact: true }),
        ).toBeVisible();
        await expect(results(page)).toHaveAttribute("aria-busy", "true");
        await expect(quickFilter(page, "Tous")).toHaveText("Tous");
        await expect(links(page)).toHaveCount(0);
        await page.screenshot({
          path: path.join(work, "users-loading-320.png"),
          fullPage: true,
        });
        api.hold = null;
        api.release();
        await expect(links(page)).toHaveCount(3);
      },
      { holdInitial: true },
    );
    await run("native-modified-links", 1440, async (page) => {
      await loaded(page);
      const link = links(page).first();
      for (const key of ["ctrlKey", "metaKey", "shiftKey", "altKey"]) {
        const prevented = await link.evaluate((el, key) => {
          let prevented;
          window.addEventListener(
            "click",
            (event) => {
              prevented = event.defaultPrevented;
              event.preventDefault();
            },
            { once: true },
          );
          el.dispatchEvent(
            new MouseEvent("click", {
              bubbles: true,
              cancelable: true,
              [key]: true,
            }),
          );
          return prevented;
        }, key);
        assert.equal(prevented, false);
      }
    });
  } finally {
    fs.writeFileSync(
      path.join(work, "observations.json"),
      JSON.stringify(
        {
          date: "2026-10-20",
          browser: browser.version(),
          environment:
            "Real Users page components and CSS; API, router, actor and 240 px shell simulated; Arial; Europe/Paris; reduced motion; fixed Date 2026-10-11 14:00Z",
          scenarios: observations,
        },
        null,
        2,
      ),
    );
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
