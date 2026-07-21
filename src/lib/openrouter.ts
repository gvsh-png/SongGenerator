import type { GenerationProgress, ModelId } from '../types';
import { estimateGenerationTimeMs } from './pricing';

export interface GenerateResult {
  audioDataUrl: string;
  transcript: string;
}

export interface GenerateCallbacks {
  onProgress: (progress: GenerationProgress) => void;
}

function base64ToDataUrl(base64: string, format: string): string {
  const mime = format === 'mp3' ? 'audio/mpeg' : 'audio/wav';
  return `data:${mime};base64,${base64}`;
}

export async function generateSong(
  apiKey: string,
  prompt: string,
  model: ModelId,
  duration: number,
  callbacks: GenerateCallbacks,
  signal?: AbortSignal,
): Promise<GenerateResult> {
  const startTime = Date.now();
  const estimatedTotal = estimateGenerationTimeMs(model, duration);

  const updateProgress = (
    phase: GenerationProgress['phase'],
    progress: number,
    message: string,
    extra: Partial<GenerationProgress> = {},
  ) => {
    const elapsedMs = Date.now() - startTime;
    const estimatedRemainingMs = Math.max(0, estimatedTotal - elapsedMs);
    callbacks.onProgress({
      phase,
      progress: Math.min(99, progress),
      message,
      elapsedMs,
      estimatedRemainingMs,
      chunksReceived: extra.chunksReceived ?? 0,
      transcript: extra.transcript ?? '',
    });
  };

  updateProgress('preparing', 5, 'Building your song prompt…');
  await delay(400);

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  updateProgress('connecting', 12, 'Connecting to OpenRouter…');
  await delay(300);

  updateProgress('generating', 18, 'Starting music generation…');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'https://lyria-song-creator.app',
      'X-Title': 'Lyria Song Creator',
    },
    body: JSON.stringify({
      model,
      messages: [{ role: 'user', content: prompt }],
      modalities: ['text', 'audio'],
      audio: { format: 'mp3' },
      stream: true,
    }),
    signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    let message = `API error (${response.status})`;
    try {
      const errJson = JSON.parse(errText);
      message = errJson.error?.message || errJson.message || message;
    } catch {
      if (errText) message = errText.slice(0, 200);
    }
    throw new Error(message);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream available');

  const decoder = new TextDecoder();
  const audioDataChunks: string[] = [];
  const transcriptChunks: string[] = [];
  let buffer = '';
  let chunksReceived = 0;
  let lastProgressUpdate = Date.now();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;

      try {
        const chunk = JSON.parse(data);
        const delta = chunk.choices?.[0]?.delta;

        if (delta?.content) {
          transcriptChunks.push(delta.content);
        }

        const audio = delta?.audio;
        if (audio?.data) {
          audioDataChunks.push(audio.data);
          chunksReceived++;
        }
        if (audio?.transcript) {
          transcriptChunks.push(audio.transcript);
        }

        const now = Date.now();
        if (now - lastProgressUpdate > 200) {
          lastProgressUpdate = now;
          const elapsed = now - startTime;
          const timeProgress = Math.min(85, 18 + (elapsed / estimatedTotal) * 67);
          const chunkProgress = Math.min(85, 18 + chunksReceived * 3);
          const progress = Math.max(timeProgress, chunkProgress);
          const transcript = transcriptChunks.join('');

          updateProgress(
            'generating',
            progress,
            chunksReceived > 0
              ? `Generating audio… (${chunksReceived} chunks received)`
              : 'Waiting for first audio chunk…',
            { chunksReceived, transcript },
          );
        }
      } catch {
        // skip malformed SSE lines
      }
    }
  }

  updateProgress('finalizing', 92, 'Assembling your song…');
  await delay(300);

  const fullAudioB64 = audioDataChunks.join('');
  const transcript = transcriptChunks.join('').trim();

  if (!fullAudioB64) {
    throw new Error(
      'No audio received. Check your API key has credits and the model is available.',
    );
  }

  const audioDataUrl = base64ToDataUrl(fullAudioB64, 'mp3');

  callbacks.onProgress({
    phase: 'complete',
    progress: 100,
    message: 'Song ready!',
    elapsedMs: Date.now() - startTime,
    estimatedRemainingMs: 0,
    chunksReceived,
    transcript,
  });

  return { audioDataUrl, transcript };
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
