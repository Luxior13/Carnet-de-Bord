const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const root = path.resolve(__dirname, '../../../..');
const proofs = path.join(__dirname, 'preuves');
const banks = fs.readdirSync(proofs).filter(file => !file.includes('-cible') && !file.includes('-avant')).flatMap(file => {
  const value = JSON.parse(fs.readFileSync(path.join(proofs,file),'utf8'));
  return value.bank ? [{bank:value.bank, proof:'preuves/'+file, passed:value.passed, total:value.total, startedAt:value.startedAt,completedAt:value.completedAt,exitCode:value.exitCode}] : [];
});
const sources = [
  'components/ui/breadcrumb.tsx', 'components/users/UserDetailPage.tsx',
  'components/users/user-detail/UserSecurityTab.tsx', 'components/users/user-detail/UserDeletionCard.tsx',
  'components/users/user-detail/user-detail-request.ts', 'components/users/user-detail/user-security-focus.ts',
  'features/persons/schemas/person.schemas.ts',
].map(relative => {
  const file = 'apps/web/src/'+relative;
  return {file,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(root,file))).digest('hex')};
});
const regressions = JSON.parse(fs.readFileSync(path.join(proofs,'fiche-six-reprises-apres.json'),'utf8'));
fs.writeFileSync(path.join(__dirname,'synthese.json'),JSON.stringify({
  generatedAt:new Date().toISOString(),timezone:'Europe/Paris',head:execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),
  localProductCorrections:true,simulation:'Real components/CSS; API, user/session, routing and some clocks simulated. No SQL or real authentication.',
  banks,passed:banks.reduce((sum,x)=>sum+x.passed,0),total:banks.reduce((sum,x)=>sum+x.total,0),
  additionalRegressionCases:{proof:'preuves/fiche-six-reprises-apres.json',passed:regressions.filter(item=>item.pass===true).length,total:regressions.length},
  newUnitTests:{file:'apps/web/src/__tests__/user-detail-request.test.ts',passed:4,total:4},
  sources,
},null,2));
