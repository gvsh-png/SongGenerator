# Local server for Song Studio Local

This folder is the **self-hosted backend** for the local edition of the app (`npm run build:local`).

The React app talks to your server over HTTP. No OpenRouter, no Google filters — you control the model and policies.

## Quick start (real model — MusicGen)

Downloads **facebook/musicgen-small** (~1.5 GB) on first run. CPU-only; a 30s clip may take several minutes.

```bash
npm run local-server:install   # once — Python deps + model cache
npm run local-server:real      # terminal 1
npm run dev:local              # terminal 2
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
