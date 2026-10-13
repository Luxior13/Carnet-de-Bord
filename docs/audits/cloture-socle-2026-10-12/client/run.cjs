const fs = require('node:fs');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const banks = [
  'accueil-2026-10-12', 'connexion-2026-10-12',
  'repertoire-2026-10-11', 'creation-personne-2026-10-12', 'fiche-personne-2026-10-12',
  'utilisateurs-2026-10-11', 'creation-utilisateur-2026-10-11', 'fiche-utilisateur-2026-10-11',
  'mon-compte-2026-10-11', 'parametres-complet-2026-10-11',
  'feuille-de-route-2026-10-12', 'navigation-generale-2026-10-12',
  'navigation-sections-2026-10-12', 'etats-techniques-2026-10-12',
  'mon-compte-securite-2026-10-12', 'utilisateur-sessions-2026-10-12',
  'creation-utilisateur-reprise-2026-10-12', 'composants-2026-10-11/banc-primitives',
];
const selected = process.argv.slice(2);
const out = path.join(__dirname, 'preuves');
fs.mkdirSync(out, { recursive: true });
async function main() {
  for (const bank of banks.filter(name => !selected.length || selected.some(filter => name.includes(filter)))) {
    const runner = path.join(root, 'docs/audits', bank, bank.includes('/') ? 'run.cjs' : 'banc-client/run.cjs');
    const startedAt = new Date().toISOString();
    const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    const env = { ...process.env };
    for (const key of Object.keys(env)) if (key.startsWith('AUDIT_')) delete env[key];
    if (process.env.CLOSURE_ONLY) env.AUDIT_ONLY = process.env.CLOSURE_ONLY;
    let log = '';
    console.log('START ' + bank);
    const code = await new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [runner], { cwd: root, env, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
      child.stdout.on('data', chunk => { log += chunk.toString(); process.stdout.write(chunk); });
      child.stderr.on('data', chunk => { log += chunk.toString(); process.stderr.write(chunk); });
      child.on('error', reject);
      child.on('close', resolve);
    });
    const work = /Résultats\s*:\s*([^\r\n]+)/.exec(log)?.[1]?.trim();
    const source = work && path.join(work, 'observations.json');
    const result = source && fs.existsSync(source) ? JSON.parse(fs.readFileSync(source, 'utf8')) : null;
    const observations = Array.isArray(result) ? result : result && (result.observations || result.scenarios || result.results);
    const pass = item => item.status === 'pass' || item.status === 'passed' || item.result === 'passed' || item.pass === true || item.passed === true;
    const archive = { bank, runner: path.relative(root, runner).replaceAll('\\', '/'), startedAt, completedAt: new Date().toISOString(), head,
      exitCode: code, work, filter: env.AUDIT_ONLY || null,
      passed: Array.isArray(observations) ? observations.filter(pass).length : null,
      total: Array.isArray(observations) ? observations.length : null,
      result,
    };
    const file = bank.replaceAll('/', '-') + (env.AUDIT_ONLY ? '-cible' : '') + '.json';
    fs.writeFileSync(path.join(out, file), JSON.stringify(archive, null, 2));
    console.log('ARCHIVED ' + file + ' ' + archive.passed + '/' + archive.total + ' exit=' + code);
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
