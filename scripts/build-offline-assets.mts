import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const buildId = (
  await readFile(path.join(root, '.next/BUILD_ID'), 'utf8')
).trim();

if (!buildId) {
  throw new Error('Next build ID is missing.');
}

const template = await readFile(
  path.join(root, '.next/offline-worker/offline-worker.js'),
  'utf8',
);
const worker = template.replace('__OFFLINE_BUILD__', buildId);

await mkdir(path.join(root, 'public'), { recursive: true });
await writeFile(
  path.join(root, 'public/sw.js'),
  worker.replace(/export\s*\{\s*\};?/, ''),
);
console.log(
  'Offline homepage worker generated; assets are discovered during installation.',
);
