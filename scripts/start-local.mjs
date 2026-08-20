#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pythonLabel, requirePython, runPython } from './resolve-python.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const prefix = requirePython();
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');

function runUi() {
  if (!existsSync(viteBin)) {
    console.error('Vite not found. Run: npm install');
    process.exit(1);
  }
  return spawn(process.execPath, [viteBin, '--mode', 'selfhosted'], {
    cwd: root,
    stdio: 'inherit',
    windowsHide: false,
  });
}

function runPythonScript(scriptPath) {
  return spawn(prefix[0], [...prefix.slice(1), scriptPath], {
    cwd: root,
    stdio: 'inherit',
    windowsHide: false,
  });
}

async function fetchHealth() {
  try {
    const res = await fetch('http://127.0.0.1:8787/health');
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function waitForHealth(maxSeconds = 600) {
  const start = Date.now();
  while (Date.now() - start < maxSeconds * 1000) {
    const data = await fetchHealth();
    if (data && (data.status === 'ok' || data.status === 'loading')) {
      return data;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

console.log('==> Song Studio Local');
console.log(`    Using ${pythonLabel(prefix)}`);

let api = null;
const existing = await fetchHealth();

if (existing?.status === 'ok') {
  console.log(`    Reusing API on http://127.0.0.1:8787 — ${existing.message} (${existing.device})`);
  if (existing.device === 'cpu') {
    const cudaProbe = runPython(prefix, ['-c', 'import torch; print(torch.cuda.is_available())']);
    if ((cudaProbe.stdout ?? '').trim() === 'True') {
      console.error('\n    ERROR: Old CPU server is still running on port 8787.');
      console.error('    Your RTX 5080 is ready but not being used.');
      console.error('\n    Fix:');
      console.error('      npm run local:stop');
      console.error('      npm run local-server:real    ← wait for "Model ready on cuda"');
      console.error('      npm run dev:local            ← in a second window\n');
      process.exit(1);
    }
  }
} else {
  console.log('    Starting MusicGen API on http://127.0.0.1:8787');
  console.log('    First run downloads the model — can take several minutes.\n');
  api = runPythonScript('local-server/server.py');

  api.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.error(`\nERROR: MusicGen server exited (code ${code}).`);
      console.error('Run: npm run local-server:install-gpu');
      process.exit(code ?? 1);
    }
  });

  console.log('    Waiting for API (up to 10 min while model loads)…');
  const health = await waitForHealth(600);

  if (!health) {
    console.error('\nERROR: API never responded on http://127.0.0.1:8787/health');
    console.error('Port may be in use. Run: npm run local:stop');
    api.kill();
    process.exit(1);
  }

  console.log(`    API ready: ${health.message ?? health.status} (${health.device ?? '?'})`);
}

console.log('    Starting UI at http://127.0.0.1:5173\n');

const ui = runUi();

ui.on('error', (error) => {
  console.error('\nUI process error:', error.message);
  console.error('API is still running. In a NEW PowerShell window run: npm run dev:local');
});

function shutdown() {
  api?.kill();
  ui?.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

ui.on('exit', () => {
  console.log('\nUI stopped. API still running on http://127.0.0.1:8787');
  console.log('Restart UI with: npm run dev:local\n');
});
