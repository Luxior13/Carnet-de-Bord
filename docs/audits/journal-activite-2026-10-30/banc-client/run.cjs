const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const assert = require("node:assert/strict");
const esbuild = require("esbuild");
const postcss = require("postcss");
const tailwind = require("@tailwindcss/postcss");
const { chromium, expect } = require("@playwright/test");

// Client bench of the rebuilt activity journal (30 October 2026): real
// components and styles, simulated session, router and API. Fictive data.
const root = path.resolve(__dirname, "../../../..");
const work = fs.mkdtempSync(path.join(os.tmpdir(), "noctambule-journal-client-"));
console.log("Résultats : " + work);

const NOW = new Date("2026-10-30T15:00:00+01:00");
const TYPES = {
  accounts: "Comptes et droits",
  persons: "Personnes",
  security: "Sécurité",
  settings: "Paramètres",
};
const actor = (id, name, loginName) => ({ id, loginName, name });
const camille = actor("admin-1", "Camille Exemple", "camille.exemple");
const alex = actor("user-2", "Alex Martin-Fontaine de la Grande Rivière", "alex.martin");

/** A record rewritten in one save: fourteen changes (31 October 2026). */
const MANY_CHANGES = [
  ["Identité", "Prénom", "Maxime", "Maximilien"],
  ["Identité", "Nom", "Fontaine", "De La Fontaine"],
  ["Identité", "Pseudo", "MaxLF", "MaxLaFontaineOfficiel"],
  ["Identité", "Naissance", "—", "12 mars 2001"],
  ["Identité", "Statut", "Membre", "Bénévole"],
  ["Structure", "Rattachement", "Hors structure", "Dans la structure"],
  ["Coordonnées", "Email", "—", "max@exemple-association.fr"],
  ["Coordonnées", "Email", "—", "maximilien@exemple.fr"],
  ["Coordonnées", "Téléphone", "—", "Valeur masquée"],
  ["Coordonnées", "Principal", "Non", "Oui"],
  ["Réseaux", "Réseau", "—", "Twitch"],
  ["Réseaux", "Lien du profil", "—", "twitch.tv/maxlf"],
  ["Réseaux", "Réseau", "—", "X"],
  ["Réseaux", "Lien du profil", "—", "x.com/maxlf"],
].map(([section, field, before, after]) => ({
  after,
  before,
  field,
  label: `${section} · ${field}`,
}));

/** 120 fictive events, newest first, as the server projects them. */
const buildEvents = () => {
  const events = [];
  for (let index = 0; index < 120; index += 1) {
    const at = new Date(NOW.getTime() - index * 47 * 60_000).toISOString();
    const kind = index % 5;
    const base = {
      at,
      browser: "Windows · Chrome",
      changes: [],
      facts: [],
      id: `event-${index}`,
      ip: null,
      ipMasked: true,
      subject: null,
      target: null,
    };
    if (kind === 0)
      events.push({
        ...base,
        actor: actor(null, "Aucun compte reconnu", null),
        facts: [{ label: "Motif", value: "Identifiant ou mot de passe incorrect" }],
        label: "Connexion échouée",
        subject: "Connexion échouée: alex.martin",
        tone: "failure",
        typeLabel: TYPES.security,
      });
    else if (kind === 1)
      events.push({
        ...base,
        actor: camille,
        facts: [
          { label: "Accordées", value: "Consulter le répertoire, Modifier les fiches du répertoire" },
        ],
        label: "Autorisations modifiées",
        target: { href: "/systeme/utilisateurs/user-2", id: "user-2", kind: "user", name: alex.name },
        tone: "critical",
        typeLabel: TYPES.accounts,
      });
    else if (kind === 2)
      events.push({
        ...base,
        actor: camille,
        changes:
          index === 7
            ? MANY_CHANGES
            : [
                { after: "Hors structure", before: "Dans la structure", field: "Rattachement", label: "Structure · Rattachement" },
                { after: "maximilien.alexandre.de-la-fontaine@exemple-association.fr", before: "—", field: "Email", label: "Coordonnées · Email" },
                { after: "Valeur masquée", before: "Valeur masquée", field: "Téléphone", label: "Coordonnées · Téléphone" },
              ],
        label: "Fiche modifiée",
        target: { href: "/membres/repertoire/person-1", id: "person-1", kind: "person", name: "MaxLaFontaineOfficiel · Maximilien-Alexandre De La Fontaine" },
        tone: "neutral",
        typeLabel: TYPES.persons,
      });
    else if (kind === 3)
      events.push({
        ...base,
        actor: camille,
        changes: [
          { after: "365 jours (1 an)", before: "1 095 jours (3 ans)", label: "Journal d'activité" },
        ],
        label: "Paramètre modifié",
        subject: "Paramètre système mis à jour : Journal d'activité",
        tone: "critical",
        typeLabel: TYPES.settings,
      });
    else
      events.push({
        ...base,
        actor: alex,
        label: "Connexion",
        target: { href: "/systeme/utilisateurs/user-2", id: "user-2", kind: "user", name: alex.name },
        tone: "neutral",
        typeLabel: TYPES.security,
      });
  }
  return events;
};

async function main() {
  const mock = JSON.stringify(path.join(__dirname, "mocks.tsx"));
  const aliases = {
    "$context/UserContext": `export {useUser} from ${mock};`,
    "$components/AuthenticatedLayout": `export {AuthenticatedLayout as default} from ${mock};`,
    "next/link": `export {Link as default} from ${mock};`,
    "next/navigation": `export {usePathname, useSearchParams} from ${mock};`,
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
        name: "journal-session-and-shell",
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
  const metrics = async (page) => {
    const result = await page.evaluate(() => ({
      viewport: innerWidth,
      document: document.documentElement.scrollWidth,
      main: document.querySelector("main")?.scrollWidth,
      mainWidth: document.querySelector("main")?.clientWidth,
    }));
    assert.ok(result.document <= result.viewport + 1, JSON.stringify(result));
    assert.ok(result.main <= result.mainWidth + 1, JSON.stringify(result));
    return result;
  };
  const rows = (page) =>
    page.getByRole("list", { name: "Événements" }).getByRole("listitem");
  const caption = (page) =>
    page.locator('[role="status"][aria-live="polite"]').first();

  async function run(name, width, fn, options = {}) {
    if (process.env.AUDIT_ONLY && !name.includes(process.env.AUDIT_ONLY))
      return;
    const context = await browser.newContext({
      viewport: { width, height: 900 },
      reducedMotion: "reduce",
      timezoneId: "Europe/Paris",
    });
    await context.addInitScript((value) => {
      window.__auditActor = value;
    }, options.actor ?? null);
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    await page.clock.setFixedTime(NOW);
    const errors = [];
    const api = { mode: options.mode ?? "success", requests: [] };
    const events = options.events ?? buildEvents();
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("**/api/audit**", async (route) => {
      const url = new URL(route.request().url());
      api.requests.push(url.search);
      if (api.mode === "error")
        return route.fulfill({
          json: { error: { message: "Journal indisponible pour le moment" }, success: false },
          status: 500,
        });
      const params = url.searchParams;
      const type = params.get("type");
      const show = params.get("show");
      const search = (params.get("search") ?? "").toLowerCase();
      const user = params.get("user");
      const filtered = events.filter(
        (event) =>
          (!type || event.typeLabel === TYPES[type]) &&
          (show !== "failures" || event.tone === "failure") &&
          (show !== "important" || ["critical", "warning", "failure"].includes(event.tone)) &&
          (!search ||
            event.actor.name.toLowerCase().includes(search) ||
            (event.target?.name ?? "").toLowerCase().includes(search)) &&
          (!user || event.actor.id === user || event.target?.id === user),
      );
      const page = Number(params.get("page") ?? "1");
      return route.fulfill({
        json: {
          data: {
            asOf: params.get("asOf") ?? NOW.toISOString(),
            events: filtered.slice((page - 1) * 50, page * 50),
            focusLabel: user ? (user === "user-2" ? alex.name : camille.name) : null,
            pagination: {
              limit: 50,
              page,
              total: filtered.length,
              totalPages: Math.max(1, Math.ceil(filtered.length / 50)),
            },
          },
          success: true,
        },
      });
    });
    try {
      await page.goto(origin + "/systeme/journal-activite" + (options.search ?? ""));
      const details = await fn(page, api);
      assert.deepEqual(errors, []);
      observations.push({ name, width, status: "pass", ...details, metrics: await metrics(page) });
      console.log("PASS " + name + " " + width);
    } catch (error) {
      await page.screenshot({ path: path.join(work, `${name}-${width}-FAIL.png`), fullPage: true });
      observations.push({ name, width, status: "fail", error: String(error), errors });
      console.log("FAIL " + name + " " + width + ": " + String(error).split("\n")[0]);
    } finally {
      await context.close();
    }
  }

  try {
    for (const width of [1440, 768, 390, 320])
      await run("liste", width, async (page) => {
        await expect(rows(page)).toHaveCount(50);
        await expect(caption(page)).toHaveText("120 événements sur 7 jours");
        await expect(page.getByRole("heading", { level: 1 })).toHaveText("Journal d'activité");
        // Every line is a 44 px target at least, whatever the width.
        const heights = await rows(page).locator("button").evaluateAll((buttons) =>
          buttons.slice(0, 5).map((button) => button.getBoundingClientRect().height),
        );
        assert.ok(heights.every((height) => height >= 43.5), JSON.stringify(heights));
        await page.screenshot({ path: path.join(work, `journal-${width}.png`) });
        return { heights };
      });

    for (const width of [1440, 390])
      await run("nombreux-changements", width, async (page) => {
        const fiche = rows(page).filter({ hasText: "Fiche modifiée" }).nth(1);
        const line = fiche.getByRole("button").first();
        // The collapsed line names the changed fields, each once.
        await expect(line).toContainText("Prénom, Nom et 9 autres");
        await line.click();
        const table = fiche.getByRole("table");
        // What changed comes before the facts, six changes first.
        const order = await fiche.evaluate((item) => {
          const details = item.querySelector("[id]:not(button)");
          return [...details.children].map((child) => child.tagName);
        });
        assert.equal(order[0], "DIV");
        assert.equal(order[1], "DL");
        await expect(table.getByRole("rowheader")).toHaveCount(6);
        const more = fiche.getByRole("button", { name: "Afficher les 8 autres changements" });
        await expect(more).toHaveAttribute("aria-expanded", "false");
        await page.screenshot({ path: path.join(work, `journal-nombreux-${width}.png`) });
        await more.click();
        await expect(table.getByRole("rowheader")).toHaveCount(14);
        const less = fiche.getByRole("button", { name: "Afficher moins" });
        await expect(less).toBeFocused();
        await expect(less).toHaveAttribute("aria-expanded", "true");
        await page.screenshot({ path: path.join(work, `journal-nombreux-tout-${width}.png`), fullPage: true });
        await less.click();
        await expect(table.getByRole("rowheader")).toHaveCount(6);
        return {};
      });

    await run("detail-et-filtre-auteur", 1440, async (page, api) => {
      const fiche = rows(page).filter({ hasText: "Fiche modifiée" }).first();
      await expect(fiche.getByRole("button").first()).toContainText("Rattachement, Email, Téléphone");
      // A setting has no record: its line keeps the column that already names it.
      const setting = rows(page).filter({ hasText: "Paramètre modifié" }).first().getByRole("button").first();
      assert.equal((await setting.innerText()).split("Journal d'activité").length - 1, 1);
      await fiche.getByRole("button").first().click();
      await expect(fiche.getByRole("button").first()).toHaveAttribute("aria-expanded", "true");
      const changes = fiche.getByRole("table");
      await expect(changes.getByRole("rowheader")).toHaveText([
        "Structure · Rattachement",
        "Coordonnées · Email",
        "Coordonnées · Téléphone",
      ]);
      await expect(fiche.getByText("Adresse masquée")).toBeVisible();
      await expect(fiche.getByRole("link", { name: "Ouvrir la fiche" })).toHaveAttribute(
        "href",
        "/membres/repertoire/person-1",
      );
      await page.screenshot({ path: path.join(work, "journal-detail-1440.png") });
      await fiche.getByRole("button", { name: "Filtrer sur cet auteur" }).click();
      await expect(page).toHaveURL(/user=admin-1/);
      await expect(page.getByText("Compte :")).toBeVisible();
      assert.ok(api.requests.at(-1).includes("user=admin-1"));
      await page.getByRole("button", { name: "Retirer le filtre compte" }).click();
      await expect(page).not.toHaveURL(/user=/);
      return {};
    });

    await run("filtres-rapides-et-periode", 1440, async (page, api) => {
      await page.getByRole("button", { name: "Sécurité", exact: true }).click();
      await expect(page).toHaveURL(/type=security/);
      await expect(caption(page)).toHaveText("48 événements sur 7 jours");
      await page.getByRole("button", { name: "Échecs", exact: true }).click();
      await expect(page).toHaveURL(/show=failures/);
      await expect(rows(page)).toHaveCount(24);
      await page.getByRole("combobox", { name: "Période" }).click();
      await page.getByRole("option", { name: "Période : 30 jours" }).click();
      await expect(page).toHaveURL(/period=30d/);
      assert.ok(api.requests.at(-1).includes("period=30d"));
      await page.getByRole("button", { name: "Réinitialiser les filtres" }).click();
      await expect(page).toHaveURL(/journal-activite$/);
      await expect(page.getByRole("searchbox")).toBeFocused();
      return {};
    });

    await run("recherche-trois-caracteres", 1440, async (page, api) => {
      const count = api.requests.length;
      await page.getByRole("searchbox").fill("al");
      await expect(caption(page)).toHaveText("Saisissez au moins trois lettres ou chiffres.");
      await page.waitForTimeout(600);
      assert.equal(api.requests.length, count);
      await page.getByRole("searchbox").fill("alex");
      await expect(page).toHaveURL(/search=alex/);
      // Alex as author or account, and Maximilien-Alexandre as a record.
      await expect(caption(page)).toHaveText("72 événements sur 7 jours");
      return {};
    });

    await run("pagination-instantane", 1440, async (page, api) => {
      await page.getByRole("button", { name: /Page suivante/ }).click();
      await expect(page).toHaveURL(/page=2/);
      await expect(rows(page)).toHaveCount(50);
      const second = api.requests.at(-1);
      assert.ok(second.includes("page=2") && second.includes("asOf="), second);
      await page.getByRole("button", { name: "Actualiser le journal" }).click();
      await expect(page).not.toHaveURL(/page=/);
      assert.ok(!api.requests.at(-1).includes("asOf="), api.requests.at(-1));
      return { secondPage: second };
    });

    await run("superadmin-ip", 390, async (page) => {
      const first = rows(page).first();
      await first.getByRole("button").first().click();
      await expect(first.getByText("2001:db8::1")).toBeVisible();
      await page.screenshot({ path: path.join(work, "journal-detail-390.png") });
      return {};
    }, {
      actor: { isProtected: true },
      events: buildEvents().map((event) => ({ ...event, ip: "2001:db8::1", ipMasked: false })),
    });

    await run("vide", 390, async (page) => {
      await expect(page.getByText("Aucun événement sur 7 jours")).toBeVisible();
      return {};
    }, { events: [] });

    await run("erreur-et-reprise", 390, async (page, api) => {
      await expect(page.getByText("Journal indisponible pour le moment")).toBeVisible();
      api.mode = "success";
      await page.getByRole("button", { name: "Réessayer" }).click();
      await expect(rows(page)).toHaveCount(50);
      return {};
    }, { mode: "error" });

    await run("acces-refuse", 390, async (page, api) => {
      await expect(page.getByText("Vous n'avez pas la permission de consulter le journal d'activité.")).toBeVisible();
      assert.equal(api.requests.length, 0);
      return {};
    }, { actor: { role: "USER" } });
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
    fs.writeFileSync(path.join(work, "observations.json"), JSON.stringify(result, null, 2));
    console.log(`${result.passed}/${result.total} réussis`);
    if (result.passed !== result.total) process.exitCode = 1;
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
