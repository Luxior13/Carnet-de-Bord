import { readdir, readFile } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';

const sourceRoot = resolve(import.meta.dirname, '../src');
const DEFAULT_SOURCE_LIMIT = 800;
const SERVER_ONLY_DATABASE_IMPORT_PATTERN =
  /(?:from\s+|import\s*)['"](?:@repo\/database|@prisma\/client)(?:\/[^'"]*)?['"]/u;
const LEGACY_LIMITS = new Map([
  ['components/ui/sidebar.tsx', 900],
  ['components/users/UserDetailPage.tsx', 1_500],
  ['components/users/user-detail/UserSecurityTab.tsx', 850],
  ['features/account/components/SecuritySection.tsx', 900],
  ['shared/constants/permissions.constants.ts', 1_400],
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
