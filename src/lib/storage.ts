import type { SavedSong } from '../types';
import { isLocalMode } from './config';

const API_KEY_STORAGE = 'lyria_api_key';
const LOCAL_BASE_URL_STORAGE = 'lyria_local_base_url';
const LOCAL_API_KEY_STORAGE = 'lyria_local_api_key';
const SONGS_STORAGE = 'lyria_songs';
const DB_NAME = 'lyria-songs-db';
const DB_VERSION = 2;
const AUDIO_STORE = 'audio';
const VIDEO_STORE = 'videos';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(AUDIO_STORE)) {
        db.createObjectStore(AUDIO_STORE);
      }
      if (!db.objectStoreNames.contains(VIDEO_STORE)) {
        db.createObjectStore(VIDEO_STORE);
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

export function getLocalBaseUrl(): string | null {
  return localStorage.getItem(LOCAL_BASE_URL_STORAGE);
}

export function setLocalBaseUrl(url: string): void {
  localStorage.setItem(LOCAL_BASE_URL_STORAGE, normalizeLocalBaseUrl(url));
}

export function getLocalApiKey(): string | null {
  return localStorage.getItem(LOCAL_API_KEY_STORAGE);
}

export function setLocalApiKey(key: string): void {
  const trimmed = key.trim();
  if (trimmed) localStorage.setItem(LOCAL_API_KEY_STORAGE, trimmed);
  else localStorage.removeItem(LOCAL_API_KEY_STORAGE);
}

export function normalizeLocalBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '');
}

export function clearLocalConfig(): void {
  localStorage.removeItem(LOCAL_BASE_URL_STORAGE);
  localStorage.removeItem(LOCAL_API_KEY_STORAGE);
}

export function isAppConfigured(): boolean {
  if (isLocalMode()) return !!getLocalBaseUrl();
  return !!getApiKey();
}

export function clearAppConfig(): void {
  if (isLocalMode()) clearLocalConfig();
  else clearApiKey();
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

export async function saveSongVideo(songId: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(VIDEO_STORE, 'readwrite');
    tx.objectStore(VIDEO_STORE).put(blob, songId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getSongVideo(songId: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(VIDEO_STORE, 'readonly');
    const request = tx.objectStore(VIDEO_STORE).get(songId);
    request.onsuccess = () => resolve((request.result as Blob) ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSongVideo(songId: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(VIDEO_STORE, 'readwrite');
    tx.objectStore(VIDEO_STORE).delete(songId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function updateSongMetadata(
  songId: string,
  patch: Partial<Omit<SavedSong, 'audioDataUrl'>>,
): void {
  const songs = getSongsMetadata();
  const updated = songs.map((s) => (s.id === songId ? { ...s, ...patch } : s));
  saveSongsMetadata(updated);
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
    const tx = db.transaction([AUDIO_STORE, VIDEO_STORE], 'readwrite');
    tx.objectStore(AUDIO_STORE).delete(id);
    tx.objectStore(VIDEO_STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  saveSongsMetadata(getSongsMetadata().filter((s) => s.id !== id));
}
