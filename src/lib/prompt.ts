import type { PromptFlowState, SongOptions } from '../types';
import { formatDuration } from './pricing';
import { buildSongSpecPrompt } from './promptTemplates';

export function buildPromptFromFlow(flow: PromptFlowState): string {
  const title = flow.customTitle.trim() || flow.suggestedTitle;
  const parts: string[] = [
    buildSongSpecPrompt(flow.pastedLyrics, flow.genre, flow.duration),
    `Mood: ${flow.mood}.`,
    `Tempo: ${flow.tempo}.`,
    `Energy: ${flow.energy}.`,
    flow.vocals === 'instrumental'
      ? 'Instrumental only, no vocals.'
      : `Vocals: ${flow.vocals}.`,
  ];
  if (title) parts.push(`Song title: "${title}".`);
  return parts.join(' ');
}

export function flowToSongOptions(flow: PromptFlowState): SongOptions {
  const title = flow.customTitle.trim() || flow.suggestedTitle;
  return {
    title,
    description: `Song created from lyrics workflow (${flow.genre}, ${flow.mood})`,
    duration: flow.duration,
    genre: flow.genre,
    mood: flow.mood,
    tempo: flow.tempo,
    energy: flow.energy,
    vocals: flow.vocals,
    instruments: [],
    key: 'Any',
    era: 'Modern',
    structure: 'Auto',
    lyrics: flow.pastedLyrics,
    model: flow.duration <= 30
      ? 'google/lyria-3-clip-preview'
      : 'google/lyria-3-pro-preview',
  };
}

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

export function defaultLyricsSongOptions(): SongOptions {
  return {
    title: '',
    description: '',
    duration: 60,
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
