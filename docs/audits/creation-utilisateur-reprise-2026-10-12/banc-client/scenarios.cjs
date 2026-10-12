module.exports = async ({ run, expect, assert, work, path, before }) => {
  const configure = (page, values) =>
    page.evaluate(
      (values) => Object.assign(window.__securityApi.modes, values),
      values,
    );
  async function fill(page, admin = false) {
    await page.locator("#newFirstName").fill("Camille");
    await page.locator("#newLoginName").fill("camille.reprise");
    if (admin) {
      await page.getByText("Administrateur", { exact: true }).click();
      await expect(
        page.getByRole("radio", { name: /Administrateur/ }),
      ).toBeChecked();
    }
  }
  const create = (page) =>
    page.getByRole("button", { name: "Créer le compte", exact: true }).click();
  const counts = (page) =>
    page.evaluate(() => ({
      post: window.__securityApi.requests.filter(
        (r) => r.path === "/api/users" && r.method === "POST",
      ).length,
      get: window.__securityApi.requests.filter(
        (r) => r.path === "/api/users" && r.method === "GET",
      ).length,
      proof: window.__securityApi.requests.filter(
        (r) => r.path === "/api/auth/step-up",
      ).length,
      aborted: window.__securityApi.requests.filter((r) => r.aborted).length,
    }));
  await run(
    "verification-tardive-nouveau-geste-clavier",
    1440,
    async (page) => {
      await configure(page, {
        "POST /api/users": "lost",
        "GET /api/users": "hold",
      });
      await fill(page);
      await create(page);
      const verify = page.getByRole("button", {
        name: "Vérifier la création",
        exact: true,
      });
      await expect(verify).toBeVisible();
      await verify.click();
      const navigation = page
        .getByRole("link", { name: "Utilisateurs", exact: true })
        .first();
      await navigation.focus();
      await page.keyboard.press("Tab");
      const chosen = await page.evaluate(() => ({
        tag: document.activeElement?.tagName,
        text: document.activeElement?.textContent,
        href: document.activeElement?.getAttribute("href"),
      }));
      await page.evaluate(() =>
        window.__securityApi.pending.splice(0).forEach((resolve) => resolve()),
      );
      await expect(
        page.getByText("Un compte utilise cet identifiant", { exact: true }),
      ).toBeVisible();
      await page.clock.runFor(60);
      const after = await page.evaluate(() => ({
        tag: document.activeElement?.tagName,
        text: document.activeElement?.textContent?.slice(0, 90),
        href: document.activeElement?.getAttribute("href"),
      }));
      if (before) assert.notEqual(after.href, chosen.href);
      else assert.equal(after.href, chosen.href);
      await page.screenshot({
        path: path.join(work, "verification-focus-1440.png"),
      });
      return { chosen, after, counts: await counts(page) };
    },
  );
  if (!before) {
    await run(
      "verification-sans-nouveau-geste-focus-panneau",
      390,
      async (page) => {
        await configure(page, {
          "POST /api/users": "lost",
          "GET /api/users": "hold",
        });
        await fill(page);
        await create(page);
        await page
          .getByRole("button", { name: "Vérifier la création", exact: true })
          .click();
        await page.evaluate(() =>
          window.__securityApi.pending
            .splice(0)
            .forEach((resolve) => resolve()),
        );
        await expect(
          page
            .locator('div[tabindex="-1"][aria-busy]')
            .filter({ hasText: "Un compte utilise cet identifiant" }),
        ).toBeFocused();
        return {
          focus: await page.evaluate(() => document.activeElement?.tagName),
          counts: await counts(page),
        };
      },
    );
    await run("verification-erreur-garde-nouveau-focus", 1440, async (page) => {
      await configure(page, {
        "POST /api/users": "lost",
        "GET /api/users": "hold",
      });
      await fill(page);
      await create(page);
      await page
        .getByRole("button", { name: "Vérifier la création", exact: true })
        .click();
      await page
        .getByRole("link", { name: "Utilisateurs", exact: true })
        .first()
        .focus();
      await page.keyboard.press("Tab");
      const chosen = await page.evaluate(() =>
        document.activeElement?.getAttribute("href"),
      );
      await page.evaluate(() =>
        window.__securityApi.pending
          .splice(0)
          .forEach((resolve) => resolve(true)),
      );
      await expect(
        page.getByText(
          "Vérification impossible pour le moment. Réessayez la vérification avant de créer à nouveau ce compte.",
          { exact: true },
        ),
      ).toBeVisible();
      await page.clock.runFor(60);
      const after = await page.evaluate(() =>
        document.activeElement?.getAttribute("href"),
      );
      assert.equal(after, chosen);
      return { chosen, after, counts: await counts(page) };
    });
  }
  await run("defi-admin-annuler-retour-formulaire", 390, async (page) => {
    await configure(page, { "POST /api/users": "stepup" });
    await fill(page, true);
    await create(page);
    const dialog = page.getByRole("dialog");
    await expect(dialog.locator("#admin-step-up-password")).toBeFocused();
    await dialog.getByRole("button", { name: "Annuler", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: "Créer le compte", exact: true }),
    ).toBeFocused();
    assert.equal((await counts(page)).post, 1);
    return { counts: await counts(page) };
  });
  await run("defi-admin-succes-focus-compte-cree", 1440, async (page) => {
    await configure(page, { "POST /api/users": "stepup" });
    await fill(page, true);
    await create(page);
    const dialog = page.getByRole("dialog");
    await dialog.locator("#admin-step-up-password").fill("FICTIF-preuve!2026");
    await dialog.locator("#admin-step-up-code").fill("123456");
    await dialog.getByRole("button", { name: /Confirmer/ }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByText("Compte créé", { exact: true })).toBeFocused();
    const requests = await counts(page);
    assert.equal(requests.post, 2);
    assert.equal(requests.proof, 1);
    return { counts: requests };
  });
  await run(
    "defi-admin-timeout-efface-preuves-et-reprise",
    390,
    async (page) => {
      await configure(page, {
        "POST /api/users": "stepup",
        "POST /api/auth/step-up": "hold",
      });
      await fill(page, true);
      await create(page);
      const dialog = page.getByRole("dialog");
      await dialog
        .locator("#admin-step-up-password")
        .fill("FICTIF-preuve!2026");
      await dialog.locator("#admin-step-up-code").fill("123456");
      await dialog.getByRole("button", { name: /Confirmer/ }).click();
      await page.clock.fastForward(31_000);
      await expect(dialog.locator("#admin-step-up-password")).toBeFocused();
      await expect(dialog.locator("#admin-step-up-password")).toHaveValue("");
      await expect(dialog.locator("#admin-step-up-code")).toHaveValue("");
      await expect(
        dialog.getByRole("button", { name: "Annuler", exact: true }),
      ).toBeEnabled();
      const requests = await counts(page);
      assert.equal(requests.post, 1);
      assert.equal(requests.proof, 1);
      assert.equal(requests.aborted, 1);
      return { counts: requests, elapsedClockMs: 31_000 };
    },
  );
};
