import type { GenerationProgress, ModelId } from '../../types';
import type { GenerateResult } from '../openrouter';

export interface SongGenerationCallbacks {
  onProgress: (progress: GenerationProgress) => void;
}

export type GenerateSongFn = (
  prompt: string,
  model: ModelId,
  duration: number,
  callbacks: SongGenerationCallbacks,
  signal?: AbortSignal,
) => Promise<GenerateResult>;
