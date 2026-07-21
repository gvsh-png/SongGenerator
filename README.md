# Lyria Studio

A minimal, mobile-first AI song creation app powered by **Google Lyria 3** via [OpenRouter](https://openrouter.ai).

Create songs with rich prompts, voice dictation, genre/mood/instrument controls, and automatic cost preview. Your songs are saved locally in the browser.

## Features

- **Lyria 3 Pro & Clip** — Auto-selects the cheapest model (Clip $0.04 for ≤30s, Pro $0.08 for longer)
- **Speech-to-text** — Describe your song with your voice
- **Rich options** — Genre, mood, tempo, energy, vocals, instruments, key, era, structure, lyrics
- **Duration control** — 15 seconds to 2 minutes
- **Cost preview** — See estimated price before generating
- **Live progress** — Multi-step loader with time remaining and audio chunk feedback
- **Local storage** — Songs saved in IndexedDB + localStorage

## Setup

```bash
npm install
npm run dev
```

Open the app, enter your [OpenRouter API key](https://openrouter.ai/keys), and start creating.

## Build

```bash
npm run build
npm run preview
```

## Pricing (OpenRouter)

| Model | Duration | Cost |
|-------|----------|------|
| Lyria 3 Clip | up to 30s | $0.04/song |
| Lyria 3 Pro | up to ~2 min | $0.08/song |

Your API key is stored locally in your browser and never sent anywhere except OpenRouter.
