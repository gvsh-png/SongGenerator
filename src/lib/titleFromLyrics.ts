const STOP_WORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
  'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
  'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'my', 'your', 'our',
  'oh', 'yeah', 'na', 'la', 'da', 'do', 'don', 'dont', "don't", 'just',
  'so', 'if', 'when', 'all', 'no', 'not', 'this', 'that', 'as', 'up',
]);

function cleanLine(line: string): string {
  return line
    .replace(/\[.*?\]/g, '')
    .replace(/[^\w\s'-]/g, ' ')
    .trim();
}

function capitalizeWord(word: string): string {
  if (!word) return '';
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

function extractChorusLine(lyrics: string): string | null {
  const sections = lyrics.split(/\n\s*\n/);
  for (const section of sections) {
    const header = section.split('\n')[0]?.trim() ?? '';
    if (/chorus/i.test(header)) {
      const lines = section
        .split('\n')
        .slice(1)
        .map(cleanLine)
        .filter((l) => l.length > 2);
      if (lines.length > 0) return lines[0];
    }
  }
  return null;
}

function extractFirstMeaningfulLine(lyrics: string): string | null {
  const lines = lyrics
    .split('\n')
    .map(cleanLine)
    .filter((l) => l.length > 3 && !/^(verse|chorus|bridge|intro|outro|hook)/i.test(l));
  return lines[0] ?? null;
}

function wordsFromLine(line: string, count: number): string {
  const words = line
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w.toLowerCase()));
  return words.slice(0, count).map(capitalizeWord).join(' ');
}

function hashPick<T>(items: T[], seed: string): T {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return items[hash % items.length];
}

export function suggestTitleFromLyrics(lyrics: string, genre: string): string {
  const trimmed = lyrics.trim();
  if (!trimmed) return `${genre} Track`;

  const chorusLine = extractChorusLine(trimmed);
  const firstLine = extractFirstMeaningfulLine(trimmed);
  const source = chorusLine ?? firstLine ?? trimmed;

  const strategies = [
    () => wordsFromLine(source, 3),
    () => wordsFromLine(source, 2),
    () => {
      const words = source.split(/\s+/).filter((w) => w.length > 3);
      const pick = hashPick(words, trimmed);
      return capitalizeWord(pick);
    },
    () => {
      const line = (chorusLine ?? firstLine ?? '').slice(0, 40).trim();
      const cut = line.lastIndexOf(' ', 28);
      return cut > 8 ? line.slice(0, cut) : line;
    },
  ];

  for (const strategy of strategies) {
    const title = strategy().trim();
    if (title.length >= 3 && title.length <= 48) {
      return title;
    }
  }

  return `${genre} ${hashPick(['Dreams', 'Echoes', 'Waves', 'Lights', 'Fire', 'Sky'], trimmed)}`;
}
