import { readFile, stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { gzipSync } from 'node:zlib';

const appRoot = resolve(import.meta.dirname, '..');
const nextRoot = resolve(appRoot, '.next-build');
const manifestPath = resolve(nextRoot, 'app-build-manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
// Keep enough headroom for framework patches while preventing the heaviest
// route from drifting back to the pre-splitting 350 KiB ceiling.
const MAX_ROUTE_GZIP_BYTES = 325 * 1024;
const MAX_SINGLE_CHUNK_BYTES = 600 * 1024;
const measuredFiles = new Map();

async function measureFile(relativePath) {
  if (measuredFiles.has(relativePath)) return measuredFiles.get(relativePath);
  const absolutePath = resolve(nextRoot, relativePath);
  const fileStat = await stat(absolutePath);
  const source = await readFile(absolutePath);
  const measurement = {
    gzipBytes: gzipSync(source).byteLength,
    rawBytes: fileStat.size,
  };
  measuredFiles.set(relativePath, measurement);

  return measurement;
}

const failures = [];
const routeMeasurements = [];
if (
  !manifest.pages ||
  typeof manifest.pages !== 'object' ||
  Array.isArray(manifest.pages)
) {
  throw new Error('Invalid app build manifest: expected a pages object.');
}

const appPageEntries = Object.entries(manifest.pages).filter(
  ([route]) => route.endsWith('/page') && !route.startsWith('/api/'),
);

if (appPageEntries.length === 0) {
  throw new Error(
    'Performance budget cannot run: the app build manifest contains no page routes.',
  );
}

for (const [route, files] of appPageEntries) {
  if (!Array.isArray(files)) {
    failures.push(`${route}: expected an array of build files`);
    continue;
  }
  const javascriptFiles = [
    ...new Set(files.filter((file) => file.endsWith('.js'))),
  ];
  let gzipBytes = 0;
  for (const file of javascriptFiles) {
    const measurement = await measureFile(file);
    gzipBytes += measurement.gzipBytes;
    if (measurement.rawBytes > MAX_SINGLE_CHUNK_BYTES) {
      failures.push(
        `${file}: ${measurement.rawBytes} raw bytes exceeds ${MAX_SINGLE_CHUNK_BYTES}`,
      );
    }
  }
  routeMeasurements.push({ gzipBytes, route });
  if (gzipBytes > MAX_ROUTE_GZIP_BYTES) {
    failures.push(
      `${route}: ${gzipBytes} gzip bytes exceeds ${MAX_ROUTE_GZIP_BYTES}`,
    );
  }
}

routeMeasurements.sort((first, second) => second.gzipBytes - first.gzipBytes);
process.stdout.write(
  `${routeMeasurements
    .map(({ gzipBytes, route }) => `${route}: ${gzipBytes} gzip bytes`)
    .join('\n')}\n`,
);

if (failures.length > 0) {
  throw new Error(`Performance budget exceeded:\n${failures.join('\n')}`);
}
