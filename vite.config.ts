import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
  },
  build: {
    outDir: mode === 'selfhosted' ? 'dist-local' : 'dist',
  },
  server: {
    proxy: mode === 'selfhosted'
      ? {
          '/local-api': {
            target: 'http://localhost:8787',
            changeOrigin: true,
            rewrite: (path) => path.replace(/^\/local-api/, ''),
          },
        }
      : undefined,
  },
}));
