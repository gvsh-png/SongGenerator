#!/usr/bin/env python3
"""Self-hosted MusicGen API for Song Studio Local."""

from __future__ import annotations

import base64
import io
import os
import asyncio
from concurrent.futures import ThreadPoolExecutor
from contextlib import asynccontextmanager

import scipy.io.wavfile
import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import AutoProcessor, MusicgenForConditionalGeneration

PORT = int(os.environ.get("PORT", "8787"))
MAX_DURATION_CPU = int(os.environ.get("MUSICGEN_MAX_SECONDS_CPU", "30"))
MAX_DURATION_GPU = int(os.environ.get("MUSICGEN_MAX_SECONDS_GPU", "120"))

processor: AutoProcessor | None = None
model: MusicgenForConditionalGeneration | None = None
device: str = "cpu"
gpu_name: str | None = None
model_id: str = ""
generate_pool = ThreadPoolExecutor(max_workers=1)


def resolve_device() -> str:
    forced = os.environ.get("MUSICGEN_DEVICE", "").strip().lower()
    if forced in {"cpu", "cuda", "mps"}:
        return forced
    if torch.cuda.is_available():
        return "cuda"
    if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
        return "mps"
    return "cpu"


def resolve_model_id(dev: str) -> str:
    explicit = os.environ.get("MUSICGEN_MODEL", "").strip()
    if explicit:
        return explicit
    # Medium fits easily on a 16GB GPU (e.g. RTX 5080); small for CPU
    return "facebook/musicgen-medium" if dev == "cuda" else "facebook/musicgen-small"


def max_duration_for_device(dev: str) -> int:
    return MAX_DURATION_GPU if dev == "cuda" else MAX_DURATION_CPU


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global processor, model, device, gpu_name, model_id

    device = resolve_device()
    model_id = resolve_model_id(device)

    if device == "cuda":
        gpu_name = torch.cuda.get_device_name(0)
        vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024**3)
        print(f"GPU detected: {gpu_name} ({vram_gb:.1f} GB VRAM)")
    else:
        gpu_name = None
        print(f"No CUDA GPU — using {device}. Set MUSICGEN_DEVICE=cuda on a machine with a GPU.")

    print(f"Downloading/loading {model_id}…")
    processor = AutoProcessor.from_pretrained(model_id)
    model = MusicgenForConditionalGeneration.from_pretrained(model_id)
    model.to(device)
    model.eval()

    if device == "cuda":
        torch.backends.cuda.matmul.allow_tf32 = True
        torch.backends.cudnn.allow_tf32 = True

    print(f"Model ready on {device} → http://0.0.0.0:{PORT}")
    yield


app = FastAPI(title="Song Studio Local Server", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class GenerateRequest(BaseModel):
    prompt: str
    duration: float = Field(default=30, ge=5, le=120)
    model: str = "local-default"
    format: str = "mp3"


@app.get("/health")
def health():
    ready = model is not None and processor is not None
    return {
        "status": "ok" if ready else "loading",
        "message": f"MusicGen ({model_id})" if ready else "Loading model…",
        "mock": False,
        "model": model_id,
        "device": device,
        "gpu": gpu_name,
        "maxDurationSec": max_duration_for_device(device),
    }


@app.post("/api/generate")
async def generate(req: GenerateRequest):
    if model is None or processor is None:
        raise HTTPException(status_code=503, detail="Model still loading. Retry in a minute.")

    loop = asyncio.get_event_loop()
    try:
        return await loop.run_in_executor(generate_pool, lambda: _generate_sync(req))
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc


def _generate_sync(req: GenerateRequest):
    if model is None or processor is None:
        raise HTTPException(status_code=503, detail="Model still loading. Retry in a minute.")

    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required.")

    cap = max_duration_for_device(device)
    duration = min(max(int(req.duration), 5), cap)
    max_new_tokens = duration * 50

    inputs = processor(text=[prompt[:800]], padding=True, return_tensors="pt")
    inputs = {key: value.to(device) for key, value in inputs.items()}

    with torch.inference_mode():
        if device == "cuda":
            with torch.autocast(device_type="cuda", dtype=torch.float16):
                audio_values = model.generate(**inputs, max_new_tokens=max_new_tokens)
        else:
            audio_values = model.generate(**inputs, max_new_tokens=max_new_tokens)

    waveform = audio_values[0, 0].detach().cpu().numpy()
    sampling_rate = model.config.audio_encoder.sampling_rate

    buffer = io.BytesIO()
    scipy.io.wavfile.write(buffer, rate=sampling_rate, data=waveform)
    audio_b64 = base64.b64encode(buffer.getvalue()).decode("ascii")

    return {
        "audio": audio_b64,
        "transcript": prompt[:800],
        "mimeType": "audio/wav",
        "duration": duration,
        "model": model_id,
        "device": device,
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
