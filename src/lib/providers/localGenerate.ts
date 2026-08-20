import type { GenerationProgress, ModelId } from '../../types';
import type { GenerateResult } from '../openrouter';
import {
  getLocalApiCandidates,
  isBrowserLocalHost,
} from '../config';
import { getLocalApiKey, getLocalBaseUrl } from '../storage';
import type { SongGenerationCallbacks } from './types';

interface LocalGenerateResponse {
  audio?: string;
  audioBase64?: string;
  transcript?: string;
  mimeType?: string;
  error?: string;
  message?: string;
  detail?: string;
}

interface LocalHealthResponse {
  status?: string;
  message?: string;
  device?: string;
  maxDurationSec?: number;
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

function parseApiError(data: { error?: string; message?: string; detail?: string | { msg?: string }[] }): string {
  if (data.error) return data.error;
  if (data.message) return data.message;
  if (typeof data.detail === 'string') return data.detail;
  if (Array.isArray(data.detail) && data.detail[0]?.msg) return data.detail[0].msg;
  return 'Local server error';
}

function formatFetchError(error: unknown, triedUrls: string[]): string {
  const message = error instanceof Error ? error.message : String(error);
  const isNetworkError =
    error instanceof TypeError ||
    message.includes('NetworkError') ||
    message.includes('Failed to fetch');

  if (!isNetworkError) return message;

  const targets = triedUrls.join(', ');

  if (typeof window !== 'undefined' && isBrowserLocalHost()) {
    return `Could not reach the MusicGen API (${targets}). Keep the terminal running where you started npm run local. Test in PowerShell: curl http://127.0.0.1:8787/health`;
  }

  return `Could not reach the local server at ${targets}. Run npm run local and open http://127.0.0.1:5173`;
}

async function fetchLocal(path: string, init?: RequestInit): Promise<Response> {
  const candidates = getLocalApiCandidates(getLocalBaseUrl());
  let lastError: unknown;
  let lastResponse: Response | null = null;

  for (const base of candidates) {
    try {
      const response = await fetch(`${base}${path}`, init);
      if (response.ok) {
        return response;
      }
      if (response.status === 503 || response.status >= 500) {
        lastError = new Error(`Server returned ${response.status}`);
        lastResponse = response;
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastResponse) return lastResponse;
  throw lastError ?? new Error(formatFetchError(new TypeError('Failed to fetch'), candidates));
}

export async function fetchLocalHealth(): Promise<LocalHealthResponse & { url?: string }> {
  const candidates = getLocalApiCandidates(getLocalBaseUrl());
  let lastError: unknown;

  for (const base of candidates) {
    try {
      const response = await fetch(`${base}/health`, { headers: localHeaders() });
      if (!response.ok) continue;
      const data = (await response.json()) as LocalHealthResponse;
      return { ...data, url: base };
    } catch (error) {
      lastError = error;
    }
  }

  throw new Error(formatFetchError(lastError, candidates));
}

export async function testLocalConnection(baseUrl?: string): Promise<{ ok: boolean; message: string }> {
  const candidates = getLocalApiCandidates(baseUrl ?? getLocalBaseUrl());
  let lastError: unknown;

  for (const resolved of candidates) {
    try {
      const response = await fetch(`${resolved}/health`, { headers: localHeaders() });
      if (!response.ok) {
        lastError = new Error(`Server returned ${response.status}`);
        continue;
      }
      const data = (await response.json()) as LocalHealthResponse;
      if (data.status === 'ok') {
        return { ok: true, message: `${data.message ?? 'Connected'} (${resolved})` };
      }
      if (data.status === 'loading') {
        return { ok: false, message: 'Model still loading — wait a minute and try again.' };
      }
      lastError = new Error(data.message ?? 'Unexpected health response');
    } catch (error) {
      lastError = error;
    }
  }

  return {
    ok: false,
    message: formatFetchError(lastError, candidates),
  };
}

export async function generateSongLocal(
  prompt: string,
  model: ModelId,
  duration: number,
  callbacks: SongGenerationCallbacks,
  signal?: AbortSignal,
): Promise<GenerateResult> {
  const startTime = Date.now();

  try {
    const health = await fetchLocalHealth();
    if (health.status === 'loading') {
      throw new Error('Model still loading on the server. Wait a minute and try again.');
    }
    const cap = health.maxDurationSec ?? 30;
    if (duration > cap) {
      duration = cap;
    }
  } catch (error) {
    throw error instanceof Error ? error : new Error(String(error));
  }

  const estimatedTotal = Math.max(30000, duration * 2000);

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
  tick('connecting', 15, 'Generating on your GPU/CPU — can take 1–3 min…');

  let response: Response;
  try {
    response = await fetchLocal('/api/generate', {
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
  } catch (error) {
    throw new Error(formatFetchError(error, getLocalApiCandidates(getLocalBaseUrl())));
  }

  if (!response.ok) {
    let message = `Local server error (${response.status})`;
    try {
      const err = (await response.json()) as LocalGenerateResponse;
      message = parseApiError(err);
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
    throw new Error(parseApiError(data));
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
