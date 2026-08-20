#!/usr/bin/env bash
# Install CUDA PyTorch + MusicGen deps for NVIDIA GPUs (RTX 5080, etc.)
set -euo pipefail

CUDA="${CUDA_INDEX:-cu128}"
echo "Installing PyTorch for CUDA (${CUDA})…"

python3 -m pip install --upgrade pip
python3 -m pip install torch torchvision torchaudio --index-url "https://download.pytorch.org/whl/${CUDA}"

echo "Installing server dependencies…"
python3 -m pip install -r local-server/requirements-gpu.txt

python3 - <<'PY'
import torch
print("CUDA available:", torch.cuda.is_available())
if torch.cuda.is_available():
    print("GPU:", torch.cuda.get_device_name(0))
    print("VRAM GB:", round(torch.cuda.get_device_properties(0).total_memory / 1024**3, 1))
PY

echo "Done. Run: npm run local-server:real"
