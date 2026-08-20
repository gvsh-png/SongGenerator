import type { PromptFlowState, SongOptions } from '../types';
import { formatDuration } from './pricing';
import { buildSongSpecPrompt, ORIGINAL_SONG_DIRECTIVE } from './promptTemplates';

function vocalDirective(vocals: SongOptions['vocals']): string {
  switch (vocals) {
    case 'instrumental':
      return 'Instrumental only, no vocals.';
    case 'male':
      return 'Male lead vocals.';
    case 'female':
      return 'Female lead vocals.';
    case 'duet':
      return 'Male and female duet vocals.';
    case 'choir':
      return 'Choir or group vocals.';
    default:
      return 'Vocals as described.';
  }
}

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
  const parts: string[] = [ORIGINAL_SONG_DIRECTIVE];

  parts.push(
    `${options.genre} track, ${formatDuration(options.duration)}, ${options.mood} mood, ${options.tempo} tempo, ${options.energy} energy.`,
  );
  parts.push(vocalDirective(options.vocals));

  if (options.instruments.length > 0) {
    parts.push(`Instrumentation: ${options.instruments.join(', ')}.`);
  }

  if (options.key && options.key !== 'Any') {
    parts.push(`Key: ${options.key}.`);
  }

  if (options.era) {
    parts.push(`Era/style reference: ${options.era}.`);
  }

  if (options.structure && options.structure !== 'Auto') {
    parts.push(`Structure: ${options.structure}.`);
  }

  if (options.description.trim()) {
    parts.push(`Creative direction: ${options.description.trim()}`);
  }

  if (options.lyrics.trim()) {
    parts.push(`Perform these original lyrics:\n${options.lyrics.trim()}`);
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
