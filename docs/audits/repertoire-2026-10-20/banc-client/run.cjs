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
const work = fs.mkdtempSync(
  path.join(os.tmpdir(), "noctambule-directory-client-"),
);
console.log("Résultats : " + work);

async function main() {
  const mock = JSON.stringify(path.join(__dirname, "mocks.tsx"));
  const aliases = {
    "$context/UserContext": `export {useUser} from ${mock};`,
    "$context/FeatureAvailabilityContext": `export {useFeatureAvailability} from ${mock};`,
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
        name: "isolated-directory-context",
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
    const errors = [];
    const requests = [];
    const api = {
      status: options.apiStatus || 200,
      revision: 0,
      hold: null,
      mode: options.mode || "normal",
      completed: [],
    };
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/personnes?*", async (route) => {
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
          : { success: true, data: response(params, api.mode, api.revision) };
      if (api.hold) await api.hold;
      await route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
      api.completed.push(params.toString());
    });
    try {
      await page.goto(
        origin +
          "/membres/repertoire" +
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
    page.getByRole("searchbox", { name: /^Rechercher par pseudo/ });
  const quickFilters = (page) =>
    page.getByRole("group", { name: "Filtres rapides" });
  const quickFilter = (page, label) =>
    quickFilters(page).getByRole("button", {
      name: new RegExp("^" + label + "(, .+ fiches?)?$"),
    });
  const loaded = async (page) => {
    await expect(search(page)).toBeVisible();
    await expect(
      page.locator('[aria-label="Résultats du répertoire"]'),
    ).toHaveAttribute("aria-busy", "false");
  };
  const renderedLinks = (page) =>
    page.locator('[aria-label="Résultats du répertoire"] a:visible');
  async function selectOption(page, label, option) {
    await page.getByRole("combobox", { name: label }).click();
    await page
      .locator('[data-slot="select-content"]')
      .getByRole("option", { name: option, exact: true })
      .click();
    await loaded(page);
  }
  try {
    for (const width of [320, 390, 768, 1440, 1920]) {
      await run("presentation-and-keyboard", width, async (page) => {
        await loaded(page);
        await expect(
          page.getByRole("heading", { name: "Répertoire", exact: true }),
        ).toBeVisible();
        await expect(
          page.getByRole("complementary", { name: "Vue d’ensemble" }),
        ).toHaveCount(0);
        await expect(quickFilters(page)).toBeVisible();
        await expect(quickFilter(page, "Tous")).toHaveText("Tous3");
        await expect(quickFilter(page, "Tous")).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        await expect(quickFilter(page, "Hors structure")).toHaveAttribute(
          "aria-pressed",
          "false",
        );
        await expect(quickFilter(page, "Sans coordonnées")).toHaveText(
          "Sans coordonnées1",
        );
        await expect(
          page.getByRole("combobox", { name: "Filtrer par statut" }),
        ).toHaveCount(0);
        await expect(renderedLinks(page)).toHaveCount(3);
        await expect(
          page.getByRole("status").filter({ hasText: "3 fiches trouvées" }),
        ).toBeVisible();
        await expect(renderedLinks(page).first()).toHaveAttribute(
          "href",
          /fiche-camille\?returnTo=/,
        );
        const contactText = await page
          .locator('[aria-label="Résultats du répertoire"]')
          .ariaSnapshot();
        assert(
          contactText.includes("1 email") &&
            contactText.includes("0 téléphone") &&
            contactText.includes("2 profils sociaux"),
        );
        assert(contactText.includes("Aucune coordonnée"));
        await expect(search(page)).toHaveAttribute("autocomplete", "off");
        await expect(search(page)).toHaveAttribute("data-bwignore", "true");
        await renderedLinks(page).first().focus();
        await expect(renderedLinks(page).first()).toBeFocused();
        // Un seul anneau : celui de la ligne en tableau, celui de la carte en mobile.
        const active = await renderedLinks(page)
          .first()
          .evaluate((el) => ({
            outline: getComputedStyle(el).outlineStyle,
            ring: getComputedStyle(el.closest("tr") ?? el).boxShadow,
          }));
        assert.equal(active.outline, "none", "double focus ring");
        assert.notEqual(active.ring, "none", "focus ring missing");
        if (width >= 1440) {
          const date = page.locator('table [tabindex="0"]').first();
          await date.focus();
          await expect(page.getByRole("tooltip")).toContainText("Alex Exemple");
          await page.keyboard.press("Escape");
          await expect(page.getByRole("tooltip")).toHaveCount(0);
          await expect(date).toBeFocused();
          await expect(date.locator("time")).toHaveAttribute(
            "datetime",
            "2026-10-11T10:30:00.000Z",
          );
          await expect(date).toContainText("12:30");
        } else {
          await expect(renderedLinks(page).first()).toContainText(
            "Par Alex Exemple (alex.exemple)",
          );
          await expect(renderedLinks(page).first()).not.toContainText(
            "coordonnées",
          );
        }
        if ([390, 1440, 1920].includes(width))
          await page.screenshot({
            path: path.join(work, `directory-${width}.png`),
            fullPage: true,
          });
        return {
          quickFiltersAccessibility: await quickFilters(page).ariaSnapshot(),
          firstRowAccessibility: await renderedLinks(page)
            .first()
            .ariaSnapshot(),
          computedFont: await renderedLinks(page)
            .first()
            .evaluate((el) => ({
              link: getComputedStyle(el).fontFamily,
              body: getComputedStyle(document.body).fontFamily,
            })),
        };
      });
      await run(
        "filters-and-reset-focus",
        width,
        async (page, api, requests) => {
          await loaded(page);
          await search(page).fill("Camille");
          await expect
            .poll(() => new URL(page.url()).searchParams.get("q"))
            .toBe("Camille");
          await loaded(page);
          await expect(renderedLinks(page)).toHaveCount(1);
          await page
            .getByRole("button", { name: "Effacer la recherche", exact: true })
            .click();
          await expect(search(page)).toBeFocused();
          await expect
            .poll(() => new URL(page.url()).searchParams.has("q"))
            .toBe(false);
          await loaded(page);
          await expect(renderedLinks(page)).toHaveCount(3);
          await quickFilter(page, "Hors structure").click();
          await loaded(page);
          await expect(renderedLinks(page)).toHaveCount(1);
          await expect(quickFilter(page, "Hors structure")).toHaveAttribute(
            "aria-pressed",
            "true",
          );
          await expect(quickFilter(page, "Hors structure")).toBeFocused();
          await selectOption(
            page,
            "Trier le répertoire",
            "Modifiées récemment",
          );
          await expect
            .poll(() => new URL(page.url()).searchParams.get("sort"))
            .toBe("updated");
          await page
            .getByRole("button", {
              name: "Réinitialiser les filtres",
              exact: true,
            })
            .click();
          await expect(search(page)).toBeFocused();
          await loaded(page);
          await expect(renderedLinks(page)).toHaveCount(3);
          await expect(
            page.getByRole("button", {
              name: "Réinitialiser les filtres",
              exact: true,
            }),
          ).toHaveCount(0);
          assert.equal(
            requests.filter(
              (query) =>
                new URLSearchParams(query).get("structureStatus") ===
                  "OUTSIDE_STRUCTURE" &&
                !new URLSearchParams(query).has("sort"),
            ).length,
            1,
            "duplicate status request",
          );
        },
      );
      await run("quick-filter-and-empty", width, async (page) => {
        await loaded(page);
        await quickFilter(page, "Sans coordonnées").click();
        await loaded(page);
        await expect(renderedLinks(page)).toHaveCount(1);
        await expect(renderedLinks(page)).toContainText("Fiche sans nom");
        await expect(quickFilter(page, "Sans coordonnées")).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        // Statut combiné au filtre : son compte de tout le répertoire disparaît.
        await expect(quickFilter(page, "Tous")).toHaveText("Tous");
        await expect(quickFilter(page, "Sans coordonnées")).toHaveText(
          "Sans coordonnées1",
        );
        await quickFilter(page, "Sans coordonnées").click();
        await expect(quickFilter(page, "Sans coordonnées")).toBeFocused();
        await loaded(page);
        await expect(renderedLinks(page)).toHaveCount(3);
        await expect(quickFilter(page, "Sans coordonnées")).toHaveAttribute(
          "aria-pressed",
          "false",
        );
        await search(page).fill("Introuvable");
        await expect
          .poll(() => new URL(page.url()).searchParams.get("q"))
          .toBe("Introuvable");
        await loaded(page);
        await expect(
          page
            .getByText("Aucune fiche trouvée", { exact: true })
            .locator("visible=true"),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Réinitialiser", exact: true }),
        ).toBeVisible();
        await expect(quickFilters(page)).not.toContainText(/[0-9]/);
        await page
          .getByRole("button", { name: "Réinitialiser", exact: true })
          .click();
        await expect(search(page)).toBeFocused();
        await expect(renderedLinks(page)).toHaveCount(3);
        await expect(search(page)).toBeFocused();
      });
      await run(
        "long-values-and-large-counts",
        width,
        async (page) => {
          await loaded(page);
          await expect(renderedLinks(page)).toHaveCount(4);
          await expect(quickFilter(page, "Tous")).toHaveText(
            /^Tous123\s?456\s?789$/,
          );
          const overflows = await quickFilters(page)
            .locator("*")
            .evaluateAll((elements) =>
              elements
                .filter(
                  (el) =>
                    el.scrollWidth > el.clientWidth + 1 &&
                    getComputedStyle(el).overflowX === "visible" &&
                    el.clientWidth > 0,
                )
                .map((el) => ({
                  tag: el.tagName,
                  text: el.textContent,
                  width: el.clientWidth,
                  scroll: el.scrollWidth,
                })),
            );
          assert.deepEqual(
            overflows,
            [],
            "quick filters contain overflowing content",
          );
          if (width === 320)
            await page.screenshot({
              path: path.join(work, "directory-long-320.png"),
              fullPage: true,
            });
        },
        { mode: "long" },
      );
    }
    await run(
      "initial-loading",
      320,
      async (page) => {
        await expect(
          page.getByRole("status", { name: "Chargement du répertoire" }),
        ).toBeVisible();
        await expect(page.getByRole("link")).toHaveCount(0);
        await page.screenshot({
          path: path.join(work, "directory-loading-320.png"),
          fullPage: true,
        });
      },
      { featureLoading: true },
    );
    await run(
      "global-empty",
      390,
      async (page) => {
        await loaded(page);
        await expect(
          page
            .getByText("Répertoire vide", { exact: true })
            .locator("visible=true"),
        ).toBeVisible();
        await expect(
          page.getByRole("link", { name: "Ajouter une fiche" }),
        ).toHaveCount(2);
        await expect(
          page.getByRole("button", { name: "Page suivante" }),
        ).toBeDisabled();
      },
      { mode: "empty" },
    );
    await run(
      "feature-unavailable",
      390,
      async (page) => {
        await expect(
          page.getByText("Répertoire temporairement indisponible"),
        ).toBeVisible();
        await expect(
          page.getByRole("button", { name: "Revérifier" }),
        ).toBeVisible();
        await expect(search(page)).toHaveCount(0);
      },
      { featureUnavailable: true },
    );
    await run("native-modified-links", 1440, async (page) => {
      await loaded(page);
      const link = renderedLinks(page).first();
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
          const event = new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            [key]: true,
          });
          el.dispatchEvent(event);
          return prevented;
        }, key);
        assert.equal(prevented, false);
      }
    });
    await run(
      "initial-data-refresh-after-search",
      390,
      async (page, api, requests) => {
        await loaded(page);
        await expect(renderedLinks(page)).toHaveCount(3);
        assert.deepEqual(
          requests,
          [],
          "initial data should avoid the first API request",
        );
        api.revision = 1;
        await search(page).fill("Camille");
        await expect(renderedLinks(page)).toHaveCount(1);
        await expect(renderedLinks(page)).toContainText("VersionActualisée");
        await page
          .getByRole("button", { name: "Effacer la recherche", exact: true })
          .click();
        await expect(renderedLinks(page)).toHaveCount(3);
        await expect(renderedLinks(page).first()).toContainText(
          "VersionActualisée",
        );
        assert.equal(
          requests.length,
          2,
          "one request per search change, no reuse of old initial data",
        );
      },
      { initial: true },
    );
    for (const status of [401, 403]) {
      await run(`access-${status}-purges-data`, 390, async (page, api) => {
        await loaded(page);
        await expect(renderedLinks(page)).toHaveCount(3);
        api.status = status;
        await search(page).fill("Camille");
        await expect(
          page.getByText("Chargement impossible", { exact: true }),
        ).toBeVisible();
        await expect(renderedLinks(page)).toHaveCount(0);
        await expect(quickFilters(page)).not.toContainText(/[0-9]/);
        await expect(
          page.getByText("CamilleJeu · Camille Exemple", { exact: true }),
        ).toHaveCount(0);
      });
    }
    await run(
      "pagination-error-then-filter-keeps-focus",
      390,
      async (page, api) => {
        await loaded(page);
        await expect(renderedLinks(page)).toHaveCount(25);
        api.status = 500;
        await page
          .getByRole("button", { name: "Page suivante", exact: true })
          .click();
        await expect(
          page.getByText("Actualisation impossible", { exact: true }),
        ).toBeVisible();
        api.status = 200;
        await search(page).fill("Personne 01");
        await expect(renderedLinks(page)).toHaveCount(1);
        await expect(search(page)).toBeFocused();
        await expect(
          page.getByText("Actualisation impossible", { exact: true }),
        ).toHaveCount(0);
      },
      { mode: "paginated" },
    );
    await run(
      "slow-search-preserves-newer-draft",
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
              (query) => new URLSearchParams(query).get("q") === "Camille",
            ),
          )
          .toBe(true);
        await search(page).fill("Zoé");
        api.hold = null;
        release();
        await expect(search(page)).toHaveValue("Zoé");
        await expect
          .poll(() => new URL(page.url()).searchParams.get("q"))
          .toBe("Zoé");
        await expect(renderedLinks(page)).toHaveCount(1);
        await expect(renderedLinks(page)).toContainText("Zoé Martin");
        await expect(search(page)).toHaveValue("Zoé");
        assert.equal(
          requests.filter(
            (query) => new URLSearchParams(query).get("q") === "Zoé",
          ).length,
          1,
        );
      },
    );
    await run("contact-search-discloses-match-reason", 1440, async (page) => {
      await loaded(page);
      await search(page).fill("contact");
      await expect(renderedLinks(page)).toHaveCount(1);
      await expect(
        page
          .getByText("Trouvée par email, téléphone ou réseau")
          .locator("visible=true"),
      ).toBeVisible();
    });
    await run(
      "slow-response-cannot-replace-newer-results",
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
              (query) => new URLSearchParams(query).get("q") === "Camille",
            ),
          )
          .toBe(true);
        api.hold = null;
        await search(page).fill("Zoé");
        await expect(renderedLinks(page)).toHaveCount(1);
        await expect(renderedLinks(page)).toContainText("Zoé Martin");
        release();
        await expect
          .poll(() =>
            api.completed.some(
              (query) => new URLSearchParams(query).get("q") === "Camille",
            ),
          )
          .toBe(true);
        await expect(renderedLinks(page)).toHaveCount(1);
        await expect(renderedLinks(page)).toContainText("Zoé Martin");
        await expect(search(page)).toHaveValue("Zoé");
        assert.equal(
          requests.length,
          3,
          "initial + A + B, without duplicate API requests",
        );
      },
    );
    await run(
      "delayed-url-preserves-newer-draft",
      390,
      async (page, api, requests) => {
        await loaded(page);
        await page.evaluate(() => {
          window.__auditHoldNavigation = true;
        });
        await search(page).fill("Camille");
        await expect
          .poll(() =>
            requests.some(
              (query) => new URLSearchParams(query).get("q") === "Camille",
            ),
          )
          .toBe(true);
        await expect
          .poll(() => new URL(page.url()).searchParams.get("q"))
          .toBe(null);
        await search(page).fill("Zoé");
        await page.evaluate(() => window.__auditReleaseNavigation());
        await expect(search(page)).toHaveValue("Zoé");
        await expect
          .poll(() => new URL(page.url()).searchParams.get("q"))
          .toBe("Zoé");
        await expect(renderedLinks(page)).toHaveCount(1);
        await expect(renderedLinks(page)).toContainText("Zoé Martin");
        await expect(search(page)).toHaveValue("Zoé");
        assert.equal(
          requests.length,
          3,
          "delayed URL synchronization must not duplicate API requests",
        );
      },
    );
    await run(
      "initial-error-retry",
      390,
      async (page, api) => {
        await expect(
          page.getByText("Chargement impossible", { exact: true }),
        ).toBeVisible();
        api.status = 200;
        await page
          .getByRole("button", { name: "Réessayer", exact: true })
          .click();
        await loaded(page);
        await expect(renderedLinks(page)).toHaveCount(3);
        await expect(
          page.locator('[aria-label="Résultats du répertoire"]'),
        ).toBeFocused();
      },
      { apiStatus: 500 },
    );
    await run(
      "initial-retry-error-then-success-focus",
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
        await expect(renderedLinks(page)).toHaveCount(3);
        await expect(
          page.locator('[aria-label="Résultats du répertoire"]'),
        ).toBeFocused();
      },
      { apiStatus: 500 },
    );
    await run(
      "refresh-retry-error-then-success-focus",
      390,
      async (page, api, requests) => {
        await loaded(page);
        api.status = 500;
        await search(page).fill("Camille");
        await expect(
          page.getByText("Actualisation impossible", { exact: true }),
        ).toBeVisible();
        const retry = page.getByRole("button", {
          name: "Réessayer",
          exact: true,
        });
        await retry.click();
        await expect.poll(() => requests.length).toBe(3);
        await expect(retry).toBeFocused();
        api.status = 200;
        await retry.click();
        await expect(renderedLinks(page)).toHaveCount(1);
        await expect(
          page.locator('[aria-label="Résultats du répertoire"]'),
        ).toBeFocused();
      },
    );
    for (const width of [320, 1440]) {
      await run("filters-keyboard-and-escape", width, async (page) => {
        await loaded(page);
        await quickFilter(page, "Dans la structure").focus();
        await page.keyboard.press("Tab");
        await expect(quickFilter(page, "Hors structure")).toBeFocused();
        await page.keyboard.press("Space");
        await loaded(page);
        await expect(renderedLinks(page)).toHaveCount(1);
        await expect(quickFilter(page, "Hors structure")).toBeFocused();
        await expect(quickFilter(page, "Hors structure")).toHaveAttribute(
          "aria-pressed",
          "true",
        );
        const trigger = page.getByRole("combobox", {
          name: "Trier le répertoire",
        });
        await trigger.focus();
        await page.keyboard.press("Space");
        await expect(page.getByRole("listbox")).toBeVisible();
        await expect(
          page.getByRole("option", { name: "Nom (A–Z)", exact: true }),
        ).toBeFocused();
        await page.keyboard.press("End");
        await expect(
          page.getByRole("option", { name: "Ajoutées récemment", exact: true }),
        ).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(trigger).toBeFocused();
        await expect(trigger).toContainText("Ajoutées récemment");
        await expect(renderedLinks(page)).toHaveCount(1);
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
          await renderedLinks(page).first().focus();
          const focus = await renderedLinks(page)
            .first()
            .evaluate((el) => ({
              style: getComputedStyle(el).outlineStyle,
              width: getComputedStyle(el).outlineWidth,
            }));
          assert.equal(focus.style, "solid");
          assert(
            Number.parseFloat(focus.width) >= 2,
            "forced-colors focus outline should remain visible",
          );
          if (width === 320)
            await page.screenshot({
              path: path.join(work, "directory-forced-colors-320.png"),
              fullPage: true,
            });
        },
        { browser: { forcedColors: "active" } },
      );
    }
    await run(
      "access-denied-client",
      390,
      async (page) => {
        await expect(
          page.getByText(
            "Vous n'avez pas la permission de consulter le répertoire.",
            { exact: true },
          ),
        ).toBeVisible();
        await expect(search(page)).toHaveCount(0);
        await expect(quickFilters(page)).toHaveCount(0);
        await expect(
          page.getByRole("link", { name: "Ajouter une fiche" }),
        ).toHaveCount(0);
      },
      { noAccess: true },
    );
    await run(
      "read-only-empty-client",
      390,
      async (page) => {
        await loaded(page);
        await expect(
          page
            .getByText("Répertoire vide", { exact: true })
            .locator("visible=true"),
        ).toBeVisible();
        await expect(
          page.getByRole("link", { name: "Ajouter une fiche" }),
        ).toHaveCount(0);
        await expect(
          page.getByRole("searchbox", { name: "Rechercher par pseudo ou nom" }),
        ).toBeVisible();
        await expect(quickFilter(page, "Sans coordonnées")).toHaveCount(0);
      },
      { readOnly: true, mode: "empty" },
    );
  } finally {
    fs.writeFileSync(
      path.join(work, "observations.json"),
      JSON.stringify(
        {
          date: "2026-10-20",
          browser: browser.version(),
          environment:
            "Chromium real page components/CSS with simulated API, router, session and 240 px desktop shell inset; fonts fall back to Arial; timezone Europe/Paris; reduced motion",
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
