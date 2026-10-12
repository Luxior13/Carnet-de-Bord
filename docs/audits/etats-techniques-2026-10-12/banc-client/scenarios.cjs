module.exports = async ({ run, expect, assert, work, path, before }) => {
  const h1 = (page) => page.getByRole("heading", { level: 1 });
  if (before) {
    await run("avant-erreur-remplacement-focus-perdu", 390, async (page) => {
      const trigger = page.getByRole("button", {
        name: "Déclencher l’erreur simulée",
        exact: true,
      });
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expect(h1(page)).toHaveText("Une erreur est survenue");
      assert.equal(
        await page.evaluate(() => document.activeElement === document.body),
        true,
      );
      await expect(page.getByRole("link", { name: /accueil/i })).toHaveCount(0);
      return {
        defect:
          "Le contrôle focalisé disparaît, focus sur body ; seul Réessayer est proposé.",
      };
    });
    await run(
      "avant-erreur-publique-sans-main",
      390,
      async (page) => {
        await expect(h1(page)).toHaveText("Une erreur est survenue");
        await expect(page.locator('main,[role="main"]')).toHaveCount(0);
        return {
          defect:
            "Branche publique du shell : aucun landmark principal autour de l’erreur.",
        };
      },
      { kind: "error", public: true },
    );
    await run(
      "avant-chargement-semantique",
      390,
      async (page) => {
        const status = page.getByRole("status", {
          name: "Chargement de la page",
        });
        await expect(status).toBeVisible();
        return {
          statusText: await status.innerText(),
          aria: await status.ariaSnapshot(),
          note: "Nom accessible présent ; annonce vocale réelle non testée.",
        };
      },
      { kind: "loading" },
    );
    await run(
      "avant-longue-reference-petit-ecran",
      320,
      async (page) => {
        await expect(h1(page)).toHaveText("Une erreur est survenue");
        await expect(page.locator("body")).not.toContainText("SECRET_FICTIF");
        await page.screenshot({
          path: path.join(work, "avant-erreur-320.png"),
          fullPage: true,
        });
        return { note: "Référence longue contenue, message interne absent." };
      },
      { kind: "error", digest: "ref-" + "a".repeat(512), height: 500 },
    );
    return;
  }
  const retry = (page) =>
    page.getByRole("button", { name: "Recharger la page", exact: true });
  const home = (page) => page.getByRole("link", { name: /accueil/i });
  const setKind = (page, kind) =>
    page.evaluate((k) => window.__auditSetKind(k), kind);
  const inspectTextContrast = (page) =>
    page.locator("h1,p").evaluateAll((nodes) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 1;
      const context = canvas.getContext("2d");
      const color = (value) => {
        context.clearRect(0, 0, 1, 1);
        context.fillStyle = value;
        context.fillRect(0, 0, 1, 1);
        return Array.from(context.getImageData(0, 0, 1, 1).data);
      };
      const light = (rgb) =>
        rgb
          .slice(0, 3)
          .map((v) => v / 255)
          .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
          .reduce((sum, v, i) => sum + v * [0.2126, 0.7152, 0.0722][i], 0);
      return nodes
        .filter(
          (n) =>
            n.getAttribute("aria-hidden") !== "true" && n.textContent.trim(),
        )
        .map((n) => {
          const style = getComputedStyle(n),
            foreground = color(style.color);
          let current = n,
            background = [255, 255, 255, 255];
          while (current) {
            const candidate = color(getComputedStyle(current).backgroundColor);
            if (candidate[3] === 255) {
              background = candidate;
              break;
            }
            current = current.parentElement;
          }
          const l1 = light(foreground),
            l2 = light(background),
            ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
          return {
            text: n.textContent.slice(0, 55),
            foreground,
            background,
            ratio,
            fontSize: style.fontSize,
            fontWeight: style.fontWeight,
            required:
              parseFloat(style.fontSize) >= 24 ||
              (parseFloat(style.fontSize) >= 18.66 &&
                parseInt(style.fontWeight) >= 700)
                ? 3
                : 4.5,
          };
        });
    });
  for (const width of [320, 390, 768, 1024, 1440, 1920])
    await run("composition-trois-etats", width, async (page) => {
      const contrasts = [];
      for (const kind of ["error", "not-found", "loading"]) {
        await setKind(page, kind);
        await expect(page.locator('main,[role="main"]')).toHaveCount(1);
        if (kind === "loading") {
          await expect(
            page.getByRole("status", { name: "Chargement de la page" }),
          ).toBeVisible();
          await expect(h1(page)).toHaveCount(0);
          await expect(page.locator("main button,main a")).toHaveCount(0);
        } else {
          await expect(h1(page)).toHaveText(
            kind === "error" ? "Une erreur est survenue" : "Page introuvable",
          );
          await expect(h1(page)).toHaveCount(1);
          await expect(home(page)).toHaveAttribute("href", "/");
          const measurements = await inspectTextContrast(page);
          for (const m of measurements)
            assert.ok(m.ratio >= m.required, JSON.stringify(m));
          contrasts.push({ kind, measurements });
        }
        await expect(page.locator("input,textarea,form")).toHaveCount(0);
        if ([320, 1440].includes(width) && kind !== "loading")
          await page.screenshot({
            path: path.join(work, `${kind}-${width}.png`),
            fullPage: true,
          });
        const geometry = await page.evaluate(() => ({
          viewport: innerWidth,
          document: document.documentElement.scrollWidth,
          main: document.querySelector("main")?.scrollWidth,
          available: document.querySelector("main")?.clientWidth,
        }));
        assert.ok(geometry.document <= width + 1, JSON.stringify(geometry));
        assert.ok(
          geometry.main <= geometry.available + 1,
          JSON.stringify(geometry),
        );
      }
      return { contrasts };
    });
  await run("erreur-remplacement-focus-clavier-retour", 390, async (page) => {
    await page
      .getByRole("button", { name: "Déclencher l’erreur simulée", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await expect(h1(page)).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(retry(page)).toBeFocused();
    const focus = await retry(page).evaluate((e) => ({
      shadow: getComputedStyle(e).boxShadow,
      outline: getComputedStyle(e).outlineStyle,
    }));
    assert.ok(focus.shadow !== "none" || focus.outline !== "none");
    await page.keyboard.press("Tab");
    await expect(home(page)).toBeFocused();
    await page.keyboard.press("Enter");
    await expect.poll(() => new URL(page.url()).pathname).toBe("/");
    assert.equal(await page.evaluate(() => window.__auditResetCount), 0);
    return { focus };
  });
  await run(
    "erreur-reessai-reussi",
    390,
    async (page, navigations) => {
      await expect(h1(page)).toHaveText("Une erreur est survenue");
      await page.addInitScript(() => {
        window.__auditOptions.kind = "success";
      });
      await retry(page).focus();
      await page.keyboard.press("Enter");
      await expect(h1(page)).toHaveText("Page rétablie simulée");
      assert.equal(await page.evaluate(() => window.__auditResetCount), 0);
      assert.deepEqual(navigations, [
        { method: "GET", path: "/audit-etat" },
        { method: "GET", path: "/audit-etat" },
      ]);
      return {
        note: "Rechargement GET complet observé ; document de remplacement simulé, pas réexécution serveur Next.",
      };
    },
    { kind: "error" },
  );
  await run(
    "erreur-reessai-persistant",
    390,
    async (page, navigations) => {
      for (let i = 1; i <= 2; i++) {
        await Promise.all([
          page.waitForEvent("load"),
          retry(page).evaluate((button) => {
            button.click();
            button.click();
          }),
        ]);
        await expect(h1(page)).toHaveText("Une erreur est survenue");
        await expect(h1(page)).toBeFocused();
        await expect(home(page)).toBeVisible();
        assert.equal(navigations.length, i + 1);
      }
      assert.ok(navigations.every((n) => n.method === "GET"));
    },
    { kind: "error", retryFails: true },
  );
  await run(
    "publique-erreur-landmark-et-status-transitoire",
    390,
    async (page) => {
      await setKind(page, "error");
      await expect(page.locator('main,[role="main"]')).toHaveCount(1);
      await expect(h1(page)).toHaveCount(1);
      await expect(h1(page)).toBeFocused();
      await expect(home(page)).toHaveAttribute("href", "/");
      await setKind(page, "loading");
      await expect(
        page.getByRole("status", { name: "Chargement de la page" }),
      ).toBeVisible();
      return {
        note: "Erreur publique avec main ; statut de chargement transitoire sans main. La 404 publique n’est pas une branche du produit actuel.",
      };
    },
    { public: true },
  );
  await run(
    "reference-longue-sans-fuite-viewport-bas",
    320,
    async (page) => {
      await expect(page.locator("body")).not.toContainText("SECRET_FICTIF");
      await expect(page.locator("body")).toContainText(
        "ref-" + "a".repeat(512),
      );
      for (const control of [h1(page), retry(page), home(page)]) {
        await control.scrollIntoViewIfNeeded();
        const r = await control.boundingBox();
        assert.ok(r.y >= 0 && r.y + r.height <= 250, JSON.stringify(r));
      }
      await home(page).focus();
      await page.keyboard.press("Enter");
      await expect.poll(() => new URL(page.url()).pathname).toBe("/");
    },
    { kind: "error", digest: "ref-" + "a".repeat(512), height: 250 },
  );
  await run("texte-agrandi-et-mouvement-reduit", 768, async (page) => {
    await page.addStyleTag({ content: "html {font-size:32px !important;}" });
    for (const kind of ["error", "not-found", "loading"]) {
      await setKind(page, kind);
      if (kind === "loading") {
        const animations = await page
          .locator("[data-slot=skeleton]")
          .evaluateAll((nodes) =>
            nodes.map((n) => ({
              name: getComputedStyle(n).animationName,
              duration: getComputedStyle(n).animationDuration,
            })),
          );
        assert.ok(
          animations.every(
            (a) => a.name === "none" || parseFloat(a.duration) <= 0.01,
          ),
          JSON.stringify(animations),
        );
      } else {
        await expect(h1(page)).toBeVisible();
        await home(page).scrollIntoViewIfNeeded();
        await expect(home(page)).toBeVisible();
      }
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
    }
    return {
      note: "Agrandissement racine à32px : simulation de texte200%, pas zoom natif du navigateur.",
    };
  });
  await run("chargement-nomme-sans-deplacement-focus", 390, async (page) => {
    const skip = page.getByRole("link", {
      name: "Aller au contenu principal",
      exact: true,
    });
    await skip.focus();
    await setKind(page, "loading");
    await expect(skip).toBeFocused();
    const status = page.getByRole("status", { name: "Chargement de la page" });
    await expect(status).toBeVisible();
    return {
      aria: await status.ariaSnapshot(),
      text: await status.innerText(),
      note: "Arbre accessible contrôlé, lecteur vocal non exécuté.",
    };
  });
};
