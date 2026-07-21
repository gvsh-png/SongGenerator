import type { EnergyLevel, Tempo, VocalType } from '../types';
import { ERAS, GENRES, INSTRUMENTS, KEYS, MOODS, STRUCTURES } from '../types';

export { ERAS, GENRES, INSTRUMENTS, KEYS, MOODS, STRUCTURES };

export const TEMPO_OPTIONS: { value: Tempo; label: string }[] = [
  { value: 'slow', label: 'Slow' },
  { value: 'medium', label: 'Medium' },
  { value: 'fast', label: 'Fast' },
  { value: 'variable', label: 'Variable' },
];

export const ENERGY_LEVELS: { value: EnergyLevel; label: string }[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'intense', label: 'Intense' },
];

export const VOCAL_TYPES: { value: VocalType; label: string }[] = [
  { value: 'instrumental', label: 'Instrumental' },
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'duet', label: 'Duet' },
  { value: 'choir', label: 'Choir' },
];
