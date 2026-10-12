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
const work = fs.mkdtempSync(path.join(os.tmpdir(), "noctambule-home-client-"));
console.log("Résultats : " + work);

async function main() {
  const mock = JSON.stringify(path.join(__dirname, "mocks.tsx"));
  const aliases = {
    "$context/UserContext": `export {useUser} from ${mock};`,
    "$components/AuthenticatedLayout": `export {AuthenticatedLayout as default} from ${mock};`,
    "next/link": `export {Link as default} from ${mock};`,
    "next/navigation": `export {usePathname} from ${mock};`,
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
        name: "home-session-and-shell",
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
  const link = (page) =>
    page.getByRole("link", { name: "Mon compte", exact: true });
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
    assert.ok(result.hero <= result.heroWidth + 1, JSON.stringify(result));
    return result;
  };
  const updateActor = async (page, patch) =>
    page.evaluate((value) => {
      window.__auditSetActor(value);
    }, patch);
  async function run(name, width, fn) {
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
      timezoneId: "Europe/Paris",
    });
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
      await page.goto(origin);
      await expect(heading(page)).toHaveText("Bonjour Camille");
      const details = await fn(page);
      assert.deepEqual(errors, []);
      assert.deepEqual(apiRequests, []);
      observations.push({
        name,
        width,
        status: "pass",
        ...details,
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
    for (const width of [320, 390, 768, 1024, 1440, 1920])
      await run("composition-et-lien", width, async (page) => {
        await expect(heading(page)).toHaveCount(1);
        await expect(
          page.getByRole("navigation", { name: "Fil d’Ariane simulé" }),
        ).toContainText("Mon travail");
        await expect(link(page)).toHaveAttribute("href", "/mon-compte");
        await expect(page.locator('[data-slot="page-heading"]')).toContainText(
          "Votre espace personnel est en préparation. Retrouvez vos informations et vos réglages dans Mon compte.",
        );
        await expect(page.locator('[data-slot="page-heading"]')).toContainText(
          "Mon travail",
        );
        await expect(page.locator("form,input,table")).toHaveCount(0);
        await page.keyboard.press("Tab");
        await expect(link(page)).toBeFocused();
        const style = await link(page).evaluate((node) => ({
          shadow: getComputedStyle(node).boxShadow,
          outline: getComputedStyle(node).outlineStyle,
          minHeight: getComputedStyle(node).minHeight,
        }));
        if ([320, 1440].includes(width))
          await page.screenshot({
            path: path.join(work, `accueil-${width}.png`),
          });
        if (width === 390) {
          await page.keyboard.press("Enter");
          await expect(
            page.getByRole("heading", { name: "Destination simulée" }),
          ).toBeVisible();
          assert.equal(new URL(page.url()).pathname, "/mon-compte");
          await page.goBack();
          await expect(heading(page)).toHaveText("Bonjour Camille");
        }
        return { focusStyle: style };
      });
    await run("prenom-long-et-repli", 320, async (page) => {
      const longName = "É".repeat(100);
      await updateActor(page, { firstName: longName });
      await expect(heading(page)).toHaveText("Bonjour " + longName);
      const longMetrics = await metrics(page);
      await updateActor(page, { firstName: "   " });
      await expect(heading(page)).toHaveText("Bienvenue");
      const emptyTitle = await heading(page).textContent();
      await updateActor(page, { firstName: "  Camille  " });
      await expect(heading(page)).toHaveText("Bonjour Camille");
      return {
        longNameLength: 100,
        longMetrics,
        emptyTitle,
        source:
          "simulated UserContext update without unmount or server reevaluation",
      };
    });
    await run(
      "prenom-et-compte-actualises-sans-demontage",
      390,
      async (page) => {
        await page.evaluate(() => {
          window.__auditInitialHeading = document.querySelector("h1");
        });
        await link(page).focus();
        await updateActor(page, { firstName: "Camille-Renommée" });
        await expect(heading(page)).toHaveText("Bonjour Camille-Renommée");
        await expect(link(page)).toBeFocused();
        assert.equal(
          await page.evaluate(
            () => window.__auditInitialHeading === document.querySelector("h1"),
          ),
          true,
        );
        await updateActor(page, {
          id: "audit-other-user",
          firstName: "Noé",
          loginName: "noe.exemple",
          role: "ADMIN",
        });
        await expect(heading(page)).toHaveText("Bonjour Noé");
        await expect(link(page)).toBeFocused();
        assert.equal(
          await page.evaluate(
            () => window.__auditInitialHeading === document.querySelector("h1"),
          ),
          true,
        );
        await expect(link(page)).toHaveAttribute("href", "/mon-compte");
        return {
          sameHeadingNode: true,
          profileAndIdentityChangesAccepted: true,
          noServerReevaluation: true,
        };
      },
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
