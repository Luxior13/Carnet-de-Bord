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
  path.join(os.tmpdir(), "noctambule-roadmap-client-"),
);
const base = "/systeme/feuille-de-route";
console.log("Résultats : " + work);

async function main() {
  const mock = JSON.stringify(path.join(__dirname, "mocks.tsx"));
  const aliases = {
    "$components/AuthenticatedLayout": `export {AuthenticatedLayout as default} from ${mock};`,
    "next/navigation": `export {useRouter,usePathname,useSearchParams} from ${mock};`,
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
        name: "isolated-roadmap-context",
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
  const cards = (page) =>
    page.locator('[id^="roadmap-"]').filter({ has: page.locator("h3") });
  const search = (page) =>
    page.getByRole("searchbox", { name: "Rechercher un chantier" });
  const reset = (page) =>
    page.getByRole("button", { name: "Réinitialiser", exact: true });
  const ids = async (page) =>
    (
      await cards(page).evaluateAll((nodes) =>
        nodes.map((node) => node.id.replace(/^roadmap-/, "")),
      )
    ).sort();
  const noOverflow = async (page) => {
    const metrics = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      main: document.querySelector("main")?.scrollWidth,
      mainWidth: document.querySelector("main")?.clientWidth,
      clippedCards: [...document.querySelectorAll('[id^="roadmap-"]')]
        .filter(
          (node) =>
            node.querySelector("h3") && node.scrollWidth > node.clientWidth + 1,
        )
        .map((node) => node.id),
    }));
    assert.ok(
      metrics.document <= metrics.viewport + 1,
      JSON.stringify(metrics),
    );
    assert.ok(metrics.main <= metrics.mainWidth + 1, JSON.stringify(metrics));
    assert.deepEqual(metrics.clippedCards, []);
    return metrics;
  };
  async function choose(page, id, text) {
    await page.locator(id).click();
    await page.getByRole("option", { name: text, exact: true }).click();
    await expect(page.getByRole("listbox")).toHaveCount(0);
  }
  const normalize = (text) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLocaleLowerCase("fr-FR")
      .replace(/œ/g, "oe")
      .replace(/æ/g, "ae")
      .replace(/[\p{P}\p{S}]+/gu, " ")
      .trim()
      .replace(/\s+/g, " ");
  function expected(catalogue, { q = "", pole = "all", phase = null } = {}) {
    const terms = normalize(q).split(" ").filter(Boolean);
    return catalogue.items
      .filter((item) => {
        const area = catalogue.areas.find((area) => area.id === item.area);
        const text = normalize(
          [
            item.title,
            item.description,
            item.firstRelease,
            item.later,
            item.baseline,
            item.audience,
            item.doneWhen,
            area?.label,
          ]
            .filter(Boolean)
            .join(" "),
        );
        return (
          (pole === "all" || item.area === pole) &&
          (phase === null || item.phase === phase) &&
          terms.every((term) => text.includes(term))
        );
      })
      .map((item) => item.id)
      .sort();
  }
  async function run(name, width, fn, options = {}) {
    if (process.env.AUDIT_ONLY && !name.includes(process.env.AUDIT_ONLY))
      return;
    const context = await browser.newContext({
      viewport: { width, height: options.height ?? 900 },
      reducedMotion: "reduce",
      timezoneId: "Europe/Paris",
      ...(options.forcedColors ? { forcedColors: "active" } : {}),
    });
    await context.addInitScript((value) => {
      window.__auditOptions = value;
    }, options);
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    const errors = [],
      apiRequests = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/**", async (route) => {
      apiRequests.push(new URL(route.request().url()).pathname);
      await route.abort();
    });
    try {
      await page.goto(origin + base + (options.query ?? ""));
      await expect(search(page)).toBeVisible();
      const catalogue = await page.evaluate(() => window.__auditCatalogue);
      const details = await fn(page, catalogue);
      const metrics = await noOverflow(page);
      assert.deepEqual(errors, []);
      assert.deepEqual(apiRequests, []);
      observations.push({ name, width, status: "pass", ...details, metrics });
      console.log("PASS " + name + " " + width);
    } catch (error) {
      observations.push({
        name,
        width,
        status: "fail",
        error: String(error),
        errors,
        apiRequests,
        url: page.url(),
        focus: await page
          .evaluate(() => ({
            tag: document.activeElement?.tagName,
            id: document.activeElement?.id,
          }))
          .catch(() => null),
      });
      await page.screenshot({
        path: path.join(work, `echec-${observations.length}.png`),
      });
      console.log("FAIL " + name + " " + width + ": " + String(error));
    } finally {
      await context.close();
    }
  }
  try {
    for (const width of [320, 390, 768, 1024, 1440, 1920]) {
      await run(
        "catalogue-complet-responsive",
        width,
        async (page, catalogue) => {
          assert.equal(catalogue.items.length, 39);
          await expect(cards(page)).toHaveCount(39);
          await expect(page.getByRole("status")).toContainText(
            "39 chantiers affichés sur 39",
          );
          assert.deepEqual(
            await ids(page),
            catalogue.items.map((item) => item.id).sort(),
          );
          await expect(reset(page)).toBeDisabled();
          for (const item of catalogue.items) {
            const card = page.locator(`#roadmap-${item.id}`);
            await expect(
              page.getByRole("article", { name: item.title, exact: true }),
            ).toHaveCount(1);
            await expect(card.getByRole("heading", { level: 3 })).toHaveText(
              item.title,
            );
            await expect(card).toContainText(item.firstRelease);
            await expect(card.getByRole("button")).toHaveAccessibleName(
              `Public, prérequis et suite — ${item.title}`,
            );
          }
          const attributes = await search(page).evaluate((node) =>
            Object.fromEntries(
              [
                "autocomplete",
                "data-bwignore",
                "data-1p-ignore",
                "data-lpignore",
                "maxlength",
              ].map((key) => [key, node.getAttribute(key)]),
            ),
          );
          assert.equal(attributes.autocomplete, "off");
          assert.equal(attributes["data-bwignore"], "true");
          assert.equal(attributes["data-1p-ignore"], "true");
          assert.equal(attributes["data-lpignore"], "true");
          assert.equal(attributes["maxlength"], "200");
          const searchIcon = await search(page).evaluate((node) => {
            const icon = node.parentElement.querySelector("svg");
            const iconBox = icon.getBoundingClientRect(),
              inputBox = node.getBoundingClientRect();
            return {
              position: getComputedStyle(icon).position,
              insideField:
                iconBox.top >= inputBox.top &&
                iconBox.bottom <= inputBox.bottom,
            };
          });
          assert.equal(searchIcon.position, "absolute");
          assert.equal(searchIcon.insideField, true);
          await search(page).focus();
          const focusStyle = await search(page).evaluate((node) => ({
            border: getComputedStyle(node).borderColor,
            shadow: getComputedStyle(node).boxShadow,
            outline: getComputedStyle(node).outlineStyle,
          }));
          if ([320, 1440].includes(width))
            await page.screenshot({
              path: path.join(work, `catalogue-${width}.png`),
            });
          return { count: 39, attributes, focusStyle, searchIcon };
        },
      );
    }
    await run(
      "filtres-combines-toutes-les-valeurs",
      1440,
      async (page, catalogue) => {
        const combinations = [];
        for (const area of catalogue.areas) {
          await choose(page, "#roadmap-area", area.label);
          for (const phase of catalogue.phases) {
            await choose(page, "#roadmap-phase", `${phase.id}. ${phase.label}`);
            const want = expected(catalogue, {
              pole: area.id,
              phase: phase.id,
            });
            await expect(cards(page)).toHaveCount(want.length);
            assert.deepEqual(await ids(page), want);
            combinations.push({
              pole: area.id,
              phase: phase.id,
              count: want.length,
            });
          }
        }
        return { combinations };
      },
    );
    await run(
      "recherche-accents-termes-donewhen",
      390,
      async (page, catalogue) => {
        const cases = [
          "ÉQUIPES",
          "equipes",
          "  identité   historique  ",
          "source destinataire",
          "canal décidé",
          "chaque message a une source",
          "[.*]",
          "inexistantxyz",
        ];
        const matches = [];
        for (const q of cases) {
          await search(page).fill(q);
          const want = expected(catalogue, { q });
          await expect(cards(page)).toHaveCount(want.length);
          assert.deepEqual(await ids(page), want);
          matches.push({ q, ids: want });
        }
        return { matches };
      },
    );
    for (const width of [320, 1440]) {
      await run("vide-reinitialisation-focus", width, async (page) => {
        await search(page).fill("aucun-chantier-ici");
        await expect(cards(page)).toHaveCount(0);
        await page
          .getByRole("button", {
            name: "Réinitialiser les filtres",
            exact: true,
          })
          .click();
        await expect(cards(page)).toHaveCount(39);
        await expect(search(page)).toBeFocused();
        await choose(page, "#roadmap-area", "Membres");
        await reset(page).click();
        await expect(cards(page)).toHaveCount(39);
        await expect(search(page)).toBeFocused();
      });
    }
    await run(
      "menus-clavier-disclosures-etapes",
      390,
      async (page, catalogue) => {
        const overview = page.getByRole("button", {
          name: "Comprendre les étapes et les principes du projet",
          exact: true,
        });
        await overview.focus();
        await overview.press("Enter");
        await expect(overview).toHaveAttribute("aria-expanded", "true");
        const step = page.getByRole("button", {
          name: /^2\. Quotidien esport/,
        });
        await step.focus();
        await step.press("Space");
        await expect(step).toHaveAttribute("aria-pressed", "true");
        assert.deepEqual(await ids(page), expected(catalogue, { phase: 2 }));
        await step.press("Enter");
        await expect(step).toHaveAttribute("aria-pressed", "false");
        await expect(cards(page)).toHaveCount(39);
        const principles = page.getByRole("button", {
          name: "Les principes retenus et le socle disponible",
          exact: true,
        });
        await principles.focus();
        await principles.press("Space");
        await expect(principles).toHaveAttribute("aria-expanded", "true");
        await expect(
          page.getByText("Une personne garde la même identité", {
            exact: false,
          }),
        ).toBeVisible();
        await overview.focus();
        await overview.press("Enter");
        await expect(overview).toHaveAttribute("aria-expanded", "false");
        for (const [id, label] of [
          ["#roadmap-area", "Membres"],
          ["#roadmap-phase", "2. Quotidien esport"],
        ]) {
          const trigger = page.locator(id);
          await trigger.focus();
          await trigger.press("Enter");
          await expect(page.getByRole("listbox")).toBeVisible();
          await page.keyboard.press("Escape");
          await expect(trigger).toBeFocused();
          await trigger.press("Enter");
          await page.getByRole("option", { name: label, exact: true }).focus();
          await page.keyboard.press("Enter");
          await expect(trigger).toBeFocused();
        }
        await reset(page).click();
        const card = page.locator("#roadmap-notifications");
        const detail = card.getByRole("button");
        await detail.focus();
        await detail.press("Enter");
        await expect(detail).toHaveAttribute("aria-expanded", "true");
        await expect(
          card.getByText(
            catalogue.items.find((item) => item.id === "notifications")
              .doneWhen,
            { exact: true },
          ),
        ).toBeVisible();
        await detail.press("Space");
        await expect(detail).toHaveAttribute("aria-expanded", "false");
        await expect(detail).toBeFocused();
      },
    );
    await run(
      "historique-rapide-back-forward",
      1440,
      async (page, catalogue) => {
        await search(page).pressSequentially("equipes", { delay: 2 });
        await choose(page, "#roadmap-area", "Esport");
        await choose(page, "#roadmap-phase", "2. Quotidien esport");
        await expect(search(page)).toHaveValue("equipes");
        assert.deepEqual(
          await ids(page),
          expected(catalogue, { q: "equipes", pole: "esport", phase: 2 }),
        );
        await page.goBack();
        await expect(page.locator("#roadmap-phase")).toContainText(
          "Toutes les étapes",
        );
        await page.goBack();
        await expect(page.locator("#roadmap-area")).toContainText(
          "Tous les pôles",
        );
        await expect(search(page)).toHaveValue("equipes");
        await page.goForward();
        await expect(page.locator("#roadmap-area")).toContainText("Esport");
        await search(page).fill("documents");
        await page.goBack();
        await expect(search(page)).toHaveValue("equipes");
        assert.deepEqual(
          await ids(page),
          expected(catalogue, { q: "equipes" }),
        );
      },
    );
    await run(
      "effacement-partage-label-et-filtres",
      320,
      async (page, catalogue) => {
        await page.getByText("Rechercher un chantier", { exact: true }).click();
        await expect(search(page)).toBeFocused();
        await choose(page, "#roadmap-area", "Esport");
        await search(page).fill("equipes");
        const clear = page.getByRole("button", {
          name: "Effacer la recherche",
          exact: true,
        });
        await expect(clear).toHaveAttribute("aria-controls", "roadmap-search");
        await clear.focus();
        await clear.press("Enter");
        await expect(search(page)).toHaveValue("");
        await expect(search(page)).toBeFocused();
        await expect(clear).toHaveCount(0);
        await expect(page.locator("#roadmap-area")).toContainText("Esport");
        assert.deepEqual(
          await ids(page),
          expected(catalogue, { pole: "esport" }),
        );
        await search(page).fill("equipes");
        await search(page).press("Escape");
        await expect(search(page)).toHaveValue("");
        await expect(search(page)).toBeFocused();
      },
    );
    await run(
      "url-doublons-hash-parametre-externe",
      1024,
      async (page, catalogue) => {
        await expect
          .poll(() => new URL(page.url()).searchParams.getAll("q").length)
          .toBe(1);
        await expect
          .poll(() => new URL(page.url()).searchParams.getAll("pole").length)
          .toBe(1);
        assert.deepEqual(
          await ids(page),
          expected(catalogue, { q: "equipe", pole: "esport", phase: 2 }),
        );
        assert.equal(new URL(page.url()).hash, "#roadmap-sport-teams");
        assert.equal(new URL(page.url()).searchParams.get("source"), "audit");
        await reset(page).click();
        await expect(cards(page)).toHaveCount(39);
        assert.equal(new URL(page.url()).hash, "#roadmap-sport-teams");
        assert.equal(new URL(page.url()).searchParams.get("source"), "audit");
      },
      {
        query:
          "?q=equipe&q=ignore&pole=esport&pole=people&phase=2&phase=5&source=audit#roadmap-sport-teams",
      },
    );
    await run(
      "url-invalide-et-bornee",
      768,
      async (page) => {
        await expect(cards(page)).toHaveCount(39);
        await expect(page.locator("#roadmap-area")).toContainText(
          "Tous les pôles",
        );
        await expect(page.locator("#roadmap-phase")).toContainText(
          "Toutes les étapes",
        );
        await expect
          .poll(() => new URL(page.url()).searchParams.has("pole"))
          .toBe(false);
        await expect
          .poll(() => new URL(page.url()).searchParams.has("phase"))
          .toBe(false);
        await page.evaluate(
          (value) =>
            history.pushState(
              null,
              "",
              `?q=${"x".repeat(260)}&pole=people&phase=2`,
            ),
          null,
        );
        await expect(search(page)).toHaveValue("x".repeat(200));
        await expect
          .poll(() => new URL(page.url()).searchParams.get("q")?.length)
          .toBe(200);
        await reset(page).click();
        await expect(cards(page)).toHaveCount(39);
      },
      { query: "?pole=inconnu&phase=99" },
    );
    await run(
      "details-toutes-cartes-donnees",
      1440,
      async (page, catalogue) => {
        for (const item of catalogue.items) {
          const card = page.locator(`#roadmap-${item.id}`);
          const disclosure = card.getByRole("button");
          await disclosure.click();
          for (const text of [item.audience, item.doneWhen, item.later])
            await expect(card.getByText(text, { exact: true })).toBeVisible();
          for (const dependency of item.dependsOn) {
            const title = catalogue.items.find(
              (item) => item.id === dependency,
            ).title;
            await expect(card).toContainText(title);
          }
          await disclosure.click();
        }
        assert.equal(await cards(page).locator("a").count(), 0);
        return { openedAndClosed: catalogue.items.length, futureLinks: 0 };
      },
    );
    await run(
      "couleurs-forcees-et-texte-agrandi",
      390,
      async (page) => {
        await page.evaluate(() => {
          document.documentElement.style.fontSize = "200%";
        });
        await search(page).fill("notifications");
        await page
          .locator("#roadmap-notifications")
          .getByRole("button")
          .click();
        await page.screenshot({ path: path.join(work, "texte-200-390.png") });
        await search(page).focus();
        return {
          textScale: "CSS root font-size 200%, not native browser zoom",
        };
      },
      { forcedColors: true, height: 844 },
    );
    await run(
      "strictmode-filtres",
      1024,
      async (page, catalogue) => {
        await choose(page, "#roadmap-area", "Finances");
        await search(page).fill("paiement");
        assert.deepEqual(
          await ids(page),
          expected(catalogue, { q: "paiement", pole: "finance" }),
        );
        await reset(page).click();
        await expect(cards(page)).toHaveCount(39);
      },
      { strict: true },
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
