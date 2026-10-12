const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const esbuild = require("esbuild"),
  postcss = require("postcss"),
  tailwind = require("@tailwindcss/postcss");
const { chromium, expect } = require("@playwright/test");
const root = path.resolve(__dirname, "../../../..");
const work = fs.mkdtempSync(
  path.join(os.tmpdir(), "noctambule-states-client-"),
);
console.log("Résultats : " + work);
async function main() {
  const mock = JSON.stringify(path.join(__dirname, "mocks.tsx"));
  const aliases = {
    "$context/UserContext": `export {useUser} from ${mock};`,
    "next/link": `export {Link as default} from ${mock};`,
    "next/navigation": `export {usePathname,useRouter} from ${mock};`,
    "$components/Sidebar": `export {Sidebar as default} from ${mock};`,
    "$components/layout/Header": `export {Header} from ${mock};`,
    "$components/ChangePasswordDialog": `export {ClosedDialog as ChangePasswordDialog} from ${mock};`,
    "$features/auth/components/MfaSetupDialog": `export {ClosedDialog as MfaSetupDialog} from ${mock};`,
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
        name: "audit-states",
        setup(build) {
          build.onResolve({ filter: /.*/ }, (a) =>
            Object.hasOwn(aliases, a.path)
              ? { path: a.path, namespace: "audit" }
              : null,
          );
          build.onLoad({ filter: /.*/, namespace: "audit" }, (a) => ({
            contents: aliases[a.path],
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
      '<!doctype html><html lang="fr" class="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/bundle.css"><style>:root{--font-geist-sans:Arial,sans-serif;--font-geist-mono:monospace}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(),
    observations = [];
  async function run(name, width, fn, options = {}) {
    if (process.env.AUDIT_ONLY && !name.includes(process.env.AUDIT_ONLY))
      return;
    const context = await browser.newContext({
      viewport: { width, height: options.height ?? 900 },
      reducedMotion: "reduce",
    });
    await context.addInitScript((value) => {
      window.__auditOptions = value;
    }, options);
    const page = await context.newPage();
    page.setDefaultTimeout(4500);
    const errors = [],
      requests = [],
      navigations = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (request) => {
      if (request.isNavigationRequest() && request.frame() === page.mainFrame())
        navigations.push({
          method: request.method(),
          path: new URL(request.url()).pathname,
        });
    });
    await page.route("**/api/**", async (route) => {
      requests.push(route.request().url());
      await route.abort();
    });
    try {
      await page.goto(origin + "/audit-etat");
      await expect(page.locator("#root")).not.toBeEmpty();
      const result = await fn(page, navigations);
      const metrics = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        main: document.querySelector("main")?.scrollWidth,
        mainWidth: document.querySelector("main")?.clientWidth,
        mains: document.querySelectorAll('main,[role="main"]').length,
      }));
      assert.ok(metrics.document <= width + 1, JSON.stringify(metrics));
      if (metrics.mainWidth)
        assert.ok(
          metrics.main <= metrics.mainWidth + 1,
          JSON.stringify(metrics),
        );
      assert.deepEqual(errors, []);
      assert.deepEqual(requests, []);
      observations.push({
        name,
        width,
        height: options.height ?? 900,
        status: "pass",
        ...result,
        metrics,
        navigations,
      });
      console.log("PASS " + name + " " + width);
    } catch (error) {
      observations.push({
        name,
        width,
        status: "fail",
        error: String(error),
        errors,
        requests,
      });
      console.log("FAIL " + name + ": " + error);
    } finally {
      await context.close();
    }
  }
  try {
    await require("./scenarios.cjs")({
      run,
      expect,
      assert,
      work,
      path,
      before: process.env.AUDIT_BEFORE === "1",
    });
  } finally {
    await browser.close();
    await new Promise((r) => server.close(r));
    const result = {
      completedAt: new Date().toISOString(),
      timezone: "Europe/Paris",
      browser: "Chromium",
      passed: observations.filter((o) => o.status === "pass").length,
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
