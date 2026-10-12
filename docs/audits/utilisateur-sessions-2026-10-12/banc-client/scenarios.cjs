module.exports = async ({ run, expect, assert, work, path, before }) => {
  const sessionsPath = "/api/users/audit-target/sessions";
  const configure = (page, values) =>
    page.evaluate(
      (values) => Object.assign(window.__securityApi.modes, values),
      values,
    );
  const counts = (page) =>
    page.evaluate(() => ({
      get: window.__securityApi.requests.filter(
        (r) => r.path.endsWith("/sessions") && r.method === "GET",
      ).length,
      del: window.__securityApi.requests.filter((r) => r.method === "DELETE")
        .length,
      proof: window.__securityApi.requests.filter(
        (r) => r.path === "/api/auth/step-up",
      ).length,
      aborted: window.__securityApi.requests.filter((r) => r.aborted).length,
    }));
  async function revoke(page, all = false) {
    await page
      .getByRole("button", {
        name: all ? "Révoquer toutes les sessions" : /^Révoquer la session /,
        exact: all,
      })
      .first()
      .click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await page
      .getByRole("alertdialog")
      .getByRole("button", {
        name: all ? "Révoquer" : "Révoquer la session",
        exact: true,
      })
      .click();
  }
  const geometry = (page) =>
    page.evaluate(() => {
      const rect = (el) => {
        const r = el.getBoundingClientRect();
        return { top: r.top, bottom: r.bottom, height: r.height };
      };
      const main = document.querySelector("main"),
        title = document.querySelector("#user-security-sessions-heading"),
        nav = document.querySelector(
          'nav[aria-label="Navigation de la fiche utilisateur"]',
        );
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
  await run(
    "lecture-sessions-suspendue31s",
    390,
    async (page) => {
      await page.clock.fastForward(31_000);
      if (before) {
        await expect(
          page.getByRole("button", { name: "Réessayer", exact: true }),
        ).toHaveCount(0);
        assert.equal((await counts(page)).aborted, 0);
      } else {
        await expect(
          page.getByRole("button", { name: "Réessayer", exact: true }),
        ).toBeVisible();
        assert.equal((await counts(page)).aborted, 1);
        await configure(page, { ["GET " + sessionsPath]: "success" });
        await page
          .getByRole("button", { name: "Réessayer", exact: true })
          .click();
        await expect(
          page.getByRole("button", {
            name: "Révoquer toutes les sessions",
            exact: true,
          }),
        ).toBeVisible();
      }
      return { elapsedClockMs: 31_000, counts: await counts(page) };
    },
    { initialLoading: true, modes: { ["GET " + sessionsPath]: "hold" } },
  );
  await run("revocation-globale-suspendue31s", 390, async (page) => {
    await configure(page, { ["DELETE " + sessionsPath]: "hold" });
    await revoke(page, true);
    if (before) await expect(page.getByRole("alertdialog")).toHaveCount(0);
    await page.clock.fastForward(31_000);
    const requests = await counts(page);
    assert.equal(requests.del, 1);
    assert.equal(requests.aborted, before ? 0 : 1);
    if (before)
      await expect(
        page.getByRole("button", {
          name: "Révoquer toutes les sessions",
          exact: true,
        }),
      ).toBeDisabled();
    else {
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      assert.equal(requests.get, 2);
      await expect(page.getByText(/réponse.*confirmée/i)).toBeVisible();
    }
    return {
      elapsedClockMs: 31_000,
      counts: requests,
      dialogOpen: await page.getByRole("alertdialog").count(),
    };
  });
  for (const mode of ["error", "lost"])
    await run("revocation-" + mode + "-relecture", 1440, async (page) => {
      await configure(page, { ["DELETE " + sessionsPath]: mode });
      await revoke(page);
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      if (!before)
        await expect.poll(async () => (await counts(page)).get).toBe(2);
      const requests = await counts(page);
      assert.equal(requests.del, 1);
      assert.equal(requests.get, before ? 1 : 2);
      let noticeOwner = null;
      if (!before) {
        const card = page.locator(
          '[aria-labelledby="user-security-sessions-heading"]',
        );
        const notice = card
          .getByRole("status")
          .filter({ hasText: /réponse.*confirmée/i });
        await expect(notice).toBeVisible();
        await expect(
          page
            .locator('[aria-labelledby="user-security-status-heading"]')
            .getByText(/réponse.*confirmée/i),
        ).toHaveCount(0);
        noticeOwner = await notice.evaluate((element) =>
          element.closest("[aria-labelledby]")?.getAttribute("aria-labelledby"),
        );
        assert.equal(noticeOwner, "user-security-sessions-heading");
        if (mode === "lost")
          await page.screenshot({
            path: path.join(work, "notice-sessions-1440.png"),
          });
      }
      return {
        noticeOwner,
        counts: requests,
        remainingControls: await page.locator("[data-session-id]").count(),
        storedSessions: await page.evaluate(
          () => window.__securityApi.sessions.length,
        ),
      };
    });
  for (const width of [390, 1440])
    await run(
      "focus-titre-apres-reprise",
      width,
      async (page) => {
        await configure(page, { ["GET " + sessionsPath]: "error" });
        await revoke(page);
        await expect(
          page.getByRole("button", { name: "Réessayer", exact: true }),
        ).toBeVisible();
        await page.evaluate(() => {
          const main = document.querySelector("main"),
            title = document.querySelector("#user-security-sessions-heading");
          main.scrollTop += title.getBoundingClientRect().top - 80;
        });
        const initial = await geometry(page);
        await configure(page, { ["GET " + sessionsPath]: "success" });
        await page
          .getByRole("button", { name: "Réessayer", exact: true })
          .click();
        await expect(
          page.locator("#user-security-sessions-heading"),
        ).toBeFocused();
        const final = await geometry(page);
        if (!before) assert.ok(!final.hiddenByNav, JSON.stringify(final));
        assert.ok(final.documentWidth <= final.viewport + 1);
        assert.ok(final.mainScrollWidth <= final.mainWidth + 1);
        await page.screenshot({
          path: path.join(work, "focus-reprise-" + width + ".png"),
        });
        return { initial, final };
      },
      { long: true, height: 900 },
    );
  await run("defi-administratif-suspendu31s", 390, async (page) => {
    await configure(page, {
      ["DELETE " + sessionsPath]: "stepup",
      "POST /api/auth/step-up": "hold",
    });
    await revoke(page, true);
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await dialog.locator("#admin-step-up-password").fill("FICTIF-preuve!2026");
    await dialog.locator("#admin-step-up-code").fill("123456");
    await dialog.getByRole("button", { name: /Confirmer/ }).click();
    await page.clock.fastForward(31_000);
    if (before) {
      await expect(
        dialog.getByRole("button", { name: "Annuler", exact: true }),
      ).toBeDisabled();
      await page.keyboard.press("Escape");
      await expect(dialog).toBeVisible();
    } else {
      await expect(
        dialog.getByRole("button", { name: "Annuler", exact: true }),
      ).toBeEnabled();
      await expect(dialog.locator("#admin-step-up-password")).toBeFocused();
    }
    const requests = await counts(page);
    assert.equal(requests.del, 1);
    assert.equal(requests.proof, 1);
    assert.equal(requests.aborted, before ? 0 : 1);
    return { elapsedClockMs: 31_000, counts: requests };
  });
  if (!before) {
    await run("reprise-ne-vole-pas-focus", 390, async (page) => {
      await configure(page, { ["GET " + sessionsPath]: "error" });
      await revoke(page);
      const retry = page.getByRole("button", {
        name: "Réessayer",
        exact: true,
      });
      await expect(retry).toBeVisible();
      await configure(page, { ["GET " + sessionsPath]: "hold" });
      await retry.click();
      const destination = page
        .getByRole("navigation", { name: "Navigation de la fiche utilisateur" })
        .getByRole("link", { name: "Profil", exact: true });
      await destination.focus();
      await page.keyboard.press("Tab");
      const beforeFocus = await page.evaluate(
        () => document.activeElement?.outerHTML,
      );
      await page.evaluate(() =>
        window.__securityApi.pending.splice(0).forEach((resolve) => resolve()),
      );
      await expect(retry).toHaveCount(0);
      assert.equal(
        await page.evaluate(() => document.activeElement?.outerHTML),
        beforeFocus,
      );
      return {
        focusedTag: await page.evaluate(() => document.activeElement?.tagName),
        counts: await counts(page),
      };
    });
    await run("refus403-non-json-purge", 1440, async (page) => {
      await configure(page, { ["DELETE " + sessionsPath]: "forbidden" });
      await revoke(page);
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      await expect(page.locator("[data-session-id]")).toHaveCount(0);
      const requests = await counts(page);
      assert.equal(requests.del, 1);
      return {
        counts: requests,
        alerts: await page.getByRole("alert").allTextContents(),
      };
    });
    await run("defi-annuler-conserve-sessions", 390, async (page) => {
      await configure(page, { ["DELETE " + sessionsPath]: "stepup" });
      await revoke(page, true);
      const dialog = page.getByRole("dialog");
      await expect(dialog.locator("#admin-step-up-password")).toBeFocused();
      await dialog
        .getByRole("button", { name: "Annuler", exact: true })
        .click();
      await expect(dialog).toHaveCount(0);
      await expect(
        page.locator("#user-security-sessions-heading"),
      ).toBeFocused();
      const focusGeometry = await geometry(page);
      assert.ok(!focusGeometry.hiddenByNav, JSON.stringify(focusGeometry));
      const requests = await counts(page);
      assert.equal(requests.del, 1);
      assert.equal(requests.proof, 0);
      assert.equal(await page.locator("[data-session-id]").count(), 4);
      return {
        counts: requests,
        focused: await page.evaluate(() => ({
          tag: document.activeElement?.tagName,
          id: document.activeElement?.id,
          text: document.activeElement?.textContent,
        })),
      };
    });
    await run("defi-confirme-reprend-une-revocation", 1440, async (page) => {
      await configure(page, { ["DELETE " + sessionsPath]: "stepup" });
      await revoke(page, true);
      const dialog = page.getByRole("dialog");
      await expect(dialog.locator("#admin-step-up-password")).toBeFocused();
      await dialog
        .locator("#admin-step-up-password")
        .fill("FICTIF-preuve!2026");
      await dialog.locator("#admin-step-up-code").fill("123456");
      await dialog.getByRole("button", { name: /Confirmer/ }).click();
      await expect(dialog).toHaveCount(0);
      await expect(page.locator("[data-session-id]")).toHaveCount(0);
      await expect(
        page.locator("#user-security-sessions-heading"),
      ).toBeFocused();
      const focusGeometry = await geometry(page);
      assert.ok(!focusGeometry.hiddenByNav, JSON.stringify(focusGeometry));
      const requests = await counts(page);
      assert.equal(requests.del, 2);
      assert.equal(requests.proof, 1);
      return {
        counts: requests,
        focused: await page.evaluate(() => ({
          tag: document.activeElement?.tagName,
          id: document.activeElement?.id,
          text: document.activeElement?.textContent,
        })),
      };
    });
  }
};
