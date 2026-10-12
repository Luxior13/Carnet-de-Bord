const fs = require("node:fs"),
  path = require("node:path"),
  os = require("node:os"),
  http = require("node:http"),
  assert = require("node:assert/strict");
const esbuild = require("esbuild"),
  postcss = require("postcss"),
  tailwind = require("@tailwindcss/postcss");
const { chromium, expect } = require("@playwright/test");
const { target, sessions } = require("./data.cjs");
const root = path.resolve(__dirname, "../../../..");
const work = fs.mkdtempSync(
  path.join(os.tmpdir(), "noctambule-account-security-client-"),
);
console.log("Résultats : " + work);
async function main() {
  const mock = JSON.stringify(path.join(__dirname, "mocks.tsx"));
  const aliases = {
    "$context/UserContext": `export {useUser} from ${mock};`,
    "$context/FeatureAvailabilityContext": `export {useFeatureAvailability} from ${mock};`,
    "next/link": `export {Link as default} from ${mock};`,
    "next/navigation": `export {usePathname,useRouter,useSearchParams} from ${mock};`,
    "next/image": `export {Image as default} from ${mock};`,
    "next/dynamic": `import React from 'react';export default function dynamic(load){return React.lazy(()=>load().then(defaultExport=>({default:defaultExport})));}`,
    "$components/ChangePasswordDialog": `export {ClosedDialog as ChangePasswordDialog} from ${mock};`,
    "$features/auth/components/MfaSetupDialog": `export {ClosedDialog as MfaSetupDialog} from ${mock};`,
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
        name: "audit-account-security",
        setup(build) {
          if (process.env.AUDIT_BASELINE_SOURCE) {
            build.onResolve(
              { filter: /^\$features\/account\/components\/SecuritySection$/ },
              () => ({
                path: process.env.AUDIT_BASELINE_SOURCE,
                namespace: "baseline",
              }),
            );
            build.onLoad({ filter: /.*/, namespace: "baseline" }, (args) => ({
              contents: fs.readFileSync(args.path, "utf8"),
              loader: "tsx",
              resolveDir: path.join(
                root,
                "apps/web/src/features/account/components",
              ),
            }));
          }
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
    if (name === "/assets/noc.png") {
      res.setHeader("Content-Type", "image/png");
      return res.end(
        fs.readFileSync(path.join(root, "apps/web/public/assets/noc.png")),
      );
    }
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
  const origin = `http://127.0.0.1:${server.address().port}`,
    browser = await chromium.launch(),
    observations = [];
  async function run(name, width, fn, options = {}) {
    if (process.env.AUDIT_ONLY && !name.includes(process.env.AUDIT_ONLY))
      return;
    const context = await browser.newContext({
      viewport: { width, height: options.height ?? 700 },
      reducedMotion: "reduce",
      timezoneId: "Europe/Paris",
    });
    await context.addInitScript(
      ({ target, sessions, options }) => {
        window.__auditOptions = {
          actor: {
            ...target,
            id: "audit-actor",
            role: "ADMIN",
            isProtected: true,
          },
          ...options,
        };
        const api = (window.__securityApi = {
          requests: [],
          pending: [],
          modes: { ...options.modes },
          sessions: [
            { ...sessions[0], isCurrent: true },
            ...Array.from({ length: options.long ? 14 : 3 }, (_, i) => ({
              ...sessions[1],
              id: "audit-other-" + i,
              isCurrent: false,
            })),
          ],
        });
        const originalFetch = window.fetch.bind(window);
        window.fetch = async (input, init = {}) => {
          const url = new URL(
            typeof input === "string" ? input : input.url,
            location.href,
          );
          if (!url.pathname.startsWith("/api/"))
            return originalFetch(input, init);
          const method = init.method ?? "GET",
            key = method + " " + url.pathname,
            mode = api.modes[key] ?? "success";
          const request = {
            method,
            path: url.pathname,
            query: url.search,
            mode,
            aborted: false,
          };
          api.requests.push(request);
          if (mode === "hold")
            return new Promise((resolve, reject) => {
              api.pending.push(() =>
                resolve(
                  new Response(
                    JSON.stringify({
                      success: true,
                      data: { sessions: api.sessions },
                    }),
                    {
                      status: 200,
                      headers: { "Content-Type": "application/json" },
                    },
                  ),
                ),
              );
              const abort = () => {
                request.aborted = true;
                reject(
                  new DOMException("Requête fictive interrompue", "AbortError"),
                );
              };
              if (init.signal?.aborted) abort();
              else
                init.signal?.addEventListener("abort", abort, { once: true });
            });
          if (mode === "error")
            return new Response(
              JSON.stringify({
                success: false,
                error: {
                  code: "INTERNAL_ERROR",
                  message: "Erreur serveur fictive",
                },
              }),
              { status: 500, headers: { "Content-Type": "application/json" } },
            );
          if (mode === "forbidden")
            return new Response("Refus fictif", {
              status: 403,
              headers: { "Content-Type": "text/html" },
            });
          let data = {};
          if (url.pathname === "/api/auth/sessions") {
            if (method === "DELETE")
              api.sessions = url.searchParams.has("id")
                ? api.sessions.filter(
                    (s) => s.id !== url.searchParams.get("id"),
                  )
                : api.sessions.filter((s) => s.isCurrent);
            data =
              method === "DELETE"
                ? { revokedCount: 1 }
                : { sessions: api.sessions };
          } else if (url.pathname === "/api/auth/mfa")
            data = {
              enabledAt: "2026-10-12T12:00:00Z",
              recoveryCodesRemaining: 8,
              required: true,
            };
          else throw new Error("API non prévue " + key);
          return new Response(JSON.stringify({ success: true, data }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        };
      },
      { target, sessions, options },
    );
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.clock.install();
    try {
      await page.goto(origin + "/mon-compte?section=security");
      if (options.initialLoading)
        await expect(
          page.getByRole("heading", { name: "Sessions actives", exact: true }),
        ).toBeVisible();
      else
        await expect(
          page.getByRole("button", {
            name: "Déconnecter les autres sessions",
            exact: true,
          }),
        ).toBeVisible();
      const result = await fn(page);
      assert.deepEqual(errors, []);
      observations.push({
        name,
        width,
        status: "pass",
        ...result,
        requests: await page.evaluate(() => window.__securityApi.requests),
      });
      console.log("PASS " + name + " " + width);
    } catch (error) {
      observations.push({
        name,
        width,
        status: "fail",
        error: String(error),
        errors,
        requests: await page.evaluate(() => window.__securityApi.requests),
      });
      console.log("FAIL " + name + " " + error);
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
      simulation:
        "AccountPageContent, SecuritySection et cadre réels ; API, identité, routeur et horloge simulés. Dialogues mot de passe et MFA exclus.",
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
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
