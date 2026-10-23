const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const esbuild = require("esbuild"),
  postcss = require("postcss"),
  tailwind = require("@tailwindcss/postcss");
const { chromium, expect } = require("@playwright/test");
const { person } = require("./data.cjs");
const root = path.resolve(__dirname, "../../../..");
const work = fs.mkdtempSync(
  path.join(os.tmpdir(), "noctambule-person-detail-client-"),
);
const initial =
  "/membres/repertoire/audit-person-a?returnTo=" +
  encodeURIComponent("/membres/repertoire?q=Camille&status=IN_STRUCTURE");
console.log("Résultats : " + work);
async function main() {
  const mock = JSON.stringify(path.join(__dirname, "mocks.tsx"));
  const aliases = {
    "$context/UserContext": `export {useUser} from ${mock};`,
    "$context/FeatureAvailabilityContext": `export {useFeatureAvailability} from ${mock};`,
    "$components/AuthenticatedLayout": `export {AuthenticatedLayout as default} from ${mock};`,
    "next/navigation": `export {usePathname,useRouter,useSearchParams} from ${mock};`,
    "next/link": `export {Link as default} from ${mock};`,
    "next/dynamic": `import React,{lazy,Suspense} from 'react';export default function dynamic(loader){const Lazy=lazy(()=>loader().then(m=>({default:m.default??m})));return props=><Suspense fallback={null}><Lazy {...props}/></Suspense>;}`,
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
        name: "isolated-person-detail",
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
      '<!doctype html><html lang="fr" class="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/bundle.css"><style>:root{--font-geist-sans:Arial,sans-serif;--font-geist-mono:monospace}.audit-shell{min-height:100vh}@media(min-width:1024px){.audit-shell{margin-left:240px}}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
    );
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch(),
    observations = [];
  const heading = (page) => page.getByRole("heading", { level: 1 });
  const nickname = (page) =>
    page.getByLabel("Pseudo principal", { exact: true });
  const save = (page) =>
    page.getByRole("button", { name: "Enregistrer", exact: true });
  const updateActor = (page, patch) =>
    page.evaluate((p) => window.__auditSetActor(p), patch);
  async function run(name, width, fn, options = {}) {
    if (process.env.AUDIT_ONLY && !name.includes(process.env.AUDIT_ONLY))
      return;
    const context = await browser.newContext({
      viewport: { width, height: options.height || 900 },
      timezoneId: "Europe/Paris",
      reducedMotion: "reduce",
    });
    await context.addInitScript((value) => {
      window.__auditOptions = value;
      window.__auditCopies = [];
      Object.defineProperty(navigator, "clipboard", {
        value: {
          writeText: async (text) => {
            window.__auditCopies.push(text);
            if (value.clipboardDenied) throw new Error("Copie fictive refusée");
          },
        },
      });
      if (value.storageBlocked) {
        Storage.prototype.getItem = function () {
          throw new DOMException("Stockage fictif refusé", "SecurityError");
        };
        Storage.prototype.removeItem = Storage.prototype.getItem;
      }
      if (value.fastTimeout) {
        const timer = window.setTimeout;
        window.setTimeout = function (fn, delay, ...args) {
          return timer(
            fn,
            [30000, 15000].includes(delay) ? 100 : delay,
            ...args,
          );
        };
      }
    }, options);
    const page = await context.newPage();
    page.setDefaultTimeout(4500);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const api = {
      person: { ...structuredClone(person), ...options.personPatch },
      mode: options.mode || "success",
      readMode: options.readMode || "success",
      historyMode: options.historyMode || "success",
      requests: [],
      held: [],
    };
    const sendSuccess = async (route, body) => {
      const req = route.request(),
        url = new URL(req.url()),
        method = req.method();
      if (method === "GET") {
        if (url.pathname.endsWith("historique-champ"))
          return route.fulfill({
            status: 200,
            json: {
              success: true,
              data: {
                items: [
                  {
                    id: "audit-history",
                    action: "CREATE",
                    at: person.createdAt,
                    actor: {
                      displayName: "Auteur fictif",
                      loginName: "auteur.audit",
                    },
                    changes: {},
                    fieldKey: url.searchParams.get("fieldKey"),
                  },
                ],
                hasMore: false,
              },
            },
          });
        return route.fulfill({
          status: 200,
          json: { success: true, data: api.person },
        });
      }
      if (method === "PATCH" && url.pathname.split("/").length === 4) {
        api.person = {
          ...api.person,
          ...body,
          version: api.person.version + 1,
        };
      } else if (method !== "DELETE") {
        const kind = url.pathname.includes("emails")
          ? "emails"
          : url.pathname.includes("telephones")
            ? "phones"
            : "socialProfiles";
        const id =
          method === "POST"
            ? "audit-child-new"
            : url.pathname.split("/").at(-1);
        const child = {
          ...body,
          id,
          version: 2,
          createdAt: person.createdAt,
          updatedAt: person.updatedAt,
        };
        api.person = {
          ...api.person,
          version: api.person.version + 1,
          [kind]:
            method === "POST"
              ? [...api.person[kind], child]
              : api.person[kind].map((c) =>
                  c.id === id ? { ...c, ...child } : c,
                ),
        };
      } else if (url.pathname.split("/").length === 4)
        return route.fulfill({ status: 204, body: "" });
      else {
        const kind = url.pathname.includes("emails")
            ? "emails"
            : url.pathname.includes("telephones")
              ? "phones"
              : "socialProfiles",
          id = url.pathname.split("/").at(-1);
        api.person = {
          ...api.person,
          version: api.person.version + 1,
          [kind]: api.person[kind]
            .filter((c) => c.id !== id)
            .map((c) => ({
              ...c,
              isPrimary: body.replacementPrimaryId
                ? c.id === body.replacementPrimaryId
                : c.isPrimary,
            })),
        };
      }
      return route.fulfill({
        status: 200,
        json: {
          success: true,
          data: {
            person: api.person,
            ...(api.mode === "duplicate"
              ? {
                  duplicateWarning: { duplicateFound: true, fields: ["email"] },
                }
              : {}),
          },
        },
      });
    };
    api.resolve = async () => {
      for (const item of api.held.splice(0))
        await sendSuccess(item.route, item.body).catch(() => {});
    };
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        method = req.method(),
        url = new URL(req.url()),
        body = req.postData() ? req.postDataJSON() : null;
      api.requests.push({
        method,
        path: url.pathname,
        query: url.search,
        body,
        headers: req.headers(),
      });
      const mode =
        method === "GET"
          ? url.pathname.endsWith("historique-champ")
            ? api.historyMode
            : api.readMode
          : api.mode;
      if (mode === "hold") {
        api.held.push({ route, body });
        return;
      }
      if (mode === "lost") {
        await route.abort("failed");
        return;
      }
      if (mode === "forbiddenHtml") {
        await route.fulfill({
          status: 403,
          contentType: "text/html",
          body: "Refus fictif",
        });
        return;
      }
      const status = {
        error: 500,
        conflict: 409,
        forbidden: 403,
        unauthorized: 401,
        missing: 404,
        gone: 410,
        field: 400,
      }[mode];
      if (status) {
        await route.fulfill({
          status,
          json: {
            success: false,
            error: {
              code: mode === "conflict" ? "CONFLICT" : "FORBIDDEN",
              message: "Erreur fictive " + mode,
              ...(mode === "field"
                ? {
                    details: {
                      email: ["Email fictif refusé"],
                      nickname: ["Pseudo fictif refusé"],
                    },
                  }
                : {}),
            },
          },
        });
        return;
      }
      await sendSuccess(route, body);
    });
    try {
      await page.goto(origin + (options.url || initial));
      if (!options.skipReady)
        await expect(heading(page)).toContainText("CamilleAudit");
      const details = await fn(page, api);
      if (!options.allowPageErrors) assert.deepEqual(errors, []);
      const metrics = await page.evaluate(() => ({
        viewport: innerWidth,
        document: document.documentElement.scrollWidth,
        main: document.querySelector("main")?.scrollWidth,
        mainWidth: document.querySelector("main")?.clientWidth,
      }));
      assert.ok(metrics.document <= width + 1, JSON.stringify(metrics));
      if (metrics.main !== undefined)
        assert.ok(
          metrics.main <= metrics.mainWidth + 1,
          JSON.stringify(metrics),
        );
      observations.push({
        name,
        width,
        status: "pass",
        ...details,
        requests: api.requests.map(({ method, path, body, headers }) => ({
          method,
          path,
          body,
          idempotencyKey: headers["idempotency-key"] ?? null,
        })),
        errors,
        metrics,
      });
      console.log("PASS " + name + " " + width);
    } catch (error) {
      observations.push({
        name,
        width,
        status: "fail",
        error: String(error),
        errors,
      });
      console.log("FAIL " + name + ": " + String(error));
    } finally {
      await context.close();
    }
  }
  try {
    await require("./scenarios.cjs")({
      run,
      expect,
      assert,
      heading,
      nickname,
      save,
      updateActor,
      work,
      path,
      initial,
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
