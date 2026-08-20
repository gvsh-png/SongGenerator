/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_MODE?: 'cloud' | 'local';
  readonly VITE_DEFAULT_LOCAL_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
