#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { pythonLabel, requirePython, runPython } from './resolve-python.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const prefix = requirePython();

console.log(`Using ${pythonLabel(prefix)}`);
console.log('Installing MusicGen dependencies (CPU)…\n');

const result = runPython(prefix, ['-m', 'pip', 'install', '-r', 'local-server/requirements.txt'], {
  cwd: root,
  stdio: 'inherit',
});
if (result.status !== 0) process.exit(result.status ?? 1);

console.log('\nDone. Run: npm run local');
