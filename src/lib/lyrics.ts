import type { SavedSong } from '../types';

export interface LyricCue {
  start: number;
  end: number;
  text: string;
}

function pad2(n: number): string {
  return n.toString().padStart(2, '0');
}

function pad3(n: number): string {
  return n.toString().padStart(3, '0');
}

export function formatSrtTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${pad2(h)}:${pad2(m)}:${pad2(s)},${pad3(ms)}`;
}

/** Pull lyrics from saved song metadata (options, transcript, or prompt). */
export function extractLyrics(song: Omit<SavedSong, 'audioDataUrl'>): string {
  if (song.options.lyrics?.trim()) {
    return song.options.lyrics.trim();
  }
  if (song.transcript?.trim()) {
    return song.transcript.trim();
  }
  const match = song.prompt.match(/Lyrics to include:\n([\s\S]+?)(?:\nSong title:|$)/i);
  if (match?.[1]?.trim()) {
    return match[1].trim();
  }
  return '';
}

function splitDisplayLines(lyrics: string): string[] {
  const raw = lyrics.split('\n');
  const lines: string[] = [];

  for (const line of raw) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const sectionMatch = trimmed.match(/^\[(.+)\]$/);
    if (sectionMatch) {
      lines.push(sectionMatch[1].toUpperCase());
      continue;
    }

    if (trimmed.length <= 48) {
      lines.push(trimmed);
      continue;
    }

    const words = trimmed.split(/\s+/);
    let chunk = '';
    for (const word of words) {
      const next = chunk ? `${chunk} ${word}` : word;
      if (next.length > 48 && chunk) {
        lines.push(chunk);
        chunk = word;
      } else {
        chunk = next;
      }
    }
    if (chunk) lines.push(chunk);
  }

  return lines;
}

/** Evenly distribute lyric lines across the video duration. */
export function buildLyricCues(
  lyrics: string,
  totalDurationSec: number,
  fallbackTitle?: string,
): LyricCue[] {
  const lines = splitDisplayLines(lyrics);

  if (lines.length === 0 && fallbackTitle) {
    return [{ start: 0, end: Math.min(4, totalDurationSec), text: fallbackTitle }];
  }

  if (lines.length === 0) {
    return [];
  }

  const slot = totalDurationSec / lines.length;
  return lines.map((text, i) => ({
    start: i * slot,
    end: Math.min(totalDurationSec, (i + 1) * slot),
    text,
  }));
}

export function buildSrtContent(cues: LyricCue[]): string {
  return cues
    .map((cue, i) => {
      const text = cue.text.replace(/\r/g, '').trim();
      if (!text) return '';
      return [
        i + 1,
        `${formatSrtTime(cue.start)} --> ${formatSrtTime(cue.end)}`,
        text,
        '',
      ].join('\n');
    })
    .filter(Boolean)
    .join('\n');
}

export function getLyricsForSong(song: Omit<SavedSong, 'audioDataUrl'>): {
  text: string;
  hasLyrics: boolean;
  isInstrumental: boolean;
} {
  const extracted = extractLyrics(song);
  const isInstrumental = song.options.vocals === 'instrumental';

  if (extracted) {
    return { text: extracted, hasLyrics: true, isInstrumental };
  }

  if (isInstrumental) {
    return {
      text: song.title || 'Instrumental',
      hasLyrics: false,
      isInstrumental: true,
    };
  }

  return {
    text: song.title || song.options.description.slice(0, 80),
    hasLyrics: false,
    isInstrumental: false,
  };
}
