module.exports = async ({ run, expect, assert, work, path, before }) => {
  const configure = (page, values) =>
    page.evaluate(
      (values) => Object.assign(window.__securityApi.modes, values),
      values,
    );
  const counts = (page) =>
    page.evaluate(() => ({
      get: window.__securityApi.requests.filter(
        (r) => r.path === "/api/auth/sessions" && r.method === "GET",
      ).length,
      del: window.__securityApi.requests.filter((r) => r.method === "DELETE")
        .length,
      aborted: window.__securityApi.requests.filter((r) => r.aborted).length,
    }));
  async function open(page, all = false) {
    await page
      .getByRole("button", {
        name: all ? "Déconnecter les autres sessions" : /^Déconnecter /,
        exact: all,
      })
      .first()
      .click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
  }
  async function confirm(page) {
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Déconnecter", exact: true })
      .click();
  }
  const geometry = (page) =>
    page.evaluate(() => {
      const rect = (el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, height: r.height };
      };
      const main = document.querySelector("main"),
        title = document.querySelector("#account-sessions-heading"),
        nav = document.querySelector('nav[aria-label="Navigation du compte"]');
      return {
        title: rect(title),
        nav: rect(nav),
        main: rect(main),
        scrollTop: main.scrollTop,
        focus: document.activeElement?.id,
        hiddenByNav:
          title.getBoundingClientRect().top <
          nav.getBoundingClientRect().bottom,
        viewport: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        mainWidth: main.clientWidth,
        mainScrollWidth: main.scrollWidth,
      };
    });
  await run("delete-suspendu-31-secondes", 390, async (page) => {
    await configure(page, { "DELETE /api/auth/sessions": "hold" });
    await open(page, true);
    await confirm(page);
    await page.clock.fastForward(31_000);
    if (before) {
      await expect(page.getByRole("alertdialog")).toBeVisible();
      await expect(
        page
          .getByRole("alertdialog")
          .getByRole("button", { name: "Annuler", exact: true }),
      ).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(page.getByRole("alertdialog")).toBeVisible();
    } else {
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      await expect(
        page.getByRole("status").filter({ hasText: /confirm/ }),
      ).toBeVisible();
    }
    const requests = await counts(page);
    assert.equal(requests.del, 1);
    assert.equal(requests.get, before ? 1 : 2);
    assert.equal(requests.aborted, before ? 0 : 1);
    await page.screenshot({ path: path.join(work, "delete-suspendu-390.png") });
    return {
      elapsedClockMs: 31_000,
      dialogOpen: await page.getByRole("alertdialog").count(),
      counts: requests,
    };
  });
  await run("succes-delete-relecture-suspendue", 390, async (page) => {
    await configure(page, { "GET /api/auth/sessions": "hold" });
    await open(page);
    await confirm(page);
    await expect.poll(async () => (await counts(page)).get).toBe(2);
    await expect(page.getByRole("alertdialog")).toHaveCount(before ? 1 : 0);
    const dialogImmediately = await page.getByRole("alertdialog").count();
    await page.clock.fastForward(31_000);
    if (before) {
      await expect(page.getByRole("alertdialog")).toBeVisible();
      await expect(
        page
          .getByRole("alertdialog")
          .getByRole("button", { name: "Annuler", exact: true }),
      ).toBeDisabled();
    } else {
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      await expect(
        page
          .getByRole("alert")
          .getByRole("button", { name: "Réessayer", exact: true }),
      ).toBeVisible();
      await configure(page, { "GET /api/auth/sessions": "success" });
      await page
        .getByRole("alert")
        .getByRole("button", { name: "Réessayer", exact: true })
        .click();
      await expect(page.locator("#account-sessions-heading")).toBeFocused();
    }
    const requests = await counts(page);
    assert.equal(requests.del, 1);
    return { elapsedClockMs: 31_000, dialogImmediately, counts: requests };
  });
  await run("erreur500-json-resultat-incertain", 1440, async (page) => {
    await configure(page, { "DELETE /api/auth/sessions": "error" });
    await open(page);
    await confirm(page);
    await expect(page.getByRole("alertdialog")).toHaveCount(0);
    const requests = await counts(page);
    assert.equal(requests.del, 1);
    assert.equal(requests.get, before ? 1 : 2);
    if (!before)
      await expect(
        page.getByRole("status").filter({ hasText: /confirm/ }),
      ).toBeVisible();
    return {
      counts: requests,
      alerts: await page.getByRole("alert").allTextContents(),
    };
  });
  for (const width of [390, 1440])
    await run(
      "focus-titre-apres-revocation",
      width,
      async (page) => {
        await page.evaluate(() => {
          const main = document.querySelector("main"),
            title = document.querySelector("#account-sessions-heading");
          main.scrollTop += title.getBoundingClientRect().top - 80;
        });
        const initial = await geometry(page);
        await open(page);
        await confirm(page);
        await expect(page.getByRole("alertdialog")).toHaveCount(0);
        await expect(page.locator("#account-sessions-heading")).toBeFocused();
        const final = await geometry(page);
        assert.ok(final.documentWidth <= final.viewport + 1);
        assert.ok(final.mainScrollWidth <= final.mainWidth + 1);
        if (!before) assert.ok(!final.hiddenByNav, JSON.stringify(final));
        await page.screenshot({
          path: path.join(work, "focus-titre-" + width + ".png"),
        });
        return { initial, final };
      },
      { long: true, height: 900 },
    );
  if (!before) {
    await run("relecture-ne-vole-pas-focus", 390, async (page) => {
      await configure(page, { "GET /api/auth/sessions": "hold" });
      await open(page);
      await confirm(page);
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      const destination = page
        .getByRole("navigation", { name: "Navigation du compte" })
        .getByRole("link", { name: "Profil", exact: true });
      await destination.focus();
      await expect(destination).toBeFocused();
      await page.evaluate(() =>
        window.__securityApi.pending.splice(0).forEach((resolve) => resolve()),
      );
      await expect(
        page.getByRole("button", {
          name: "Déconnecter les autres sessions",
          exact: true,
        }),
      ).toBeVisible();
      await expect(destination).toBeFocused();
      return {
        active: await page.evaluate(() => document.activeElement?.textContent),
        counts: await counts(page),
      };
    });
    await run("refus403-non-json-purge-liste", 1440, async (page) => {
      await configure(page, { "DELETE /api/auth/sessions": "forbidden" });
      await open(page);
      await confirm(page);
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      await expect(
        page.getByRole("alert").filter({ hasText: /accès/ }),
      ).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Détails techniques" }),
      ).toHaveCount(0);
      const requests = await counts(page);
      assert.equal(requests.del, 1);
      assert.equal(requests.get, 1);
      return { counts: requests };
    });
    await run(
      "lectures-initiales-sessions-mfa-bornees-reprises",
      390,
      async (page) => {
        await page.clock.fastForward(31_000);
        const retry = page
          .getByRole("alert")
          .getByRole("button", { name: "Réessayer", exact: true });
        await expect(retry).toHaveCount(2);
        await configure(page, {
          "GET /api/auth/sessions": "success",
          "GET /api/auth/mfa": "success",
        });
        await retry.first().click();
        await expect(
          page.getByRole("button", {
            name: "Nouveaux codes de secours",
            exact: true,
          }),
        ).toBeVisible();
        await retry.click();
        await expect(
          page.getByRole("button", {
            name: "Déconnecter les autres sessions",
            exact: true,
          }),
        ).toBeVisible();
        await expect(page.locator("#account-sessions-heading")).toBeFocused();
        const requests = await counts(page);
        assert.equal(requests.del, 0);
        assert.equal(requests.aborted, 2);
        return { counts: requests };
      },
      {
        initialLoading: true,
        modes: {
          "GET /api/auth/sessions": "hold",
          "GET /api/auth/mfa": "hold",
        },
      },
    );
  }
};
