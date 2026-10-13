// Reuse the real detail-page setup without duplicating its complete test bank.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const filename = path.resolve(__dirname, '../../fiche-utilisateur-2026-10-11/banc-client/run.cjs');
const marker = '  fs.writeFileSync(\n    path.join(work, "observations.json"),';
const scenario = `
  await run('bounded-detail-delete',390,async({page,api})=>{
    await page.clock.install();
    api.deleteMode='hold';
    await page.getByRole('button',{name:'Supprimer définitivement',exact:true}).click();
    await page.locator('#delete-user-confirmation').fill(api.user.loginName);
    await page.getByRole('alertdialog').getByRole('button',{name:'Supprimer définitivement',exact:true}).click();
    await expect.poll(()=>api.held.length).toBe(1);
    await page.clock.runFor(31_000);
    if(process.env.CLOSURE_BEFORE==='1') {
      return {after31Seconds:'no-persistent-result',dialogCount:await page.getByRole('alertdialog').count(),deleteCount:api.requests.filter(r=>r.method==='DELETE').length};
    }
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    await expect(page.getByText(/La suppression n’a pas pu être confirmée/)).toBeVisible();
    await expect(page.getByRole('button',{name:'Supprimer définitivement',exact:true})).toBeDisabled();
    await page.getByRole('button',{name:'Actualiser et conserver ma saisie',exact:true}).click();
    await expect(page.getByRole('button',{name:'Supprimer définitivement',exact:true})).toBeEnabled();
    assert.equal(api.requests.filter(r=>r.method==='DELETE').length,1);
    return {after31Seconds:'uncertain-result-and-explicit-read',deleteCount:1};
  },{section:'security',user:{isActive:false}});
  for (const section of ['profile','access','account','security']) await run('bounded-detail-patch-'+section,390,async({page,api})=>{
    await page.clock.install();
    if(section==='profile') await page.locator('#user-first-name').fill('Brouillon');
    else if(section==='account') await page.getByRole('switch').first().click();
    else if(section==='security') await page.getByRole('switch',{name:'Compte actif'}).click();
    else {await page.locator('#user-role').click();await page.getByRole('option',{name:'Administrateur',exact:true}).click();}
    api.patchMode='hold';
    await page.getByRole('button',{name:section==='security'?'Désactiver le compte':'Enregistrer',exact:true}).click();
    await expect.poll(()=>api.held.length).toBe(1);
    await page.clock.runFor(31_000);
    if(process.env.CLOSURE_BEFORE==='1') {
      await expect(page.getByRole('button',{name:'Enregistrement…',exact:true})).toBeDisabled();
      return {after31Seconds:'save-still-locked'};
    }
    await expect(page.getByText(/La réponse du serveur n’a pas pu être confirmée/)).toBeVisible();
    await expect(page.getByRole('button',{name:section==='security'?'Désactiver le compte':'Enregistrer',exact:true})).toBeDisabled();
    if(section==='profile') await expect(page.locator('#user-first-name')).toHaveValue('Brouillon');
    await page.getByRole('button',{name:'Actualiser et conserver ma saisie',exact:true}).click();
    await expect(page.getByText(/La réponse du serveur n’a pas pu être confirmée/)).toHaveCount(0);
    assert.equal(api.requests.filter(r=>r.method==='PATCH').length,1);
    return {after31Seconds:'save-released',read:'explicit',patchCount:1};
  }, {section});
  await run('bounded-detail-mfa-recovery', 390, async ({page, api}) => {
    await page.clock.install();
    api.mfaMode = 'lost';
    await page.getByRole('button', {name:'Réinitialiser la double authentification',exact:true}).click();
    await page.locator('#admin-mfa-reset-password').fill('Preuve-fictive!');
    await page.locator('#admin-mfa-reset-code').fill('123456');
    await page.getByRole('dialog').getByRole('button',{name:'Réinitialiser',exact:true}).click();
    await expect(page.getByText(/La réponse du serveur n’a pas pu être confirmée/)).toBeVisible();
    api.getMode = 'hold';
    await page.getByRole('button',{name:'Vérifier l’état du compte',exact:true}).click();
    await expect.poll(()=>api.held.length).toBe(1);
    await page.clock.runFor(31_000);
    const cancel = page.getByRole('dialog').getByRole('button',{name:'Fermer',exact:true}).first();
    if (process.env.CLOSURE_BEFORE === '1') {
      await expect(cancel).toBeDisabled();
      await expect(page.getByRole('button',{name:'Vérification…',exact:true})).toBeDisabled();
      return {after31Seconds:'verification-still-locked',postCount:api.requests.filter(r=>r.path.endsWith('/reset-mfa')).length};
    }
    await expect(cancel).toBeEnabled();
    await expect(page.getByText(/Vérification impossible. Le résultat reste incertain/)).toBeVisible();
    await expect(page.getByRole('button',{name:'Vérifier l’état du compte',exact:true})).toBeEnabled();
    api.getMode = 'success';
    await page.getByRole('button',{name:'Vérifier l’état du compte',exact:true}).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    assert.equal(api.requests.filter(r=>r.path.endsWith('/reset-mfa')).length,1);
    return {after31Seconds:'verification-released',explicitRetry:'success',postCount:1};
  }, {section:'security'});
`;
let source = fs.readFileSync(filename, 'utf8');
if (!source.includes(marker)) throw new Error('Detail bank insertion point changed');
source = source.replace(marker, scenario + marker);
source = source.replace('mode = method === "PATCH" ? api.patchMode : api.getMode;', 'mode = method === "PATCH" ? api.patchMode : method === "DELETE" ? api.deleteMode || "success" : api.getMode;');
if(process.env.CLOSURE_BEFORE==='1') source = source.replace('setup(build) {', `setup(build) {
  build.onLoad({filter:/UserDetailPage.tsx$/}, args=>({
    contents:require('node:child_process').execFileSync('git',['show','c54e5d8:apps/web/src/components/users/UserDetailPage.tsx'],{cwd:root,encoding:'utf8'}),
    loader:'tsx',resolveDir:path.dirname(args.path)
  }));`);
process.env.AUDIT_ONLY = process.env.CLOSURE_ONLY || 'bounded-detail';
const derived = new Module(filename, module);
derived.filename = filename;
derived.paths = Module._nodeModulePaths(path.dirname(filename));
derived._compile(source, filename);
