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

export function getDefaultLocalBaseUrl(): string {
  return import.meta.env.VITE_DEFAULT_LOCAL_URL ?? 'http://localhost:8787';
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
