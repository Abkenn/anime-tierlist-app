import { type ChildProcess, spawn } from 'node:child_process';
import { existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const workspace = fileURLToPath(new URL('../', import.meta.url));
const sketch = process.env.STORYBOOK_SKETCH_DIR ?? join(workspace, '.local', 'stately-sketch');
const temporaryDirectory = join(workspace, '.local', 'tmp');
mkdirSync(temporaryDirectory, { recursive: true });

const env = { ...process.env, TEMP: temporaryDirectory, TMP: temporaryDirectory };
const pnpm = process.env.npm_execpath;
if (!pnpm) {
  throw new Error('Start this script with pnpm storybook.');
}

const children = new Set<ChildProcess>();
const run = (command: string, args: string[], cwd = workspace) =>
  new Promise<number>((resolve, reject) => {
    const child = spawn(command, args, { cwd, env, stdio: 'inherit', windowsHide: true });
    children.add(child);
    child.once('error', reject);
    child.once('exit', (code) => {
      children.delete(child);
      resolve(code ?? 1);
    });
  });

const stop = () => {
  for (const child of children) {
    if (process.platform === 'win32' && child.pid) {
      spawn('taskkill.exe', ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true });
    } else {
      child.kill();
    }
  }
};

const runPnpm = (args: string[], cwd: string) =>
  pnpm.endsWith('.exe') ? run(pnpm, args, cwd) : run(process.execPath, [pnpm, ...args], cwd);

process.once('SIGINT', stop);
process.once('SIGTERM', stop);

try {
  if (!existsSync(join(sketch, 'package.json'))) {
    const code = await run('git', [
      'clone',
      '--depth',
      '1',
      'https://github.com/statelyai/sketch.git',
      sketch,
    ]);
    if (code !== 0) {
      throw new Error('Could not clone Stately Sketch.');
    }
  }

  if (!existsSync(join(sketch, 'node_modules', 'vite', 'bin', 'vite.js'))) {
    if ((await runPnpm(['install', '--frozen-lockfile'], sketch)) !== 0) {
      throw new Error('Could not install Stately Sketch dependencies.');
    }
  }

  process.exitCode = await Promise.race([
    run(
      process.execPath,
      [
        'node_modules/vite/bin/vite.js',
        'dev',
        '--host',
        '127.0.0.1',
        '--port',
        '6106',
        '--strictPort',
      ],
      sketch,
    ),
    runPnpm(['exec', 'storybook', 'dev', '-p', '6006', ...process.argv.slice(2)], workspace),
  ]);
} finally {
  stop();
}
