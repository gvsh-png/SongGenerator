export type AppMode = 'cloud' | 'local';

export function getAppMode(): AppMode {
  const mode = import.meta.env.VITE_APP_MODE;
  return mode === 'local' ? 'local' : 'cloud';
}

export function isLocalMode(): boolean {
  return getAppMode() === 'local';
}

export function isCloudMode(): boolean {
  return !isLocalMode();
}

/** Same-origin path proxied to the local API server in dev/preview (see vite.config.ts). */
export const LOCAL_API_PROXY_PATH = '/local-api';

const LEGACY_LOCAL_URLS = new Set([
  'http://localhost:8787',
  'http://127.0.0.1:8787',
]);

export function getDefaultLocalBaseUrl(): string {
  return import.meta.env.VITE_DEFAULT_LOCAL_URL ?? LOCAL_API_PROXY_PATH;
}

/** Map legacy direct localhost URLs to the Vite proxy when a same-origin path works better. */
export function normalizeLocalApiBase(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return getDefaultLocalBaseUrl();

  if (LEGACY_LOCAL_URLS.has(trimmed) && typeof window !== 'undefined') {
    const onHttps = window.location.protocol === 'https:';
    const notLocalHost =
      window.location.hostname !== 'localhost' &&
      window.location.hostname !== '127.0.0.1';
    if (onHttps || notLocalHost || import.meta.env.DEV) {
      return LOCAL_API_PROXY_PATH;
    }
  }

  if (
    typeof window !== 'undefined' &&
    window.location.protocol === 'https:' &&
    trimmed.startsWith('http://')
  ) {
    return LOCAL_API_PROXY_PATH;
  }

  return trimmed;
}

export function resolveLocalApiBase(storedUrl?: string | null): string {
  return normalizeLocalApiBase(storedUrl ?? getDefaultLocalBaseUrl());
}

export interface AppBranding {
  appName: string;
  tagline: string;
  setupTitle: string;
  generateWith: string;
}

export function getAppBranding(): AppBranding {
  if (isLocalMode()) {
    return {
      appName: 'Song Studio Local',
      tagline: 'Self-hosted music generation on your hardware',
      setupTitle: 'Connect to your local server',
      generateWith: 'your local model',
    };
  }

  return {
    appName: 'Lyria Studio',
    tagline: 'AI Music Studio',
    setupTitle: 'OpenRouter API Key',
    generateWith: 'Lyria 3',
  };
}

export function supportsMusicVideo(): boolean {
  return isCloudMode();
}
