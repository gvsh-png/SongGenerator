#!/usr/bin/env python3
"""Self-hosted MusicGen API for Song Studio Local."""

from __future__ import annotations

import base64
import io
import os
from contextlib import asynccontextmanager

import scipy.io.wavfile
import torch
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from transformers import AutoProcessor, MusicgenForConditionalGeneration

PORT = int(os.environ.get("PORT", "8787"))
MODEL_ID = os.environ.get("MUSICGEN_MODEL", "facebook/musicgen-small")
MAX_DURATION = int(os.environ.get("MUSICGEN_MAX_SECONDS", "30"))

processor: AutoProcessor | None = None
model: MusicgenForConditionalGeneration | None = None


@asynccontextmanager
async def lifespan(_app: FastAPI):
    global processor, model
    print(f"Downloading/loading {MODEL_ID} (first run may take several minutes)…")
    processor = AutoProcessor.from_pretrained(MODEL_ID)
    model = MusicgenForConditionalGeneration.from_pretrained(MODEL_ID)
    model.to("cpu")
    model.eval()
    print(f"Model ready on CPU → http://0.0.0.0:{PORT}")
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
        "message": f"MusicGen ({MODEL_ID})" if ready else "Loading model…",
        "mock": False,
        "model": MODEL_ID,
        "device": "cpu",
        "maxDurationSec": MAX_DURATION,
    }


@app.post("/api/generate")
def generate(req: GenerateRequest):
    if model is None or processor is None:
        raise HTTPException(status_code=503, detail="Model still loading. Retry in a minute.")

    prompt = req.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=400, detail="Prompt is required.")

    duration = min(max(int(req.duration), 5), MAX_DURATION)
    # ~50 generation steps ≈ 1 second of audio for MusicGen
    max_new_tokens = duration * 50

    inputs = processor(text=[prompt[:800]], padding=True, return_tensors="pt")

    with torch.inference_mode():
        audio_values = model.generate(**inputs, max_new_tokens=max_new_tokens)

    waveform = audio_values[0, 0].cpu().numpy()
    sampling_rate = model.config.audio_encoder.sampling_rate

    buffer = io.BytesIO()
    scipy.io.wavfile.write(buffer, rate=sampling_rate, data=waveform)
    audio_b64 = base64.b64encode(buffer.getvalue()).decode("ascii")

    return {
        "audio": audio_b64,
        "transcript": prompt[:800],
        "mimeType": "audio/wav",
        "duration": duration,
        "model": MODEL_ID,
    }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=PORT, log_level="info")
