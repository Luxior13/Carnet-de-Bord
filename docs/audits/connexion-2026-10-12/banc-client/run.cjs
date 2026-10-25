const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const { execFileSync } = require("node:child_process");
const assert = require("node:assert/strict");
const esbuild = require("esbuild");
const postcss = require("postcss");
const tailwind = require("@tailwindcss/postcss");
const { chromium, expect } = require("@playwright/test");

const root = path.resolve(__dirname, "../../../..");
const baselineMfa = process.env.AUDIT_BASELINE_MFA === "1";
const work = fs.mkdtempSync(path.join(os.tmpdir(), "noctambule-login-client-"));
const password = "Fictif-Uniquement-37!";
const totp = "123456";
const recovery = "ABCD-EFGH-IJKL-MNOP-QRST-UVWX";
const redact = (value) =>
  String(value)
    .replaceAll(password, "[mot de passe fictif masqué]")
    .replaceAll(recovery, "[code fictif masqué]");
console.log("Résultats : " + work);

async function main() {
  const mock = JSON.stringify(path.join(__dirname, "mocks.tsx"));
  const aliases = {
    "next/navigation": `export {useRouter,usePathname,useSearchParams} from ${mock};`,
    "next/image": `export {Image as default} from ${mock};`,
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
        name: "isolated-login-navigation",
        setup(build) {
          if (baselineMfa)
            build.onLoad({ filter: /[/\\]MfaCodeInput\.tsx$/ }, () => ({
              contents: execFileSync(
                "git",
                [
                  "show",
                  "0fd674a:apps/web/src/features/auth/components/MfaCodeInput.tsx",
                ],
                { cwd: root, encoding: "utf8" },
              ),
              loader: "tsx",
              resolveDir: path.join(
                root,
                "apps/web/src/features/auth/components",
              ),
            }));
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
    if (name === "/assets/noc.png") {
      res.setHeader("Content-Type", "image/png");
      return res.end(
        fs.readFileSync(path.join(root, "apps/web/public/assets/noc.png")),
      );
    }
    res.setHeader("Content-Type", "text/html");
    res.end(
      '<!doctype html><html lang="fr" class="dark"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"><link rel="stylesheet" href="/bundle.css"><style>:root{--font-geist-sans:Arial,sans-serif;--font-geist-mono:monospace}</style></head><body><div id="root"></div><script src="/bundle.js"></script></body></html>',
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${server.address().port}`;
  const browser = await chromium.launch();
  const observations = [];
  const loginField = (page) => page.locator("#loginName");
  const passField = (page) => page.locator("#password");
  const codeField = (page) => page.locator("#login-mfa-code");
  const credentialsSubmit = (page) =>
    page.getByRole("button", { name: "Se connecter", exact: true });
  const verifySubmit = (page) =>
    page.getByRole("button", { name: "Vérifier et se connecter", exact: true });
  const account = {
    id: "audit-login-account",
    loginName: "camille.exemple",
    firstName: "Camille",
    lastName: "Exemple",
    contactEmail: null,
    contactEmailVerifiedAt: null,
    createdAt: "2026-01-01T10:00:00Z",
    updatedAt: "2026-10-12T10:00:00Z",
    failedLoginAttempts: 0,
    isActive: true,
    isProtected: false,
    lastLoginAt: null,
    lockedUntil: null,
    mfaEnabledAt: "2026-09-01T10:00:00Z",
    mustChangePassword: false,
    passwordChangedAt: "2026-09-01T10:00:00Z",
    permissions: {},
    role: "USER",
  };
  const session = {
    expiresAt: "2027-01-01T10:00:00Z",
    idleExpiresAt: "2027-01-01T10:00:00Z",
    lastSeenAt: "2026-10-12T10:00:00Z",
    rememberMe: false,
  };
  const authData = {
    status: "authenticated",
    user: account,
    session,
    mustChangePassword: false,
  };
  async function noOverflow(page) {
    const metrics = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      dialog: [...document.querySelectorAll('[role="dialog"]')].map((node) => ({
        width: node.clientWidth,
        content: node.scrollWidth,
      })),
    }));
    assert.ok(
      metrics.document <= metrics.viewport + 1,
      JSON.stringify(metrics),
    );
    assert.ok(metrics.body <= metrics.viewport + 1, JSON.stringify(metrics));
    for (const dialog of metrics.dialog)
      assert.ok(dialog.content <= dialog.width + 1, JSON.stringify(metrics));
    return metrics;
  }
  async function noAutocomplete(page) {
    const attributes = await page
      .locator('input:not([type="hidden"]):not([type="checkbox"])')
      .evaluateAll((nodes) =>
        nodes.map((node) => ({
          id: node.id,
          autocomplete: node.getAttribute("autocomplete"),
          bitwarden: node.getAttribute("data-bwignore"),
          onepassword: node.getAttribute("data-1p-ignore"),
          lastpass: node.getAttribute("data-lpignore"),
        })),
      );
    // Since 25 October 2026 (REV-07), authentication fields carry their
    // autofill token; every other field, recovery codes included, stays off.
    const tokens = [
      "current-password",
      "new-password",
      "one-time-code",
      "username",
    ];
    for (const item of attributes) {
      if (tokens.includes(item.autocomplete)) {
        assert.equal(item.bitwarden, null);
        continue;
      }
      assert.equal(item.autocomplete, "off", JSON.stringify(item));
      assert.equal(item.bitwarden, "true");
      assert.equal(item.onepassword, "true");
      assert.equal(item.lastpass, "true");
    }
    for (const form of await page.locator("form").all())
      await expect(form).toHaveAttribute("autocomplete", "off");
    return attributes;
  }
  async function credentials(page) {
    await loginField(page).fill(" Camille.Exemple ");
    await passField(page).fill(password);
  }
  async function enterMfa(page, api) {
    api.loginMode = "mfa";
    await credentials(page);
    await passField(page).press("Enter");
    await expect(codeField(page)).toBeVisible();
  }
  async function enterSetup(page, api) {
    api.loginMode = "setup";
    await credentials(page);
    await passField(page).press("Enter");
    await expect(
      page.getByRole("button", { name: "Configurer maintenant" }),
    ).toBeVisible();
  }
  async function scan(page, api) {
    await enterSetup(page, api);
    await page.getByRole("button", { name: "Configurer maintenant" }).click();
    await expect(page.locator("#mfa-setup-code")).toBeVisible();
  }
  async function finishMfa(page, api) {
    api.verifyMode = "success";
    await codeField(page).fill(totp);
    await verifySubmit(page).click();
    await expect(
      page.getByRole("heading", { name: "Destination simulée" }),
    ).toBeVisible();
  }
  async function run(name, width, fn, options = {}) {
    if (process.env.AUDIT_ONLY && !name.includes(process.env.AUDIT_ONLY))
      return;
    const context = await browser.newContext({
      viewport: { width, height: options.height ?? 900 },
      reducedMotion: "reduce",
      timezoneId: "Europe/Paris",
      acceptDownloads: true,
      ...(options.forcedColors ? { forcedColors: "active" } : {}),
      ...(options.nativeClipboard
        ? { permissions: ["clipboard-read", "clipboard-write"] }
        : {}),
    });
    await context.addInitScript((options) => {
      window.__auditOptions = options;
      window.__auditClipboardCalls = 0;
      window.__auditClipboardFail = false;
      if (!options.nativeClipboard)
        Object.defineProperty(navigator, "clipboard", {
          configurable: true,
          value: {
            writeText: async () => {
              window.__auditClipboardCalls++;
              if (window.__auditClipboardFail)
                throw new Error("Fictional clipboard refusal");
            },
          },
        });
      if (options.blockedStorage)
        for (const key of ["localStorage", "sessionStorage"])
          Object.defineProperty(window, key, {
            configurable: true,
            get() {
              throw new DOMException("Storage blocked", "SecurityError");
            },
          });
      if (options.fastTimeout) {
        const original = window.setTimeout.bind(window);
        window.setTimeout = (handler, delay, ...args) =>
          original(
            handler,
            delay === 30_000 || delay === 15_000 ? 120 : delay,
            ...args,
          );
      }
    }, options);
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const api = {
      loginMode: "mfa",
      verifyMode: "success",
      startMode: "success",
      confirmMode: "success",
      cancelMode: "success",
      meMode: options.meMode ?? "anonymous",
      authenticated: false,
      requests: [],
      held: [],
    };
    const count = (method, endpoint) =>
      api.requests.filter(
        (item) => item.method === method && item.path.endsWith(endpoint),
      ).length;
    api.count = count;
    await page.route("**/api/**", async (route) => {
      const req = route.request(),
        pathname = new URL(req.url()).pathname,
        method = req.method();
      let body = {};
      try {
        body = req.postDataJSON() ?? {};
      } catch {}
      api.requests.push({
        path: pathname,
        method,
        keys: Object.keys(body),
        ...(Object.hasOwn(body, "rememberMe")
          ? { rememberMe: body.rememberMe }
          : {}),
        ...(Object.hasOwn(body, "loginName")
          ? { normalizedLogin: body.loginName === "camille.exemple" }
          : {}),
      });
      const json = (status, payload) =>
        route.fulfill({
          status,
          contentType: "application/json",
          body: JSON.stringify(payload),
        });
      const success = (data) => json(200, { success: true, data });
      const failure = (status, code, message) =>
        json(status, { success: false, error: { code, message } });
      const selected = pathname.endsWith("/login")
        ? api.loginMode
        : pathname.endsWith("/verify")
          ? api.verifyMode
          : pathname.endsWith("/setup")
            ? method === "POST"
              ? api.startMode
              : api.confirmMode
            : pathname.endsWith("/challenge")
              ? api.cancelMode
              : api.meMode;
      if (selected === "hold") {
        api.held.push({ route, success, failure });
        return;
      }
      if (selected === "abort" || selected === "commit-abort") {
        if (selected === "commit-abort") api.authenticated = true;
        return route.abort("failed");
      }
      if (selected === "invalid-json")
        return route.fulfill({
          status: 200,
          contentType: "text/html",
          body: "Invalid simulated response",
        });
      if (selected === "500")
        return failure(500, "INTERNAL_ERROR", "Erreur temporaire fictive");
      if (selected === "429")
        return failure(
          429,
          "RATE_LIMITED",
          "Trop de tentatives. Réessayez plus tard.",
        );
      if (pathname.endsWith("/me")) {
        if (api.authenticated || api.meMode === "authenticated")
          return success({ user: account, session });
        return failure(401, "UNAUTHORIZED", "Connexion requise");
      }
      if (pathname.endsWith("/login")) {
        if (selected === "invalid")
          return failure(
            401,
            "INVALID_CREDENTIALS",
            "Identifiant ou mot de passe incorrect",
          );
        if (selected === "disabled")
          return failure(403, "ACCOUNT_DISABLED", "Ce compte est désactivé");
        return success({
          status: selected === "setup" ? "mfa_setup_required" : "mfa_required",
          challengeExpiresAt: new Date(
            Date.now() + (selected === "expired" ? -1000 : 300000),
          ).toISOString(),
        });
      }
      if (pathname.endsWith("/verify")) {
        if (selected === "invalid")
          return failure(401, "INVALID_MFA_CODE", "Code incorrect ou expiré");
        if (selected === "expired")
          return failure(
            401,
            "MFA_CHALLENGE_EXPIRED",
            "La vérification a expiré. Recommencez la connexion.",
          );
        api.authenticated = true;
        return success(authData);
      }
      if (pathname.endsWith("/challenge")) return success(null);
      if (pathname.endsWith("/setup")) {
        if (selected === "expired")
          return failure(
            401,
            "MFA_CHALLENGE_EXPIRED",
            "La vérification a expiré. Recommencez la connexion.",
          );
        if (selected === "invalid")
          return failure(400, "INVALID_MFA_CODE", "Code incorrect ou expiré");
        if (method === "POST")
          return success({
            expiresAt: new Date(Date.now() + 300000).toISOString(),
            manualKey: "EXEMPLEFICTIFABCD",
            replacing: false,
            qrCodeDataUrl:
              "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=",
          });
        api.authenticated = true;
        return success({
          ...authData,
          recoveryCodes: Array.from({ length: 10 }, (_, index) =>
            String.fromCharCode(65 + index).repeat(24),
          ),
        });
      }
      return failure(404, "NOT_FOUND", "Endpoint non prévu dans le banc");
    });
    try {
      await page.goto(
        origin +
          "/login" +
          (options.next ? "?next=" + encodeURIComponent(options.next) : ""),
      );
      if (options.dialog)
        await expect(
          page.getByRole("button", { name: "Ouvrir la configuration fictive" }),
        ).toBeVisible();
      else if (options.meMode === "authenticated")
        await expect(
          page.getByRole("heading", { name: "Destination simulée" }),
        ).toBeVisible();
      else await expect(loginField(page)).toBeVisible();
      const details = await fn(page, api);
      const metrics = await noOverflow(page);
      assert.deepEqual(errors, []);
      observations.push({
        name,
        width,
        status: "pass",
        ...details,
        metrics,
        requests: api.requests,
      });
      console.log("PASS " + name + " " + width);
    } catch (error) {
      // Deliberately no failure screenshot, HTML or traces: setup/recovery may be visible.
      observations.push({
        name,
        width,
        status: "fail",
        error: redact(error),
        errors,
        requests: api.requests,
        pathname: new URL(page.url()).pathname,
        focus: await page
          .evaluate(() => ({
            tag: document.activeElement?.tagName,
            id: document.activeElement?.id,
          }))
          .catch(() => null),
      });
      console.log("FAIL " + name + " " + width + ": " + redact(error));
    } finally {
      await context.close();
    }
  }
  try {
    for (const width of [320, 390, 768, 1024, 1280, 1440, 1920])
      await run("identifiants-responsive-clavier", width, async (page) => {
        await expect(loginField(page)).toBeFocused();
        await expect(credentialsSubmit(page)).toBeDisabled();
        const attributes = await noAutocomplete(page);
        await expect(loginField(page)).toHaveAttribute("maxlength", "32");
        await page.keyboard.press("Tab");
        await expect(passField(page)).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(
          page.getByRole("button", { name: "Afficher le mot de passe" }),
        ).toBeFocused();
        await page.keyboard.press("Enter");
        await expect(passField(page)).toHaveAttribute("type", "text");
        await page.keyboard.press("Enter");
        await expect(passField(page)).toHaveAttribute("type", "password");
        await page.keyboard.press("Tab");
        await expect(page.getByRole("checkbox")).toBeFocused();
        await page.keyboard.press("Space");
        await expect(page.getByRole("checkbox")).toBeChecked();
        if ([320, 1440].includes(width))
          await page.screenshot({
            path: path.join(work, `identifiants-vides-${width}.png`),
          });
        return { attributes };
      });
    for (const width of [390, 1440])
      await run(
        "refus-identifiants-et-mfa-puis-secours",
        width,
        async (page, api) => {
          await credentials(page);
          api.loginMode = "invalid";
          await passField(page).press("Enter");
          await expect(
            page
              .getByRole("alert")
              .filter({ hasText: "Identifiant ou mot de passe incorrect" })
              .first(),
          ).toBeVisible();
          await expect(page.getByRole("alert").first()).toBeFocused();
          await page.keyboard.press("Tab");
          await expect(loginField(page)).toBeFocused();
          await passField(page).fill(password);
          api.loginMode = "mfa";
          await credentialsSubmit(page).click();
          await expect(codeField(page)).toBeFocused();
          await noAutocomplete(page);
          api.verifyMode = "invalid";
          await codeField(page).fill(totp);
          await codeField(page).press("Enter");
          await expect(codeField(page)).toHaveValue("");
          await expect(page.getByRole("alert").first()).toBeFocused();
          await page.keyboard.press("Tab");
          await expect(codeField(page)).toBeFocused();
          await page
            .getByRole("button", { name: "Utiliser un code de secours" })
            .click();
          await expect(codeField(page)).toBeFocused();
          await expect(codeField(page)).toHaveAttribute("inputmode", "text");
          await noAutocomplete(page);
          await codeField(page).fill(recovery);
          api.verifyMode = "success";
          await verifySubmit(page).click();
          await expect(
            page.getByRole("heading", { name: "Destination simulée" }),
          ).toBeVisible();
        },
      );
    await run("soumissions-doubles-et-remember", 390, async (page, api) => {
      await credentials(page);
      await page.getByRole("checkbox").check();
      api.loginMode = "hold";
      await page.locator("form").evaluate((form) => {
        form.requestSubmit();
        form.requestSubmit();
      });
      await expect.poll(() => api.count("POST", "/login")).toBe(1);
      await expect(passField(page)).toBeDisabled();
      assert.equal(
        api.requests.find((item) => item.path.endsWith("/login")).rememberMe,
        true,
      );
      assert.equal(
        api.requests.find((item) => item.path.endsWith("/login"))
          .normalizedLogin,
        true,
      );
      await api.held.shift().success({
        status: "mfa_required",
        challengeExpiresAt: new Date(Date.now() + 300000).toISOString(),
      });
      await expect(codeField(page)).toBeVisible();
      await codeField(page).fill(totp);
      api.verifyMode = "hold";
      await page.locator("form").evaluate((form) => {
        form.requestSubmit();
        form.requestSubmit();
      });
      await expect.poll(() => api.count("POST", "/verify")).toBe(1);
      await expect(codeField(page)).toBeDisabled();
      await api.held.shift().success(authData);
      await expect(
        page.getByRole("heading", { name: "Destination simulée" }),
      ).toBeVisible();
    });
    await run(
      "stockage-bloque-connexion",
      320,
      async (page, api) => {
        await enterMfa(page, api);
        await finishMfa(page, api);
      },
      { blockedStorage: true },
    );
    await run("erreurs-reseau-identifiants-reprise", 390, async (page, api) => {
      for (const mode of ["abort", "invalid-json", "429", "disabled"]) {
        await credentials(page);
        api.loginMode = mode;
        await credentialsSubmit(page).click();
        await expect(page.getByRole("alert").first()).toBeVisible();
        await expect(passField(page)).toBeEnabled();
      }
      await enterMfa(page, api);
      await finishMfa(page, api);
    });
    await run("expiration-mfa-retour-identifiants", 390, async (page, api) => {
      await enterMfa(page, api);
      api.verifyMode = "expired";
      await codeField(page).fill(totp);
      await verifySubmit(page).click();
      await expect(page.getByRole("alert").first()).toBeVisible();
      await page
        .getByRole("button", {
          name: "Retour à l’identifiant et au mot de passe",
        })
        .click();
      await expect(loginField(page)).toBeFocused();
      await expect(passField(page)).toHaveValue("");
      assert.equal(api.count("DELETE", "/challenge"), 1);
      await enterMfa(page, api);
      await finishMfa(page, api);
    });
    await run("retour-attente-et-reseau-refuse", 390, async (page, api) => {
      await enterMfa(page, api);
      api.cancelMode = "hold";
      await page
        .getByRole("button", {
          name: "Retour à l’identifiant et au mot de passe",
        })
        .click();
      await expect.poll(() => api.count("DELETE", "/challenge")).toBe(1);
      await expect(codeField(page)).toBeDisabled();
      await api.held.shift().route.abort();
      await expect(loginField(page)).toBeFocused();
      await expect(passField(page)).toHaveValue("");
    });
    await run(
      "collage-natif-totp-et-secours",
      390,
      async (page, api) => {
        await enterMfa(page, api);
        await page.evaluate(() => navigator.clipboard.writeText("123 456"));
        await codeField(page).focus();
        await page.keyboard.press("Control+V");
        assert.equal(
          (await codeField(page).inputValue()).length,
          6,
          "Le collage natif de six chiffres avec un espace doit garder les six chiffres",
        );
        await expect(codeField(page)).toHaveValue(totp);
        await page
          .getByRole("button", { name: "Utiliser un code de secours" })
          .click();
        await page.evaluate(() =>
          navigator.clipboard.writeText("ABCD EFGH IJKL MNOP QRST UVWX"),
        );
        await page.keyboard.press("Control+V");
        await expect(codeField(page)).toHaveValue(recovery);
        await expect(verifySubmit(page)).toBeEnabled();
      },
      { nativeClipboard: true },
    );
    await run(
      "configuration-complete-copie-et-confirmation",
      320,
      async (page, api) => {
        await scan(page, api);
        await noAutocomplete(page);
        await noOverflow(page);
        await page
          .getByRole("button", { name: "Copier la clé de configuration" })
          .click();
        await expect
          .poll(() => page.evaluate(() => window.__auditClipboardCalls))
          .toBe(1);
        await page.locator("#mfa-setup-code").fill(totp);
        await page.locator("#mfa-setup-code").press("Enter");
        await expect(
          page
            .getByRole("list", { name: "Codes de secours" })
            .getByRole("listitem"),
        ).toHaveCount(10);
        await expect(
          page.getByRole("button", { name: "Terminer", exact: true }),
        ).toBeDisabled();
        const before = await page.evaluate(() => {
          const event = new Event("beforeunload", { cancelable: true });
          window.dispatchEvent(event);
          return event.defaultPrevented;
        });
        assert.equal(before, true);
        await page.getByRole("button", { name: "Copier", exact: true }).click();
        await expect
          .poll(() => page.evaluate(() => window.__auditClipboardCalls))
          .toBe(2);
        const download = page.waitForEvent("download");
        await page.getByRole("button", { name: "Télécharger" }).click();
        assert.match((await download).suggestedFilename(), /^codes-secours-/);
        await page
          .getByRole("checkbox", {
            name: "J’ai enregistré ces codes dans un endroit sûr.",
          })
          .check();
        await noOverflow(page);
        await page
          .getByRole("button", { name: "Terminer", exact: true })
          .click();
        await expect(
          page.getByRole("heading", { name: "Destination simulée" }),
        ).toBeVisible();
        assert.equal(api.count("POST", "/setup"), 1);
        assert.equal(api.count("PUT", "/setup"), 1);
      },
    );
    await run("configuration-erreurs-et-reprise", 390, async (page, api) => {
      await enterSetup(page, api);
      api.startMode = "500";
      await page.getByRole("button", { name: "Configurer maintenant" }).click();
      await expect(page.getByRole("alert")).toBeFocused();
      api.startMode = "success";
      await page.getByRole("button", { name: "Configurer maintenant" }).click();
      await expect(page.locator("#mfa-setup-code")).toBeFocused();
      api.confirmMode = "invalid";
      await page.locator("#mfa-setup-code").fill(totp);
      await page.locator("#mfa-setup-code").press("Enter");
      await expect(page.locator("#mfa-setup-code")).toHaveValue("");
      await expect(page.getByRole("alert").first()).toBeFocused();
      api.confirmMode = "success";
      await page.locator("#mfa-setup-code").fill(totp);
      await page.locator("#mfa-setup-code").press("Enter");
      await expect(
        page.getByRole("checkbox", {
          name: "J’ai enregistré ces codes dans un endroit sûr.",
        }),
      ).toBeFocused();
      await page.evaluate(() => {
        window.__auditClipboardFail = true;
      });
      await page.getByRole("button", { name: "Copier", exact: true }).click();
      await expect(
        page.getByText("Impossible de copier les codes", { exact: true }),
      ).toBeVisible();
    });
    await run("configuration-reponse-perdue", 390, async (page, api) => {
      await scan(page, api);
      api.confirmMode = "commit-abort";
      await page.locator("#mfa-setup-code").fill(totp);
      await page.locator("#mfa-setup-code").press("Enter");
      await expect(page.getByRole("alert").first()).toContainText("peut-être");
      await expect(
        page.getByRole("button", { name: "Recharger le compte" }),
      ).toBeVisible();
      await expect(page.locator("#mfa-setup-code")).toHaveCount(0);
      await expect(
        page.getByRole("img", {
          name: "QR code pour configurer l’application d’authentification",
        }),
      ).toHaveCount(0);
      assert.equal(api.count("PUT", "/setup"), 1);
      await page.getByRole("button", { name: "Recharger le compte" }).click();
      await expect(
        page.getByRole("heading", { name: "Destination simulée" }),
      ).toBeVisible();
    });
    await run(
      "timeouts-identifiants-et-retour",
      390,
      async (page, api) => {
        await credentials(page);
        api.loginMode = "hold";
        await credentialsSubmit(page).click();
        await expect(passField(page)).toBeEnabled();
        await expect(page.getByRole("alert").first()).toBeVisible();
        api.loginMode = "mfa";
        await credentials(page);
        await credentialsSubmit(page).click();
        await expect(codeField(page)).toBeVisible();
        api.cancelMode = "hold";
        await page
          .getByRole("button", {
            name: "Retour à l’identifiant et au mot de passe",
          })
          .click();
        await expect(loginField(page)).toBeFocused();
      },
      { fastTimeout: true },
    );
    await run("reponse-tardive-apres-demontage", 1440, async (page, api) => {
      await credentials(page);
      api.loginMode = "hold";
      await credentialsSubmit(page).click();
      await expect.poll(() => api.count("POST", "/login")).toBe(1);
      await page.evaluate(() => window.__auditUnmount());
      await api.held
        .shift()
        .success({
          status: "mfa_required",
          challengeExpiresAt: new Date(Date.now() + 300000).toISOString(),
        })
        .catch(() => {});
      assert.equal(await page.locator("#root").textContent(), "");
      assert.equal(new URL(page.url()).pathname, "/login");
    });
    for (const [label, next, want] of [
      [
        "interne",
        "/membres/repertoire?q=camille#titre",
        "/membres/repertoire?q=camille#titre",
      ],
      ["externe", "https://example.test/vol", "/"],
    ])
      await run(
        "destination-" + label,
        768,
        async (page, api) => {
          await enterMfa(page, api);
          await finishMfa(page, api);
          const url = new URL(page.url());
          assert.equal(url.pathname + url.search + url.hash, want);
        },
        { next },
      );
    await run(
      "session-deja-authentifiee",
      1024,
      async (page) => {
        assert.equal(new URL(page.url()).pathname, "/mon-compte");
      },
      { meMode: "authenticated", next: "/mon-compte" },
    );
    await run(
      "modale-clavier-annulation",
      390,
      async (page, api) => {
        const trigger = page.getByRole("button", {
          name: "Ouvrir la configuration fictive",
        });
        await trigger.click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        await expect(page.locator("#mfa-current-password")).toBeFocused();
        await noAutocomplete(page);
        await page.keyboard.press("Escape");
        await expect(dialog).toBeVisible();
        for (let index = 0; index < 5; index++) {
          await page.keyboard.press("Tab");
          assert.equal(
            await page.evaluate(
              () => !!document.activeElement?.closest('[role="dialog"]'),
            ),
            true,
          );
        }
        api.cancelMode = "hold";
        await dialog
          .getByRole("button", { name: "Retour", exact: true })
          .click();
        await expect.poll(() => api.count("DELETE", "/challenge")).toBe(1);
        await api.held
          .shift()
          .failure(500, "INTERNAL_ERROR", "Annulation fictive refusée");
        await expect(dialog.getByRole("alert")).toBeFocused();
        api.cancelMode = "success";
        await dialog
          .getByRole("button", { name: "Retour", exact: true })
          .click();
        await expect(dialog).toHaveCount(0);
        await expect(trigger).toBeFocused();
      },
      { dialog: true, height: 550 },
    );
    for (const mode of ["commit-abort", "abort"])
      await run("mfa-reponse-perdue-" + mode, 390, async (page, api) => {
        await enterMfa(page, api);
        await page
          .getByRole("button", { name: "Utiliser un code de secours" })
          .click();
        await codeField(page).fill(recovery);
        api.verifyMode = mode;
        await verifySubmit(page).click();
        await expect(page.getByRole("alert").first()).toContainText("consommé");
        await expect(verifySubmit(page)).toHaveCount(0);
        await expect(page.getByRole("alert").first()).toBeFocused();
        assert.equal(api.count("POST", "/verify"), 1);
        await page
          .getByRole("button", { name: "Vérifier la session", exact: true })
          .click();
        if (mode === "commit-abort")
          await expect(
            page.getByRole("heading", { name: "Destination simulée" }),
          ).toBeVisible();
        else {
          await expect(page.getByRole("alert").first()).toContainText(
            "Aucune session active",
          );
          await expect(verifySubmit(page)).toHaveCount(0);
          await page
            .getByRole("button", {
              name: "Recommencer la connexion",
              exact: true,
            })
            .click();
          await expect(loginField(page)).toBeFocused();
          await enterMfa(page, api);
          await finishMfa(page, api);
        }
        assert.equal(
          api.count("POST", "/verify"),
          mode === "commit-abort" ? 1 : 2,
        );
      });
    await run(
      "configuration-timeouts-preparation-confirmation",
      390,
      async (page, api) => {
        await enterSetup(page, api);
        api.startMode = "hold";
        await page
          .getByRole("button", { name: "Configurer maintenant" })
          .click();
        await expect(page.getByRole("alert").first()).toBeFocused();
        await expect(
          page.getByRole("button", { name: "Configurer maintenant" }),
        ).toBeEnabled();
        api.startMode = "success";
        await page
          .getByRole("button", { name: "Configurer maintenant" })
          .click();
        await expect(page.locator("#mfa-setup-code")).toBeVisible();
        api.confirmMode = "hold";
        await page.locator("#mfa-setup-code").fill(totp);
        await page.locator("#mfa-setup-code").press("Enter");
        await expect(page.getByRole("alert").first()).toContainText(
          "peut-être",
        );
        await expect(
          page.getByRole("button", { name: "Recharger le compte" }),
        ).toBeEnabled();
        await expect(page.locator("#mfa-setup-code")).toHaveCount(0);
        assert.equal(api.count("POST", "/setup"), 2);
        assert.equal(api.count("PUT", "/setup"), 1);
      },
      { fastTimeout: true },
    );
    await run(
      "modale-obligatoire-configuration-expiree",
      390,
      async (page, api) => {
        await page
          .getByRole("button", { name: "Ouvrir la configuration fictive" })
          .click();
        const dialog = page.getByRole("dialog");
        await page.locator("#mfa-current-password").fill(password);
        await dialog
          .getByRole("button", { name: "Continuer", exact: true })
          .click();
        await expect(page.locator("#mfa-setup-code")).toBeVisible();
        api.confirmMode = "expired";
        await page.locator("#mfa-setup-code").fill(totp);
        await page.locator("#mfa-setup-code").press("Enter");
        await expect(page.locator("#mfa-current-password")).toBeVisible();
        await expect(dialog.getByRole("alert")).toBeFocused();
        await expect(
          dialog.getByRole("img", {
            name: "QR code pour configurer l’application d’authentification",
          }),
        ).toHaveCount(0);
        await expect(
          dialog.getByRole("button", { name: "Continuer", exact: true }),
        ).toBeDisabled();
        await expect(
          dialog.getByRole("button", { name: /Annuler|Retour/ }),
        ).toHaveCount(0);
        assert.equal(api.count("POST", "/setup"), 1);
        await page.locator("#mfa-current-password").fill(password);
        await dialog
          .getByRole("button", { name: "Continuer", exact: true })
          .click();
        await expect(page.locator("#mfa-setup-code")).toBeVisible();
        assert.equal(api.count("POST", "/setup"), 2);
      },
      { dialog: true, mandatory: true },
    );
    await run(
      "strictmode-connexion",
      1280,
      async (page, api) => {
        await enterMfa(page, api);
        await finishMfa(page, api);
        assert.equal(api.count("POST", "/login"), 1);
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
      sourceMode: baselineMfa
        ? "MfaCodeInput from 0fd674a, current LoginPage/UserProvider"
        : "current working tree",
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
