import type { GenerationProgress } from '../types';
import {
  MUSIC_VIDEO_DURATION,
  VIDEO_MODEL,
  estimateMusicVideoCost,
  estimateVideoGenerationTimeMs,
} from './musicVideo';

export interface VideoJobResponse {
  id: string;
  polling_url: string;
  status: string;
  generation_id?: string;
}

export interface VideoPollResponse {
  id: string;
  polling_url?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled' | 'expired';
  error?: string;
  unsigned_urls?: string[];
  usage?: { cost: number };
}

export interface GenerateMusicVideoResult {
  videoBlob: Blob;
  cost: number;
  duration: number;
}

export interface VideoGenerationCallbacks {
  onProgress: (progress: GenerationProgress) => void;
}

const OPENROUTER_BASE = 'https://openrouter.ai/api/v1';

function apiHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://lyria-song-creator.app',
    'X-Title': 'Lyria Song Studio',
  };
}

async function resolvePollUrl(pollingUrl: string): Promise<string> {
  if (pollingUrl.startsWith('http')) return pollingUrl;
  return `https://openrouter.ai${pollingUrl.startsWith('/') ? '' : '/'}${pollingUrl}`;
}

export async function generateMusicVideo(
  apiKey: string,
  prompt: string,
  callbacks: VideoGenerationCallbacks,
  signal?: AbortSignal,
): Promise<GenerateMusicVideoResult> {
  const startTime = Date.now();
  const estimatedTotal = estimateVideoGenerationTimeMs();
  const expectedCost = estimateMusicVideoCost();

  const update = (
    phase: GenerationProgress['phase'],
    progress: number,
    message: string,
    extra: Partial<GenerationProgress> = {},
  ) => {
    const elapsedMs = Date.now() - startTime;
    callbacks.onProgress({
      phase,
      progress: Math.min(99, progress),
      message,
      elapsedMs,
      estimatedRemainingMs: Math.max(0, estimatedTotal - elapsedMs),
      chunksReceived: extra.chunksReceived ?? 0,
      transcript: extra.transcript ?? '',
    });
  };

  update('submitting', 8, 'Submitting music video request…');

  const submitRes = await fetch(`${OPENROUTER_BASE}/videos`, {
    method: 'POST',
    headers: apiHeaders(apiKey),
    body: JSON.stringify({
      model: VIDEO_MODEL,
      prompt,
      duration: MUSIC_VIDEO_DURATION,
      resolution: '720p',
      aspect_ratio: '16:9',
      generate_audio: false,
    }),
    signal,
  });

  if (!submitRes.ok) {
    const errText = await submitRes.text();
    let message = `Video API error (${submitRes.status})`;
    try {
      const errJson = JSON.parse(errText);
      message = errJson.error?.message || errJson.message || message;
    } catch {
      if (errText) message = errText.slice(0, 200);
    }
    throw new Error(message);
  }

  const job = (await submitRes.json()) as VideoJobResponse;
  if (!job.polling_url) throw new Error('No polling URL returned from video API');

  update('polling', 15, 'Video queued — waiting for generation…');

  let pollUrl = await resolvePollUrl(job.polling_url);
  let status: VideoPollResponse['status'] = 'pending';
  let pollData: VideoPollResponse | null = null;
  let attempts = 0;
  const maxAttempts = 120;

  while (attempts < maxAttempts) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    await delay(attempts === 0 ? 2000 : 5000);

    const pollRes = await fetch(pollUrl, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal,
    });

    if (!pollRes.ok) {
      throw new Error(`Failed to check video status (${pollRes.status})`);
    }

    pollData = (await pollRes.json()) as VideoPollResponse;
    status = pollData.status;

    const elapsed = Date.now() - startTime;
    const timeProgress = Math.min(85, 15 + (elapsed / estimatedTotal) * 70);

    if (status === 'pending') {
      update('polling', timeProgress, 'Waiting in queue…');
    } else if (status === 'in_progress') {
      update('generating', timeProgress, 'Generating music video visuals…');
    } else if (status === 'completed') {
      break;
    } else if (status === 'failed' || status === 'cancelled' || status === 'expired') {
      throw new Error(pollData.error ?? `Video generation ${status}`);
    }

    if (pollData.polling_url) {
      pollUrl = await resolvePollUrl(pollData.polling_url);
    }

    attempts++;
  }

  if (status !== 'completed' || !pollData?.unsigned_urls?.length) {
    throw new Error('Video generation timed out. Try again later.');
  }

  update('downloading', 92, 'Downloading your music video…');

  const videoUrl = pollData.unsigned_urls[0];
  const videoRes = await fetch(videoUrl, {
    headers: videoUrl.includes('openrouter.ai')
      ? { Authorization: `Bearer ${apiKey}` }
      : undefined,
    signal,
  });

  if (!videoRes.ok) {
    throw new Error(`Failed to download video (${videoRes.status})`);
  }

  const videoBlob = await videoRes.blob();
  const cost = pollData.usage?.cost ?? expectedCost;

  callbacks.onProgress({
    phase: 'complete',
    progress: 100,
    message: 'Music video ready!',
    elapsedMs: Date.now() - startTime,
    estimatedRemainingMs: 0,
    chunksReceived: 0,
    transcript: '',
  });

  return {
    videoBlob,
    cost,
    duration: MUSIC_VIDEO_DURATION,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
