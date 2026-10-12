module.exports = async ({ run, expect, assert, work, path, before }) => {
  const trigger = (page) =>
    page.getByRole("button", { name: "Ouvrir la navigation", exact: true });
  const sheet = (page) =>
    page.getByRole("dialog", { name: "Menu", exact: true });
  const active = (page) =>
    page.evaluate(() => ({
      tag: document.activeElement.tagName,
      label: document.activeElement.getAttribute("aria-label"),
      text: document.activeElement.textContent?.slice(0, 80),
      visible: document.activeElement.getClientRects().length > 0,
    }));
  if (before) {
    await run("avant-mobile-vers-bureau-focus", 390, async (page) => {
      await trigger(page).click();
      await sheet(page)
        .getByRole("link", { name: "Paramètres système", exact: true })
        .focus();
      await page.setViewportSize({ width: 1440, height: 900 });
      await expect(sheet(page)).toHaveCount(0);
      await expect(page.locator("body")).toBeFocused();
      return {
        defect:
          "Redimensionnement avec focus dans le volet : focus perdu sur body.",
        active: await active(page),
      };
    });
    await run("avant-fil-ariane-resize-focus", 390, async (page) => {
      await page
        .getByRole("button", {
          name: "Afficher les niveaux intermédiaires",
          exact: true,
        })
        .click();
      await page
        .getByRole("menuitem", { name: "Accueil", exact: true })
        .focus();
      await page.setViewportSize({ width: 768, height: 900 });
      await expect(page.getByRole("menu")).toHaveCount(0);
      await expect(page.locator("body")).toBeFocused();
      return {
        defect:
          "Menu ancêtres fermé au changement de présentation, focus perdu.",
        active: await active(page),
      };
    });
    await run("avant-sidebar-garde-rester", 390, async (page) => {
      await page.getByLabel("Brouillon fictif").fill("Saisie conservée");
      await trigger(page).click();
      await sheet(page)
        .getByRole("link", { name: "Paramètres système", exact: true })
        .click();
      await expect(page.getByRole("alertdialog")).toBeVisible();
      await page.getByRole("button", { name: "Rester", exact: true }).click();
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      await expect(page.getByLabel("Brouillon fictif")).toHaveValue(
        "Saisie conservée",
      );
      return {
        active: await active(page),
        sheetOpen: await sheet(page).count(),
        href: new URL(page.url()).pathname,
      };
    });
    await run(
      "avant-menu-compte-nom-absent",
      1440,
      async (page) => {
        await expect(
          page.getByRole("button", {
            name: "Menu utilisateur de Camille",
            exact: true,
          }),
        ).toBeVisible();
        return {
          note: "Nom absent normalisé en chaîne vide par le DTO : prénom seul affiché correctement.",
        };
      },
      { actor: { lastName: '' } },
    );
    await run("avant-recherche-garde-rester", 390, async (page) => {
      await page.getByLabel("Brouillon fictif").fill("Saisie conservée");
      await page
        .getByRole("button", { name: "Rechercher une page", exact: true })
        .click();
      await page
        .getByRole("combobox", { name: "Rechercher une page", exact: true })
        .fill("paramètres");
      await page.getByRole("option").filter({ hasText: "Paramètres" }).click();
      await expect(page.getByRole("alertdialog")).toBeVisible();
      await page.getByRole("button", { name: "Rester", exact: true }).click();
      await expect(page.getByRole("alertdialog")).toHaveCount(0);
      return { active: await active(page), href: new URL(page.url()).pathname };
    });
    await run("avant-composition-mesures", 1440, async (page) => {
      const search = page.getByRole("button", {
        name: "Rechercher une page",
        exact: true,
      });
      const measure = await search.boundingBox();
      await page.screenshot({
        path: path.join(work, "avant-navigation-1440.png"),
        fullPage: true,
      });
      return {
        searchHeight: measure.height,
        spacePresentation: await page
          .getByRole("navigation", { name: "Rubriques", exact: true })
          .innerText(),
      };
    });
    await run('avant-menu-compte-garde-rester',390,async page=>{
      await page.getByLabel('Brouillon fictif').fill('Saisie conservée');await trigger(page).click();
      await sheet(page).getByRole('button',{name:/Menu utilisateur/}).click();
      await page.getByRole('menuitem').filter({hasText:'Mon compte'}).click();
      await expect(page.getByRole('alertdialog')).toBeVisible();await page.getByRole('button',{name:'Rester',exact:true}).click();await expect(page.getByRole('alertdialog')).toHaveCount(0);
      return {active:await active(page),sheetOpen:await sheet(page).count(),accountMenu:await page.getByRole('menu').count(),href:new URL(page.url()).pathname};
    });
    await run('avant-deconnexion-garde-rester',390,async page=>{
      await page.getByLabel('Brouillon fictif').fill('Saisie conservée');await trigger(page).click();
      await sheet(page).getByRole('button',{name:/Menu utilisateur/}).click();
      await page.getByRole('menuitem',{name:'Déconnexion',exact:true}).click();
      await expect(page.getByRole('alertdialog')).toBeVisible();await page.getByRole('button',{name:'Rester',exact:true}).click();await expect(page.getByRole('alertdialog')).toHaveCount(0);
      assert.equal(await page.evaluate(()=>window.__auditLogoutCount),0);
      return {active:await active(page),sheetOpen:await sheet(page).count(),href:new URL(page.url()).pathname};
    });
    await run('avant-rubrique-garde-annuler-puis-confirmer',390,async page=>{
      await page.getByLabel('Brouillon fictif').fill('Saisie conservée');await trigger(page).click();
      await sheet(page).getByRole('button',{name:/Rubriques/}).click();
      await page.getByRole('menuitem',{name:'Membres',exact:true}).click();
      await expect(page.getByRole('alertdialog')).toBeVisible();await page.getByRole('button',{name:'Rester',exact:true}).click();await expect(page.getByRole('alertdialog')).toHaveCount(0);
      const afterCancel={active:await active(page),sheetOpen:await sheet(page).count(),menus:await page.getByRole('menu').count()};
      if(!await sheet(page).count())await trigger(page).click();
      if(!await page.getByRole('menuitem',{name:'Membres',exact:true}).count())await sheet(page).getByRole('button',{name:/Rubriques/}).click();
      await page.getByRole('menuitem',{name:'Membres',exact:true}).click();await page.getByRole('button',{name:'Quitter sans enregistrer',exact:true}).click();
      await expect(page).toHaveURL(/\/membres\/repertoire$/);
      return {afterCancel,afterConfirm:{active:await active(page),sheetOpen:await sheet(page).count()}};
    });
    await run('avant-ancetres-garde-rester',390,async page=>{
      await page.getByLabel('Brouillon fictif').fill('Saisie conservée');await page.getByRole('button',{name:'Afficher les niveaux intermédiaires',exact:true}).click();
      await page.getByRole('menuitem',{name:'Accueil',exact:true}).click();await expect(page.getByRole('alertdialog')).toBeVisible();await page.getByRole('button',{name:'Rester',exact:true}).click();await expect(page.getByRole('alertdialog')).toHaveCount(0);
      return {active:await active(page),menus:await page.getByRole('menu').count(),href:new URL(page.url()).pathname};
    });
    return;
  }
  await run('resize-sidebar-focus',390,async page=>{
    await trigger(page).click();
    await sheet(page).getByRole('link',{name:'Paramètres système',exact:true}).focus();
    await page.setViewportSize({width:1440,height:900});
    await expect(sheet(page)).toHaveCount(0);
    await expect(page.getByRole('link',{name:'Paramètres système',exact:true})).toBeFocused();
    await page.setViewportSize({width:390,height:900});
    await expect(trigger(page)).toBeFocused();
    await page.getByLabel('Brouillon fictif').focus();
    await page.setViewportSize({width:1440,height:900});
    await expect(page.getByLabel('Brouillon fictif')).toBeFocused();
    return {focus:'Destination bureau, déclencheur mobile, saisie extérieure préservée'};
  });
  await run('resize-ancetres-focus',390,async page=>{
    await page.getByRole('button',{name:'Afficher les niveaux intermédiaires',exact:true}).click();
    await page.getByRole('menuitem',{name:'Accueil',exact:true}).focus();
    await page.setViewportSize({width:768,height:900});
    await expect(page.getByRole('menu')).toHaveCount(0);
    await expect(page.getByRole('navigation',{name:"Fil d'Ariane"}).getByRole('link',{name:'Accueil',exact:true})).toBeFocused();
    await page.setViewportSize({width:390,height:900});
    await expect(page.getByRole('button',{name:'Afficher les niveaux intermédiaires',exact:true})).toBeFocused();
    await page.setViewportSize({width:768,height:900});
    await page.getByLabel('Brouillon fictif').focus();
    await page.setViewportSize({width:390,height:900});
    await expect(page.getByLabel('Brouillon fictif')).toBeFocused();
  });
  for(const mode of ['page','compte','rubrique','deconnexion','ancetres','recherche']){
    await run('garde-'+mode,390,async page=>{
      await page.getByLabel('Brouillon fictif').fill('Saisie conservée');
      let source;
      if(['page','compte','rubrique','deconnexion'].includes(mode)){
        await trigger(page).click();
        if(mode==='page')source=sheet(page).getByRole('link',{name:'Paramètres système',exact:true});
        if(mode==='rubrique'){
          await sheet(page).getByRole('button',{name:/Rubriques/}).click();
          source=page.getByRole('menuitem',{name:'Membres',exact:true});
        }
        if(['compte','deconnexion'].includes(mode)){
          await sheet(page).getByRole('button',{name:/Menu utilisateur/}).click();
          source=mode==='compte'?page.getByRole('menuitem').filter({hasText:'Mon compte'}):page.getByRole('menuitem',{name:'Déconnexion',exact:true});
        }
      }
      if(mode==='ancetres'){
        await page.getByRole('button',{name:'Afficher les niveaux intermédiaires',exact:true}).click();
        source=page.getByRole('menuitem',{name:'Accueil',exact:true});
      }
      if(mode==='recherche'){
        await page.getByRole('button',{name:'Rechercher une page',exact:true}).click();
        await page.getByRole('combobox',{name:'Rechercher une page',exact:true}).fill('paramètres');
        source=page.getByRole('option').filter({hasText:'Paramètres'});
      }
      await source.click();
      await expect(page.getByRole('alertdialog')).toBeVisible();
      await page.getByRole('button',{name:'Rester',exact:true}).click();
      await expect(page.getByRole('alertdialog')).toHaveCount(0);
      await expect(source).toBeVisible();
      await expect(mode==='recherche'?page.getByRole('combobox',{name:'Rechercher une page',exact:true}):source).toBeFocused();
      assert.equal(new URL(page.url()).pathname,'/systeme/utilisateurs');
      assert.equal(await page.locator('#audit-draft').inputValue(),'Saisie conservée');
      assert.equal(await page.evaluate(()=>window.__auditLogoutCount),0);
      const restored=await active(page);
      await source.click();
      await page.getByRole('button',{name:'Quitter sans enregistrer',exact:true}).click();
      const target={page:'/systeme/parametres',compte:'/mon-compte',rubrique:'/membres/repertoire',deconnexion:'/login',ancetres:'/',recherche:'/systeme/parametres'}[mode];
      await expect.poll(()=>new URL(page.url()).pathname).toBe(target);
      await expect(page.getByRole('menu')).toHaveCount(0);
      if(mode==='rubrique'){
        await expect(sheet(page)).toBeVisible();
        await expect(sheet(page).getByRole('button',{name:'Rubriques : Membres',exact:true})).toBeFocused();
      }else await expect(sheet(page)).toHaveCount(0);
      if(mode==='deconnexion')assert.equal(await page.evaluate(()=>window.__auditLogoutCount),1);
      return {restored,target,sheetPreservedForSpace:mode==='rubrique'};
    });
  }
  for(const width of [320,390,768,1024,1440,1920])await run('composition-'+width,width,async page=>{
    const search=page.getByRole('button',{name:'Rechercher une page',exact:true});
    assert.equal((await search.boundingBox()).height,width<1024?44:40);
    if(width<1024)await trigger(page).click();
    await page.getByRole('button',{name:/Rubriques/}).click();
    await page.getByRole('menuitem',{name:'Membres',exact:true}).press('Enter');
    await expect(page).toHaveURL(/\/membres\/repertoire$/);
    await page.getByRole('button',{name:/Menu utilisateur/}).click();
    await expect(page.getByRole('menu')).toBeVisible();
    if([320,1440].includes(width))await page.screenshot({path:path.join(work,'navigation-'+width+'.png'),fullPage:true});
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button',{name:/Menu utilisateur/})).toBeFocused();
    if(width<1024){await page.keyboard.press('Escape');await expect(trigger(page)).toBeFocused();}
    return {searchHeight:(await search.boundingBox()).height};
  },{actor:{firstName:'Camille aux prénoms particulièrement longs',lastName:'Exemple de famille fictive avec un nom étendu'},longBreadcrumb:true});
  for(const width of [320,1440])await run('deconnexion-attente-erreur-reprise-'+width,width,async page=>{
    if(width<1024)await trigger(page).click();
    await page.getByRole('button',{name:/Menu utilisateur/}).click();
    await page.getByRole('menuitem',{name:'Déconnexion',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Déconnexion en cours',exact:true})).toBeFocused();
    await expect(page.getByRole('button',{name:'Déconnexion…',exact:true})).toBeDisabled();
    await expect(page.getByRole('navigation')).toHaveCount(0);
    await page.evaluate(()=>window.__auditFinishLogout('unconfirmed'));
    await expect(page.getByRole('heading',{name:'Déconnexion non confirmée',exact:true})).toBeFocused();
    await expect(page.locator('#app-sidebar')).toHaveCount(0);
    assert.equal(await page.evaluate(()=>window.__auditLogoutCount),1);
    await page.getByRole('button',{name:'Réessayer la déconnexion',exact:true}).click();
    await expect(page.getByRole('heading',{name:'Déconnexion en cours',exact:true})).toBeFocused();
    await page.evaluate(()=>window.__auditFinishLogout('confirmed'));
    await expect(page.getByRole('heading',{name:'Déconnexion confirmée',exact:true})).toBeFocused();
    await expect(page.getByRole('link',{name:'Retour à la connexion',exact:true})).toHaveAttribute('href','/login');
    assert.equal(await page.evaluate(()=>window.__auditLogoutCount),2);
    return {contextStates:['pending','unconfirmed','pending','confirmed'],note:'États du contexte simulés ; aucune requête POST réelle'};
  },{controlLogout:true,blockLogoutNavigation:true});
  await run('recherche-clavier-garde-effacement',1440,async page=>{
    await page.getByLabel('Brouillon fictif').fill('Texte conservé');
    await page.getByRole('button',{name:'Rechercher une page',exact:true}).press('Enter');
    const search=page.getByRole('combobox',{name:'Rechercher une page',exact:true});
    await search.fill('paramètres');
    await search.press('Enter');
    await page.getByRole('button',{name:'Rester',exact:true}).click();
    await expect(search).toBeFocused();await expect(search).toHaveValue('paramètres');
    await expect(search).toHaveAttribute('autocomplete','off');
    await expect(search).toHaveAttribute('data-bwignore','true');
    await page.getByRole('button',{name:'Effacer la recherche',exact:true}).click();
    await expect(search).toBeFocused();await expect(search).toHaveValue('');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button',{name:'Rechercher une page',exact:true})).toBeFocused();
  });
};
