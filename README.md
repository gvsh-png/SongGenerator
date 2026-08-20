# Lyria Studio

A minimal, mobile-first AI song creation app. Two editions:

| Edition | Command | Backend |
|---------|---------|---------|
| **Cloud** (default) | `npm run dev` / `npm run build` | Google Lyria 3 via [OpenRouter](https://openrouter.ai) |
| **Local / self-hosted** | `npm run dev:local` / `npm run build:local` | Your own API server (YuE, HeartMuLa, etc.) |

Create songs with rich prompts, voice dictation, genre/mood/instrument controls, and automatic cost preview. Your songs are saved locally in the browser.

## Cloud edition (OpenRouter)

```bash
npm install
npm run dev
```

Open the app, enter your [OpenRouter API key](https://openrouter.ai/keys), and start creating.

```bash
npm run build    # → dist/
```

## Local / self-hosted edition

Run your own model with no OpenRouter billing or Google content filters (you control the backend).

```bash
# Terminal 1 — local API (mock mode for UI testing)
npm run local-server:mock

# Terminal 2 — local frontend
npm run dev:local
```

Set server URL to `http://localhost:8787` in the app setup screen.

```bash
npm run build:local   # → dist-local/
```

See [local-server/README.md](local-server/README.md) for the API contract and how to wire YuE, HeartMuLa, or your own inference code.

## Features

- **Lyria 3 Pro & Clip** (cloud) — Auto-selects the cheapest model (Clip $0.04 for ≤30s, Pro $0.08 for longer)
- **Self-hosted backend** (local) — `POST /api/generate` on your hardware
- **Speech-to-text** — Describe your song with your voice
- **Rich options** — Genre, mood, tempo, energy, vocals, instruments, key, era, structure, lyrics
- **Duration control** — 15 seconds to 2 minutes (longer on local depending on your model)
- **Cost preview** — Cloud only; local runs on your GPU
- **Live progress** — Multi-step loader with time remaining
- **Local storage** — Songs saved in IndexedDB + localStorage
- **Music videos** — Cloud only (Veo via OpenRouter)

## Pricing (cloud / OpenRouter)

| Model | Duration | Cost |
|-------|----------|------|
| Lyria 3 Clip | up to 30s | $0.04/song |
| Lyria 3 Pro | up to ~2 min | $0.08/song |

Your API key is stored locally in your browser and never sent anywhere except OpenRouter.
