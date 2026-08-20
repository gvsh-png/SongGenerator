#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getPythonPrefix, pythonLabel, runPython } from './resolve-python.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

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
  const pkg = JSON.parse(readFileSync(path.join(root, 'package.json'), 'utf8'));
  ok(`package.json found (${pkg.name})`);
} catch {
  fail('Not in SongGenerator repo — cd into the folder you cloned first');
  process.exit(1);
}

console.log('\n2. Python');
const prefix = getPythonPrefix();
if (prefix) {
  const py = runPython(prefix, ['--version']);
  ok(`${pythonLabel(prefix)} — ${(py.stdout || py.stderr || '').trim()}`);
} else if (process.platform === 'win32') {
  fail('Python not found — install from https://www.python.org/downloads/');
  console.log('     Check "Add python.exe to PATH" during install, then reopen PowerShell.');
} else {
  fail('python3 not found — install Python 3.10+');
}

console.log('\n3. Dependencies');
if (prefix) {
  const torch = runPython(prefix, ['-c', 'import torch; print(torch.__version__)'], { cwd: root });
  if (torch.status === 0) {
    ok(`torch ${torch.stdout.trim()}`);
  } else {
    fail('Missing packages — run: npm run local-server:install-gpu');
  }
} else {
  fail('Skipped (no Python)');
}

console.log('\n4. Port 8787');
try {
  const res = await fetch('http://localhost:8787/health');
  const data = await res.json();
  ok(`Server responding: ${data.message ?? data.status} (${data.device ?? '?'})`);
} catch {
  fail('Nothing listening — run: npm run local');
}

console.log('\n5. Vite UI (5173)');
try {
  const res = await fetch('http://localhost:5173/');
  ok(`UI responding: HTTP ${res.status}`);
} catch {
  fail('UI not running — will start with npm run local');
}

console.log('\nDone. Step 4 must pass before the app can generate songs.');
