# Local server for Song Studio Local

This folder is the **self-hosted backend** for the local edition of the app (`npm run build:local`).

The React app talks to your server over HTTP. No OpenRouter, no Google filters — you control the model and policies.

## Quick start (GPU — RTX 5080 / NVIDIA)

Auto-detects CUDA and uses **musicgen-medium** (better quality). Up to **120s** clips on GPU.

```bash
git checkout self-hosted
npm install

# Install CUDA PyTorch + deps (RTX 5080: use cu128, or cu124 if cu128 fails)
npm run local-server:install-gpu
# or: CUDA_INDEX=cu124 npm run local-server:install-gpu

npm run local-server:real   # terminal 1 — should log your GPU name
npm run dev:local           # terminal 2
```

Optional env vars:

| Variable | Default | Description |
|----------|---------|-------------|
| `MUSICGEN_DEVICE` | auto | Force `cuda`, `cpu`, or `mps` |
| `MUSICGEN_MODEL` | medium on GPU | e.g. `facebook/musicgen-large` |
| `MUSICGEN_MAX_SECONDS_GPU` | 120 | Max clip length on GPU |

## Quick start (CPU only)

Downloads **facebook/musicgen-small** (~1.5 GB). Slower; max 30s clips.

```bash
npm run local-server:install
npm run local-server:real
npm run dev:local
```

## Quick start (mock / UI test only)

```bash
npm run local-server:mock
npm run dev:local
```

Open the app, set server URL to `http://localhost:8787`, test connection, create a song.

## API contract

### `GET /health`

```json
{ "status": "ok", "message": "..." }
```

### `POST /api/generate`

**Request**

```json
{
  "prompt": "Pop track, uplifting mood…",
  "duration": 60,
  "model": "local-default",
  "format": "mp3"
}
```

**Response (success)**

```json
{
  "audio": "<base64-encoded audio bytes>",
  "transcript": "optional lyrics or notes",
  "mimeType": "audio/mpeg"
}
```

**Response (error)**

```json
{ "error": "...", "message": "..." }
```

Optional: send `Authorization: Bearer <token>` if you protect your server.

## Wire your model

Edit `local-server/index.js` in the `POST /api/generate` handler:

1. Parse `prompt`, `duration`, and optional lyrics from the body.
2. Call your inference stack (YuE, HeartMuLa, custom Python script, etc.).
3. Return base64-encoded MP3 or WAV in the `audio` field.

### Open-source models to consider

| Model | Notes |
|-------|--------|
| [YuE](https://github.com/multimodal-art-projection/YuE) | Lyrics → full song, Apache 2.0, needs GPU |
| [HeartMuLa](https://github.com/HeartMuLa/heartlib) | Tags + lyrics → music, Apache 2.0 |

Typical setup: run inference in Python, expose this small Node (or FastAPI) gateway, point the app at it.

## CORS

The stub sets `Access-Control-Allow-Origin: *` so the static app can call it from any origin. Restrict this in production.

## Production

```bash
npm run build:local    # → dist-local/
npm run local-server   # or your real backend
# Serve dist-local/ with any static file server (nginx, Caddy, etc.)
```

## Cloud vs local builds

| Script | Output | Mode |
|--------|--------|------|
| `npm run dev` | — | OpenRouter / Lyria cloud |
| `npm run dev:local` | — | Self-hosted |
| `npm run build` | `dist/` | Cloud |
| `npm run build:local` | `dist-local/` | Local |
