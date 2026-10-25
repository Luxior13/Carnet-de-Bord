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
  path.join(os.tmpdir(), "noctambule-settings-client-"),
);
const base = "/systeme/parametres";

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
  const key = "audit.retentionDays",
    collection = "/api/systeme/parametres";
  const row = (page) =>
    page.locator('[data-setting-key="audit.retentionDays"]');
  const field = (page) => row(page).getByRole("spinbutton");
  const save = (page) =>
    row(page).getByRole("button", { name: /^Enregistrer/ });
  const refresh = (page) =>
    page.getByRole("button", { name: "Actualiser", exact: true });
  const focus = (page) =>
    page.evaluate(() => ({
      tag: document.activeElement?.tagName,
      id: document.activeElement?.id,
      text: document.activeElement?.textContent?.slice(0, 120),
    }));
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
    page.setDefaultTimeout(6000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const api = {
      item: {
        key,
        isStoredValueInvalid: false,
        value: 1095,
        version: 0,
        updatedAt: new Date(0).toISOString(),
        ...options.item,
      },
      getMode: options.getMode ?? "success",
      putMode: "success",
      proofMode: "success",
      proofNeeded: false,
      verified: false,
      requests: [],
      held: [],
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
        method,
        body: body
          ? Object.fromEntries(
              Object.entries(body).filter(
                ([key]) => !/password|code/i.test(key),
              ),
            )
          : null,
      });
      const json = (status, data) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(data),
        });
      const failure = (status, code, message) =>
        json(status, { success: false, error: { code, message } });
      if (url.pathname === "/api/auth/step-up") {
        if (api.proofMode === "invalid-totp")
          return failure(400, "VALIDATION_ERROR", "Le code est incorrect");
        if (api.proofMode === "invalid")
          return failure(
            400,
            "VALIDATION_ERROR",
            "Le mot de passe est incorrect",
          );
        if (api.proofMode === "hold")
          await new Promise((resolve) =>
            api.held.push({ kind: "proof", resolve }),
          );
        api.verified = true;
        return json(200, {
          success: true,
          data: {
            kind: "password",
            expiresAt: "2026-10-12T15:00:00Z",
            passwordExpiresAt: "2026-10-12T15:00:00Z",
            criticalMfaExpiresAt: null,
          },
        });
      }
      if (!url.pathname.startsWith(collection))
        return failure(404, "NOT_FOUND", "Route fictive non déclarée");
      const mode = method === "GET" ? api.getMode : api.putMode;
      if (mode === "hold")
        await new Promise((resolve) =>
          api.held.push({ kind: method, resolve }),
        );
      if (mode === "forbidden-json")
        return failure(403, "FORBIDDEN", "Accès retiré");
      if (mode === "forbidden-html")
        return route.fulfill({
          status: 403,
          contentType: "text/html",
          body: "Refus fictif non JSON",
        });
      if (mode === "error")
        return failure(500, "INTERNAL_ERROR", "Service fictif indisponible");
      if (mode === "invalid-json")
        return route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "Réponse fictive invalide",
        });
      if (method === "GET")
        return json(200, {
          success: true,
          data: mode === "incomplete" ? [] : [api.item],
        });
      if (mode === "conflict")
        return failure(409, "CONFLICT", "Version modifiée");
      if (api.proofNeeded && !api.verified)
        return failure(
          403,
          "PASSWORD_REAUTHENTICATION_REQUIRED",
          "Confirmez votre mot de passe",
        );
      if (mode === "abort") return route.abort("failed");
      api.item = {
        ...api.item,
        value: body.value,
        isStoredValueInvalid: false,
        version: api.item.version + 1,
        updatedAt: "2026-10-12T12:00:00Z",
      };
      if (mode === "commit-abort") return route.abort("failed");
      return json(200, { success: true, data: api.item });
    });
    try {
      await page.goto(origin + base);
      await expect(page.getByRole("main")).toBeVisible();
      const result = await fn({ page, api, context });
      assert.deepEqual(errors, []);
      observations.push({
        name,
        width,
        height: options.height ?? 900,
        pass: true,
        result,
        requests: api.requests,
      });
      await page.screenshot({
        path: path.join(work, name + "-" + width + ".png"),
        fullPage: true,
      });
    } catch (error) {
      observations.push({
        name,
        width,
        pass: false,
        error: error.message,
        errors,
        focus: await focus(page),
        requests: api.requests,
      });
      await page
        .screenshot({
          path: path.join(work, name + "-" + width + "-FAIL.png"),
          fullPage: true,
        })
        .catch(() => {});
    } finally {
      for (const pending of api.held) pending.resolve();
      await context.close();
      console.log(name + " " + width + ": " + observations.at(-1).pass);
    }
  }
  const open = async (page) => {
    await field(page).focus();
    await expect(field(page)).toBeFocused();
  };
  const write = async (page, value) => {
    await open(page);
    await field(page).fill(String(value));
  };
  const writes = (api) => api.requests.filter((r) => r.method === "PUT");
  for (const width of [320, 390, 768, 1024, 1440, 1920])
    await run("read-edit-keyboard-responsive", width, async ({ page, api }) => {
      await expect(field(page)).toBeVisible();
      await expect(save(page)).toHaveCount(0);
      await expect(
        row(page).getByRole("button", { name: "Annuler", exact: true }),
      ).toHaveCount(0);
      await page.screenshot({
        path: path.join(work, "repos-" + width + ".png"),
        fullPage: true,
      });
      const reading = await noOverflow(page);
      await field(page).focus();
      await expect(field(page)).toBeFocused();
      await field(page).press("Enter");
      assert.equal(writes(api).length, 0);
      await expect(field(page)).toHaveAttribute("autocomplete", "off");
      await expect(field(page)).toHaveAttribute("data-bwignore", "true");
      const less = row(page).getByRole("button", { name: /^Diminuer/ }),
        more = row(page).getByRole("button", { name: /^Augmenter/ });
      await more.click();
      await expect(field(page)).toHaveValue("1096");
      await expect(field(page)).toBeFocused();
      await less.focus();
      await less.press("Space");
      await expect(field(page)).toHaveValue("1095");
      await field(page).press("ArrowUp");
      await expect(field(page)).toHaveValue("1096");
      for (const value of ["", "364", "3651", "1095.5"]) {
        await field(page).fill(value);
        await expect(field(page)).toHaveAttribute("aria-invalid", "true");
        await expect(less).toBeDisabled();
        await expect(more).toBeDisabled();
        await expect(save(page)).toBeDisabled();
      }
      await field(page).fill("365");
      await expect(less).toBeDisabled();
      await field(page).fill("3650");
      await expect(more).toBeDisabled();
      await field(page).fill("1100");
      await field(page).hover();
      await page.mouse.wheel(0, 300);
      await expect(field(page)).toHaveValue("1100");
      await expect(field(page)).toBeFocused();
      const editing = await noOverflow(page);
      await page.screenshot({
        path: path.join(work, "edition-" + width + ".png"),
        fullPage: true,
      });
      await row(page)
        .getByRole("button", { name: "Annuler", exact: true })
        .click();
      await expect(field(page)).toBeFocused();
      await expect(save(page)).toHaveCount(0);
      assert.equal(writes(api).length, 0);
      return { reading, editing };
    });
  await run("native-save-pending-double-submit", 390, async ({ page, api }) => {
    await write(page, 1200);
    api.putMode = "hold";
    await field(page).press("Enter");
    await expect.poll(() => api.held.length).toBe(1);
    await expect(field(page)).toBeDisabled();
    await expect(row(page)).toHaveAttribute("aria-busy", "true");
    await row(page).evaluate((form) => {
      form.requestSubmit();
      form.requestSubmit();
    });
    assert.equal(writes(api).length, 1);
    api.held.shift().resolve();
    await expect(field(page)).toBeFocused();
    await expect(field(page)).toHaveValue("1200");
    await expect(save(page)).toHaveCount(0);
  });
  await run(
    "save-preserves-deliberately-moved-focus",
    390,
    async ({ page, api }) => {
      await write(page, 1200);
      api.putMode = "hold";
      await save(page).click();
      await expect.poll(() => api.held.length).toBe(1);
      const link = page.locator("#audit-leave");
      await link.focus();
      api.held.shift().resolve();
      await expect(save(page)).toHaveCount(0);
      await expect(link).toBeFocused();
    },
  );
  await run(
    "restore-default-from-saved-custom-value",
    390,
    async ({ page, api }) => {
      await expect(field(page)).toHaveValue("1460");
      await expect(save(page)).toHaveCount(0);
      await row(page)
        .getByRole("button", { name: /^Rétablir la valeur par défaut/ })
        .click();
      await expect(field(page)).toHaveValue("1095");
      await expect(field(page)).toBeFocused();
      await save(page).click();
      await expect(page.getByRole("alertdialog")).toBeVisible();
      assert.equal(writes(api).length, 0);
      await page
        .getByRole("button", {
          name: "Conserver la durée actuelle",
          exact: true,
        })
        .click();
      await row(page)
        .getByRole("button", { name: "Annuler", exact: true })
        .click();
      await expect(field(page)).toHaveValue("1460");
      await expect(field(page)).toBeFocused();
      await expect(save(page)).toHaveCount(0);
    },
    { item: { value: 1460, version: 1, updatedAt: "2026-10-14T12:00:00Z" } },
  );
  await run("refresh-dirty-confirmation-focus", 390, async ({ page, api }) => {
    await write(page, 1200);
    await refresh(page).click();
    let dialog = page.getByRole("alertdialog");
    await dialog
      .getByRole("button", { name: "Continuer la modification" })
      .click();
    await expect(refresh(page)).toBeFocused();
    await expect(field(page)).toHaveValue("1200");
    await refresh(page).click();
    api.getMode = "hold";
    await dialog
      .getByRole("button", { name: "Abandonner et actualiser" })
      .click();
    await expect(refresh(page)).toBeFocused();
    await expect(refresh(page)).toHaveAttribute("aria-busy", "true");
    await refresh(page).press("Enter");
    await expect.poll(() => api.held.length).toBe(1);
    api.held.shift().resolve();
    await expect(field(page)).toHaveValue("1095");
    await expect(refresh(page)).toBeFocused();
  });
  await run("navigation-draft-cancel-and-leave", 390, async ({ page }) => {
    await write(page, 1200);
    const link = page.locator("#audit-leave");
    await link.focus();
    await link.press("Enter");
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Rester", exact: true })
      .click();
    await expect(link).toBeFocused();
    await expect(field(page)).toHaveValue("1200");
    await link.press("Enter");
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Quitter sans enregistrer", exact: true })
      .click();
    await expect(
      page.getByRole("heading", { name: "Destination simulée" }),
    ).toBeVisible();
  });
  await run(
    "numeric-equivalence-default-and-reduction-cancel",
    1440,
    async ({ page, api }) => {
      await open(page);
      await field(page).fill("01095");
      await expect(save(page)).toHaveCount(0);
      await refresh(page).click();
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      await expect(field(page)).toHaveValue("1095");
      await write(page, 1400);
      await row(page)
        .getByRole("button", { name: /^Rétablir la valeur par défaut/ })
        .click();
      await expect(field(page)).toHaveValue("1095");
      await expect(field(page)).toBeFocused();
      await expect(save(page)).toHaveCount(0);
      await field(page).fill("900");
      await save(page).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", {
          name: "Conserver la durée actuelle",
          exact: true,
        })
        .click();
      await expect(field(page)).toBeFocused();
      await expect(field(page)).toHaveValue("900");
      assert.equal(writes(api).length, 0);
    },
  );
  await run(
    "initial-error-retry-focus",
    390,
    async ({ page, api }) => {
      await expect(
        page.getByText("Paramètres indisponibles", { exact: true }),
      ).toBeVisible();
      api.getMode = "success";
      await page
        .getByRole("button", { name: "Réessayer", exact: true })
        .click();
      await expect(field(page)).toBeVisible();
      const actual = await focus(page);
      assert.notEqual(actual.tag, "BODY", JSON.stringify(actual));
    },
    { getMode: "error" },
  );
  await run(
    "incomplete-catalogue",
    320,
    async ({ page }) => {
      await expect(
        page.getByText("Catalogue de paramètres incomplet", { exact: true }),
      ).toBeVisible();
      await expect(row(page)).toHaveCount(0);
      return noOverflow(page);
    },
    { getMode: "incomplete" },
  );
  await run(
    "refresh-error-preserves-draft-retry-focus",
    1440,
    async ({ page, api }) => {
      await write(page, 1200);
      api.getMode = "error";
      await refresh(page).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Abandonner et actualiser" })
        .click();
      await expect(field(page)).toHaveValue("1200");
      await expect(
        page.getByText("Actualisation impossible", { exact: true }),
      ).toBeVisible();
      api.getMode = "success";
      await page
        .getByRole("button", { name: "Réessayer", exact: true })
        .click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Abandonner et actualiser" })
        .click();
      await expect(field(page)).toHaveValue("1095");
      assert.notEqual((await focus(page)).tag, "BODY");
    },
  );
  await run(
    "conflict-reread-unavailable-then-keep-draft",
    390,
    async ({ page, api }) => {
      await write(page, 1600);
      api.putMode = "conflict";
      api.getMode = "error";
      api.item = { ...api.item, value: 1460, version: 3 };
      await save(page).click();
      await expect(
        row(page).getByRole("button", {
          name: "Vérifier la valeur actuelle",
          exact: true,
        }),
      ).toBeVisible();
      await expect(field(page)).toHaveValue("1600");
      await expect(save(page)).toBeDisabled();
      api.getMode = "success";
      await row(page)
        .getByRole("button", {
          name: "Vérifier la valeur actuelle",
          exact: true,
        })
        .click();
      await expect(
        row(page).getByRole("button", {
          name: "Conserver ma saisie",
          exact: true,
        }),
      ).toBeVisible();
      assert.notEqual((await focus(page)).tag, "BODY");
      await row(page)
        .getByRole("button", { name: "Conserver ma saisie", exact: true })
        .click();
      await expect(field(page)).toBeFocused();
      await expect(field(page)).toHaveValue("1600");
      api.putMode = "success";
      await save(page).click();
      await expect(field(page)).toBeFocused();
      await expect(save(page)).toHaveCount(0);
      assert.equal(writes(api).at(-1).body.expectedVersion, 3);
    },
  );
  await run("conflict-adopt-current", 1440, async ({ page, api }) => {
    await write(page, 1600);
    api.item = { ...api.item, value: 1460, version: 3 };
    api.putMode = "conflict";
    await save(page).click();
    await row(page)
      .getByRole("button", { name: "Utiliser la valeur actuelle", exact: true })
      .click();
    await expect(field(page)).toHaveValue("1460");
    await expect(field(page)).toBeFocused();
    await expect(save(page)).toHaveCount(0);
    assert.equal(writes(api).length, 1);
  });
  for (const mode of ["forbidden-json", "forbidden-html"])
    await run("refresh-denied-" + mode, 390, async ({ page, api }) => {
      await field(page).waitFor();
      api.getMode = mode;
      await refresh(page).click();
      await expect(row(page)).toHaveCount(0);
      await expect(page.getByRole("spinbutton")).toHaveCount(0);
      assert.notEqual((await focus(page)).tag, "BODY");
    });
  for (const mode of ["commit-abort", "error"])
    await run("write-uncertain-" + mode, 390, async ({ page, api }) => {
      await write(page, 1600);
      api.putMode = mode;
      await save(page).click();
      await expect(field(page)).toHaveValue("1600");
      await expect(save(page)).toBeDisabled();
      const verify = row(page).getByRole("button", {
        name: "Vérifier la valeur actuelle",
        exact: true,
      });
      await expect(verify).toBeVisible();
      await expect(field(page)).toBeFocused();
      assert.equal(writes(api).length, 1);
      api.putMode = "success";
      await verify.click();
      await expect(
        row(page).getByRole("button", {
          name: "Utiliser la valeur actuelle",
          exact: true,
        }),
      ).toBeVisible();
      await row(page)
        .getByRole("button", {
          name:
            mode === "commit-abort"
              ? "Utiliser la valeur actuelle"
              : "Conserver ma saisie",
          exact: true,
        })
        .click();
      await expect(field(page)).toBeFocused();
      if (mode === "commit-abort") {
        await expect(save(page)).toHaveCount(0);
        assert.equal(writes(api).length, 1);
      } else {
        await save(page).click();
        await expect(field(page)).toBeFocused();
        await expect(save(page)).toHaveCount(0);
        assert.equal(writes(api).length, 2);
      }
    });
  await run("uncertain-cancel-keeps-verification", 390, async ({ page, api }) => {
    await write(page, 1600);
    api.putMode = "commit-abort";
    await save(page).click();
    const verify = row(page).getByRole("button", { name: "Vérifier la valeur actuelle", exact: true });
    await expect(verify).toBeVisible();
    const cancel = row(page).getByRole("button", { name: "Annuler", exact: true });
    await cancel.click();
    await expect(field(page)).toHaveValue("1095");
    await expect(field(page)).toBeFocused();
    await expect(cancel).toBeDisabled();
    await expect(save(page)).toBeDisabled();
    await verify.click();
    await row(page).getByRole("button", { name: "Utiliser la valeur actuelle", exact: true }).click();
    await expect(field(page)).toHaveValue("1600");
    await expect(field(page)).toBeFocused();
    await expect(save(page)).toHaveCount(0);
    assert.equal(writes(api).length, 1);
  });
  await run(
    "reduction-stepup-invalid-then-valid",
    390,
    async ({ page, api }) => {
      await write(page, 900);
      api.proofNeeded = true;
      await save(page).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Réduire la durée", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      const password = dialog.locator("input[type=password]");
      await expect(password).toBeFocused();
      // Since 25 October 2026 (REV-07), the password field carries its
      // autofill token.
      await expect(password).toHaveAttribute("autocomplete", "current-password");
      api.proofMode = "invalid";
      await password.fill("FICTIF-erreur!2026");
      await password.press("Enter");
      await expect(dialog.getByRole("alert")).toContainText("incorrect");
      await expect(password).toBeFocused();
      api.proofMode = "success";
      await password.fill("FICTIF-preuve!2026");
      await password.press("Enter");
      await expect(dialog).toHaveCount(0);
      await expect(field(page)).toBeFocused();
      await expect(save(page)).toHaveCount(0);
      assert.equal(writes(api).length, 2);
      assert.equal(
        api.requests.filter((r) => r.path === "/api/auth/step-up").length,
        2,
      );
    },
  );
  // 25 October 2026: a plain refresh keeps focus on « Actualiser »; only a
  // vanished « Réessayer » moves it into the content.
  await run("refresh-keeps-trigger-focus", 390, async ({ page, api }) => {
    await expect(field(page)).toBeVisible();
    const before = api.requests.length;
    await refresh(page).click();
    await expect.poll(() => api.requests.length).toBeGreaterThan(before);
    await expect(field(page)).toHaveValue("1095");
    // The former code moved focus one animation frame after the reload.
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    assert.equal(
      await refresh(page).evaluate(
        (element) => element === document.activeElement,
      ),
      true,
    );
  });
  await run("actor-change-during-save", 390, async ({ page, api }) => {
    await write(page, 1200);
    api.putMode = "hold";
    await save(page).click();
    await expect.poll(() => api.held.length).toBe(1);
    await page.evaluate(() => window.__auditSetActor({ id: "audit-actor-b" }));
    await expect(field(page)).toBeEnabled();
    api.held.shift().resolve();
    await expect(field(page)).toHaveValue("1095");
    await expect(save(page)).toHaveCount(0);
    await expect(page.getByText(/mis à jour avec succès/)).toHaveCount(0);
  });
  await run(
    "rights-removed-during-reduction-proof",
    390,
    async ({ page, api }) => {
      await write(page, 900);
      api.proofNeeded = true;
      await save(page).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Réduire la durée", exact: true })
        .click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.evaluate(() =>
        window.__auditSetActor({
          isProtected: false,
          role: "USER",
          permissions: {},
        }),
      );
      await expect(page.getByRole("dialog")).toHaveCount(0);
      await expect(row(page)).toHaveCount(0);
      assert.equal(writes(api).length, 1);
    },
  );
  await run(
    "admin-role-bound-ignores-invalid-override",
    320,
    async ({ page }) => {
      await expect(row(page)).toBeVisible();
      await expect(field(page)).toBeEnabled();
      await expect(save(page)).toHaveCount(0);
      return noOverflow(page);
    },
    {
      actor: {
        isProtected: false,
        role: "ADMIN",
        permissions: { "settings:view": true, "settings:update": false },
      },
    },
  );
  await run(
    "no-settings-access",
    320,
    async ({ page, api }) => {
      await expect(row(page)).toHaveCount(0);
      await expect(page.getByRole("heading", { name: /Accès/ })).toBeVisible();
      assert.equal(api.requests.length, 0);
      return noOverflow(page);
    },
    { actor: { isProtected: false, role: "USER", permissions: {} } },
  );
  await run(
    "strictmode-load-and-cancel",
    1920,
    async ({ page }) => {
      await open(page);
      await field(page).fill("1200");
      await row(page)
        .getByRole("button", { name: "Annuler", exact: true })
        .click();
      await expect(field(page)).toBeFocused();
      await expect(save(page)).toHaveCount(0);
      return noOverflow(page);
    },
    { strict: true },
  );
  await run(
    "forced-colors-small-height",
    390,
    async ({ page }) => {
      await write(page, 900);
      await save(page).click();
      const dialog = page.getByRole("alertdialog");
      await expect(dialog).toBeVisible();
      await dialog
        .getByRole("button", {
          name: "Conserver la durée actuelle",
          exact: true,
        })
        .click();
      await expect(field(page)).toBeFocused();
      return noOverflow(page);
    },
    { forcedColors: true, height: 550 },
  );
  await run("step-up-refusal-focus", 390, async ({ page, api }) => {
    await write(page, 900);
    api.proofNeeded = true;
    await save(page).click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Réduire la durée", exact: true })
      .click();
    const dialog = page.getByRole("dialog");
    const password = dialog.locator("input[type=password]");
    await expect(password).toBeVisible();
    api.proofMode = "invalid";
    await password.fill("FICTIF-erreur!2026");
    await password.press("Enter");
    await expect(dialog.getByRole("alert")).toContainText("incorrect");
    await expect(password).toBeFocused();
  });
  await run(
    "invalid-stored-value-explicit-repair",
    390,
    async ({ page, api }) => {
      await expect(
        row(page).getByText("Valeur à réparer.", { exact: true }),
      ).toBeVisible();
      await expect(field(page)).toHaveAccessibleName(/Durée proposée/);
      await expect(
        row(page).getByText("Durée appliquée", { exact: true }),
      ).toHaveCount(0);
      await open(page);
      await expect(field(page)).toHaveValue("1095");
      await expect(save(page)).toBeEnabled();
      api.proofNeeded = true;
      await field(page).press("Enter");
      const warning = page.getByRole("alertdialog");
      await expect(
        warning.getByRole("heading", {
          name: "Réparer la durée de conservation ?",
          exact: true,
        }),
      ).toBeVisible();
      await warning
        .getByRole("button", { name: "Réparer la durée", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      await expect(
        dialog.getByRole("heading", {
          name: "Confirmer cette réparation",
          exact: true,
        }),
      ).toBeVisible();
      await expect(dialog.locator("input[type=password]")).toBeFocused();
      await dialog.locator("input[type=password]").fill("FICTIF-preuve!2026");
      await dialog.locator("input[type=password]").press("Enter");
      await expect(dialog).toHaveCount(0);
      await expect(field(page)).toBeFocused();
      await expect(save(page)).toHaveCount(0);
      await expect(field(page)).toHaveAccessibleName(/Durée de conservation/);
      await expect(
        row(page).getByText("Valeur à réparer.", { exact: true }),
      ).toHaveCount(0);
      assert.equal(api.item.isStoredValueInvalid, false);
      assert.equal(api.item.value, 1095);
      assert.equal(api.item.version, 5);
      assert.equal(writes(api).length, 2);
    },
    {
      item: {
        isStoredValueInvalid: true,
        version: 4,
        updatedAt: "2026-10-11T12:00:00Z",
      },
    },
  );
  // The "critical-mfa" proof kind was removed on 24 October 2026 (REV-03);
  // the shared dialog now has a full and a password-only mode.
  await run(
    "shared-step-up-password-refusal-focus",
    390,
    async ({ page, api }) => {
      await page
        .getByRole("button", {
          name: "Confirmer une opération fictive",
          exact: true,
        })
        .click();
      const dialog = page.getByRole("dialog");
      const password = dialog.locator("input[type=password]");
      await expect(dialog.locator("input[inputmode=numeric]")).toHaveCount(0);
      api.proofMode = "invalid";
      await password.fill("FICTIF-erreur!2026");
      await password.press("Enter");
      await expect(dialog.getByRole("alert")).toContainText("incorrect");
      await expect(password).toBeFocused();
      api.proofMode = "success";
      await password.fill("FICTIF-preuve!2026");
      await password.press("Enter");
      await expect(dialog).toHaveCount(0);
      await expect(
        page.getByRole("button", {
          name: "Confirmer une opération fictive",
          exact: true,
        }),
      ).toBeFocused();
    },
    { stepUpKind: "password" },
  );
  for (const kind of ["full"])
    await run(
      "shared-step-up-" + kind + "-refusal-focus",
      390,
      async ({ page, api }) => {
        await page
          .getByRole("button", {
            name: "Confirmer une opération fictive",
            exact: true,
          })
          .click();
        const dialog = page.getByRole("dialog");
        if (kind === "full")
          await dialog
            .locator("input[type=password]")
            .fill("FICTIF-preuve!2026");
        const code = dialog.locator("input[inputmode=numeric]");
        await code.fill("123456");
        api.proofMode = "invalid-totp";
        await code.press("Enter");
        await expect(dialog.getByRole("alert")).toContainText(
          "code est incorrect",
        );
        await expect(code).toBeEnabled();
        await expect(code).toHaveValue("");
        await expect(code).toBeFocused();
        api.proofMode = "success";
        await code.fill("234567");
        await code.press("Enter");
        await expect(dialog).toHaveCount(0);
        await expect(
          page.getByRole("button", {
            name: "Confirmer une opération fictive",
            exact: true,
          }),
        ).toBeFocused();
      },
      { stepUpKind: kind },
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
