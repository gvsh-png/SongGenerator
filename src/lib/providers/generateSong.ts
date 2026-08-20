import type { ModelId } from '../../types';
import { isLocalMode } from '../config';
import { generateSong as generateSongCloud } from '../openrouter';
import { getApiKey } from '../storage';
import { generateSongLocal } from './localGenerate';
import type { GenerateResult } from '../openrouter';
import type { SongGenerationCallbacks } from './types';

export async function generateSong(
  prompt: string,
  model: ModelId,
  duration: number,
  callbacks: SongGenerationCallbacks,
  signal?: AbortSignal,
): Promise<GenerateResult> {
  if (isLocalMode()) {
    return generateSongLocal(prompt, model, duration, callbacks, signal);
  }

  const apiKey = getApiKey();
  if (!apiKey) throw new Error('OpenRouter API key is not configured.');

  return generateSongCloud(apiKey, prompt, model, duration, callbacks, signal);
}
