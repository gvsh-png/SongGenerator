#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { requirePython } from './resolve-python.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const prefix = requirePython();

const child = spawn(prefix[0], [...prefix.slice(1), 'local-server/server.py'], {
  cwd: root,
  stdio: 'inherit',
});

child.on('exit', (code) => process.exit(code ?? 0));
