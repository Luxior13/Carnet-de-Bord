const { authenticate, assert, chromium, config, expect, fs, path, prisma } = require('./auth.cjs');

const phase = process.argv[2] || 'baseline';
assert(['baseline', 'final'].includes(phase));
const out = path.join(__dirname, 'preuves');
fs.mkdirSync(out, { recursive: true });
const results = { date: new Date().toISOString(), phase, environment: { nextPort:3128, postgresPort:54650, database:'sections_test', viewport:{width:1024,height:600} }, scenarios:[] };

async function settle(page) { await page.waitForTimeout(400); }
async function metrics(page) {
  return page.evaluate(() => {
    const main = document.querySelector('main#main-content');
    const nav = document.querySelector('[data-slot="page-section-navigation"]');
    const title = [...nav.parentElement.querySelectorAll('h2,h3')].find(el => el.getClientRects().length && el.getBoundingClientRect().height>2 && el.getBoundingClientRect().width>2);
    const active = document.activeElement;
    const rect = element => element ? {top:element.getBoundingClientRect().top,bottom:element.getBoundingClientRect().bottom} : null;
    return { url:location.pathname+location.search, viewport:{width:innerWidth,height:innerHeight}, historyLength:history.length, scrollTop:main.scrollTop, scrollMax:main.scrollHeight-main.clientHeight,
      nav:rect(nav), title:{ text:title?.textContent, ...rect(title) }, focus:{tag:active?.tagName,text:active?.textContent?.trim().slice(0,100),href:active?.getAttribute('href')},
      activeLink:[...nav.querySelectorAll('a')].find(el=>el.getAttribute('aria-current')==='page')?.textContent?.trim() };
  });
}
async function bottom(page) {
  await page.locator('main#main-content').evaluate(el => {el.scrollTop=el.scrollHeight;});
  await settle(page);
}
function navLink(page,label) {return page.locator('[data-slot="page-section-navigation"]').getByRole('link',{name:new RegExp('^'+label)});}
async function activate(page,label,keyboard) {
  const link=navLink(page,label);
  if(keyboard){await link.focus();await page.keyboard.press('Enter');} else await link.click();
}
function checkVisible(after) {
  return after.title.top>=after.nav.bottom && after.title.top<550;
}
async function test(name,callback) {
  const observation={name};
  try { await callback(observation); observation.executed=true; } catch(error) {observation.executed=false;observation.error=error.message.slice(0,1500);}
  results.scenarios.push(observation);
  fs.writeFileSync(path.join(out, `${phase}-resultats.json`),JSON.stringify(results,null,2));
  console.log(`${observation.executed?'EXECUTED':'FAILED'} ${name}`);
}

(async()=>{
  const browser=await chromium.launch({headless:true});
  results.environment.chromium=browser.version();
  try {
    const {context,page}=await authenticate(browser,config.E2E_SUPERADMIN_LOGIN_NAME);
    await page.setViewportSize(results.environment.viewport);
    const specs=[
      {id:'personne',url:'/membres/repertoire/e2e-sections-person',long:'coordonnees',short:'identite',longLabel:'Coordonnées',shortLabel:'Identité',keyboard:false},
      {id:'compte',url:'/mon-compte',long:'security',short:'profile',longLabel:'Sécurité',shortLabel:'Profil',keyboard:true},
      {id:'utilisateur',url:'/systeme/utilisateurs/e2e-sections-user',long:'access',short:'profile',longLabel:'Autorisations',shortLabel:'Profil',keyboard:false},
    ];
    for(const spec of specs) {
      await test(`${spec.id}: long vers début de section (${spec.keyboard?'clavier':'souris'})`,async o=>{
        await page.goto(`${spec.url}?section=${spec.long}`);
        await navLink(page,spec.longLabel).waitFor();await settle(page);await bottom(page);
        o.before=await metrics(page);assert(o.before.scrollTop>500);
        await activate(page,spec.shortLabel,spec.keyboard);
        await expect(navLink(page,spec.shortLabel)).toHaveAttribute('aria-current','page');await settle(page);
        o.after=await metrics(page);o.newContentVisible=checkVisible(o.after);o.barRemainsAtTop=Math.abs(o.after.nav.top-56)<=1;o.focusOnActivatedLink=o.after.focus.tag==='A'&&o.after.focus.text.startsWith(spec.shortLabel);
        await page.screenshot({path:path.join(out,`${phase}-${spec.id}.png`)});
        if(phase==='final'){assert(o.newContentVisible,'New section beginning must be visible below sticky bar');assert(o.focusOnActivatedLink,'Focus must remain on activated link');}
      });
      await test(`${spec.id}: retour vers section longue déjà chargée, mobile et clavier`,async o=>{
        await page.setViewportSize({width:390,height:600});await settle(page);await bottom(page);
        o.before=await metrics(page);
        await activate(page,spec.longLabel,true);
        await expect(navLink(page,spec.longLabel)).toHaveAttribute('aria-current','page');await settle(page);
        o.after=await metrics(page);o.newContentVisible=checkVisible(o.after);o.barRemainsAtTop=Math.abs(o.after.nav.top-56)<=1;o.focusOnActivatedLink=o.after.focus.tag==='A'&&o.after.focus.text.startsWith(spec.longLabel);
        await page.screenshot({path:path.join(out,`${phase}-${spec.id}-mobile.png`)});
        if(phase==='final'){assert(o.newContentVisible,'Already visited section beginning must be visible');assert(o.focusOnActivatedLink,'Focus must remain on activated link');}
      });
      await test(`${spec.id}: brouillon, Rester puis confirmer`,async o=>{
        await page.setViewportSize(results.environment.viewport);
        await page.goto(`${spec.url}?section=${spec.short}`);
        await navLink(page,spec.shortLabel).waitFor();
        const field=page.getByLabel(/^Prénom/);await field.fill('Brouillon Sections');await settle(page);await bottom(page);
        o.before=await metrics(page);assert(o.before.scrollTop>0);
        await activate(page,spec.longLabel,true);
        const dialog=page.getByRole('alertdialog');await dialog.waitFor();
        await dialog.getByRole('button',{name:'Rester',exact:true}).click();await settle(page);
        o.cancelled=await metrics(page);o.draftPreserved=await field.inputValue()==='Brouillon Sections';
        o.cancelPreservesScroll=o.before.scrollTop===o.cancelled.scrollTop;
        assert(o.draftPreserved);assert.equal(o.cancelled.url,o.before.url);assert(o.cancelPreservesScroll,'Cancel must not move page');
        assert(o.cancelled.focus.tag==='A'&&o.cancelled.focus.text.startsWith(spec.longLabel),'Cancel must restore focus to original link');
        await activate(page,spec.longLabel,true);await dialog.waitFor();
        await dialog.getByRole('button',{name:'Quitter sans enregistrer',exact:true}).click();
        await expect(navLink(page,spec.longLabel)).toHaveAttribute('aria-current','page');await settle(page);
        o.confirmed=await metrics(page);o.newContentVisible=checkVisible(o.confirmed);o.barRemainsAtTop=Math.abs(o.confirmed.nav.top-56)<=1;o.focusOnActivatedLink=o.confirmed.focus.tag==='A'&&o.confirmed.focus.text.startsWith(spec.longLabel);
        if(phase==='final'){assert(o.newContentVisible,'Confirmed section beginning must be visible');assert(o.focusOnActivatedLink,'Confirmed focus must return to activated link');assert.equal(o.confirmed.historyLength,o.before.historyLength,'Confirmation must preserve section replacement semantics');}
        // The draft was never submitted; leave a clean page for the following scenario.
        await page.goto('/');
      });
    }
    await context.close();
  } finally { await browser.close();await prisma.$disconnect(); }
  results.executed=results.scenarios.filter(s=>s.executed).length;
  fs.writeFileSync(path.join(out,`${phase}-resultats.json`),JSON.stringify(results,null,2));
  if(results.executed!==results.scenarios.length)process.exitCode=1;
})().catch(error=>{console.error(error.message);process.exitCode=1;});
