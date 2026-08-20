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

/** Prefer 127.0.0.1 over localhost — Windows browsers often fail on IPv6 localhost. */
export const LOCAL_DIRECT_URL = 'http://127.0.0.1:8787';

export const LOCAL_DIRECT_URL_ALT = 'http://localhost:8787';

const LEGACY_LOCAL_URLS = new Set([
  LOCAL_DIRECT_URL,
  LOCAL_DIRECT_URL_ALT,
  'http://127.0.0.1:8787',
  'http://localhost:8787',
]);

export function isBrowserLocalHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}

export function needsLocalApiProxy(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.location.protocol === 'https:') return true;
  return !isBrowserLocalHost();
}

export function getDefaultLocalBaseUrl(): string {
  const envDefault = import.meta.env.VITE_DEFAULT_LOCAL_URL?.trim();
  if (envDefault) return envDefault;
  if (needsLocalApiProxy()) return LOCAL_API_PROXY_PATH;
  return LOCAL_DIRECT_URL;
}

/** Pick direct localhost vs /local-api proxy depending on where the app is opened. */
export function normalizeLocalApiBase(url: string): string {
  const trimmed = url.trim().replace(/\/+$/, '');
  if (!trimmed) return getDefaultLocalBaseUrl();

  if (typeof window !== 'undefined') {
    if (needsLocalApiProxy()) {
      if (LEGACY_LOCAL_URLS.has(trimmed) || trimmed === LOCAL_API_PROXY_PATH) {
        return LOCAL_API_PROXY_PATH;
      }
      if (trimmed.startsWith('http://')) {
        return LOCAL_API_PROXY_PATH;
      }
    } else if (trimmed === LOCAL_API_PROXY_PATH || LEGACY_LOCAL_URLS.has(trimmed)) {
      return LOCAL_DIRECT_URL;
    }
  }

  return trimmed;
}

export function resolveLocalApiBase(storedUrl?: string | null): string {
  return normalizeLocalApiBase(storedUrl ?? getDefaultLocalBaseUrl());
}

/** URLs to try when connecting to the local API (order matters). */
export function getLocalApiCandidates(storedUrl?: string | null): string[] {
  const primary = resolveLocalApiBase(storedUrl);
  const extras: string[] = [];

  if (typeof window !== 'undefined' && isBrowserLocalHost()) {
    for (const url of [LOCAL_DIRECT_URL, LOCAL_DIRECT_URL_ALT, LOCAL_API_PROXY_PATH]) {
      if (url !== primary) extras.push(url);
    }
  } else if (primary !== LOCAL_API_PROXY_PATH) {
    extras.push(LOCAL_API_PROXY_PATH);
  }

  return [...new Set([primary, ...extras])];
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
