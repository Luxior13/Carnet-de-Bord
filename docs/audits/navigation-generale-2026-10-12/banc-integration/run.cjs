const { authenticate, api, assert, chromium, config, expect, fs, json, origin, path, prisma, work } = require('./auth.cjs');
const phase = process.argv[2] || 'baseline';
assert(['baseline', 'final'].includes(phase));
assert(path.basename(work).startsWith('noctambule-navigation-'));
const observations = [];
const browserErrors = [];
const destinations = [
  { label: 'Mon travail', href: '/', pole: 'Aujourd’hui' },
  { label: 'Répertoire', href: '/membres/repertoire', pole: 'Membres' },
  { label: 'Utilisateurs', href: '/systeme/utilisateurs', pole: 'Système' },
  { label: 'Paramètres système', href: '/systeme/parametres', pole: 'Système' },
  { label: 'Feuille de route', href: '/systeme/feuille-de-route', pole: 'Système' },
  { label: 'Mon compte', href: '/mon-compte' },
];
let browser;
let page;
let rootContext;
let limitedContext;
async function scenario(name, run) {
  try {
    const details = await run();
    observations.push({ name, result: 'passed', ...details });
    console.log('PASS ' + name);
  } catch (error) {
    observations.push({ name, result: 'failed', error: String(error.message).slice(0, 1600) });
    await page?.screenshot({ path: path.join(__dirname, `${phase}-${name}-failure.png`) }).catch(() => {});
    fs.writeFileSync(path.join(work, `${phase}-${name}-failure.txt`), String(error.stack || error));
    console.log('FAIL ' + name + ': ' + String(error.message).split('\n')[0]);
  }
}
async function destinationVisible(targetPage, href) {
  await expect(targetPage).toHaveURL(origin + href);
  await expect(targetPage.getByRole('main').getByRole('heading', { level: 1 }).first()).toBeVisible();
  await expect(targetPage.getByRole('heading', { name: /Page introuvable|Une erreur est survenue/ })).toHaveCount(0);
}
async function search(targetPage, query) {
  await targetPage.getByRole('button', { name: 'Rechercher une page', exact: true }).click();
  const dialog = targetPage.getByRole('dialog', { name: 'Navigation rapide' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('combobox', { name: 'Rechercher une page' }).fill(query);
  return dialog;
}
async function selectSearch(targetPage, label) {
  const dialog = await search(targetPage, label);
  await dialog.getByRole('option').filter({ has: targetPage.getByText(label, { exact: true }) }).click();
}
async function selectPole(targetPage, name) {
  await targetPage.getByRole('button', { name: /^Rubriques :/ }).click();
  await targetPage.getByRole('menuitem', { name, exact: true }).click();
}
async function resetPage(href = '/') {
  await page.goto(origin + href);
  await expect(page.getByRole('main').getByRole('heading', { level: 1 }).first()).toBeVisible();
}
async function dirtyCreate(targetPage) {
  await targetPage.goto('/membres/repertoire/nouveau');
  await targetPage.getByLabel('Pseudo principal', { exact: true }).fill('Brouillon Navigation');
}
async function cancelThenConfirm(targetPage, activate, afterCancel = async () => {}) {
  await activate();
  const confirm = targetPage.getByRole('alertdialog');
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Rester', exact: true }).click();
  await expect(confirm).toBeHidden();
  await expect(targetPage).toHaveURL(origin + '/membres/repertoire/nouveau');
  await expect(targetPage.getByLabel('Pseudo principal', { exact: true })).toHaveValue('Brouillon Navigation');
  await afterCancel();
  await activate();
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Quitter sans enregistrer', exact: true }).click();
}
(async () => {
  const root = await prisma.user.findUniqueOrThrow({ where: { id: 'e2e-only-superadmin' }, select: { passwordHash: true } });
  await prisma.$transaction(async (transaction) => {
    await transaction.user.upsert({ where: { id: 'e2e-navigation-limited' }, create: { id: 'e2e-navigation-limited', loginName: 'e2e-navigation-limited', firstName: 'Audit', lastName: 'Limité', passwordHash: root.passwordHash, role: 'USER', permissions: { 'persons:view': true, 'users:view': false, 'settings:view': false } }, update: { permissions: { 'persons:view': true, 'users:view': false, 'settings:view': false } } });
    await transaction.loginNameReservation.upsert({ where: { loginName: 'e2e-navigation-limited' }, create: { loginName: 'e2e-navigation-limited', userId: 'e2e-navigation-limited' }, update: {} });
  });
  browser = await chromium.launch({ headless: true });
  ({ context: rootContext, page } = await authenticate(browser, config.E2E_SUPERADMIN_LOGIN_NAME));
  page.on('dialog', (dialog) => dialog.accept()); // Only native beforeunload during scenario resets; custom guards remain exercised below.
  page.on('pageerror', (error) => browserErrors.push(error.message.slice(0, 300)));
  await scenario('real-authenticated-root-and-header', async () => {
    const me = await json(await api(page).get('/api/auth/me'));
    assert(me.user.isProtected && me.user.mfaEnabledAt);
    const size = await page.getByRole('button', { name: 'Rechercher une page', exact: true }).boundingBox();
    if (phase === 'final') assert.equal(size.height, 40);
    await page.screenshot({ path: path.join(__dirname, `${phase}-shell-1440.png`) });
    return { passwordTotpAndSession: true, searchTriggerHeight: size.height };
  });
  await scenario('six-destinations-through-quick-search', async () => {
    await resetPage('/');
    for (const destination of [...destinations.slice(1), destinations[0]]) {
      await selectSearch(page, destination.label);
      await destinationVisible(page, destination.href);
      await expect(page.getByRole('dialog', { name: 'Navigation rapide' })).toBeHidden();
    }
    return { destinations: destinations.map(({ href }) => href) };
  });
  await scenario('six-destinations-through-sidebar-and-account', async () => {
    await resetPage('/');
    for (const destination of destinations.filter(({ pole }) => pole)) {
      await selectPole(page, destination.pole);
      await page.getByRole('navigation', { name: 'Navigation principale', exact: true }).getByRole('link', { name: destination.label, exact: true }).click();
      await destinationVisible(page, destination.href);
    }
    await page.getByRole('button', { name: /^Menu utilisateur de/ }).click();
    await page.getByRole('menuitem', { name: /^Mon compte/ }).click();
    await destinationVisible(page, '/mon-compte');
    return { destinations: destinations.map(({ href }) => href) };
  });
  await scenario('quick-search-keyboard-local-and-dismissal', async () => {
    await resetPage('/');
    const requests = [];
    const listen = (request) => { if (request.resourceType() === 'fetch' && !request.url().includes('/api/observability/web-vitals')) requests.push(new URL(request.url()).pathname); };
    page.on('request', listen);
    const dialog = await search(page, 'feuille');
    await dialog.getByRole('combobox').press('Enter');
    await destinationVisible(page, '/systeme/feuille-de-route');
    page.off('request', listen);
    // Session and feature-readiness refreshes belong to the shell, not the local query.
    const forbiddenSearchCalls = requests.filter((href) => href.startsWith('/api/') && !['/api/auth/me', '/api/health/ready'].includes(href));
    assert.deepEqual(forbiddenSearchCalls, []);
    const reopened = await search(page, 'zzzx');
    await expect(reopened.getByText('Aucune page trouvée', { exact: true })).toBeVisible();
    await reopened.getByRole('button', { name: 'Effacer la recherche' }).focus();
    await page.keyboard.press('Enter');
    await expect(reopened.getByRole('combobox')).toHaveValue('');
    await expect(reopened.getByRole('combobox')).toBeFocused();
    await page.screenshot({ path: path.join(__dirname, `${phase}-search-1440.png`) });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Rechercher une page', exact: true })).toBeFocused();
    return { enterNavigates: true, clearEnterOnlyClears: true, escapeRestoresFocus: true, noSearchApi: true };
  });
  await scenario('mobile-pole-keeps-drawer-page-closes-it', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await resetPage('/');
    await page.getByRole('button', { name: 'Ouvrir la navigation' }).click();
    const drawer = page.getByRole('dialog', { name: 'Menu', exact: true });
    await expect(drawer).toBeVisible();
    await selectPole(page, 'Membres');
    await expect(page).toHaveURL(origin + '/membres/repertoire');
    await expect(drawer).toBeVisible();
    await selectPole(page, 'Système');
    await expect(page).toHaveURL(origin + '/systeme/utilisateurs');
    await expect(drawer).toBeVisible();
    await page.screenshot({ path: path.join(__dirname, `${phase}-drawer-390.png`) });
    await drawer.getByRole('link', { name: 'Feuille de route', exact: true }).click();
    await destinationVisible(page, '/systeme/feuille-de-route');
    await expect(drawer).toBeHidden();
    return { polePreservesDrawer: true, pageClosesDrawer: true };
  });
  await scenario('dirty-create-search-cancel-preserves-then-leaves', async () => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await dirtyCreate(page);
    await cancelThenConfirm(page, async () => {
      const dialog = page.getByRole('dialog', { name: 'Navigation rapide' });
      if (await dialog.isVisible()) {
        await dialog.getByRole('option').filter({ has: page.getByText('Mon compte', { exact: true }) }).click();
      } else await selectSearch(page, 'Mon compte');
    }, async () => {
      if (phase === 'final') {
        const dialog = page.getByRole('dialog', { name: 'Navigation rapide' });
        await expect(dialog).toBeVisible();
        await expect(dialog.getByRole('combobox')).toHaveValue('Mon compte');
        await expect(dialog.getByRole('combobox')).toBeFocused();
      }
    });
    await destinationVisible(page, '/mon-compte');
    return { draftPreservedOnCancel: true, sourceContextAndFocusPreserved: phase === 'final' ? true : undefined, confirmedDestination: '/mon-compte' };
  });
  await scenario('dirty-create-mobile-sidebar-cancel-preserves-then-leaves', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await dirtyCreate(page);
    await cancelThenConfirm(page, async () => {
      if (!(await page.getByRole('dialog', { name: 'Menu', exact: true }).isVisible())) await page.getByRole('button', { name: 'Ouvrir la navigation' }).click();
      await page.getByRole('navigation', { name: 'Navigation principale', exact: true }).getByRole('link', { name: 'Répertoire', exact: true }).click();
    }, async () => {
      if (phase === 'final') {
        const drawer = page.getByRole('dialog', { name: 'Menu', exact: true });
        await expect(drawer).toBeVisible();
        await expect(drawer.getByRole('link', { name: 'Répertoire', exact: true })).toBeFocused();
      }
    });
    await destinationVisible(page, '/membres/repertoire');
    return { draftPreservedOnCancel: true, sourceContextAndFocusPreserved: phase === 'final' ? true : undefined, confirmedDestination: '/membres/repertoire' };
  });
  await scenario('dirty-create-logout-cancel-preserves-session-and-draft', async () => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await dirtyCreate(page);
    const requests = [];
    const listen = (request) => { if (new URL(request.url()).pathname === '/api/auth/logout') requests.push(request.method()); };
    page.on('request', listen);
    await page.getByRole('button', { name: /^Menu utilisateur de/ }).click();
    await page.getByRole('menuitem', { name: /^Déconnexion/ }).click();
    const confirm = page.getByRole('alertdialog');
    await expect(confirm).toBeVisible();
    await confirm.getByRole('button', { name: 'Rester', exact: true }).click();
    await expect(confirm).toBeHidden();
    let accountMenuAccessibleSnapshot;
    if (phase === 'final') {
      const menu = page.getByRole('menu').filter({ has: page.getByRole('menuitem', { name: /^Déconnexion/ }) });
      await expect(menu).toBeVisible();
      accountMenuAccessibleSnapshot = (await menu.ariaSnapshot()).split('\n')[0];
      await expect(page.getByRole('menuitem', { name: /^Déconnexion/ })).toBeFocused();
    }
    await expect(page.getByLabel('Pseudo principal', { exact: true })).toHaveValue('Brouillon Navigation');
    assert.equal((await api(page).get('/api/auth/me')).status(), 200);
    page.off('request', listen);
    assert.deepEqual(requests, []);
    return { draftAndSessionPreserved: true, menuAndFocusPreserved: phase === 'final' ? true : undefined, accountMenuAccessibleSnapshot, logoutRequestSent: false };
  });
  await scenario('breadcrumb-menu-and-native-history-context', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    const filtered = '/membres/repertoire?q=Navigation';
    await resetPage(filtered);
    await page.getByRole('link', { name: /Ajouter une fiche/ }).click();
    await expect(page.getByRole('heading', { name: 'Nouvelle fiche', exact: true })).toBeVisible();
    assert.equal(new URL(page.url()).searchParams.get('returnTo'), filtered);
    if (phase === 'final') await page.getByLabel('Pseudo principal', { exact: true }).fill('Brouillon Navigation');
    await page.getByRole('button', { name: 'Afficher les niveaux intermédiaires' }).click();
    await page.getByRole('menuitem', { name: 'Répertoire', exact: true }).click();
    if (phase === 'final') {
      const confirm = page.getByRole('alertdialog');
      await expect(confirm).toBeVisible();
      await confirm.getByRole('button', { name: 'Rester', exact: true }).click();
      await expect(page.getByRole('menu', { name: 'Niveaux intermédiaires' })).toBeVisible();
      await expect(page.getByRole('menuitem', { name: 'Répertoire', exact: true })).toBeFocused();
      await expect(page.getByLabel('Pseudo principal', { exact: true })).toHaveValue('Brouillon Navigation');
      await page.getByRole('menuitem', { name: 'Répertoire', exact: true }).click();
      await confirm.getByRole('button', { name: 'Quitter sans enregistrer', exact: true }).click();
    }
    await expect(page).toHaveURL(origin + filtered);
    await page.goBack();
    await expect(page.getByRole('heading', { name: 'Nouvelle fiche', exact: true })).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL(origin + filtered);
    return { breadcrumbPreservedFilter: true, backForwardPreservedContext: true, draftMenuAndFocusPreserved: phase === 'final' ? true : undefined };
  });
  await scenario('limited-account-visibility-direct-denial-and-revocation', async () => {
    const limited = await authenticate(browser, 'e2e-navigation-limited');
    limitedContext = limited.context;
    const limitedPage = limited.page;
    const dialog = await search(limitedPage, '');
    const labels = await dialog.getByRole('option').allTextContents();
    assert(labels.some((label) => label.includes('Répertoire')));
    assert(!labels.some((label) => /Utilisateurs|Paramètres système/.test(label)));
    await limitedPage.keyboard.press('Escape');
    for (const href of ['/systeme/utilisateurs', '/systeme/parametres']) {
      await limitedPage.goto(href);
      await expect(limitedPage.getByRole('heading', { name: 'Accès refusé', exact: true })).toBeVisible();
    }
    assert.equal((await api(limitedPage).get('/api/users')).status(), 403);
    assert.equal((await api(limitedPage).get('/api/systeme/parametres')).status(), 403);
    await prisma.user.update({ where: { id: 'e2e-navigation-limited' }, data: { permissions: { 'persons:view': false, 'users:view': false, 'settings:view': false } } });
    await limitedPage.goto('/');
    const refreshed = await search(limitedPage, 'répertoire');
    await expect(refreshed.getByText('Aucune page trouvée', { exact: true })).toBeVisible();
    await limitedPage.keyboard.press('Escape');
    await limitedPage.goto('/membres/repertoire');
    await expect(limitedPage.getByRole('heading', { name: 'Accès refusé', exact: true })).toBeVisible();
    assert.equal((await api(limitedPage).get('/api/personnes')).status(), 403);
    if (phase === 'final') {
      await limitedPage.getByRole('button', { name: /^Menu utilisateur de/ }).click();
      const logoutResponse = limitedPage.waitForResponse((response) => new URL(response.url()).pathname === '/api/auth/logout' && response.request().method() === 'POST');
      await limitedPage.getByRole('menuitem', { name: /^Déconnexion/ }).click();
      assert.equal((await logoutResponse).status(), 200);
      await expect(limitedPage).toHaveURL(origin + '/login');
      await expect(limitedPage.getByLabel('Identifiant de connexion')).toBeVisible();
      assert.equal((await api(limitedPage).get('/api/auth/me')).status(), 401);
    }
    return { realLimitedMfa: true, usersAndSettingsHidden: true, directApiStatuses: [403, 403, 403], fixturePermissionRevoked: true, refreshRemovesDestination: true, normalLogout200AndMe401: phase === 'final' ? true : undefined };
  });
  fs.writeFileSync(path.join(__dirname, `${phase}-resultats.json`), JSON.stringify({ date: new Date().toISOString(), phase, baseCommit: '84a1431', next: '15.5.23 production', browser: browser.version(), database: 'PostgreSQL17/54640/navigation_test/52migrations', observations, browserErrors }, null, 2) + '\n');
  if (observations.some(({ result }) => result === 'failed')) process.exitCode = 1;
})().catch((error) => { fs.writeFileSync(path.join(work, `${phase}-fatal.txt`), String(error.stack || error)); console.error(String(error.stack || error)); process.exitCode = 1; }).finally(async () => { await rootContext?.close(); await limitedContext?.close(); await browser?.close(); await prisma.$disconnect(); });
