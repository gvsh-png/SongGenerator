import type { SongOptions } from '../types';
import { formatDuration } from './pricing';

export function buildPrompt(options: SongOptions): string {
  const parts: string[] = [];

  parts.push(`Create a ${formatDuration(options.duration)} song.`);

  if (options.genre) parts.push(`Genre: ${options.genre}.`);
  if (options.mood) parts.push(`Mood: ${options.mood}.`);
  parts.push(`Tempo: ${options.tempo}.`);
  parts.push(`Energy: ${options.energy}.`);

  if (options.vocals === 'instrumental') {
    parts.push('Instrumental only, no vocals.');
  } else {
    parts.push(`Vocals: ${options.vocals}.`);
  }

  if (options.instruments.length > 0) {
    parts.push(`Featured instruments: ${options.instruments.join(', ')}.`);
  }

  if (options.key && options.key !== 'Any') {
    parts.push(`Key: ${options.key}.`);
  }

  if (options.era) parts.push(`Era/style reference: ${options.era}.`);

  if (options.structure && options.structure !== 'Auto') {
    parts.push(`Song structure: ${options.structure}.`);
  }

  if (options.description.trim()) {
    parts.push(`Creative direction: ${options.description.trim()}`);
  }

  if (options.lyrics.trim()) {
    parts.push(`Lyrics to include:\n${options.lyrics.trim()}`);
  }

  if (options.title.trim()) {
    parts.push(`Song title: "${options.title.trim()}".`);
  }

  return parts.join(' ');
}

export function defaultSongOptions(): SongOptions {
  return {
    title: '',
    description: '',
    duration: 30,
    genre: 'Pop',
    mood: 'Uplifting',
    tempo: 'medium',
    energy: 'medium',
    vocals: 'female',
    instruments: [],
    key: 'Any',
    era: 'Modern',
    structure: 'Auto',
    lyrics: '',
    model: 'google/lyria-3-clip-preview',
  };
}
