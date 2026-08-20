import type { GenerationProgress, ModelId } from '../../types';
import type { GenerateResult } from '../openrouter';
import { isBrowserLocalHost, LOCAL_API_PROXY_PATH, LOCAL_DIRECT_URL, resolveLocalApiBase } from '../config';
import { getLocalApiKey, getLocalBaseUrl } from '../storage';
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

function formatFetchError(error: unknown, baseUrl: string, triedUrls?: string[]): string {
  const message = error instanceof Error ? error.message : String(error);
  const isNetworkError =
    error instanceof TypeError ||
    message.includes('NetworkError') ||
    message.includes('Failed to fetch');

  if (!isNetworkError) return message;

  const targets = triedUrls?.length ? triedUrls.join(', ') : baseUrl;

  if (baseUrl === LOCAL_API_PROXY_PATH || baseUrl.startsWith('/')) {
    return `Could not reach the local server at ${targets}. Run npm run local (starts API + UI) or npm run local-server:real in a separate terminal. Use npm run dev:local — not a static build — so /local-api can proxy.`;
  }

  if (baseUrl.startsWith('http://') && typeof window !== 'undefined') {
    if (window.location.protocol === 'https:') {
      return 'Blocked by mixed content (HTTPS page calling HTTP API). Use /local-api as the server URL so Vite proxies the request.';
    }
    if (!isBrowserLocalHost()) {
      return `Could not reach ${targets}. On a remote preview use /local-api with npm run dev:local, not ${LOCAL_DIRECT_URL}.`;
    }
  }

  return `Could not reach the local server at ${targets}. Start it with npm run local-server:real (or npm run local to start both).`;
}

function localApiCandidates(stored?: string | null): string[] {
  const primary = resolveLocalApiBase(stored);
  const fallbacks: string[] = [];
  if (primary === LOCAL_API_PROXY_PATH) {
    fallbacks.push(LOCAL_DIRECT_URL);
  } else if (primary === LOCAL_DIRECT_URL && import.meta.env.DEV) {
    fallbacks.push(LOCAL_API_PROXY_PATH);
  }
  return [...new Set([primary, ...fallbacks])];
}

async function fetchLocal(path: string, init?: RequestInit): Promise<Response> {
  const stored = getLocalBaseUrl();
  const candidates = localApiCandidates(stored);
  let lastError: unknown;

  for (const base of candidates) {
    try {
      const response = await fetch(`${base}${path}`, init);
      if (response.ok || response.status < 500) {
        return response;
      }
      lastError = new Error(`Server returned ${response.status}`);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error(formatFetchError(new TypeError('Failed to fetch'), candidates[0], candidates));
}

export async function testLocalConnection(baseUrl?: string): Promise<{ ok: boolean; message: string }> {
  const candidates = localApiCandidates(baseUrl ?? getLocalBaseUrl());
  let lastError: unknown;

  for (const resolved of candidates) {
    try {
      const response = await fetch(`${resolved}/health`, { headers: localHeaders() });
      if (!response.ok) {
        lastError = new Error(`Server returned ${response.status}`);
        continue;
      }
      const data = (await response.json()) as { status?: string; message?: string };
      if (data.status === 'ok') {
        return { ok: true, message: `${data.message ?? 'Connected'} (${resolved})` };
      }
      lastError = new Error(data.message ?? 'Unexpected health response');
    } catch (error) {
      lastError = error;
    }
  }

  return {
    ok: false,
    message: formatFetchError(lastError, candidates[0], candidates),
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
    const candidates = localApiCandidates(getLocalBaseUrl());
    throw new Error(formatFetchError(error, candidates[0], candidates));
  }

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
