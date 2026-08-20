import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const localApiProxy = {
  '/local-api': {
    target: 'http://127.0.0.1:8787',
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/local-api/, ''),
    timeout: 600_000,
  },
};

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  build: {
    outDir: mode === 'selfhosted' ? 'dist-local' : 'dist',
  },
  server: {
    host: true,
    proxy: mode === 'selfhosted' ? localApiProxy : undefined,
  },
  preview: {
    host: true,
    proxy: mode === 'selfhosted' ? localApiProxy : undefined,
  },
}));
