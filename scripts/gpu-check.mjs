#!/usr/bin/env node
import { pythonLabel, requirePython, runPython } from './resolve-python.mjs';

const prefix = requirePython();

console.log(`Checking GPU via ${pythonLabel(prefix)}…\n`);

const result = runPython(prefix, [
  '-c',
  `import torch
print("CUDA available:", torch.cuda.is_available())
if torch.cuda.is_available():
    print("GPU:", torch.cuda.get_device_name(0))
    vram = torch.cuda.get_device_properties(0).total_memory / (1024**3)
    print(f"VRAM: {vram:.1f} GB")
print("Torch:", torch.__version__)`,
]);

process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');

if (result.status !== 0) {
  console.error('\nGPU check failed. Run: npm run local-server:install-gpu');
  process.exit(1);
}

if (!(result.stdout ?? '').includes('CUDA available: True')) {
  console.log('\nNo CUDA — server will use CPU. For NVIDIA GPU run: npm run local-server:install-gpu');
} else {
  console.log('\nGPU ready. Restart the server if health still shows "device":"cpu":');
  console.log('  Ctrl+C the running npm run local, then: npm run local');
}
