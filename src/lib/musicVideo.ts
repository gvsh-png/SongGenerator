import type { SavedSong, VideoModelId } from '../types';

export const VIDEO_MODEL = 'google/veo-3.1-lite' as const satisfies VideoModelId;

/** Cheapest Veo 3.1 Lite rate: 720p video-only */
export const VIDEO_PRICE_PER_SECOND = 0.03;

/** Veo 3.1 Lite supports 4–8 second clips */
export const MUSIC_VIDEO_DURATION = 8;

export const VIDEO_PRICING = {
  model: VIDEO_MODEL,
  label: 'Veo 3.1 Lite',
  perSecond: VIDEO_PRICE_PER_SECOND,
  duration: MUSIC_VIDEO_DURATION,
  resolution: '720p',
} as const;

export function estimateMusicVideoCost(
  duration: number = MUSIC_VIDEO_DURATION,
): number {
  return duration * VIDEO_PRICE_PER_SECOND;
}

export function buildMusicVideoPrompt(song: SavedSong | Omit<SavedSong, 'audioDataUrl'>): string {
  const { options, title, prompt, transcript } = song;
  const mood = options.mood;
  const genre = options.genre;
  const energy = options.energy;

  const context = transcript?.slice(0, 120) || prompt.slice(0, 160);

  return [
    `Cinematic music video visuals for a ${genre} song titled "${title}".`,
    `Mood: ${mood}. Energy: ${energy}.`,
    `Visual style: dynamic performance shots, atmospheric lighting, abstract motion synced to music.`,
    `Scene inspiration: ${context}`,
    `High-quality 720p music video aesthetic, no text overlays, no subtitles.`,
  ].join(' ');
}

export function estimateVideoGenerationTimeMs(): number {
  return 90000;
}
