import { readdir, rm } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const WORKSPACE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const REMOVABLE_DIRECTORIES = new Set([
  ".next",
  ".prisma",
  ".turbo",
  "dist",
  "generated",
  "node_modules",
]);
const SKIPPED_DIRECTORIES = new Set([".git"]);

function assertWithinWorkspace(targetPath) {
  const relativePath = relative(WORKSPACE_ROOT, targetPath);

  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    resolve(WORKSPACE_ROOT, relativePath) !== targetPath
  ) {
    throw new Error(`Refusing to remove path outside workspace: ${targetPath}`);
  }
}

async function findGeneratedDirectories(directory, matches) {
  const entries = await readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = resolve(directory, entry.name);

    if (REMOVABLE_DIRECTORIES.has(entry.name)) {
      assertWithinWorkspace(entryPath);
      matches.push(entryPath);
      continue;
    }

    if (entry.isDirectory() && !SKIPPED_DIRECTORIES.has(entry.name)) {
      await findGeneratedDirectories(entryPath, matches);
    }
  }
}

const directories = [];

await findGeneratedDirectories(WORKSPACE_ROOT, directories);

directories.sort((left, right) => right.length - left.length);

for (const directory of directories) {
  await rm(directory, { force: true, recursive: true });
  console.log(`Removed ${relative(WORKSPACE_ROOT, directory)}`);
}

console.log(
  `Workspace clean: ${directories.length} director${directories.length === 1 ? "y" : "ies"} removed.`,
);
