// Creates an isolated source copy. Never adds a diagnostic route to the product.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const repo = path.resolve(__dirname, '../../../..');
const envFile = process.env.AUDIT_ENV_FILE;
assert(envFile, 'AUDIT_ENV_FILE is required');
const work = path.dirname(path.resolve(envFile));
assert(path.basename(work).startsWith('noctambule-technical-states-'));
const copy = path.join(work, 'probe-workspace');
const web = path.join(copy, 'apps/web');
const sourceWeb = path.join(repo, 'apps/web');
fs.mkdirSync(web, { recursive: true });
for (const name of ['src', 'public', 'package.json', 'next.config.ts', 'tsconfig.json', 'postcss.config.mjs', 'eslint.config.mjs', '.prettierrc', '.prettierignore']) {
  const source = path.join(sourceWeb, name);
  if (fs.existsSync(source)) fs.cpSync(source, path.join(web, name), { recursive: true });
}
// Dependency junctions point at the installed packages. No env file, user data,
// private key, .git directory or application build is copied into the source tree.
for (const name of ['node_modules', 'packages']) {
  const link = path.join(copy, name);
  if (!fs.existsSync(link)) fs.symlinkSync(path.join(repo, name), link, 'junction');
}
for (const name of ['package.json', 'turbo.json']) {
  fs.copyFileSync(path.join(repo, name), path.join(copy, name));
}
const faultFile = path.join(work, 'probe-control.json');
if (!fs.existsSync(faultFile)) fs.writeFileSync(faultFile, JSON.stringify({ serverFault: false, delayMs: 0 }));
const serverDir = path.join(web, 'src/app/audit-technique-probe/server');
const clientDir = path.join(web, 'src/app/audit-technique-probe/client');
fs.mkdirSync(serverDir, { recursive: true });
fs.mkdirSync(clientDir, { recursive: true });
fs.writeFileSync(path.join(serverDir, 'page.tsx'), `import { readFile } from 'node:fs/promises';
import React from 'react';
export const dynamic = 'force-dynamic';
export default async function ServerProbe(): Promise<React.ReactNode> {
  const control = JSON.parse(await readFile(${JSON.stringify(faultFile)}, 'utf8')) as { serverFault: boolean; delayMs: number };
  if (control.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, Math.min(5000, control.delayMs)));
  if (control.serverFault) throw new Error('PRIVATE_TECHNICAL_SERVER_PROBE');
  return <h1>Sonde serveur rétablie</h1>;
}
`);
fs.writeFileSync(path.join(clientDir, 'page.tsx'), `'use client';
import React, { useEffect, useState } from 'react';
export default function ClientProbe(): React.ReactNode {
  const [ready, setReady] = useState(false);
  useEffect(() => { setReady(true); }, []);
  if (ready && sessionStorage.getItem('technical-probe-client-fault') === '1') throw new Error('PRIVATE_TECHNICAL_CLIENT_PROBE');
  return <h1>Sonde client rétablie</h1>;
}
`);
// Baseline boundary only, within the private copy. All other files keep the
// corrected source so the production global-error/font contract is retained.
if (process.argv.includes('--baseline-error')) {
  const previous = execFileSync('git', ['show', '9731385:apps/web/src/app/error.tsx'], { cwd: repo, windowsHide: true });
  fs.writeFileSync(path.join(web, 'src/app/error.tsx'), previous);
}
fs.writeFileSync(path.join(work, 'probe-workspace.txt'), copy);
console.log('Temporary probe workspace prepared; product routes unchanged.');
