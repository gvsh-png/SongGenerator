#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const python = process.platform === 'win32' ? 'python' : 'python3';
const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';

function run(cmd, args, opts = {}) {
  return spawn(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', ...opts });
}

async function waitForHealth(maxSeconds = 600) {
  const start = Date.now();
  while (Date.now() - start < maxSeconds * 1000) {
    try {
      const res = await fetch('http://localhost:8787/health');
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'ok' || data.status === 'loading') {
          return data;
        }
      }
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

console.log('==> Song Studio Local');
console.log('    Starting MusicGen API on http://localhost:8787');
console.log('    First run downloads the model — can take several minutes.');
console.log('');

const api = run(python, ['local-server/server.py']);

api.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`\nERROR: MusicGen server exited (code ${code}).`);
    console.error('Run: npm run local-server:install   (or local-server:install-gpu for NVIDIA)');
    process.exit(code ?? 1);
  }
});

console.log('    Waiting for API (up to 10 min while model loads)…');
const health = await waitForHealth(600);

if (!health) {
  console.error('\nERROR: API never responded on http://localhost:8787/health');
  console.error('Check that Python deps are installed and port 8787 is free.');
  api.kill();
  process.exit(1);
}

console.log(`    API ready: ${health.message ?? health.status}`);
if (health.status === 'loading') {
  console.log('    Model still loading — generation may fail until ready.');
}

console.log('    Starting UI at http://localhost:5173\n');
const ui = run(npmCmd, ['run', 'dev:local']);

function shutdown() {
  api.kill();
  ui.kill();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

ui.on('exit', (code) => {
  api.kill();
  process.exit(code ?? 0);
});
