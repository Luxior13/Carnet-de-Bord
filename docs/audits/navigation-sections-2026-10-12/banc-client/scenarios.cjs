module.exports = async ({ run, expect, assert, before, path, work }) => {
  const nav = (page) =>
    page.getByRole("navigation", {
      name: "Sections de la fiche fictive",
      exact: true,
    });
  const link = (page, name) =>
    nav(page).getByRole("link", { name, exact: true });
  const measure = (page) =>
    page.evaluate(() => {
      const main = document.querySelector("main"),
        bar = document.querySelector('[data-slot="page-section-navigation"]'),
        title = document.querySelector("#audit-content-title");
      return {
        scroll: main.scrollTop,
        scrollHeight: main.scrollHeight,
        mainTop: main.getBoundingClientRect().top,
        mainBottom: main.getBoundingClientRect().bottom,
        barTop: bar.getBoundingClientRect().top,
        barBottom: bar.getBoundingClientRect().bottom,
        titleTop: title.getBoundingClientRect().top,
        heroTop: document.querySelector("h1")?.getBoundingClientRect().top,
        active: document.activeElement?.textContent?.slice(0, 80),
        section: document
          .querySelector("[data-audit-content]")
          ?.getAttribute("data-audit-content"),
        history: history.length,
      };
    });
  const down = async (page) => {
    await expect(nav(page)).toBeVisible();
    await page.locator("main").evaluate((element) => {
      element.scrollTop = 900;
    });
    await expect(nav(page)).toHaveAttribute("data-stuck", "true");
    return measure(page);
  };
  if (before) {
    for (const nativeLink of [false, true])
      await run(
        "avant-section-propre-" + (nativeLink ? "lien" : "locale"),
        390,
        async (page) => {
          await expect(nav(page)).toBeVisible();
          const initialGeometry = await measure(page);
          const start = await down(page);
          await link(page, "Coordonnées").click();
          await expect(page.locator("[data-audit-content]")).toHaveAttribute(
            "data-audit-content",
            "coordonnees",
          );
          await expect(page.getByRole("alertdialog")).toHaveCount(0);
          const end = await measure(page);
          assert.ok(end.titleTop < end.barBottom);
          assert.equal(end.scroll, start.scroll);
          if (!nativeLink)
            await page.screenshot({
              path: path.join(work, "avant-section-390.png"),
            });
          return {
            initialGeometry,
            start,
            end,
            note: nativeLink
              ? "Link et navigation simulés : aucune conclusion sur le routeur Next réel"
              : "Callback local réel de la fixture, history.replaceState sans scroll",
          };
        },
        { nativeLink },
      );
    await run("avant-garde-refusee-confirmee", 390, async (page) => {
      await page.getByLabel("Brouillon fictif").fill("Texte fictif");
      const start = await down(page);
      await link(page, "Coordonnées").click();
      await page.getByRole("button", { name: "Rester", exact: true }).click();
      await expect(link(page, "Coordonnées")).toBeFocused();
      await expect(page.getByLabel("Brouillon fictif")).toHaveValue(
        "Texte fictif",
      );
      const refused = await measure(page);
      assert.equal(refused.scroll, start.scroll);
      assert.equal(refused.section, "identite");
      await link(page, "Coordonnées").click();
      await page
        .getByRole("button", { name: "Quitter sans enregistrer", exact: true })
        .click();
      await expect(page.locator("[data-audit-content]")).toHaveAttribute(
        "data-audit-content",
        "coordonnees",
      );
      const accepted = await measure(page);
      assert.ok(accepted.titleTop < accepted.barBottom);
      return {
        start,
        refused,
        accepted,
        routerCalls: await page.evaluate(() => window.__auditNavigations),
      };
    });
    return;
  }
  const visibleStart = async (page) => {
    await expect
      .poll(async () => {
        const m = await measure(page);
        return m.titleTop >= m.barBottom - 1 && m.titleTop < m.mainBottom - 32;
      })
      .toBe(true);
    return measure(page);
  };
  for (const width of [390, 1440])
    await run("section-acceptee-" + width, width, async (page) => {
      await expect(nav(page)).toBeVisible();
      const initialGeometry = await measure(page);
      if (width === 390) {
        for (const [key, expected] of Object.entries({
          scroll: 0,
          // 3 693 px on 12 October; 3 697 px since the design retouches up to
          // 25 October 2026 (bar, title and hero positions unchanged).
          scrollHeight: 3697,
          barTop: 218.78125,
          barBottom: 267.78125,
          titleTop: 283.78125,
          heroTop: 89,
        })) {
          assert.ok(
            Math.abs(initialGeometry[key] - expected) < 0.5,
            `${key}: ${initialGeometry[key]} vs ${expected}`,
          );
        }
      }
      const start = await down(page);
      await link(page, "Coordonnées").click();
      await expect(page.locator("[data-audit-content]")).toHaveAttribute(
        "data-audit-content",
        "coordonnees",
      );
      const end = await visibleStart(page);
      await expect(link(page, "Coordonnées")).toBeFocused();
      assert.ok(end.scroll > 0);
      assert.equal(end.history, start.history);
      await page.screenshot({
        path: path.join(work, "section-" + width + ".png"),
      });
      return { initialGeometry, start, end };
    });
  await run(
    "lien-accepte",
    390,
    async (page) => {
      const start = await down(page);
      await link(page, "Coordonnées").press("Enter");
      await expect(page.locator("[data-audit-content]")).toHaveAttribute(
        "data-audit-content",
        "coordonnees",
      );
      const end = await visibleStart(page);
      await expect(link(page, "Coordonnées")).toBeFocused();
      assert.equal(end.history, start.history);
      return { start, end };
    },
    { nativeLink: true },
  );
  await run("garde-refus-puis-confirmation", 390, async (page) => {
    await page.getByLabel("Brouillon fictif").fill("Texte fictif");
    const start = await down(page);
    await link(page, "Coordonnées").click();
    await page.getByRole("button", { name: "Rester", exact: true }).click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(link(page, "Coordonnées")).toBeFocused();
    await expect(page.getByLabel("Brouillon fictif")).toHaveValue(
      "Texte fictif",
    );
    const refused = await measure(page);
    assert.equal(refused.scroll, start.scroll);
    assert.equal(refused.section, "identite");
    await link(page, "Coordonnées").click();
    await page
      .getByRole("button", { name: "Quitter sans enregistrer", exact: true })
      .click();
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await expect(page.locator("[data-audit-content]")).toHaveAttribute(
      "data-audit-content",
      "coordonnees",
    );
    const accepted = await visibleStart(page);
    await expect(link(page, "Coordonnées")).toBeFocused();
    assert.equal(accepted.history, start.history);
    return { start, refused, accepted };
  });
  await run(
    "section-courte-clamp",
    390,
    async (page) => {
      const start = await down(page);
      await link(page, "Coordonnées").click();
      await expect(page.locator("[data-audit-content]")).toHaveAttribute(
        "data-audit-content",
        "coordonnees",
      );
      const end = await visibleStart(page);
      await expect(link(page, "Coordonnées")).toBeFocused();
      return {
        start,
        end,
        note: "Le clamp natif et un morceau de bandeau visible sont acceptés lorsque le contenu est court.",
      };
    },
    { shortTarget: true },
  );
  await run(
    "actions-sans-changement-vertical",
    390,
    async (page) => {
      await page.getByLabel("Brouillon fictif").fill("Texte fictif conservé");
      const initialUrl = page.url();
      const start = await down(page);
      await nav(page).locator('a[aria-current="page"]').click();
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      assert.equal(page.url(), initialUrl);
      assert.equal((await measure(page)).scroll, start.scroll);
      await link(page, "Coordonnées").focus();
      assert.equal((await measure(page)).scroll, start.scroll);
      await page
        .getByRole("button", {
          name: "Afficher les sections suivantes",
          exact: true,
        })
        .click();
      assert.equal((await measure(page)).scroll, start.scroll);
      await page.evaluate(() => {
        window.__auditVerticalScrollCommands = [];
        for (const method of ["scrollBy", "scrollTo"]) {
          const original = Element.prototype[method];
          Element.prototype[method] = function (...args) {
            const top = typeof args[0] === "object" ? args[0]?.top : args[1];
            if (top) window.__auditVerticalScrollCommands.push({ method, top });
            return original.apply(this, args);
          };
        }
      });
      await page.setViewportSize({ width: 1920, height: 900 });
      await expect(
        page.getByRole("button", {
          name: "Afficher les sections suivantes",
          exact: true,
        }),
      ).toHaveCount(0);
      const afterResize = await measure(page);
      assert.deepEqual(
        await page.evaluate(() => window.__auditVerticalScrollCommands),
        [],
      );
      assert.ok(afterResize.scroll > 0);
      await expect(nav(page).locator('a[aria-current="page"]')).toBeFocused();
      const popup = page.context().waitForEvent("page");
      await link(page, "Coordonnées").click({ modifiers: ["Control"] });
      const external = await popup;
      await external.close();
      assert.equal((await measure(page)).scroll, afterResize.scroll);
      assert.equal((await measure(page)).section, "identite");
      return {
        start,
        afterResize,
        end: await measure(page),
        note: "Le resize replie différemment les paragraphes : scroll anchoring natif accepté, aucune commande verticale par le composant.",
      };
    },
    { manySections: true },
  );
  await run(
    "montage-historique-actualisation-sans-saut",
    1440,
    async (page) => {
      await expect(page.locator("[data-audit-content]")).toHaveAttribute(
        "data-audit-content",
        "coordonnees",
      );
      assert.equal((await measure(page)).scroll, 0);
      const start = await down(page);
      await page.evaluate(() =>
        window.__auditNavigateSection("identite", false),
      );
      await expect(page.locator("[data-audit-content]")).toHaveAttribute(
        "data-audit-content",
        "identite",
      );
      assert.equal((await measure(page)).scroll, start.scroll);
      await page.goBack();
      await expect(page.locator("[data-audit-content]")).toHaveAttribute(
        "data-audit-content",
        "coordonnees",
      );
      assert.equal((await measure(page)).scroll, start.scroll);
      await page.goForward();
      await expect(page.locator("[data-audit-content]")).toHaveAttribute(
        "data-audit-content",
        "identite",
      );
      assert.equal((await measure(page)).scroll, start.scroll);
      await page.evaluate(() =>
        window.__auditSetActor({ firstName: "Prénom actualisé" }),
      );
      assert.equal((await measure(page)).scroll, start.scroll);
      return {
        start,
        end: await measure(page),
        note: "Histoire navigateur réelle, routeur simulé sans restauration automatique du scroll.",
      };
    },
    {
      url: "/membres/repertoire/audit-person-sections?section=coordonnees",
      strict: true,
    },
  );
  await run(
    "activations-rapides-derniere-section",
    390,
    async (page) => {
      const start = await down(page);
      await nav(page).evaluate((element) => {
        const links = element.querySelectorAll("a");
        links[1].focus();
        links[1].click();
        links[2].focus();
        links[2].click();
      });
      await expect(page.locator("[data-audit-content]")).toHaveAttribute(
        "data-audit-content",
        "test-0",
      );
      const end = await visibleStart(page);
      await expect(link(page, "Section fictive 1")).toBeFocused();
      assert.equal(end.history, start.history);
      return { start, end };
    },
    { manySections: true },
  );
};
