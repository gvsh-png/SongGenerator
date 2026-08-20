import type { SavedSong } from '../types';

export const VIDEO_MODEL = 'google/veo-3.1-lite' as const;

/** Cheapest Veo 3.1 Lite rate: 720p video-only */
export const VIDEO_PRICE_PER_SECOND = 0.03;

/** Veo 3.1 Lite clip bounds */
export const CLIP_MIN_SECONDS = 4;
export const CLIP_MAX_SECONDS = 8;

export const MAX_MUSIC_VIDEO_SECONDS = 120;

export const VIDEO_PRICING = {
  model: VIDEO_MODEL,
  label: 'Veo 3.1 Lite',
  perSecond: VIDEO_PRICE_PER_SECOND,
  resolution: '720p',
} as const;

export interface MusicVideoPlan {
  clipDurations: number[];
  clipCount: number;
  totalDuration: number;
  estimatedCost: number;
}

/** Build clip durations that sum to the song length (4–8s per Veo Lite clip, max 2 min). */
export function planMusicVideoClips(songDurationSec: number): MusicVideoPlan {
  const target = Math.min(Math.max(songDurationSec, CLIP_MIN_SECONDS), MAX_MUSIC_VIDEO_SECONDS);
  const clipDurations: number[] = [];
  let remaining = target;

  while (remaining > 0) {
    if (remaining >= CLIP_MAX_SECONDS) {
      clipDurations.push(CLIP_MAX_SECONDS);
      remaining -= CLIP_MAX_SECONDS;
    } else if (remaining >= CLIP_MIN_SECONDS) {
      clipDurations.push(remaining);
      remaining = 0;
    } else {
      clipDurations.push(CLIP_MIN_SECONDS);
      remaining = 0;
    }
  }

  const totalDuration = clipDurations.reduce((a, b) => a + b, 0);

  return {
    clipDurations,
    clipCount: clipDurations.length,
    totalDuration,
    estimatedCost: totalDuration * VIDEO_PRICE_PER_SECOND,
  };
}

export function estimateMusicVideoCost(songDurationSec: number): number {
  return planMusicVideoClips(songDurationSec).estimatedCost;
}

export function buildMusicVideoPrompt(
  song: SavedSong | Omit<SavedSong, 'audioDataUrl'>,
): string {
  const { options, title, prompt, transcript } = song;
  const context = transcript?.slice(0, 120) || prompt.slice(0, 160);

  return [
    `Cinematic music video visuals for a ${options.genre} song titled "${title}".`,
    `Mood: ${options.mood}. Energy: ${options.energy}.`,
    `Visual style: dynamic performance shots, atmospheric lighting, abstract motion synced to music.`,
    `Scene inspiration: ${context}`,
    `High-quality 720p music video aesthetic, no text overlays, no subtitles.`,
  ].join(' ');
}

export function buildMusicVideoPromptForClip(
  song: SavedSong | Omit<SavedSong, 'audioDataUrl'>,
  clipIndex: number,
  totalClips: number,
): string {
  const base = buildMusicVideoPrompt(song);
  let phase: string;

  if (totalClips === 1) {
    phase = 'Full music video sequence.';
  } else if (clipIndex === 0) {
    phase = 'Opening scene — establish mood and setting.';
  } else if (clipIndex === totalClips - 1) {
    phase = 'Finale — peak energy, dramatic closing visuals.';
  } else {
    phase = `Middle section ${clipIndex + 1} — evolving visuals, maintain visual continuity with prior scenes.`;
  }

  return `${base} ${phase} (Part ${clipIndex + 1} of ${totalClips})`;
}

export function estimateVideoGenerationTimeMs(clipCount: number): number {
  return clipCount * 90000 + 60000;
}
