import type { SavedSong } from '../types';

const API_KEY_STORAGE = 'lyria_api_key';
const SONGS_STORAGE = 'lyria_songs';
const DB_NAME = 'lyria-songs-db';
const DB_VERSION = 1;
const AUDIO_STORE = 'audio';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE);
      }
    };
  });
}

export function getApiKey(): string | null {
  return localStorage.getItem(API_KEY_STORAGE);
}

export function setApiKey(key: string): void {
  localStorage.setItem(API_KEY_STORAGE, key);
}

export function clearApiKey(): void {
  localStorage.removeItem(API_KEY_STORAGE);
}

export function getSongsMetadata(): Omit<SavedSong, 'audioDataUrl'>[] {
  try {
    const raw = localStorage.getItem(SONGS_STORAGE);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveSongsMetadata(songs: Omit<SavedSong, 'audioDataUrl'>[]): void {
  localStorage.setItem(SONGS_STORAGE, JSON.stringify(songs));
}

export async function saveSong(song: SavedSong): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    tx.objectStore(AUDIO_STORE).put(song.audioDataUrl, song.id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  const { audioDataUrl: _audio, ...meta } = song;
  const existing = getSongsMetadata().filter((s) => s.id !== song.id);
  saveSongsMetadata([meta, ...existing]);
}

export async function getSongAudio(id: string): Promise<string | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE, 'readonly');
    const request = tx.objectStore(AUDIO_STORE).get(id);
    request.onsuccess = () => resolve((request.result as string) ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function loadSong(id: string): Promise<SavedSong | null> {
  const meta = getSongsMetadata().find((s) => s.id === id);
  if (!meta) return null;
  const audioDataUrl = await getSongAudio(id);
  if (!audioDataUrl) return null;
  return { ...meta, audioDataUrl };
}

export async function deleteSong(id: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(AUDIO_STORE, 'readwrite');
    tx.objectStore(AUDIO_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  saveSongsMetadata(getSongsMetadata().filter((s) => s.id !== id));
}
