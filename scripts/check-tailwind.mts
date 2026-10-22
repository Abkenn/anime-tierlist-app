import { readdir, readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { __unstable__loadDesignSystem } from 'tailwindcss';

const require = createRequire(import.meta.url);
const stylesheet = path.resolve('src/app/_styles/globals.css');
const design = await __unstable__loadDesignSystem(
  await readFile(stylesheet, 'utf8'),
  {
    base: path.dirname(stylesheet),
    loadStylesheet: async (id, base) => {
      let resolved: string;

      if (id.startsWith('.')) {
        resolved = path.resolve(base, id);
      } else if (id === 'tailwindcss') {
        resolved = require.resolve('tailwindcss/index.css');
      } else if (id === 'tw-animate-css') {
        const packageRoot = path.resolve('node_modules', id);
        const manifest = JSON.parse(
          await readFile(path.join(packageRoot, 'package.json'), 'utf8'),
        );

        resolved = path.resolve(packageRoot, manifest.exports['.'].style);
      } else {
        resolved = require.resolve(id, { paths: [base] });
      }

      return {
        path: resolved,
        base: path.dirname(resolved),
        content: await readFile(resolved, 'utf8'),
      };
    },
  },
);
let warnings = 0;

const scan = async (directory: string): Promise<void> => {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await scan(filename);
      continue;
    }

    if (!/\.tsx?$/.test(filename)) {
      continue;
    }

    const source = await readFile(filename, 'utf8');

    for (const match of source.matchAll(/['"`]([^'"`\n]+)['"`]/g)) {
      for (const candidate of match[1].split(/\s+/)) {
        const [canonical] = design.canonicalizeCandidates([candidate]);

        if (canonical && canonical !== candidate) {
          console.error(`${filename}: ${candidate} -> ${canonical}`);
          warnings++;
        }
      }
    }
  }
};

await scan('src');

if (warnings) {
  process.exitCode = 1;
} else {
  console.log('Tailwind canonical classes checked.');
}
