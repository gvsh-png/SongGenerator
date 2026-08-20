#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const python = process.platform === 'win32' ? 'python' : 'python3';

function ok(msg) {
  console.log(`  ✓ ${msg}`);
}
function fail(msg) {
  console.log(`  ✗ ${msg}`);
}

console.log('Song Studio Local — diagnostics\n');

console.log('1. Project folder');
console.log(`   ${root}`);
try {
  const pkg = await import(path.join(root, 'package.json'), { with: { type: 'json' } });
  ok(`package.json found (${pkg.default.name})`);
} catch {
  fail('Not in SongGenerator repo — cd into the folder you cloned first');
  process.exit(1);
}

console.log('\n2. Python');
const py = spawnSync(python, ['--version'], { encoding: 'utf8' });
if (py.status === 0) {
  ok(py.stdout.trim() || py.stderr.trim());
} else {
  fail(`${python} not found — install Python 3.10+`);
}

console.log('\n3. Dependencies');
const torch = spawnSync(python, ['-c', 'import torch; print(torch.__version__)'], {
  cwd: root,
  encoding: 'utf8',
});
if (torch.status === 0) {
  ok(`torch ${torch.stdout.trim()}`);
} else {
  fail('Missing Python packages — run: npm run local-server:install');
}

console.log('\n4. Port 8787');
try {
  const res = await fetch('http://localhost:8787/health');
  const data = await res.json();
  ok(`Server responding: ${data.message ?? data.status} (${data.device ?? '?'})`);
} catch {
  fail('Nothing listening — run: npm run local-server:real  (or npm run local)');
}

console.log('\n5. Vite UI (5173)');
try {
  const res = await fetch('http://localhost:5173/');
  ok(`UI responding: HTTP ${res.status}`);
} catch {
  fail('UI not running — run: npm run dev:local');
}

console.log('\nDone. If step 4 failed, the app cannot generate until the API is up.');
