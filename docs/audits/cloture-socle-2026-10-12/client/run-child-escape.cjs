// A focused reuse of the Person detail fixture; API/session/router are simulated.
const fs = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const source = path.resolve(__dirname, '../../fiche-personne-2026-10-12/banc-client/run.cjs');
const scenarios = path.join(path.dirname(source), 'scenarios.cjs');
require.cache[scenarios] = { id: scenarios, filename: scenarios, loaded: true, exports: async ({run, expect}) => {
  for (const width of [390, 1280]) {
    await run('confirmation-apres-animation-deux-cycles', width, async page => {
      await page.getByRole('listitem').filter({hasText: 'autre@example.test'}).getByRole('button', {name: 'Modifier cet email'}).click();
      const field = page.locator('#person-child-email-label');
      await field.fill('Brouillon diagnostic');
      const confirmation = page.getByRole('alertdialog');
      for (const cancel of ['Escape', 'Rester']) {
        await page.keyboard.press('Escape');
        await expect(confirmation.getByRole('button', {name:'Rester', exact:true})).toBeFocused();
        await confirmation.evaluate(async element => {
          await Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => undefined)));
        });
        if (cancel === 'Escape') await page.keyboard.press('Escape');
        else await confirmation.getByRole('button', {name:'Rester', exact:true}).click();
        await expect(confirmation).toHaveCount(0);
        await expect(field).toHaveValue('Brouillon diagnostic');
        await expect(field).toBeFocused();
      }
      await page.getByRole('dialog').getByRole('button', {name:'Annuler', exact:true}).click();
      await page.getByRole('alertdialog').getByRole('button', {name:'Quitter sans enregistrer', exact:true}).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      return {cycles:2, synchronization:'real entrance animation', focusRestored:true, draftPreserved:true, normalExit:true};
    }, {url:'/membres/repertoire/audit-person-a?section=coordonnees'});
  }
}};
const runner = new Module(source, module);
runner.filename = source;
runner.paths = Module._nodeModulePaths(path.dirname(source));
runner._compile(fs.readFileSync(source,'utf8').replace('reducedMotion: "reduce"', 'reducedMotion: "no-preference"'), source);
