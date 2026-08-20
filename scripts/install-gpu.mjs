#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { getPythonPrefix, pythonLabel, requirePython, runPython } from './resolve-python.mjs';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const cuda = process.env.CUDA_INDEX ?? 'cu128';
const prefix = requirePython();

console.log(`Using ${pythonLabel(prefix)}`);
console.log(`Installing PyTorch for CUDA (${cuda})…\n`);

function pip(...args) {
  const result = runPython(prefix, ['-m', 'pip', ...args], { cwd: root, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

pip('install', '--upgrade', 'pip');
pip(
  'install',
  'torch',
  'torchvision',
  'torchaudio',
  '--index-url',
  `https://download.pytorch.org/whl/${cuda}`,
);
console.log('\nInstalling server dependencies…');
pip('install', '-r', 'local-server/requirements-gpu.txt');

console.log('\nChecking GPU…');
const check = runPython(
  prefix,
  [
    '-c',
    `import torch
print("CUDA available:", torch.cuda.is_available())
if torch.cuda.is_available():
    print("GPU:", torch.cuda.get_device_name(0))
    print("VRAM GB:", round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 1))`,
  ],
  { cwd: root },
);
process.stdout.write(check.stdout ?? '');
process.stderr.write(check.stderr ?? '');

console.log('\nDone. Run: npm run local');
