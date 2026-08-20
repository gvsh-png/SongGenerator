import type { GenerationProgress, ModelId } from '../../types';
import type { GenerateResult } from '../openrouter';
import { getLocalApiKey, getLocalBaseUrl, normalizeLocalBaseUrl } from '../storage';
import type { SongGenerationCallbacks } from './types';

interface LocalGenerateResponse {
  audio?: string;
  audioBase64?: string;
  transcript?: string;
  mimeType?: string;
  error?: string;
  message?: string;
}

function localHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const key = getLocalApiKey();
  if (key) headers.Authorization = `Bearer ${key}`;
  return headers;
}

function toDataUrl(base64: string, mimeType = 'audio/mpeg'): string {
  const cleaned = base64.replace(/^data:[^;]+;base64,/, '');
  return `data:${mimeType};base64,${cleaned}`;
}

export async function testLocalConnection(baseUrl: string): Promise<{ ok: boolean; message: string }> {
  const url = `${normalizeLocalBaseUrl(baseUrl)}/health`;
  try {
    const response = await fetch(url, { headers: localHeaders() });
    if (!response.ok) {
      return { ok: false, message: `Server returned ${response.status}` };
    }
    const data = (await response.json()) as { status?: string; message?: string };
    if (data.status === 'ok') {
      return { ok: true, message: data.message ?? 'Connected' };
    }
    return { ok: false, message: data.message ?? 'Unexpected health response' };
  } catch {
    return {
      ok: false,
      message: 'Could not reach server. Is it running? Check the URL and CORS settings.',
    };
  }
}

export async function generateSongLocal(
  prompt: string,
  model: ModelId,
  duration: number,
  callbacks: SongGenerationCallbacks,
  signal?: AbortSignal,
): Promise<GenerateResult> {
  const baseUrl = getLocalBaseUrl();
  if (!baseUrl) throw new Error('Local server URL is not configured.');

  const startTime = Date.now();
  const estimatedTotal = Math.max(30000, duration * 1000);

  const tick = (phase: GenerationProgress['phase'], progress: number, message: string) => {
    const elapsedMs = Date.now() - startTime;
    callbacks.onProgress({
      phase,
      progress: Math.min(99, progress),
      message,
      elapsedMs,
      estimatedRemainingMs: Math.max(0, estimatedTotal - elapsedMs),
      chunksReceived: 0,
      transcript: '',
    });
  };

  tick('preparing', 8, 'Sending prompt to local server…');
  tick('connecting', 15, 'Waiting for your model…');

  const response = await fetch(`${normalizeLocalBaseUrl(baseUrl)}/api/generate`, {
    method: 'POST',
    headers: localHeaders(),
    body: JSON.stringify({
      prompt,
      duration,
      model,
      format: 'mp3',
    }),
    signal,
  });

  if (!response.ok) {
    let message = `Local server error (${response.status})`;
    try {
      const err = (await response.json()) as { error?: string; message?: string };
      message = err.error ?? err.message ?? message;
    } catch {
      const text = await response.text();
      if (text) message = text.slice(0, 300);
    }
    throw new Error(message);
  }

  tick('generating', 70, 'Receiving audio from local server…');

  const data = (await response.json()) as LocalGenerateResponse;
  const audioB64 = data.audio ?? data.audioBase64;
  if (!audioB64) {
    throw new Error(
      data.error ??
        data.message ??
        'Local server returned no audio. Implement POST /api/generate on your backend.',
    );
  }

  const transcript = data.transcript?.trim() ?? '';
  const audioDataUrl = toDataUrl(audioB64, data.mimeType ?? 'audio/mpeg');

  callbacks.onProgress({
    phase: 'complete',
    progress: 100,
    message: 'Song ready!',
    elapsedMs: Date.now() - startTime,
    estimatedRemainingMs: 0,
    chunksReceived: 1,
    transcript,
  });

  return { audioDataUrl, transcript };
}
