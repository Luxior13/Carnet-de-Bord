module.exports = async ({
  run,
  expect,
  assert,
  heading,
  nickname,
  save,
  updateActor,
  before,
  initial,
  work,
  path,
}) => {
  if (before) {
    await run("avant-ssr-compte-garde-brouillon", 390, async (page, api) => {
      await nickname(page).fill("BrouillonAncienCompte");
      await updateActor(page, { id: "audit-other-actor" });
      await expect(nickname(page)).toHaveValue("BrouillonAncienCompte");
      assert.equal(api.requests.length, 0);
      return {
        defect: "snapshot et brouillon compte A restent affichés sous compte B",
      };
    });
    await run(
      "avant-patch-tardif-compte-change",
      390,
      async (page, api) => {
        await nickname(page).fill("AncienCompteEnregistre");
        await save(page).click();
        await expect
          .poll(() => api.requests.filter((r) => r.method === "PATCH").length)
          .toBe(1);
        await updateActor(page, { id: "audit-other-actor" });
        await api.resolve();
        await expect(heading(page)).toContainText("AncienCompteEnregistre");
        return { defect: "PATCH ancien accepté après changement de compte" };
      },
      { mode: "hold" },
    );
    await run(
      "avant-readiness-perd-brouillon",
      390,
      async (page) => {
        await nickname(page).fill("BrouillonEfface");
        await page.evaluate(() => window.__auditToggleFeature(false));
        await expect(heading(page)).toHaveText(
          "Répertoire temporairement indisponible",
        );
        await page.evaluate(() => window.__auditToggleFeature(true));
        await expect(nickname(page)).toHaveValue("CamilleAudit");
        return {
          defect: "brouillon perdu sans snapshot lorsque disponibilité change",
        };
      },
      { ssr: false },
    );
    await run(
      "avant-stockage-bloque",
      390,
      async (page) => {
        await expect(page.locator("body")).not.toContainText("CamilleAudit");
        return {
          defect: "lecture sessionStorage non protégée démonte la page",
        };
      },
      { storageBlocked: true, skipReady: true, allowPageErrors: true },
    );
    await run(
      "avant-email-entree-sans-submit",
      390,
      async (page, api) => {
        await page.getByRole("button", { name: /Ajouter.*email/i }).click();
        const dialog = page.getByRole("dialog");
        await dialog
          .locator("#person-child-email-email")
          .fill("nouveau@example.test");
        await dialog.locator("#person-child-email-email").press("Enter");
        await expect(dialog).toBeVisible();
        assert.equal(api.requests.filter((r) => r.method === "POST").length, 0);
        return { defect: "Entrée ne soumet pas le dialogue de coordonnée" };
      },
      { url: initial + "&section=coordonnees" },
    );
    await run(
      "avant-conflit-coordonnee-ecrase-champ-intact",
      390,
      async (page, api) => {
        await page
          .getByRole("listitem")
          .filter({
            has: page.getByRole("link", {
              name: "camille@example.test",
              exact: true,
            }),
          })
          .getByRole("button", { name: /Modifier/ })
          .click();
        const dialog = page.getByRole("dialog");
        await dialog
          .locator("#person-child-email-email")
          .fill("modifie@example.test");
        await dialog
          .getByRole("button", { name: "Enregistrer", exact: true })
          .click();
        await expect(
          dialog.getByText("Modification concurrente", { exact: true }),
        ).toBeVisible();
        api.person = {
          ...api.person,
          version: 2,
          emails: api.person.emails.map((e) =>
            e.id === "audit-email-a"
              ? { ...e, label: "Professionnel", version: 2 }
              : e,
          ),
        };
        await dialog
          .getByRole("button", { name: "Actualiser la version", exact: true })
          .click();
        await expect(
          dialog.getByRole("button", { name: "Enregistrer", exact: true }),
        ).toBeEnabled();
        await expect(dialog.locator("#person-child-email-label")).toHaveValue(
          "Personnel",
        );
        api.mode = "success";
        await dialog
          .getByRole("button", { name: "Enregistrer", exact: true })
          .click();
        await expect(dialog).toHaveCount(0);
        const patches = api.requests.filter((r) => r.method === "PATCH");
        assert.equal(patches.at(-1).body.label, "Personnel");
        return {
          defect:
            "le rechargement actualise les versions sans fusion : libellé serveur Professionnel écrasé par Personnel intact localement",
        };
      },
      { url: initial + "&section=coordonnees", mode: "conflict" },
    );
    await run(
      "avant-fermeture-coordonnee-focus",
      390,
      async (page) => {
        const trigger = page
          .getByRole("listitem")
          .filter({
            has: page.getByRole("link", {
              name: "camille@example.test",
              exact: true,
            }),
          })
          .getByRole("button", { name: /Modifier/ });
        await trigger.click();
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Annuler", exact: true })
          .click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
        return {
          active: await page.evaluate(() => ({
            tag: document.activeElement.tagName,
            label: document.activeElement.getAttribute("aria-label"),
          })),
          triggerFocused: await trigger.evaluate(
            (e) => e === document.activeElement,
          ),
        };
      },
      { url: initial + "&section=coordonnees" },
    );
    return;
  }
  const editor = (page, email = "camille@example.test") =>
    page
      .getByRole("listitem")
      .filter({ has: page.getByRole("link", { name: email, exact: true }) })
      .getByRole("button", { name: /Modifier/ });
  const dialog = (page) => page.getByRole("dialog");
  const email = (page) => dialog(page).locator("#person-child-email-email");
  const label = (page) => dialog(page).locator("#person-child-email-label");
  const coords = initial + "&section=coordonnees";
  const writes = (api) => api.requests.filter((r) => r.method !== "GET");
  for (const width of [320, 390, 768, 1024, 1440, 1920])
    await run(
      "composition-identite-coordonnees-dialogues",
      width,
      async (page) => {
        await expect(nickname(page)).toHaveValue("CamilleAudit");
        const broken = await page
          .locator("input[aria-describedby]")
          .evaluateAll((nodes) =>
            nodes.flatMap((n) =>
              (n.getAttribute("aria-describedby") || "")
                .split(" ")
                .filter((id) => id && !document.getElementById(id)),
            ),
          );
        assert.deepEqual(broken, []);
        // Reprise du 22 octobre : pas de titre visible qui répète l'onglet,
        // dates de la fiche une seule fois dans le bandeau.
        await expect(page.getByText("Informations personnelles")).toHaveCount(0);
        await expect(
          page.getByRole("heading", { name: "Identité", exact: true }),
        ).toHaveCount(1);
        const hero = page.locator('[data-slot="page-heading"]');
        await expect(hero).toContainText("Créée le");
        await expect(hero).toContainText("Modifiée le");
        await expect(page.getByText(/^Dernière modification le/)).toHaveCount(0);
        await expect(
          page.getByText("Zone dangereuse", { exact: true }),
        ).toBeVisible();
        if ([320, 1440].includes(width))
          await page.screenshot({
            path: path.join(work, `identite-${width}.png`),
            fullPage: true,
          });
        await page
          .getByRole("link", { name: "Coordonnées", exact: true })
          .click();
        await expect(
          page.getByRole("link", { name: "camille@example.test", exact: true }),
        ).toBeVisible();
        if ([320, 1440].includes(width))
          await page.screenshot({
            path: path.join(work, `coordonnees-${width}.png`),
            fullPage: true,
          });
        for (const kind of ["email", "téléphone", "profil social"]) {
          const trigger = page.getByRole("button", {
            name: new RegExp("Ajouter.*" + kind, "i"),
          });
          await trigger.click();
          await expect(dialog(page)).toBeVisible();
          await expect(dialog(page).locator("form")).toHaveAttribute(
            "autocomplete",
            "off",
          );
          for (const input of await dialog(page)
            .locator('input:not([type="hidden"]):not([aria-hidden="true"])')
            .all()) {
            await expect(input).toHaveAttribute("autocomplete", "off");
            await expect(input).toHaveAttribute("data-bwignore", "true");
          }
          const menu = dialog(page)
            .getByRole("combobox")
            .filter({ hasNot: page.locator("input") });
          if (kind !== "email") {
            await menu.first().focus();
            await page.keyboard.press("ArrowDown");
            await expect(page.getByRole("listbox")).toBeVisible();
            await page.keyboard.press("Escape");
            await expect(menu.first()).toBeFocused();
          }
          await dialog(page)
            .getByRole("button", { name: "Annuler", exact: true })
            .click();
          await expect(dialog(page)).toHaveCount(0);
          await expect(trigger).toBeFocused();
        }
      },
    );
  await run(
    "identite-validation-entree-double-save",
    390,
    async (page, api) => {
      await page
        .getByLabel("Date de naissance", { exact: true })
        .fill("2099-01-01");
      await save(page).click();
      await expect(
        page.getByLabel("Date de naissance", { exact: true }),
      ).toBeFocused();
      assert.equal(writes(api).length, 0);
      await page
        .getByLabel("Date de naissance", { exact: true })
        .fill("2000-01-02");
      await nickname(page).fill("PseudoNouveau");
      api.mode = "hold";
      await nickname(page).press("Enter");
      await page.locator("form").evaluate((f) => f.requestSubmit());
      await expect.poll(() => writes(api).length).toBe(1);
      await api.resolve();
      await expect(heading(page)).toContainText("PseudoNouveau");
      await expect(nickname(page)).toBeFocused();
    },
  );
  await run(
    "identite-conflit-fusion-annuler",
    390,
    async (page, api) => {
      await nickname(page).fill("PseudoLocal");
      await save(page).click();
      await expect(
        page.getByRole("button", {
          name: "Actualiser la version",
          exact: true,
        }),
      ).toBeVisible();
      api.person = { ...api.person, version: 2, lastName: "NomServeur" };
      await page
        .getByRole("button", { name: "Actualiser la version", exact: true })
        .click();
      await expect(nickname(page)).toHaveValue("PseudoLocal");
      await expect(page.getByLabel("Nom", { exact: true })).toHaveValue(
        "NomServeur",
      );
      await page.getByRole("button", { name: "Annuler", exact: true }).click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", {
          name: "Abandonner les modifications",
          exact: true,
        })
        .click();
      await expect(nickname(page)).toHaveValue("CamilleAudit");
      await expect(nickname(page)).toBeFocused();
      assert.equal(writes(api).length, 1);
    },
    { mode: "conflict" },
  );
  await run(
    "navigation-dirty-pending-et-retourfocus",
    390,
    async (page, api) => {
      await nickname(page).fill("BrouillonLocal");
      const tab = page.getByRole("link", { name: /Coordonnées/ });
      await tab.click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Rester", exact: true })
        .click();
      await expect(tab).toBeFocused();
      await expect(nickname(page)).toHaveValue("BrouillonLocal");
      api.mode = "hold";
      await save(page).click();
      await expect.poll(() => writes(api).length).toBe(1);
      await tab.click();
      await expect(page.getByRole("alertdialog")).toContainText(
        "Quitter la page ne garantit pas son annulation",
      );
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Quitter la page", exact: true })
        .click();
      await expect(
        page.getByRole("link", { name: "camille@example.test", exact: true }),
      ).toBeVisible();
      await api.resolve();
      await expect(heading(page)).toContainText("CamilleAudit");
    },
  );
  await run("ssr-compte-a-b-a-snapshot-non-recycle", 390, async (page, api) => {
    await nickname(page).fill("BrouillonA");
    api.person = { ...api.person, nickname: "VersionServeurB", version: 2 };
    await updateActor(page, { id: "audit-other-actor" });
    await expect(nickname(page)).toHaveValue("VersionServeurB");
    api.person = {
      ...api.person,
      nickname: "VersionServeurARevenu",
      version: 3,
    };
    await updateActor(page, { id: "audit-creator" });
    await expect(nickname(page)).toHaveValue("VersionServeurARevenu");
    return { readCount: api.requests.filter((r) => r.method === "GET").length };
  });
  await run(
    "patch-ancien-compte-ignore",
    390,
    async (page, api) => {
      await nickname(page).fill("AncienCompteTardif");
      await save(page).click();
      await expect.poll(() => writes(api).length).toBe(1);
      await updateActor(page, { id: "audit-other-actor" });
      await expect(nickname(page)).toHaveValue("CamilleAudit");
      await api.resolve();
      await expect(heading(page)).toContainText("CamilleAudit");
      await expect(nickname(page)).toHaveValue("CamilleAudit");
    },
    { mode: "hold" },
  );
  await run(
    "readiness-identite-dialogue-conserve",
    390,
    async (page) => {
      await nickname(page).fill("BrouillonConserve");
      await page.evaluate(() => window.__auditToggleFeature(false));
      await expect(nickname(page)).toHaveValue("BrouillonConserve");
      await expect(save(page)).toBeDisabled();
      await page.evaluate(() => window.__auditToggleFeature(true));
      await expect(nickname(page)).toHaveValue("BrouillonConserve");
      await expect(save(page)).toBeEnabled();
    },
    { ssr: false },
  );
  await run(
    "stockage-refuse-sans-effondrement",
    390,
    async (page) => {
      await expect(nickname(page)).toHaveValue("CamilleAudit");
    },
    { storageBlocked: true },
  );
  await run(
    "email-conflit-fusion-champ-intact",
    390,
    async (page, api) => {
      await editor(page).click();
      await email(page).fill("modifie@example.test");
      await email(page).press("Enter");
      await expect(
        dialog(page).getByText("Modification concurrente", { exact: true }),
      ).toBeVisible();
      api.person = {
        ...api.person,
        version: 2,
        emails: api.person.emails.map((e) =>
          e.id === "audit-email-a"
            ? { ...e, label: "Professionnel", version: 2 }
            : e,
        ),
      };
      await dialog(page)
        .getByRole("button", { name: "Actualiser la version", exact: true })
        .click();
      await expect(email(page)).toHaveValue("modifie@example.test");
      await expect(label(page)).toHaveValue("Professionnel");
      await expect(email(page)).toBeFocused();
      api.mode = "success";
      await email(page).press("Enter");
      await expect(dialog(page)).toHaveCount(0);
      assert.equal(writes(api).at(-1).body.label, "Professionnel");
      assert.equal(writes(api).at(-1).body.version, 2);
    },
    { url: coords, mode: "conflict" },
  );
  await run(
    "email-noop-et-erreurs-focus",
    390,
    async (page, api) => {
      await editor(page).click();
      await expect(
        dialog(page).getByRole("button", { name: "Enregistrer", exact: true }),
      ).toBeDisabled();
      await email(page).fill("  camille@example.test  ");
      await expect(
        dialog(page).getByRole("button", { name: "Enregistrer", exact: true }),
      ).toBeDisabled();
      await email(page).fill("incorrect");
      await email(page).press("Enter");
      await expect(email(page)).toHaveAttribute("aria-invalid", "true");
      await expect(email(page)).toBeFocused();
      assert.equal(writes(api).length, 0);
      await email(page).fill("autre-valide@example.test");
      api.mode = "field";
      await email(page).press("Enter");
      await expect(email(page)).toBeFocused();
      await expect(email(page)).toHaveAttribute("aria-invalid", "true");
    },
    { url: coords },
  );
  await run(
    "email-ajout-double-submit-doublon",
    320,
    async (page, api) => {
      await page.getByRole("button", { name: /Ajouter.*email/i }).click();
      await email(page).fill("partage@example.test");
      api.mode = "hold";
      await dialog(page)
        .locator("form")
        .evaluate((f) => {
          f.requestSubmit();
          f.requestSubmit();
        });
      await expect.poll(() => writes(api).length).toBe(1);
      api.mode = "duplicate";
      await api.resolve();
      await expect(
        dialog(page).getByText(/Cette valeur existe aussi/),
      ).toBeVisible();
      await expect(
        dialog(page).getByRole("group", {
          name: "Résultat de l’enregistrement",
        }),
      ).toBeFocused();
      await expect(email(page)).toBeDisabled();
      await dialog(page)
        .getByRole("button", { name: "Terminer", exact: true })
        .click();
      await expect(dialog(page)).toHaveCount(0);
      assert.equal(writes(api).length, 1);
    },
    { url: coords },
  );
  await run(
    "coordonnee-readiness-et-depart-annule",
    390,
    async (page) => {
      const trigger = editor(page);
      await trigger.click();
      await email(page).fill("brouillon@example.test");
      await page.evaluate(() => window.__auditToggleFeature(false));
      await expect(email(page)).toHaveValue("brouillon@example.test");
      await expect(
        dialog(page).getByRole("button", { name: "Enregistrer", exact: true }),
      ).toBeDisabled();
      await page.evaluate(() => window.__auditToggleFeature(true));
      await dialog(page)
        .getByRole("button", { name: "Annuler", exact: true })
        .click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Rester", exact: true })
        .click();
      await expect(
        dialog(page).getByRole("button", { name: "Annuler", exact: true }),
      ).toBeFocused();
      await expect(email(page)).toHaveValue("brouillon@example.test");
    },
    { url: coords },
  );
  await run(
    "telephone-social-contrats-entree",
    390,
    async (page, api) => {
      await page.getByRole("button", { name: /Ajouter.*téléphone/i }).click();
      await dialog(page)
        .locator("#person-child-phone-phone")
        .fill("0612345678");
      await dialog(page).locator("#person-child-phone-phone").press("Enter");
      await expect(dialog(page)).toHaveCount(0);
      const phone = writes(api).at(-1).body;
      assert.deepEqual(
        Object.keys(phone).sort(),
        ["countryCode", "isPrimary", "label", "personVersion", "phone"].sort(),
      );
      assert.equal(phone.phone, "0612345678");
      await page
        .getByRole("button", { name: /Ajouter.*profil social/i })
        .click();
      await dialog(page)
        .locator("#person-child-social-identifier")
        .fill("audit.nouveau");
      await dialog(page)
        .locator("#person-child-social-url")
        .fill("javascript:alert(1)");
      await dialog(page)
        .locator("#person-child-social-identifier")
        .press("Enter");
      await expect(
        dialog(page).locator("#person-child-social-url"),
      ).toHaveAttribute("aria-invalid", "true");
      assert.equal(writes(api).length, 1);
      await dialog(page).locator("#person-child-social-url").fill("");
      await dialog(page)
        .locator("#person-child-social-identifier")
        .press("Enter");
      await expect(dialog(page)).toHaveCount(0);
      assert.deepEqual(
        Object.keys(writes(api).at(-1).body).sort(),
        [
          "networkKey",
          "identifier",
          "profileUrl",
          "isPrimary",
          "label",
          "personVersion",
        ].sort(),
      );
    },
    { url: coords },
  );
  await run(
    "email-reponse-perdue-verification-sans-second-ajout",
    390,
    async (page, api) => {
      await page.getByRole("button", { name: /Ajouter.*email/i }).click();
      await email(page).fill("incertain@example.test");
      await email(page).press("Enter");
      await expect(
        dialog(page).getByRole("button", { name: "Enregistrer", exact: true }),
      ).toBeDisabled();
      await expect(
        dialog(page).getByRole("group", {
          name: "Résultat de l’enregistrement",
        }),
      ).toBeFocused();
      api.person = {
        ...api.person,
        version: 2,
        emails: [
          ...api.person.emails,
          {
            ...api.person.emails[0],
            id: "audit-child-new",
            email: "incertain@example.test",
            isPrimary: false,
          },
        ],
      };
      await dialog(page)
        .getByRole("button", { name: "Actualiser la version", exact: true })
        .click();
      await expect(dialog(page)).toContainText(
        "présente dans la fiche actualisée",
      );
      await dialog(page)
        .getByRole("button", { name: "Terminer", exact: true })
        .click();
      await expect(dialog(page)).toHaveCount(0);
      assert.equal(writes(api).length, 1);
    },
    { url: coords, mode: "lost" },
  );
  await run(
    "coordonnee-timeout-relecture-echec-reprise",
    390,
    async (page, api) => {
      await editor(page).click();
      await email(page).fill("timeout@example.test");
      await email(page).press("Enter");
      await expect(
        dialog(page).getByRole("button", { name: "Enregistrer", exact: true }),
      ).toBeDisabled();
      await expect(
        dialog(page).getByRole("button", {
          name: "Actualiser la version",
          exact: true,
        }),
      ).toBeVisible();
      api.readMode = "error";
      await dialog(page)
        .getByRole("button", { name: "Actualiser la version", exact: true })
        .click();
      await expect(
        dialog(page).getByRole("group", {
          name: "Résultat de l’enregistrement",
        }),
      ).toBeFocused();
      await expect(email(page)).toHaveValue("timeout@example.test");
      api.readMode = "success";
      await dialog(page)
        .getByRole("button", { name: "Actualiser la version", exact: true })
        .click();
      await expect(email(page)).toBeFocused();
      await expect(
        dialog(page).getByRole("button", { name: "Enregistrer", exact: true }),
      ).toBeEnabled();
      assert.equal(writes(api).length, 1);
    },
    { url: coords, mode: "hold", fastTimeout: true },
  );
  await run(
    "coordonnee-disparue-conflit",
    390,
    async (page, api) => {
      await editor(page).click();
      await email(page).fill("modifie@example.test");
      await email(page).press("Enter");
      await expect(
        dialog(page).getByText("Modification concurrente", { exact: true }),
      ).toBeVisible();
      api.person = {
        ...api.person,
        version: 2,
        emails: api.person.emails.filter((e) => e.id !== "audit-email-a"),
      };
      await dialog(page)
        .getByRole("button", { name: "Actualiser la version", exact: true })
        .click();
      await expect(dialog(page)).toContainText("supprimée");
      await expect(
        dialog(page).getByRole("button", { name: "Enregistrer", exact: true }),
      ).toBeDisabled();
    },
    { url: coords, mode: "conflict" },
  );
  await run(
    "suppression-email-principal-remplacement",
    390,
    async (page, api) => {
      await editor(page).click();
      await dialog(page)
        .getByRole("button", { name: "Supprimer", exact: true })
        .click();
      const confirmation = page.getByRole("alertdialog");
      await expect(
        confirmation.getByRole("button", { name: "Supprimer", exact: true }),
      ).toBeDisabled();
      await confirmation
        .getByRole("combobox", { name: "Nouveau principal" })
        .click();
      await page
        .getByRole("option", { name: "autre@example.test", exact: true })
        .click();
      await confirmation
        .getByRole("button", { name: "Supprimer", exact: true })
        .click();
      await expect(confirmation).toHaveCount(0);
      await expect(
        page.getByRole("link", { name: "camille@example.test", exact: true }),
      ).toHaveCount(0);
      assert.equal(
        writes(api).at(-1).body.replacementPrimaryId,
        "audit-email-b",
      );
      assert.equal(writes(api).at(-1).body.personVersion, 1);
    },
    { url: coords },
  );
  await run(
    "suppression-fiche-reponse-perdue-cle-retour",
    390,
    async (page, api) => {
      const trigger = page.getByRole("button", {
        name: "Supprimer la fiche",
        exact: true,
      });
      await trigger.click();
      const confirmation = page.getByRole("alertdialog");
      await expect(confirmation.locator("input[type=password]")).toHaveCount(0);
      await confirmation
        .getByRole("button", { name: "Annuler", exact: true })
        .click();
      await expect(trigger).toBeFocused();
      assert.equal(writes(api).length, 0);
      await trigger.click();
      await confirmation
        .getByRole("button", { name: "Supprimer définitivement", exact: true })
        .click();
      await expect(confirmation.getByRole("alert")).toBeVisible();
      await confirmation
        .getByRole("button", { name: "Annuler", exact: true })
        .click();
      await trigger.click();
      api.mode = "success";
      await confirmation
        .getByRole("button", { name: "Supprimer définitivement", exact: true })
        .click();
      await expect(heading(page)).toHaveText("Destination simulée");
      assert.equal(writes(api).length, 2);
      assert.equal(
        writes(api)[0].headers["idempotency-key"],
        writes(api)[1].headers["idempotency-key"],
      );
      await expect(page).toHaveURL(
        /repertoire\?q=Camille&status=IN_STRUCTURE$/,
      );
    },
    { mode: "lost" },
  );
  await run(
    "suppression-fiche-mot-de-passe-puis-reprise",
    390,
    async (page, api) => {
      await page
        .getByRole("button", { name: "Supprimer la fiche", exact: true })
        .click();
      await page
        .getByRole("alertdialog")
        .getByRole("button", { name: "Supprimer définitivement", exact: true })
        .click();
      const proof = page.getByRole("dialog", {
        name: "Confirmer la suppression",
      });
      await expect(proof).toBeVisible();
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      await page.screenshot({
        path: path.join(work, "suppression-mot-de-passe-390.png"),
      });
      await proof.locator("input[type=password]").fill("Preuve-fictive!");
      await proof.getByRole("button", { name: /^Confirmer/ }).click();
      await expect(heading(page)).toHaveText("Destination simulée");
      const deletions = api.requests.filter((r) => r.method === "DELETE");
      assert.equal(deletions.length, 2);
      assert.equal(
        deletions[0].headers["idempotency-key"],
        deletions[1].headers["idempotency-key"],
      );
    },
    { mode: "passwordProof" },
  );
  await run(
    "lecture-seule-copie-coordonnees",
    320,
    async (page, api) => {
      await expect(
        page.getByRole("button", { name: /Modifier|Ajouter|Supprimer/ }),
      ).toHaveCount(0);
      await expect(
        page.getByRole("button", { name: /^Historique :/ }),
      ).toHaveCount(0);
      await page
        .getByRole("listitem")
        .filter({
          has: page.getByRole("link", {
            name: "camille@example.test",
            exact: true,
          }),
        })
        .getByRole("button", { name: /Copier/ })
        .click();
      assert.deepEqual(await page.evaluate(() => window.__auditCopies), [
        "camille@example.test",
      ]);
      assert.equal(writes(api).length, 0);
    },
    { url: coords, readonly: true },
  );
  await run(
    "refus-actualisation-purge-donnees-dialogue",
    390,
    async (page, api) => {
      await editor(page).click();
      await email(page).fill("refuse@example.test");
      await email(page).press("Enter");
      await expect(
        dialog(page).getByText("Modification concurrente", { exact: true }),
      ).toBeVisible();
      api.readMode = "forbiddenHtml";
      await dialog(page)
        .getByRole("button", { name: "Actualiser la version", exact: true })
        .click();
      await expect(dialog(page)).toHaveCount(0);
      await expect(
        page.getByRole("link", { name: "camille@example.test", exact: true }),
      ).toHaveCount(0);
      await expect(page.locator("body")).not.toContainText("CamilleAudit");
    },
    { url: coords, mode: "conflict" },
  );
  await run(
    "provenance-ouverte-revision-relecture-timeout",
    390,
    async (page, api) => {
      const trigger = page.getByRole("button", {
        name: /Historique : Pseudo/,
      });
      await trigger.click();
      await expect(page.getByRole("tooltip")).toContainText("Auteur fictif");
      await page.evaluate(() => window.__auditSetInitial({ version: 2 }));
      await expect
        .poll(
          () =>
            api.requests.filter((r) => r.path.endsWith("historique-champ"))
              .length,
        )
        .toBe(2);
      await expect(page.getByRole("tooltip")).toContainText("Auteur fictif");
      await page.keyboard.press("Escape");
      api.historyMode = "hold";
      await page.evaluate(() => window.__auditSetInitial({ version: 3 }));
      await trigger.click();
      await expect(page.getByRole("tooltip")).toContainText(
        "Information indisponible",
      );
      await page.keyboard.press("Escape");
      api.historyMode = "success";
      await trigger.click();
      await expect(page.getByRole("tooltip")).toContainText("Auteur fictif");
    },
    { fastTimeout: true },
  );
  await run(
    "identite-conflit-brouillon-revenu-base",
    390,
    async (page, api) => {
      await nickname(page).fill("ValeurInconnue");
      await save(page).click();
      const refresh = page.getByRole("button", {
        name: "Actualiser la version",
        exact: true,
      });
      await expect(refresh).toBeVisible();
      await nickname(page).fill("CamilleAudit");
      await expect(refresh).toBeVisible();
      await expect(save(page)).toBeDisabled();
      await refresh.click();
      await expect(refresh).toHaveCount(0);
      await expect(nickname(page)).toBeFocused();
      assert.equal(writes(api).length, 1);
    },
    { mode: "lost" },
  );
  await run(
    "strictmode-lecture-annulee-remplacee",
    390,
    async (page, api) => {
      await expect
        .poll(() => api.requests.filter((r) => r.method === "GET").length)
        .toBeGreaterThanOrEqual(1);
      await page.waitForTimeout(120);
      await expect(page.getByRole("alert")).toHaveCount(0);
      await expect(nickname(page)).toHaveCount(0);
      api.readMode = "success";
      await api.resolve();
      await expect(nickname(page)).toHaveValue("CamilleAudit");
      await expect(page.getByRole("alert")).toHaveCount(0);
    },
    { ssr: false, strict: true, readMode: "hold", skipReady: true },
  );
  await run(
    "coordonnee-retrait-droits-ignore-reponse",
    390,
    async (page, api) => {
      await editor(page).click();
      await email(page).fill("ancienne-autorisation@example.test");
      await email(page).press("Enter");
      await expect.poll(() => writes(api).length).toBe(1);
      await updateActor(page, {
        isProtected: false,
        role: "USER",
        permissions: {},
      });
      await expect(dialog(page)).toHaveCount(0);
      await expect(page.locator("body")).not.toContainText("CamilleAudit");
      await api.resolve();
      await expect(page.locator("body")).not.toContainText(
        "ancienne-autorisation@example.test",
      );
    },
    { url: coords, mode: "hold" },
  );
  await run(
    "coordonnee-succes-retourfocus-modifier",
    390,
    async (page) => {
      await editor(page).click();
      await label(page).fill("Professionnel");
      await email(page).press("Enter");
      await expect(dialog(page)).toHaveCount(0);
      await expect(editor(page)).toBeFocused();
    },
    { url: coords },
  );
};
