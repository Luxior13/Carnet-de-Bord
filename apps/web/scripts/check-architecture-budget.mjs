import { readdir, readFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';

const sourceRoot = resolve(import.meta.dirname, '../src');
const DEFAULT_SOURCE_LIMIT = 800;
const SERVER_ONLY_DATABASE_IMPORT_PATTERN =
  /(?:from\s+|import\s*)['"](?:@repo\/database|@prisma\/client)(?:\/[^'"]*)?['"]/u;
const LEGACY_LIMITS = new Map([
  ['app/api/systeme/journal-activite/route.ts', 1_050],
  ['app/api/users/[id]/audit/route.ts', 950],
  ['app/api/users/[id]/route.ts', 1_350],
  ['components/Sidebar.tsx', 850],
  ['components/ui/sidebar.tsx', 900],
  ['components/users/PermissionsEditor.tsx', 1_200],
  ['components/users/UserDetailPage.tsx', 2_800],
  ['components/users/user-detail/UserHistoryTab.tsx', 2_850],
  ['components/users/user-detail/UserSecurityTab.tsx', 850],
  ['features/account/components/SecuritySection.tsx', 900],
  ['features/audit/SystemActivityJournalPage.tsx', 1_900],
  ['features/users/UsersListPage.tsx', 1_100],
  ['shared/constants/app.constants.ts', 1_000],
  ['shared/constants/permissions.constants.ts', 1_350],
  ['shared/server/auth.ts', 1_450],
]);

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      files.push(...(await collectSourceFiles(path)));
    } else if (['.ts', '.tsx'].includes(extname(entry.name))) {
      files.push(path);
    }
  }

  return files;
}

const failures = [];
for (const filePath of await collectSourceFiles(sourceRoot)) {
  const sourcePath = relative(sourceRoot, filePath).replaceAll('\\', '/');
  const source = await readFile(filePath, 'utf8');
  const lineCount = source.split(/\r?\n/u).length;
  const limit = LEGACY_LIMITS.get(sourcePath) ?? DEFAULT_SOURCE_LIMIT;
  if (lineCount > limit) {
    failures.push(`${sourcePath}: ${lineCount} lines exceeds ${limit}`);
  }

  const isDatabaseServerBoundary =
    sourcePath.startsWith('app/api/') ||
    sourcePath.startsWith('shared/server/') ||
    /^features\/[^/]+\/server\//u.test(sourcePath);
  if (
    !isDatabaseServerBoundary &&
    SERVER_ONLY_DATABASE_IMPORT_PATTERN.test(source)
  ) {
    failures.push(
      `${sourcePath}: database packages are server-only; import browser-safe contracts from @repo/shared`,
    );
  }
}

if (failures.length > 0) {
  throw new Error(`Architecture size budget exceeded:\n${failures.join('\n')}`);
}

process.stdout.write('Architecture size budget respected.\n');
