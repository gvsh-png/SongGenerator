import type { SavedSong, GenerationProgress } from '../types';
import {
  VIDEO_MODEL,
  buildMusicVideoPromptForClip,
  planMusicVideoClips,
  estimateVideoGenerationTimeMs,
} from './musicVideo';
import { concatVideoClips } from './videoConcat';

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
  clipCount: number;
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

async function generateSingleClip(
  apiKey: string,
  prompt: string,
  clipDuration: number,
  onStatus: (msg: string) => void,
  signal?: AbortSignal,
): Promise<{ blob: Blob; cost: number }> {
  onStatus('Submitting clip…');

  const submitRes = await fetch(`${OPENROUTER_BASE}/videos`, {
    method: 'POST',
    headers: apiHeaders(apiKey),
    body: JSON.stringify({
      model: VIDEO_MODEL,
      prompt,
      duration: clipDuration,
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

  let pollUrl = await resolvePollUrl(job.polling_url);
  let status: VideoPollResponse['status'] = 'pending';
  let pollData: VideoPollResponse | null = null;
  let attempts = 0;

  while (attempts < 120) {
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

    if (status === 'pending') {
      onStatus('Waiting in queue…');
    } else if (status === 'in_progress') {
      onStatus('Rendering clip…');
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
    throw new Error('Video clip generation timed out.');
  }

  onStatus('Downloading clip…');

  const videoUrl = pollData.unsigned_urls[0];
  const videoRes = await fetch(videoUrl, {
    headers: videoUrl.includes('openrouter.ai')
      ? { Authorization: `Bearer ${apiKey}` }
      : undefined,
    signal,
  });

  if (!videoRes.ok) {
    throw new Error(`Failed to download clip (${videoRes.status})`);
  }

  const blob = await videoRes.blob();
  const cost = pollData.usage?.cost ?? clipDuration * 0.03;

  return { blob, cost };
}

export async function generateMusicVideo(
  apiKey: string,
  song: Omit<SavedSong, 'audioDataUrl'>,
  callbacks: VideoGenerationCallbacks,
  signal?: AbortSignal,
): Promise<GenerateMusicVideoResult> {
  const plan = planMusicVideoClips(song.duration);
  const startTime = Date.now();
  const estimatedTotal = estimateVideoGenerationTimeMs(plan.clipCount);
  let totalCost = 0;
  const clipBlobs: Blob[] = [];

  const update = (
    phase: GenerationProgress['phase'],
    progress: number,
    message: string,
  ) => {
    const elapsedMs = Date.now() - startTime;
    callbacks.onProgress({
      phase,
      progress: Math.min(99, progress),
      message,
      elapsedMs,
      estimatedRemainingMs: Math.max(0, estimatedTotal - elapsedMs),
      chunksReceived: clipBlobs.length,
      transcript: '',
    });
  };

  update('submitting', 5, `Planning ${plan.clipCount} clip${plan.clipCount > 1 ? 's' : ''}…`);

  for (let i = 0; i < plan.clipDurations.length; i++) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const clipDuration = plan.clipDurations[i];
    const clipProgressBase = 10 + (i / plan.clipCount) * 75;
    const prompt = buildMusicVideoPromptForClip(song, i, plan.clipCount);

    update(
      'generating',
      clipProgressBase,
      `Generating clip ${i + 1} of ${plan.clipCount} (${clipDuration}s)…`,
    );

    const { blob, cost } = await generateSingleClip(
      apiKey,
      prompt,
      clipDuration,
      (msg) => update('generating', clipProgressBase + 5, `Clip ${i + 1}/${plan.clipCount}: ${msg}`),
      signal,
    );

    clipBlobs.push(blob);
    totalCost += cost;
  }

  update('finalizing', 88, 'Stitching clips into full music video…');

  const videoBlob = await concatVideoClips(clipBlobs, (msg) => {
    update('finalizing', 92, msg);
  });

  callbacks.onProgress({
    phase: 'complete',
    progress: 100,
    message: 'Music video ready!',
    elapsedMs: Date.now() - startTime,
    estimatedRemainingMs: 0,
    chunksReceived: clipBlobs.length,
    transcript: '',
  });

  return {
    videoBlob,
    cost: totalCost,
    duration: plan.totalDuration,
    clipCount: plan.clipCount,
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
