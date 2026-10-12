const { authenticate, assert, chromium, config, fs, path, prisma, work } = require('./auth.cjs');

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const root = await prisma.user.findUniqueOrThrow({ where: { id: 'e2e-only-superadmin' } });
    await prisma.user.upsert({ where: { id: 'e2e-sections-user' }, update: {}, create: {
      id: 'e2e-sections-user', loginName: 'e2e-sections-user', firstName: 'Sections', lastName: 'Exemple',
      passwordHash: root.passwordHash, permissions: {}, role: 'USER',
      loginNameReservations: { create: { loginName: 'e2e-sections-user' } },
    } });
    await prisma.person.upsert({ where: { id: 'e2e-sections-person' }, update: {}, create: {
      id: 'e2e-sections-person', firstName: 'Camille', normalizedFirstName: 'camille',
      lastName: 'Sections', normalizedLastName: 'sections', nickname: 'Navigation', normalizedNickname: 'navigation', sortName: 'navigation',
      emails: { create: Array.from({ length: 8 }, (_, i) => ({ email: `sections${i}@example.test`, normalizedEmail: `sections${i}@example.test`, label: `Contact ${i + 1}`, isPrimary: i === 0 })) },
      phones: { create: Array.from({ length: 4 }, (_, i) => ({ phone: `+3360000000${i}`, normalizedPhone: `+3360000000${i}`, label: `Téléphone ${i + 1}`, isPrimary: i === 0 })) },
    } });
    const { page, context } = await authenticate(browser, config.E2E_SUPERADMIN_LOGIN_NAME);
    const result = [];
    for (const url of ['/membres/repertoire/e2e-sections-person?section=coordonnees', '/mon-compte?section=security', '/systeme/utilisateurs/e2e-sections-user?section=access']) {
      await page.setViewportSize({ width: 1024, height: 600 });
      await page.goto(url);
      await page.locator('[data-slot="page-section-navigation"]').waitFor();
      await page.waitForTimeout(500);
      result.push(await page.evaluate(() => ({ url: location.pathname + location.search, headings: [...document.querySelectorAll('main h1, main h2, main h3')].filter(el => el.getClientRects().length).map(el => ({tag: el.tagName, text: el.textContent, top: el.getBoundingClientRect().top})), links: [...document.querySelectorAll('[data-slot="page-section-navigation"] a')].map(el => ({text:el.textContent, href:el.getAttribute('href')})), main: {height: document.querySelector('main').clientHeight, scroll:document.querySelector('main').scrollHeight}, labels:[...document.querySelectorAll('main label')].filter(el=>el.getClientRects().length).map(el=>el.textContent) })));
    }
    fs.writeFileSync(path.join(work, 'discovery.json'), JSON.stringify(result, null, 2));
    console.log(JSON.stringify(result));
    await context.close();
  } finally { await browser.close(); await prisma.$disconnect(); }
})().catch(error => { console.error(error.message); process.exitCode=1; });
