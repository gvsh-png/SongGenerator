export type ModelId =
  | 'google/lyria-3-clip-preview'
  | 'google/lyria-3-pro-preview'
  | 'local-default';

export type VocalType = 'instrumental' | 'male' | 'female' | 'duet' | 'choir';
export type EnergyLevel = 'low' | 'medium' | 'high' | 'intense';
export type Tempo = 'slow' | 'medium' | 'fast' | 'variable';

export type AppView = 'home' | 'create' | 'library' | 'prompt-flow' | 'write-lyrics';

export type PromptFlowStep = 'configure' | 'copy-prompt' | 'paste-lyrics' | 'confirm';

export interface SongOptions {
  title: string;
  description: string;
  duration: number;
  genre: string;
  mood: string;
  tempo: Tempo;
  energy: EnergyLevel;
  vocals: VocalType;
  instruments: string[];
  key: string;
  era: string;
  structure: string;
  lyrics: string;
  seed?: number;
  model: ModelId;
}

export interface PromptFlowState {
  step: PromptFlowStep;
  genre: string;
  vocals: VocalType;
  mood: string;
  tempo: Tempo;
  energy: EnergyLevel;
  theme: string;
  generatedPrompt: string;
  pastedLyrics: string;
  duration: number;
  suggestedTitle: string;
  customTitle: string;
}

export type VideoModelId = 'google/veo-3.1-lite';

export interface MusicVideoMeta {
  duration: number;
  cost: number;
  createdAt: number;
  resolution: string;
  model: VideoModelId;
  clipCount: number;
  hasLyrics?: boolean;
}

export interface SavedSong {
  id: string;
  title: string;
  prompt: string;
  options: SongOptions;
  audioDataUrl: string;
  transcript: string;
  model: ModelId;
  cost: number;
  duration: number;
  createdAt: number;
  musicVideo?: MusicVideoMeta;
}

export type GenerationPhase =
  | 'idle'
  | 'preparing'
  | 'connecting'
  | 'generating'
  | 'finalizing'
  | 'complete'
  | 'error'
  | 'submitting'
  | 'polling'
  | 'downloading';

export interface GenerationProgress {
  phase: GenerationPhase;
  progress: number;
  message: string;
  elapsedMs: number;
  estimatedRemainingMs: number;
  chunksReceived: number;
  transcript: string;
}

export const GENRES = [
  'Pop', 'Rock', 'Hip Hop', 'R&B', 'Electronic', 'Jazz', 'Classical',
  'Country', 'Folk', 'Metal', 'Indie', 'Lo-fi', 'Ambient', 'Reggae',
  'Latin', 'Blues', 'Soul', 'Funk', 'Punk', 'Synthwave',
] as const;

export const MOODS = [
  'Happy', 'Sad', 'Energetic', 'Calm', 'Dark', 'Uplifting', 'Melancholic',
  'Dreamy', 'Aggressive', 'Romantic', 'Nostalgic', 'Epic', 'Playful',
  'Mysterious', 'Hopeful', 'Chill',
] as const;

export const INSTRUMENTS = [
  'Piano', 'Guitar', 'Drums', 'Bass', 'Synth', 'Strings', 'Brass',
  'Saxophone', 'Violin', 'Cello', 'Flute', 'Organ', 'Ukulele', 'Banjo',
  '808 Bass', 'Pads', 'Choir', 'Percussion',
] as const;

export const KEYS = [
  'Any', 'C Major', 'G Major', 'D Major', 'A Major', 'E Major',
  'F Major', 'Bb Major', 'A Minor', 'E Minor', 'D Minor', 'B Minor',
] as const;

export const ERAS = [
  'Modern', '2020s', '2010s', '2000s', '90s', '80s', '70s', '60s', 'Vintage',
] as const;

export const STRUCTURES = [
  'Auto', 'Verse-Chorus', 'Verse-Chorus-Bridge', 'AABA', 'Through-composed',
  'Loop-based', 'Build-up',
] as const;

export function defaultPromptFlowState(): PromptFlowState {
  return {
    step: 'configure',
    genre: 'Pop',
    vocals: 'female',
    mood: 'Uplifting',
    tempo: 'medium',
    energy: 'medium',
    theme: '',
    generatedPrompt: '',
    pastedLyrics: '',
    duration: 60,
    suggestedTitle: '',
    customTitle: '',
  };
}
