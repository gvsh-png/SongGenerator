import type { ModelId } from '../types';

export const MODEL_PRICING: Record<ModelId, { perSong: number; label: string; maxDuration: number }> = {
  'google/lyria-3-clip-preview': {
    perSong: 0.04,
    label: 'Lyria 3 Clip',
    maxDuration: 30,
  },
  'google/lyria-3-pro-preview': {
    perSong: 0.08,
    label: 'Lyria 3 Pro',
    maxDuration: 120,
  },
};

export function selectCheapestModel(duration: number): ModelId {
  if (duration <= 30) {
    return 'google/lyria-3-clip-preview';
  }
  return 'google/lyria-3-pro-preview';
}

export function estimateCost(model: ModelId): number {
  return MODEL_PRICING[model].perSong;
}

export function estimateGenerationTimeMs(model: ModelId, duration: number): number {
  const baseLatency = model === 'google/lyria-3-clip-preview' ? 15000 : 40000;
  const durationFactor = duration / (model === 'google/lyria-3-clip-preview' ? 30 : 90);
  return Math.round(baseLatency * Math.max(0.6, durationFactor));
}

export function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
}

export function formatTimeRemaining(ms: number): string {
  if (ms <= 0) return 'Almost done…';
  const seconds = Math.ceil(ms / 1000);
  if (seconds < 60) return `~${seconds}s left`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `~${m}m ${s}s left`;
}
