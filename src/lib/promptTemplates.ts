import type { EnergyLevel, Tempo, VocalType } from '../types';

export const ORIGINAL_SONG_DIRECTIVE =
  'Create an original, family-friendly song. Do not imitate any real artist, celebrity, or copyrighted recording.';

export interface LyricsPromptInput {
  genre: string;
  vocals: VocalType;
  mood: string;
  tempo: Tempo;
  energy: EnergyLevel;
  theme?: string;
}

const VOCAL_INSTRUCTIONS: Record<VocalType, string> = {
  instrumental: 'This is an instrumental track — write no vocal lyrics. Instead, describe the emotional arc and section labels (e.g. Intro, Build, Drop, Outro) as short scene directions.',
  male: 'Write lyrics meant for a male vocalist. Use a natural, conversational male singing voice.',
  female: 'Write lyrics meant for a female vocalist. Use a natural, expressive female singing voice.',
  duet: 'Write lyrics for a duet between a male and female vocalist. Clearly label each line with [Male] or [Female].',
  choir: 'Write lyrics suited for a choir or group vocals. Include layered harmonies and call-and-response where appropriate.',
};

const GENRE_STYLE: Record<string, string> = {
  Pop: 'catchy hooks, memorable choruses, and radio-friendly phrasing',
  Rock: 'driving rhythms, powerful imagery, and anthemic choruses',
  'Hip Hop': 'clever wordplay, internal rhyme, and strong rhythmic flow',
  'R&B': 'smooth, soulful phrasing with emotional vulnerability',
  Electronic: 'atmospheric verses, build-ups, and euphoric drops',
  Jazz: 'sophisticated imagery, subtle rhyme, and improvisational feel',
  Classical: 'poetic, timeless language with dramatic arcs',
  Country: 'storytelling, vivid scenes, and heartfelt honesty',
  Folk: 'intimate storytelling, acoustic warmth, and natural imagery',
  Metal: 'intense imagery, dark themes, and powerful declarations',
  Indie: 'quirky, authentic voice with unconventional structure',
  'Lo-fi': 'hazy, nostalgic imagery with understated emotion',
  Ambient: 'minimal, evocative phrases that paint a soundscape',
  Reggae: 'laid-back groove, positive or conscious messaging',
  Latin: 'passionate, rhythmic phrasing with vivid cultural imagery',
  Blues: 'raw emotion, repetition for effect, and soulful lament',
  Soul: 'deep feeling, gospel-influenced power, and rich metaphors',
  Funk: 'playful, rhythmic lyrics with attitude and groove',
  Punk: 'short, punchy lines with rebellious energy',
  Synthwave: 'retro-futuristic nostalgia, neon imagery, and cinematic mood',
};

const TEMPO_HINT: Record<Tempo, string> = {
  slow: 'Keep the pacing slow and spacious — fewer words per line, longer held notes.',
  medium: 'Use a moderate pacing with balanced line lengths.',
  fast: 'Write snappy, rhythmic lines that fit a fast tempo.',
  variable: 'Vary pacing between sections — slower verses, faster choruses.',
};

const ENERGY_HINT: Record<EnergyLevel, string> = {
  low: 'Keep the emotional intensity subdued and intimate.',
  medium: 'Balance calm verses with a moderately energetic chorus.',
  high: 'Build toward an energetic, uplifting climax.',
  intense: 'Push emotional and dynamic intensity to the maximum throughout.',
};

export function buildLyricsRequestPrompt(input: LyricsPromptInput): string {
  const genreStyle = GENRE_STYLE[input.genre] ?? 'distinctive style fitting the genre';
  const vocalNote = VOCAL_INSTRUCTIONS[input.vocals];
  const tempoNote = TEMPO_HINT[input.tempo];
  const energyNote = ENERGY_HINT[input.energy];
  const themeLine = input.theme?.trim()
    ? `\nTheme or subject: ${input.theme.trim()}`
    : '';

  return `Write original song lyrics for a ${input.genre} track.

Mood: ${input.mood}
Style notes: ${genreStyle}
${vocalNote}
${tempoNote}
${energyNote}${themeLine}

Structure the song with clear sections labeled like [Verse 1], [Chorus], [Bridge], etc.
Keep lines singable and rhythmically natural for ${input.genre}.
Aim for 2–3 verses, a memorable chorus (repeat 2x), and optionally a bridge.
Do not include production notes — only lyrics and section labels.`;
}

export function buildSongSpecPrompt(lyrics: string, genre: string, duration: number): string {
  return `${ORIGINAL_SONG_DIRECTIVE} Use these original lyrics for a ${duration}-second ${genre} song:

${lyrics.trim()}

Match the mood and structure of the lyrics. Honor all section labels and vocal directions.`;
}
