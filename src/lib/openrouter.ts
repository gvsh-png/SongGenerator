import type { GenerationProgress, ModelId } from '../types';
import { estimateGenerationTimeMs } from './pricing';

export interface GenerateResult {
  audioDataUrl: string;
  transcript: string;
}

export interface GenerateCallbacks {
  onProgress: (progress: GenerationProgress) => void;
}

const OPENROUTER_CHAT_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface ParsedAudio {
  audioChunks: string[];
  audioUrls: string[];
  transcriptParts: string[];
  streamErrors: string[];
}

function isLyriaModel(model: ModelId): boolean {
  return model.includes('lyria');
}

function apiHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer':
      typeof window !== 'undefined' ? window.location.origin : 'https://lyria-song-creator.app',
    'X-Title': 'Lyria Song Creator',
  };
}

function buildRequestBody(model: ModelId, prompt: string, stream: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    messages: [{ role: 'user', content: prompt }],
    stream,
    modalities: ['text', 'audio'],
    audio: { format: 'mp3' },
  };

  return body;
}

function emptyParsedAudio(): ParsedAudio {
  return {
    audioChunks: [],
    audioUrls: [],
    transcriptParts: [],
    streamErrors: [],
  };
}

function pushError(parsed: ParsedAudio, error: unknown): void {
  if (!error) return;
  if (typeof error === 'string') {
    parsed.streamErrors.push(error);
    return;
  }
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === 'string' && message.trim()) {
      parsed.streamErrors.push(message);
    }
  }
}

function extractFromContentValue(content: unknown, parsed: ParsedAudio): void {
  if (typeof content === 'string') {
    if (content.trim()) parsed.transcriptParts.push(content);
    return;
  }

  if (!Array.isArray(content)) return;

  for (const part of content) {
    if (!part || typeof part !== 'object') continue;
    const item = part as Record<string, unknown>;
    const type = item.type;

    if (type === 'text' && typeof item.text === 'string') {
      parsed.transcriptParts.push(item.text);
    }

    const inline = item.inline_data ?? item.inlineData;
    if (inline && typeof inline === 'object') {
      const data = (inline as Record<string, unknown>).data;
      if (typeof data === 'string' && data.length > 0) {
        parsed.audioChunks.push(data);
      }
    }
  }
}

function extractFromMessagePart(part: Record<string, unknown>, parsed: ParsedAudio): void {
  const audio = part.audio;
  if (audio && typeof audio === 'object') {
    const audioObj = audio as Record<string, unknown>;
    if (typeof audioObj.data === 'string' && audioObj.data.length > 0) {
      parsed.audioChunks.push(audioObj.data);
    }
    if (typeof audioObj.url === 'string' && audioObj.url.length > 0) {
      parsed.audioUrls.push(audioObj.url);
    }
    if (typeof audioObj.transcript === 'string') {
      parsed.transcriptParts.push(audioObj.transcript);
    }
  }

  extractFromContentValue(part.content, parsed);
}

function extractFromChunk(chunk: unknown, parsed: ParsedAudio): void {
  if (!chunk || typeof chunk !== 'object') return;

  const obj = chunk as Record<string, unknown>;
  pushError(parsed, obj.error);

  const choices = obj.choices;
  if (!Array.isArray(choices) || choices.length === 0) return;

  for (const choice of choices) {
    if (!choice || typeof choice !== 'object') continue;
    const choiceObj = choice as Record<string, unknown>;
    pushError(parsed, choiceObj.error);

    if (choiceObj.delta && typeof choiceObj.delta === 'object') {
      extractFromMessagePart(choiceObj.delta as Record<string, unknown>, parsed);
    }
    if (choiceObj.message && typeof choiceObj.message === 'object') {
      extractFromMessagePart(choiceObj.message as Record<string, unknown>, parsed);
    }
  }
}

function mergeParsedAudio(target: ParsedAudio, source: ParsedAudio): void {
  target.audioChunks.push(...source.audioChunks);
  target.audioUrls.push(...source.audioUrls);
  target.transcriptParts.push(...source.transcriptParts);
  target.streamErrors.push(...source.streamErrors);
}

function mimeFromBytes(bytes: Uint8Array): string {
  if (bytes.length >= 3 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return 'audio/mpeg';
  }
  if (bytes.length >= 2 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0) {
    return 'audio/mpeg';
  }
  if (
    bytes.length >= 4 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46
  ) {
    return 'audio/wav';
  }
  return 'audio/mpeg';
}

function decodeBase64Chunk(chunk: string): Uint8Array {
  const binary = atob(chunk);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function concatAudioBytes(chunks: string[]): Uint8Array {
  if (chunks.length === 0) return new Uint8Array(0);
  if (chunks.length === 1) return decodeBase64Chunk(chunks[0]);

  const parts = chunks.map(decodeBase64Chunk);
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    merged.set(part, offset);
    offset += part.length;
  }
  return merged;
}

function bytesToDataUrl(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:${mimeFromBytes(bytes)};base64,${btoa(binary)}`;
}

async function resolveAudioData(
  parsed: ParsedAudio,
  apiKey: string,
  signal?: AbortSignal,
): Promise<Uint8Array> {
  const inline = concatAudioBytes(parsed.audioChunks);
  if (inline.length > 0) return inline;

  for (const url of parsed.audioUrls) {
    const response = await fetch(url, {
      headers: url.includes('openrouter.ai') ? { Authorization: `Bearer ${apiKey}` } : undefined,
      signal,
    });
    if (!response.ok) {
      throw new Error(`Failed to download audio (${response.status})`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }

  return new Uint8Array(0);
}

function buildNoAudioError(parsed: ParsedAudio, model: ModelId): Error {
  if (parsed.streamErrors.length > 0) {
    return new Error(parsed.streamErrors[parsed.streamErrors.length - 1]);
  }

  const text = parsed.transcriptParts.join('').trim();
  if (text) {
    const preview = text.length > 180 ? `${text.slice(0, 180)}…` : text;
    return new Error(
      `The model returned text but no audio: "${preview}". Try again or use a shorter prompt.`,
    );
  }

  if (isLyriaModel(model)) {
    return new Error(
      'No audio received from Lyria. Confirm your OpenRouter account has credits, Lyria 3 is enabled, and try a simpler prompt.',
    );
  }

  return new Error(
    'No audio received. Check your API key has credits and the model is available.',
  );
}

async function parseApiError(response: Response): Promise<string> {
  const errText = await response.text();
  let message = `API error (${response.status})`;
  try {
    const errJson = JSON.parse(errText);
    message = errJson.error?.message || errJson.message || message;
  } catch {
    if (errText) message = errText.slice(0, 300);
  }
  return message;
}

async function generateSongStreaming(
  apiKey: string,
  model: ModelId,
  prompt: string,
  signal: AbortSignal | undefined,
  onStreamProgress: (parsed: ParsedAudio) => void,
): Promise<ParsedAudio> {
  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: apiHeaders(apiKey),
    body: JSON.stringify(buildRequestBody(model, prompt, true)),
    signal,
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No response stream available');

  const parsed = emptyParsedAudio();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/u);
    buffer = lines.pop() ?? '';

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('data:')) continue;
      const data = trimmed.slice(5).trim();
      if (data === '[DONE]') continue;

      try {
        extractFromChunk(JSON.parse(data), parsed);
        onStreamProgress(parsed);
      } catch {
        // skip malformed SSE lines
      }
    }
  }

  return parsed;
}

async function generateSongNonStreaming(
  apiKey: string,
  model: ModelId,
  prompt: string,
  signal?: AbortSignal,
): Promise<ParsedAudio> {
  const response = await fetch(OPENROUTER_CHAT_URL, {
    method: 'POST',
    headers: apiHeaders(apiKey),
    body: JSON.stringify(buildRequestBody(model, prompt, false)),
    signal,
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const parsed = emptyParsedAudio();
  extractFromChunk(await response.json(), parsed);
  return parsed;
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

  updateProgress('preparing', 5, 'Building your song prompt…');
  await delay(400);

  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  updateProgress('connecting', 12, 'Connecting to OpenRouter…');
  await delay(300);

  updateProgress('generating', 18, 'Starting music generation…');

  let parsed = await generateSongStreaming(apiKey, model, prompt, signal, (streamParsed) => {
    const chunksReceived = streamParsed.audioChunks.length;
    const transcript = streamParsed.transcriptParts.join('');
    const elapsed = Date.now() - startTime;
    const timeProgress = Math.min(85, 18 + (elapsed / estimatedTotal) * 67);
    const chunkProgress = Math.min(85, 18 + chunksReceived * 3);
    updateProgress(
      'generating',
      Math.max(timeProgress, chunkProgress),
      chunksReceived > 0
        ? `Generating audio… (${chunksReceived} chunks received)`
        : transcript
          ? 'Generating lyrics…'
          : 'Waiting for first audio chunk…',
      { chunksReceived, transcript },
    );
  });

  let audioBytes = await resolveAudioData(parsed, apiKey, signal);

  if (audioBytes.length === 0 && isLyriaModel(model)) {
    updateProgress('generating', 86, 'Retrying without streaming…');
    const fallback = await generateSongNonStreaming(apiKey, model, prompt, signal);
    mergeParsedAudio(parsed, fallback);
    audioBytes = await resolveAudioData(parsed, apiKey, signal);
  }

  updateProgress('finalizing', 92, 'Assembling your song…');
  await delay(300);

  const transcript = parsed.transcriptParts.join('').trim();

  if (audioBytes.length === 0) {
    throw buildNoAudioError(parsed, model);
  }

  const audioDataUrl = bytesToDataUrl(audioBytes);
  const chunksReceived = parsed.audioChunks.length || 1;

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
